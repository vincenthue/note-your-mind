<template>
  <div class="dn" role="dialog" aria-modal="true" :aria-label="note ? 'Edit day note' : 'New day note'">
    <header class="dn-top">
      <button class="dn-crumb" @click="requestClose">Day notes</button>
      <span class="dn-sep">/</span>
      <span class="dn-crumb-title">{{ form.title.trim() || (note ? 'Untitled day' : 'New note') }}</span>
      <span class="dn-top-right">
        <span v-if="error" class="dn-error">{{ error }}</span>
        <span v-else-if="isDirty" class="dn-unsaved">Unsaved changes</span>
        <button v-if="note" class="btn btn-ghost btn-icon" title="Delete note" :disabled="saving" @click="$emit('delete', note)">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.8h4V4M4 4l.7 9.2h6.6L12 4"/></svg>
        </button>
        <button class="btn btn-ghost" :disabled="saving" @click="requestClose">Cancel</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save note' }}</button>
      </span>
    </header>

    <div class="dn-body">
      <input
        ref="titleEl"
        v-model="form.title"
        class="dn-title"
        placeholder="Untitled day"
        maxlength="200"
        aria-label="Note title"
        @keydown.enter.prevent="!$event.isComposing && openCell(times[0], form.data.columns[0].id)"
      />

      <div class="dn-meta">
        <label class="dn-chip">
          <span class="sr-only">Date</span>
          <input v-model="form.day" type="date" required class="dn-chip-input" />
        </label>
        <span class="dn-chip">
          <select class="dn-chip-input" data-which="start" :value="form.data.start" aria-label="Start time" @change="e => setRange(e.target.value, form.data.end, e)">
            <option v-for="h in HOURS" :key="h" :value="h" :disabled="h >= form.data.end">{{ h }}</option>
          </select>
          <span class="dn-dash">–</span>
          <select class="dn-chip-input" :value="form.data.end" aria-label="End time" @change="e => setRange(form.data.start, e.target.value, e)">
            <option v-for="h in HOURS" :key="h" :value="h" :disabled="h <= form.data.start">{{ h }}</option>
          </select>
        </span>
      </div>

      <div class="dn-table-wrap">
        <div class="dn-table" :style="{ '--cols': form.data.columns.length }">
          <div class="dn-row dn-head">
            <div class="dn-time">Time</div>
            <div v-for="col in form.data.columns" :key="col.id" class="dn-colname">{{ col.name }}</div>
          </div>

          <div v-for="time in times" :key="time" class="dn-row">
            <div class="dn-time">{{ time }}</div>
            <div
              v-for="col in form.data.columns"
              :key="col.id"
              class="dn-cell"
              :class="{ on: isActive(time, col.id) }"
              @mousedown="e => onCellDown(e, time, col.id)"
            >
              <div v-for="(e, i) in entriesIn(form.data, time, col.id)" :key="e.id" class="pill pill--waiting" @mousedown.stop>
                <span class="pill-ring" aria-hidden="true"></span>
                <span class="pill-text">{{ e.text }}</span>
                <button class="pill-x" :aria-label="`Remove ${e.text}`" @click.stop="removeEntry(time, col.id, i)">×</button>
              </div>
              <input
                v-if="isActive(time, col.id)"
                :ref="el => { if (el) cellInput = el }"
                v-model="draft"
                class="dn-cell-input"
                maxlength="500"
                :placeholder="entriesIn(form.data, time, col.id).length ? 'Add another…' : 'Type, then press Enter'"
                @mousedown.stop
                @keydown.enter.prevent="onEnter"
                @keydown.esc.stop.prevent="closeCell"
                @blur="isActive(time, col.id) && commit(false)"
              />
              <span v-else-if="entriesIn(form.data, time, col.id).length" class="dn-cell-add">+ Add entry</span>
            </div>
          </div>
        </div>
      </div>
      <p class="dn-hint">Click a cell to type. Press Enter to add it as an entry; a cell can hold as many entries as you need.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { HOURS, blankDayNote, timesOf, entriesIn, uid } from '../daynote'
import { confirmDialog, confirmState, settleConfirm } from '../confirm'
import { errorMessage } from '../api'

const props = defineProps({
  note: { type: Object, default: null },
  onSave: { type: Function, required: true },
})
const emit = defineEmits(['close', 'delete'])

const start = props.note
  ? { title: props.note.title, day: props.note.day, data: JSON.parse(JSON.stringify(props.note.data)) }
  : blankDayNote()
start.data.extraTimes ||= []
start.data.cells ||= {}
const form = reactive(start)
const initial = JSON.stringify(form)
const isDirty = computed(() => JSON.stringify(form) !== initial)

const times = computed(() => timesOf(form.data))
const saving = ref(false)
const error = ref('')
const titleEl = ref(null)

// ── Typing into a cell ──
const active = ref(null) // { time, col }
const draft = ref('')
let cellInput = null

const isActive = (time, col) => active.value?.time === time && active.value?.col === col

async function openCell(time, col) {
  if (isActive(time, col)) return cellInput?.focus()
  commit(false)
  active.value = { time, col }
  draft.value = ''
  await nextTick()
  cellInput?.focus()
}
// Open on mousedown (not click) so the previous cell shrinking can't make the click miss
function onCellDown(e, time, col) {
  if (e.button !== 0) return
  e.preventDefault()
  openCell(time, col)
}
function closeCell() {
  draft.value = ''
  active.value = null
}
function commit(keepOpen) {
  const a = active.value
  if (!a) return
  const text = draft.value.trim()
  if (text) {
    const row = (form.data.cells[a.time] ||= {})
    ;(row[a.col] ||= []).push({ id: uid(), text, status: 'waiting' })
  }
  draft.value = ''
  if (!keepOpen) active.value = null
}
function onEnter(e) {
  if (e.isComposing) return // still choosing characters in a Chinese/Japanese input method
  commit(true)
}
function removeEntry(time, col, i) {
  const row = form.data.cells[time]
  row[col].splice(i, 1)
  if (!row[col].length) delete row[col]
  if (!Object.keys(row).length) delete form.data.cells[time]
}

// ── Time range ──
async function setRange(newStart, newEnd, e) {
  const keep = new Set(timesOf(form.data, newStart, newEnd))
  const dropped = Object.keys(form.data.cells).filter(t => !keep.has(t))
  const lost = dropped.reduce((n, t) => n + Object.values(form.data.cells[t]).reduce((m, l) => m + l.length, 0), 0)
  if (lost) {
    const ok = await confirmDialog({
      title: 'Remove entries outside the new hours?',
      message: `${lost} entr${lost === 1 ? 'y' : 'ies'} at ${dropped.join(', ')} will be removed.`,
      confirmText: 'Remove', danger: true,
    })
    if (!ok) { e.target.value = e.target.dataset.which === 'start' ? form.data.start : form.data.end; return }
    for (const t of dropped) delete form.data.cells[t]
  }
  if (active.value && !keep.has(active.value.time)) closeCell()
  form.data.start = newStart
  form.data.end = newEnd
}

// ── Save / close ──
async function save() {
  if (saving.value) return
  commit(false)
  error.value = ''
  if (!form.day) { error.value = 'Pick a date.'; return }
  saving.value = true
  try {
    await props.onSave({ title: form.title.trim(), day: form.day, data: form.data })
    emit('close')
  } catch (err) {
    error.value = errorMessage(err, 'Could not save.')
  } finally {
    saving.value = false
  }
}

async function requestClose() {
  if (saving.value) return
  commit(false)
  if (isDirty.value) {
    const ok = await confirmDialog({ title: 'Discard changes?', message: 'This note has changes that haven’t been saved.', confirmText: 'Discard', danger: true })
    if (!ok) return
  }
  emit('close')
}

function onKey(e) {
  if (confirmState.open) return
  if (e.key === 'Escape') requestClose()
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (!props.note) titleEl.value?.focus()
})
onUnmounted(() => {
  if (confirmState.open) settleConfirm(false)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.dn {
  position: fixed; inset: 0; z-index: 100;
  display: flex; flex-direction: column;
  background: var(--bg);
}
.dn-top {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  min-height: 56px; padding: 10px 24px; border-bottom: 1px solid var(--border);
}
.dn-crumb { border: 0; background: none; padding: 0; color: var(--text-3); font-size: 14px; }
.dn-crumb:hover { color: var(--text); }
.dn-sep { color: var(--text-3); }
.dn-crumb-title { font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40vw; }
.dn-top-right { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.dn-unsaved { color: var(--text-3); font-size: 12.5px; margin-right: 4px; }
.dn-error { color: var(--danger); font-size: 13px; margin-right: 4px; }

.dn-body { flex: 1; min-height: 0; overflow: auto; padding: 22px 24px 28px; }
.dn-title {
  width: 100%; border: 0; outline: 0; background: transparent; padding: 0;
  font-size: 26px; font-weight: 650; letter-spacing: -0.015em; color: var(--text);
}
.dn-title::placeholder { color: var(--text-3); }

.dn-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 16px; }
.dn-chip {
  display: inline-flex; align-items: center; gap: 2px; height: 32px; padding: 0 6px;
  background: var(--bg-elev); border: 1px solid var(--border); border-radius: 7px;
}
.dn-chip:focus-within { border-color: var(--accent); }
.dn-chip-input {
  height: 30px; border: 0; outline: 0; background: transparent; padding: 0 4px;
  font-size: 13px; color: var(--text); color-scheme: inherit;
}
.dn-chip-input option { background: var(--bg-elev); color: var(--text); }
.dn-dash { color: var(--text-3); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.dn-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
.dn-table { min-width: calc(88px + var(--cols) * 190px); }
.dn-row {
  display: grid; grid-template-columns: 88px repeat(var(--cols), minmax(190px, 1fr));
  border-top: 1px solid var(--border);
}
.dn-row:first-child { border-top: 0; }
.dn-row > * { border-left: 1px solid var(--border); }
.dn-row > :first-child { border-left: 0; }
.dn-head { background: var(--bg-elev); font-weight: 600; font-size: 13px; }
.dn-head > * { display: flex; align-items: center; height: 44px; padding: 0 14px; }
.dn-head .dn-time { color: var(--text-3); }
.dn-colname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dn-time { padding: 8px 14px 0; color: var(--text-3); font-size: 13px; background: var(--bg-sidebar); font-variant-numeric: tabular-nums; }
.dn-cell {
  min-height: 36px; padding: 4px 10px; cursor: text;
  display: flex; flex-direction: column; gap: 4px;
}
.dn-cell:hover { background: var(--bg-hover); }
.dn-cell.on { box-shadow: inset 0 0 0 2px var(--accent); background: transparent; }
.dn-cell-input {
  width: 100%; height: 26px; border: 0; outline: 0; background: transparent; padding: 0 4px;
  font-size: 13px; color: var(--text);
}
.dn-cell-input::placeholder { color: var(--text-3); }
.dn-cell-add { display: none; font-size: 12.5px; color: var(--accent); padding: 1px 4px; }
.dn-cell:hover .dn-cell-add { display: block; }

/* Entry bar: yellow = waiting */
.pill {
  display: flex; align-items: center; gap: 8px; min-height: 26px; padding: 3px 4px 3px 7px;
  border-radius: 999px; font-size: 13px; font-weight: 500; cursor: default;
}
.pill--waiting { background: #F5C542; color: #1F1700; }
.pill-ring { flex: none; width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid currentColor; }
.pill-text { flex: 1; min-width: 0; overflow-wrap: anywhere; line-height: 1.35; }
.pill-x {
  flex: none; width: 20px; height: 20px; border: 0; border-radius: 50%; padding: 0;
  background: transparent; color: inherit; font-size: 15px; line-height: 1; opacity: 0;
}
.pill:hover .pill-x, .pill-x:focus-visible { opacity: .7; }
.pill-x:hover { opacity: 1; background: rgba(0, 0, 0, 0.12); }

.dn-hint { margin: 12px 0 0; color: var(--text-3); font-size: 12.5px; }

@media (max-width: 640px) {
  .dn-top { padding: 10px 16px; }
  .dn-body { padding: 16px 16px 24px; }
  .dn-title { font-size: 22px; }
  .dn-unsaved { display: none; }
  .dn-crumb-title { max-width: 30vw; }
  .dn-row { grid-template-columns: 64px repeat(var(--cols), minmax(170px, 1fr)); }
  .dn-table { min-width: calc(64px + var(--cols) * 170px); }
  .dn-time { padding: 8px 10px 0; }
  .dn-head .dn-time { padding: 0 10px; }
}
@media (hover: none) {
  .pill-x { opacity: .6; }
  .dn-cell-add { display: block; }
}
</style>
