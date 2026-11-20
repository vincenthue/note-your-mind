<template>
  <div class="dn" role="dialog" aria-modal="true" :aria-label="noteId ? 'Edit day note' : 'New day note'">
    <header class="dn-top">
      <button class="dn-crumb" @click="requestClose">Day notes</button>
      <span class="dn-sep">/</span>
      <span class="dn-crumb-title">{{ form.title.trim() || (noteId ? 'Untitled day' : 'New note') }}</span>
      <span class="dn-top-right">
        <span v-if="error" class="dn-error">{{ error }}</span>
        <span v-else class="dn-unsaved">{{ statusText }}</span>
        <button v-if="noteId" class="btn btn-ghost btn-icon" title="Delete note" :disabled="saving" @click="$emit('delete', note)">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.8h4V4M4 4l.7 9.2h6.6L12 4"/></svg>
        </button>
        <template v-if="noteId">
          <button class="btn btn-primary" @click="requestClose">Done</button>
        </template>
        <template v-else>
          <button class="btn btn-ghost" :disabled="saving" @click="requestClose">Cancel</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveNow()">{{ saving ? 'Saving…' : 'Save note' }}</button>
        </template>
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
        @keydown.enter.prevent="!$event.isComposing && afterTitle()"
      />

      <div class="dn-meta">
        <label class="dn-chip">
          <span class="sr-only">Date</span>
          <input v-model="form.day" type="date" required class="dn-chip-input" />
        </label>
        <span v-if="isToday" class="dn-chip dn-chip--now">Now {{ nowT }}</span>
        <div class="dn-tabs" role="tablist" aria-label="View">
          <button v-for="t in TABS" :key="t.id" role="tab" :aria-selected="view === t.id" class="dn-tab" :class="{ on: view === t.id }" @click="view = t.id">{{ t.label }}</button>
        </div>
      </div>

      <!-- ── Table ── -->
      <template v-if="view === 'table'">
        <div class="dn-table-wrap">
          <div class="dn-table" :style="{ '--cols': form.data.columns.length }">
            <div class="dn-row dn-head">
              <div class="dn-sess">Time · Session</div>
              <div v-for="col in form.data.columns" :key="col.id" class="dn-colname">{{ col.name }}</div>
            </div>

            <div v-for="s in form.data.sessions" :key="s.id" class="dn-row" :class="{ 'dn-row--now': current?.id === s.id }">
              <div class="dn-sess" role="button" tabindex="0" title="Edit session" @click="editSession(s)" @keydown.enter="editSession(s)">
                <div class="dn-sess-top">
                  <span class="dn-sess-time">{{ s.time }}</span>
                  <span v-if="s.format" class="dn-tag" :class="`dn-tag--${s.format}`">{{ FORMAT_LABEL[s.format] }}</span>
                  <span class="dn-hall">{{ s.hall }}</span>
                  <button class="dn-sess-more" aria-label="Session options" @click.stop="openSessionMenu(s, $event.currentTarget)">⋯</button>
                </div>
                <span class="dn-sess-name" :class="{ empty: !s.name }">{{ s.name || 'Untitled session' }}</span>
              </div>
              <div
                v-for="col in form.data.columns"
                :key="col.id"
                class="dn-cell"
                :class="{ on: isActive(s.id, col.id) }"
                @mousedown="e => onCellDown(e, s.id, col.id)"
              >
                <template v-for="e in entriesIn(s, col.id)" :key="e.id">
                  <DayPill
                    v-if="active?.editId !== e.id"
                    :entry="e"
                    :overdue="overdue(e, col.id, s)"
                    @copy="copy(e.text)"
                    @done="copy(e.text); e.status = 'done'"
                    @toggle="toggle(e)"
                    @menu="el => openEntryMenu(s, col.id, e, el)"
                  />
                </template>
                <textarea
                  v-if="isActive(s.id, col.id)"
                  :ref="el => { if (el) cellInput = el }"
                  v-model="draft"
                  class="dn-cell-input"
                  rows="1"
                  maxlength="500"
                  :placeholder="active.editId ? 'Edit, then press Enter' : entriesIn(s, col.id).length ? 'Add another…' : 'Type, then press Enter'"
                  @mousedown.stop
                  @input="autoGrow"
                  @keydown.enter="onEnter"
                  @keydown.esc.stop.prevent="closeCell"
                  @blur="isActive(s.id, col.id) && commit(false)"
                />
                <span v-else-if="entriesIn(s, col.id).length" class="dn-cell-add">+ Add entry</span>
              </div>
            </div>

            <button class="dn-add-session" @click="addSession">+ Add session</button>
          </div>
        </div>
        <p class="dn-hint">
          Click a cell to type; Enter adds an entry, Shift+Enter starts a new line in the same entry. Click an entry to copy it, double-click to copy and mark it done, or click its circle.
          Write <b>@name</b> to highlight who does it. Setup turns red if not done when its session starts; tasks and venue items when the session ends.
        </p>
      </template>

      <!-- ── Now ── -->
      <template v-else-if="view === 'now'">
        <p v-if="!sessions.length" class="dn-empty">No sessions yet. Add them in <button class="dn-link" @click="view = 'table'">Table</button>.</p>
        <template v-else>
          <p v-if="dayState !== 'today'" class="dn-banner">
            {{ dayState === 'future' ? `This note is for ${formatDay(form.day)}. Showing the first session.` : 'This day is over. Here is what was left open.' }}
          </p>
          <div class="nw">
            <section v-if="next" class="nw-next">
              <div class="nw-kicker">
                <span class="nw-k nw-k--accent">NEXT · {{ next.time }}</span>
                <span v-if="next.format" class="dn-tag" :class="`dn-tag--${next.format}`">{{ FORMAT_LABEL[next.format] }}</span>
                <span v-if="startsIn !== null" class="nw-badge">{{ startsIn }}</span>
              </div>
              <div class="nw-title">{{ next.name || 'Untitled session' }}</div>
              <div v-if="next.hall" class="nw-sub">{{ next.hall }}</div>
              <div v-for="g in GROUPS" :key="g.col" class="nw-group">
                <div class="nw-group-head"><b>{{ g.title }}</b><span>{{ colName(g.col) }}</span></div>
                <DayPill v-for="e in entriesIn(next, g.col)" :key="e.id" :entry="e" mode="check" big
                  :overdue="overdue(e, g.col, next)" @toggle="toggle(e)" @copy="copy(e.text)" />
                <span v-if="!entriesIn(next, g.col).length" class="nw-none">Nothing for this session</span>
              </div>
            </section>

            <div class="nw-side">
              <section v-if="current" class="nw-card">
                <div class="nw-kicker">
                  <span class="nw-k">NOW · {{ current.time }}</span>
                  <span v-if="current.format" class="dn-tag" :class="`dn-tag--${current.format}`">{{ FORMAT_LABEL[current.format] }}</span>
                  <span class="nw-muted nw-right">{{ openIn(current).length }} open</span>
                </div>
                <div class="nw-card-title">{{ current.name || 'Untitled session' }}</div>
                <DayPill v-for="x in openIn(current)" :key="x.e.id" :entry="x.e" mode="check" :label="SHORT[x.col] || ''"
                  :overdue="overdue(x.e, x.col, current)" @toggle="toggle(x.e)" @copy="copy(x.e.text)" />
                <span v-if="!openIn(current).length" class="nw-none">All done ✓</span>
              </section>

              <section v-if="dayState === 'past'" class="nw-card">
                <span class="nw-k">LEFT OPEN</span>
                <template v-for="s in sessions" :key="s.id">
                  <DayPill v-for="x in openIn(s)" :key="x.e.id" :entry="x.e" mode="check" :label="s.time"
                    overdue @toggle="toggle(x.e)" @copy="copy(x.e.text)" />
                </template>
                <span v-if="!sessions.some(s => openIn(s).length)" class="nw-none">Everything was done ✓</span>
              </section>

              <section v-if="later.length" class="nw-card nw-later">
                <span class="nw-k">LATER TODAY</span>
                <div v-for="s in later" :key="s.id" class="nw-later-row">
                  <span class="nw-muted">{{ s.time }}</span>
                  <span class="nw-later-name">{{ s.name || 'Untitled session' }}</span>
                  <span v-if="openIn(s).length" class="nw-count">{{ openIn(s).length }} open</span>
                </div>
              </section>
            </div>
          </div>
          <p class="dn-hint">Click an item to mark it done (click again to undo). Press and hold to copy its text.</p>
        </template>
      </template>

      <!-- ── Venue ── -->
      <template v-else-if="view === 'venue'">
        <div class="vn">
          <section class="vn-list">
            <div class="vn-head">
              <b>Things to confirm with the venue</b>
              <span v-if="venueItems.length" class="vn-count">{{ venueDone }} of {{ venueItems.length }} confirmed</span>
              <label class="vn-contact">
                <span>Venue contact</span>
                <input v-model="form.data.venueContact" maxlength="80" placeholder="e.g. Banquet team" />
              </label>
            </div>
            <div v-for="x in venueItems" :key="x.e.id" class="vn-row">
              <span class="vn-time" :class="{ dim: x.e.status === 'done' }">{{ x.s.time }}</span>
              <span class="vn-sess">{{ x.s.name }}</span>
              <DayPill :entry="x.e" mode="check" :overdue="overdue(x.e, 'venue', x.s)" @toggle="toggle(x.e)" @copy="copy(x.e.text)" />
            </div>
            <p v-if="!venueItems.length" class="dn-empty">Nothing in the Venue column yet.</p>
          </section>
          <section class="vn-side">
            <button class="btn btn-primary" :disabled="!venueOpen.length" @click="copy(venueMessage, 'Copied — paste it to the venue')">Copy what’s not confirmed</button>
            <pre v-if="venueOpen.length" class="vn-msg">{{ venueMessage }}</pre>
            <p class="dn-hint">When the venue replies, tick each item — it turns cyan in the table too.</p>
          </section>
        </div>
      </template>

      <!-- ── Packing ── -->
      <template v-else>
        <div class="pk-bar">
          <b>Packing list</b>
          <span class="nw-muted">{{ packed }} of {{ packItems.length }} packed</span>
          <div class="pk-meter"><div :style="{ width: packItems.length ? (packed / packItems.length) * 100 + '%' : 0 }"></div></div>
          <label class="pk-toggle"><input v-model="hidePacked" type="checkbox" /> Hide packed</label>
          <button class="btn btn-ghost" :disabled="packed === packItems.length" @click="copy(packMessage, 'Copied the packing list')">Copy list</button>
        </div>
        <div class="pk-grid">
          <section v-for="g in packGroups" :key="g.s.id" class="pk-card">
            <div class="pk-card-head"><span class="nw-muted">{{ g.s.time }}</span><b>{{ g.s.name || 'Untitled session' }}</b></div>
            <div v-for="e in g.items" :key="e.id" class="pk-item" :class="{ packed: e.packed }">
              <button class="pk-box" :aria-label="e.packed ? `Unpack ${e.text}` : `Packed ${e.text}`" @click="e.packed = !e.packed">{{ e.packed ? '✓' : '' }}</button>
              <span class="pk-text">{{ e.text }}</span>
              <button class="pk-hide" title="Not something to bring — hide from this list" @click="e.noPack = true">Hide</button>
            </div>
          </section>
        </div>
        <p v-if="!packItems.length && !hiddenPack.length" class="dn-empty">Nothing in the Default setup column yet.</p>
        <div v-if="hiddenPack.length" class="pk-hidden">
          <button class="dn-link" @click="showHidden = !showHidden">{{ showHidden ? 'Hide' : 'Show' }} {{ hiddenPack.length }} hidden</button>
          <span v-if="showHidden" class="pk-hidden-list">
            <button v-for="e in hiddenPack" :key="e.id" class="pk-restore" title="Put back on the list" @click="e.noPack = false">{{ e.text }} ↺</button>
          </span>
        </div>
        <p class="dn-hint">Everything from Default setup, grouped by session. “Packed” is separate from Done: pack the night before, set up at the time.</p>
      </template>
    </div>

    <!-- Session dialog -->
    <div v-if="sessDlg.open" class="dn-scrim" @mousedown.self="sessDlg.open = false">
      <form class="dn-dialog" role="dialog" :aria-label="sessDlg.id ? 'Edit session' : 'Add session'" @submit.prevent="saveSession">
        <b class="dn-dialog-title">{{ sessDlg.id ? 'Edit session' : 'Add session' }}</b>
        <div class="dn-fields">
          <label class="dn-field dn-field--time"><span>Time</span><input v-model="sessDlg.time" type="time" required /></label>
          <label class="dn-field dn-field--grow"><span>Session</span><input ref="sessNameEl" v-model="sessDlg.name" maxlength="200" placeholder="e.g. Crew Breakfast" /></label>
        </div>
        <div class="dn-fields">
          <div class="dn-field dn-field--grow"><span>Format</span>
            <div class="dn-seg">
              <button v-for="f in FORMATS" :key="f" type="button" :class="[{ on: sessDlg.format === f }, f && `dn-seg--${f}`]" @click="sessDlg.format = f">{{ FORMAT_LABEL[f] || 'None' }}</button>
            </div>
          </div>
          <label class="dn-field dn-field--hall"><span>Hall (optional)</span><input v-model="sessDlg.hall" maxlength="60" placeholder="e.g. Hall L" /></label>
        </div>
        <p v-if="placement" class="dn-place">{{ placement }}</p>
        <div class="dn-dialog-actions">
          <button type="button" class="btn btn-ghost" @click="sessDlg.open = false">Cancel</button>
          <button type="submit" class="btn btn-primary">{{ sessDlg.id ? 'Save' : 'Add session' }}</button>
        </div>
      </form>
    </div>

    <!-- Menus -->
    <div v-if="menu" class="dn-menu-scrim" @mousedown="menu = null">
      <div class="dn-menu" role="menu" :style="{ top: menu.y + 'px', left: menu.x + 'px' }" @mousedown.stop>
        <template v-if="menu.kind === 'entry'">
          <button role="menuitem" @click="toggle(menu.e); menu = null">{{ menu.e.status === 'done' ? 'Back to waiting' : 'Mark as done' }}</button>
          <button role="menuitem" @click="copy(menu.e.text); menu = null">Copy text</button>
          <button role="menuitem" @click="editEntry(menu)">Edit text</button>
          <button role="menuitem" class="danger" @click="removeEntry(menu.s, menu.col, menu.e); menu = null">Remove entry</button>
        </template>
        <template v-else>
          <button role="menuitem" @click="editSession(menu.s); menu = null">Edit time, name, format</button>
          <button role="menuitem" @click="duplicateSession(menu.s); menu = null">Duplicate session</button>
          <button role="menuitem" class="danger" @click="deleteSession(menu.s)">Delete session</button>
        </template>
      </div>
    </div>

    <div v-if="flash" class="dn-flash" role="status">{{ flash }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import DayPill from './DayPill.vue'
import {
  FORMATS, blankDayNote, normalizeData, sortSessions, entriesIn, uid, isOverdue,
  localISODate, nowHHMM, toMin, formatDay,
} from '../daynote'
import { confirmDialog, confirmState, settleConfirm } from '../confirm'
import { errorMessage } from '../api'

const props = defineProps({
  note: { type: Object, default: null },
  onSave: { type: Function, required: true },
})
const emit = defineEmits(['close', 'delete'])

const TABS = [{ id: 'table', label: 'Table' }, { id: 'now', label: 'Now' }, { id: 'venue', label: 'Venue' }, { id: 'packing', label: 'Packing' }]
const FORMAT_LABEL = { '': '', combined: 'Combined', split: 'Split' }
const GROUPS = [{ col: 'setup', title: 'Prepare' }, { col: 'task', title: 'Ask people' }, { col: 'venue', title: 'Confirm with venue' }]
const SHORT = { setup: 'setup', task: 'task', venue: 'venue' }

const start = props.note
  ? { title: props.note.title, day: props.note.day, data: normalizeData(props.note.data) }
  : blankDayNote()
const form = reactive(start)
const noteId = computed(() => props.note?.id ?? null)
const sessions = computed(() => form.data.sessions)
const colName = id => form.data.columns.find(c => c.id === id)?.name || id

// ── Clock ──
const now = ref(new Date())
const clock = setInterval(() => (now.value = new Date()), 20000)
const nowT = computed(() => nowHHMM(now.value))
const today = computed(() => localISODate(now.value))
const isToday = computed(() => form.day === today.value)
const dayState = computed(() => (form.day === today.value ? 'today' : form.day > today.value ? 'future' : 'past'))
const overdue = (e, col, s) => isOverdue(e, col, s, sessions.value, form.day, now.value)

const view = ref(props.note && isToday.value ? 'now' : 'table')

// ── Saving: new notes save with the button; saved notes save themselves after each change ──
const saving = ref(false)
const error = ref('')
let savedJSON = JSON.stringify(form)
const isDirty = ref(false)
let timer = null
let pending = null

watch(form, () => {
  isDirty.value = JSON.stringify(form) !== savedJSON
  if (noteId.value && isDirty.value) {
    clearTimeout(timer)
    timer = setTimeout(() => saveNow(true), 800)
  }
}, { deep: true })

const statusText = computed(() => {
  if (saving.value) return 'Saving…'
  if (!noteId.value) return isDirty.value ? 'Unsaved changes' : ''
  return isDirty.value ? 'Unsaved changes' : 'Saved'
})

async function saveNow(quiet = false) {
  clearTimeout(timer)
  if (saving.value) { pending = quiet; return }
  if (!quiet) commit(false) // autosave must not close the cell you are typing in
  error.value = ''
  if (!form.day) { error.value = 'Pick a date.'; return false }
  const snapshot = JSON.stringify(form)
  saving.value = true
  try {
    await props.onSave({ title: form.title.trim(), day: form.day, data: form.data }, { quiet })
    savedJSON = snapshot
    isDirty.value = JSON.stringify(form) !== savedJSON
    return true
  } catch (err) {
    error.value = errorMessage(err, 'Could not save.')
    return false
  } finally {
    saving.value = false
    if (pending !== null) { const q = pending; pending = null; if (isDirty.value) saveNow(q) }
  }
}

async function requestClose() {
  if (confirmState.open) return
  commit(false)
  while (saving.value) await new Promise(r => setTimeout(r, 100))
  if (noteId.value && isDirty.value) {
    if (await saveNow(true)) return emit('close')
  }
  if (isDirty.value) {
    const ok = await confirmDialog({ title: 'Discard changes?', message: 'This note has changes that haven’t been saved.', confirmText: 'Discard', danger: true })
    if (!ok) return
  }
  emit('close')
}

// ── Copy ──
const flash = ref('')
let flashTimer
function showFlash(msg) {
  flash.value = msg
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = ''), 2000)
}
async function copy(text, msg) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text })
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
  }
  showFlash(msg || `Copied “${text.length > 40 ? text.slice(0, 40) + '…' : text}”`)
}
const toggle = e => { e.status = e.status === 'done' ? 'waiting' : 'done' }

// ── Typing into a cell ──
const active = ref(null) // { sid, col, editId? }
const draft = ref('')
let cellInput = null
const isActive = (sid, col) => active.value?.sid === sid && active.value?.col === col
const findSession = sid => sessions.value.find(s => s.id === sid)

async function openCell(sid, col, editEntryObj = null) {
  if (!editEntryObj && isActive(sid, col) && !active.value.editId) return cellInput?.focus()
  commit(false)
  active.value = { sid, col, editId: editEntryObj?.id }
  draft.value = editEntryObj?.text || ''
  await nextTick()
  autoGrow()
  cellInput?.focus()
}
function onCellDown(e, sid, col) {
  if (e.button !== 0) return
  e.preventDefault()
  openCell(sid, col)
}
function closeCell() {
  draft.value = ''
  active.value = null
}
function commit(keepOpen) {
  const a = active.value
  if (!a) return
  const s = findSession(a.sid)
  const text = draft.value.trim()
  if (s) {
    const list = (s.cells[a.col] ||= [])
    if (a.editId) {
      const e = list.find(x => x.id === a.editId)
      if (e && text) e.text = text
      else if (e) list.splice(list.indexOf(e), 1)
    } else if (text) {
      list.push({ id: uid(), text, status: 'waiting' })
    }
    if (!list.length) delete s.cells[a.col]
  }
  draft.value = ''
  if (keepOpen && s) active.value = { sid: a.sid, col: a.col }
  else active.value = null
}
// Enter adds the entry; Shift+Enter starts a new line inside the same entry.
function onEnter(e) {
  if (e.isComposing || e.shiftKey) return // still choosing characters in an IME, or a line break
  e.preventDefault()
  commit(true)
  nextTick(autoGrow)
}
function autoGrow() {
  const el = cellInput
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
function removeEntry(s, col, e) {
  const list = s.cells[col]
  list.splice(list.indexOf(e), 1)
  if (!list.length) delete s.cells[col]
}
function editEntry(m) {
  menu.value = null
  openCell(m.s.id, m.col, m.e)
}

// ── Menus ──
const menu = ref(null)
function placeMenu(el) {
  const r = el.getBoundingClientRect()
  return { x: Math.min(r.left, window.innerWidth - 230), y: Math.min(r.bottom + 4, window.innerHeight - 180) }
}
function openEntryMenu(s, col, e, el) { commit(false); menu.value = { kind: 'entry', s, col, e, ...placeMenu(el) } }
function openSessionMenu(s, el) { commit(false); menu.value = { kind: 'session', s, ...placeMenu(el) } }

// ── Sessions ──
const sessDlg = reactive({ open: false, id: null, time: '', name: '', format: '', hall: '' })
const sessNameEl = ref(null)

async function openSessionDialog(values) {
  commit(false)
  Object.assign(sessDlg, { open: true, ...values })
  await nextTick()
  sessNameEl.value?.focus()
}
function addSession() {
  const last = sessions.value[sessions.value.length - 1]
  const t = last ? Math.min(toMin(last.time) + 30, 23 * 60 + 30) : 8 * 60
  const time = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  openSessionDialog({ id: null, time, name: '', format: '', hall: '' })
}
function editSession(s) {
  openSessionDialog({ id: s.id, time: s.time, name: s.name, format: s.format, hall: s.hall })
}
const placement = computed(() => {
  if (!sessDlg.time) return ''
  const others = sessions.value.filter(s => s.id !== sessDlg.id)
  const before = [...others].reverse().find(s => s.time <= sessDlg.time)
  const after = others.find(s => s.time > sessDlg.time)
  const label = s => `${s.time} ${s.name || 'Untitled session'}`
  if (before && after) return `Goes between ${label(before)} and ${label(after)}.`
  if (before) return `Goes after ${label(before)}.`
  if (after) return `Goes before ${label(after)}.`
  return ''
})
function saveSession() {
  if (!/^\d{2}:\d{2}$/.test(sessDlg.time)) return
  const values = { time: sessDlg.time, name: sessDlg.name.trim(), format: sessDlg.format, hall: sessDlg.hall.trim() }
  if (sessDlg.id) Object.assign(findSession(sessDlg.id), values)
  else form.data.sessions.push({ id: uid(), ...values, cells: {} })
  sortSessions(form.data.sessions)
  sessDlg.open = false
}
function duplicateSession(s) {
  const copyS = JSON.parse(JSON.stringify(s))
  copyS.id = uid()
  for (const list of Object.values(copyS.cells)) for (const e of list) { e.id = uid(); e.status = 'waiting'; delete e.packed }
  form.data.sessions.splice(form.data.sessions.indexOf(s) + 1, 0, copyS)
}
async function deleteSession(s) {
  menu.value = null
  const n = Object.values(s.cells).reduce((m, l) => m + l.length, 0)
  if (n) {
    const ok = await confirmDialog({
      title: 'Delete this session?',
      message: `“${s.name || s.time}” and its ${n} entr${n === 1 ? 'y' : 'ies'} will be removed.`,
      confirmText: 'Delete', danger: true,
    })
    if (!ok) return
  }
  if (active.value?.sid === s.id) closeCell()
  form.data.sessions.splice(form.data.sessions.indexOf(s), 1)
}

function afterTitle() {
  if (sessions.value.length) openCell(sessions.value[0].id, form.data.columns[0].id)
  else addSession()
}

// ── Now ──
const current = computed(() => {
  if (!isToday.value) return null
  return [...sessions.value].reverse().find(s => s.time <= nowT.value) || null
})
const next = computed(() => {
  if (dayState.value === 'past') return null
  if (dayState.value === 'future') return sessions.value[0] || null
  return sessions.value.find(s => s.time > nowT.value) || null
})
const startsIn = computed(() => {
  if (!next.value || !isToday.value) return null
  const m = toMin(next.value.time) - toMin(nowT.value)
  return m < 60 ? `starts in ${m} min` : `starts in ${Math.floor(m / 60)} h ${m % 60} min`
})
const later = computed(() => {
  if (dayState.value === 'past' || !next.value) return []
  return sessions.value.slice(sessions.value.indexOf(next.value) + 1)
})
const openIn = s => {
  const out = []
  for (const col of form.data.columns) for (const e of entriesIn(s, col.id)) if (e.status !== 'done') out.push({ e, col: col.id })
  return out
}

// ── Venue ──
const venueItems = computed(() => sessions.value.flatMap(s => entriesIn(s, 'venue').map(e => ({ e, s }))))
const venueDone = computed(() => venueItems.value.filter(x => x.e.status === 'done').length)
const venueOpen = computed(() => venueItems.value.filter(x => x.e.status !== 'done'))
const venueMessage = computed(() => {
  const who = form.data.venueContact.trim()
  const lines = venueOpen.value.map(x => `${x.s.time} ${x.e.text}`)
  const title = form.title.trim() || 'our event'
  return `Hi${who ? ' ' + who : ''}, for ${title} (${formatDay(form.day)}), could you help confirm:\n\n${lines.join('\n')}\n\nThank you!`
})

// ── Packing ──
const hidePacked = ref(false)
const showHidden = ref(false)
const packItems = computed(() => sessions.value.flatMap(s => entriesIn(s, 'setup').filter(e => !e.noPack)))
const hiddenPack = computed(() => sessions.value.flatMap(s => entriesIn(s, 'setup').filter(e => e.noPack)))
const packed = computed(() => packItems.value.filter(e => e.packed).length)
const packGroups = computed(() => sessions.value
  .map(s => ({ s, items: entriesIn(s, 'setup').filter(e => !e.noPack && !(hidePacked.value && e.packed)) }))
  .filter(g => g.items.length))
const packMessage = computed(() => {
  const lines = []
  for (const s of sessions.value) {
    const items = entriesIn(s, 'setup').filter(e => !e.noPack && !e.packed)
    if (items.length) lines.push(`${s.time} ${s.name || ''}`.trim(), ...items.map(e => `☐ ${e.text}`), '')
  }
  return `Packing list — ${form.title.trim() || 'Untitled day'} (${formatDay(form.day)})\n\n${lines.join('\n').trim()}`
})

// ── Keys ──
function onKey(e) {
  if (confirmState.open) return
  if (e.key === 'Escape') {
    if (menu.value) menu.value = null
    else if (sessDlg.open) sessDlg.open = false
    else requestClose()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(!!noteId.value) }
}

const titleEl = ref(null)
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (!props.note) titleEl.value?.focus()
})
onUnmounted(() => {
  if (confirmState.open) settleConfirm(false)
  window.removeEventListener('keydown', onKey)
  clearInterval(clock)
  clearTimeout(timer)
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
  background: var(--bg-elev); border: 1px solid var(--border); border-radius: 7px; font-size: 13px;
}
.dn-chip:focus-within { border-color: var(--accent); }
.dn-chip--now { padding: 0 10px; border-color: var(--accent); background: var(--accent-bg); color: var(--accent); font-weight: 600; }
.dn-chip-input {
  height: 30px; border: 0; outline: 0; background: transparent; padding: 0 4px;
  font-size: 13px; color: var(--text); color-scheme: inherit;
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.dn-tabs { margin-left: auto; display: flex; gap: 2px; padding: 3px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 9px; }
.dn-tab { height: 28px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; color: var(--text-3); font-size: 13px; }
.dn-tab:hover { color: var(--text); }
.dn-tab.on { background: var(--bg-hover); color: var(--text); font-weight: 600; }

/* Table */
.dn-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
.dn-table { min-width: calc(240px + var(--cols) * 190px); }
.dn-row {
  display: grid; grid-template-columns: 240px repeat(var(--cols), minmax(190px, 1fr));
  border-top: 1px solid var(--border);
}
.dn-row:first-child { border-top: 0; }
.dn-row > * { border-left: 1px solid var(--border); }
.dn-row > :first-child { border-left: 0; }
.dn-head { background: var(--bg-elev); font-weight: 600; font-size: 13px; }
.dn-head > * { display: flex; align-items: center; height: 42px; padding: 0 14px; }
.dn-head .dn-sess { flex-direction: row; color: var(--text-3); cursor: default; }
.dn-colname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dn-sess { display: flex; flex-direction: column; gap: 3px; padding: 8px 10px 8px 14px; background: var(--bg-sidebar); cursor: pointer; min-width: 0; }
.dn-row:not(.dn-head) .dn-sess:hover { background: var(--bg-hover); }
.dn-sess-top { display: flex; align-items: center; gap: 7px; min-height: 22px; }
.dn-sess-time { font-weight: 700; font-variant-numeric: tabular-nums; }
.dn-hall { margin-left: auto; color: var(--text-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dn-sess-more { flex: none; width: 24px; height: 22px; border: 0; border-radius: 6px; padding: 0; background: transparent; color: var(--text-3); font-weight: 700; opacity: 0; }
.dn-sess:hover .dn-sess-more, .dn-sess-more:focus-visible { opacity: 1; }
.dn-sess-more:hover { background: var(--bg-elev); color: var(--text); }
.dn-sess-name { font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.dn-sess-name.empty { color: var(--text-3); font-weight: 500; }
.dn-row--now { background: rgba(124, 131, 255, 0.07); border-top-color: var(--accent); }
.dn-row--now .dn-sess { background: rgba(124, 131, 255, 0.15); }
.dn-row--now .dn-sess-time { color: var(--accent); }
.dn-tag { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 5px; font-size: 11px; font-weight: 600; }
.dn-tag--combined { background: rgba(110, 150, 255, 0.18); color: #8FB4FF; }
.dn-tag--split { background: rgba(242, 109, 109, 0.18); color: #FF9C9C; }
.dn-cell {
  min-height: 40px; padding: 5px 10px; cursor: text;
  display: flex; flex-direction: column; gap: 4px;
}
.dn-cell:hover { background: var(--bg-hover); }
.dn-cell.on { box-shadow: inset 0 0 0 2px var(--accent); background: transparent; }
.dn-cell-input {
  display: block; width: 100%; min-height: 26px; box-sizing: border-box; border: 0; outline: 0; background: transparent;
  padding: 4px; resize: none; overflow: hidden; font: inherit; font-size: 13px; line-height: 1.35; color: var(--text);
}
.dn-cell-input::placeholder { color: var(--text-3); }
.dn-cell-add { display: none; font-size: 12.5px; color: var(--accent); padding: 1px 4px; }
.dn-cell:hover .dn-cell-add { display: block; }
.dn-add-session {
  display: flex; align-items: center; width: 100%; height: 40px; padding: 0 14px;
  border: 0; border-top: 1px solid var(--border); background: transparent; color: var(--accent); font-weight: 500; font-size: 13px;
}
.dn-add-session:hover { background: var(--accent-bg); }

.dn-hint { margin: 12px 0 0; color: var(--text-3); font-size: 12.5px; line-height: 1.55; }
.dn-empty { color: var(--text-3); font-size: 13px; }
.dn-link { border: 0; background: none; padding: 0; color: var(--accent); font: inherit; }
.dn-banner { margin: 0 0 14px; padding: 10px 14px; border-radius: 9px; background: var(--bg-elev); border: 1px solid var(--border); color: var(--text-2, var(--text)); font-size: 13px; }

/* Now */
.nw { display: flex; gap: 16px; align-items: flex-start; }
.nw-next {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; padding: 18px 20px;
  background: rgba(124, 131, 255, 0.07); border: 1.5px solid var(--accent); border-radius: 14px;
}
.nw-side { width: 380px; flex: none; display: flex; flex-direction: column; gap: 14px; }
.nw-card { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; }
.nw-card-title { font-size: 16px; font-weight: 650; margin-bottom: 4px; }
.nw-kicker { display: flex; align-items: center; gap: 8px; }
.nw-k { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; color: var(--text-3); }
.nw-k--accent { color: var(--accent); }
.nw-badge { margin-left: auto; height: 26px; display: inline-flex; align-items: center; padding: 0 11px; border-radius: 999px; background: var(--accent); color: #0E0F12; font-weight: 700; font-size: 13px; }
.nw-title { font-size: 22px; font-weight: 650; letter-spacing: -.01em; line-height: 1.25; }
.nw-sub, .nw-muted { color: var(--text-3); font-size: 13px; }
.nw-right { margin-left: auto; }
.nw-group { display: flex; flex-direction: column; gap: 6px; }
.nw-group-head { display: flex; align-items: baseline; gap: 8px; font-size: 13.5px; }
.nw-group-head span { color: var(--text-3); font-size: 12px; }
.nw-none { color: var(--text-3); font-size: 13px; }
.nw-later-row { display: flex; align-items: center; gap: 10px; min-height: 34px; border-top: 1px solid var(--border); font-size: 13px; }
.nw-later-name { flex: 1; min-width: 0; font-weight: 500; }
.nw-count { flex: none; height: 20px; display: inline-flex; align-items: center; padding: 0 8px; border-radius: 999px; background: rgba(245, 197, 66, 0.16); color: #F5C542; font-size: 11.5px; font-weight: 600; }

/* Venue */
.vn { display: flex; gap: 16px; align-items: flex-start; }
.vn-list { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 14px 18px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; }
.vn-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding-bottom: 10px; font-size: 15px; }
.vn-count { height: 22px; display: inline-flex; align-items: center; padding: 0 9px; border-radius: 999px; background: rgba(45, 212, 191, 0.16); color: #2DD4BF; font-size: 12px; font-weight: 600; }
.vn-contact { margin-left: auto; display: flex; align-items: center; gap: 8px; color: var(--text-3); font-size: 12px; }
.vn-contact input { height: 30px; width: 170px; padding: 0 10px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text); font-size: 13px; outline: 0; }
.vn-contact input:focus { border-color: var(--accent); }
.vn-row { display: flex; align-items: center; gap: 12px; min-height: 42px; border-top: 1px solid var(--border); font-size: 13px; }
.vn-row .pill { flex: 0 1 auto; }
.vn-time { width: 44px; flex: none; font-weight: 600; font-variant-numeric: tabular-nums; }
.vn-time.dim { color: var(--text-3); }
.vn-sess { width: 190px; flex: none; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vn-side { width: 320px; flex: none; display: flex; flex-direction: column; gap: 10px; }
.vn-msg {
  margin: 0; padding: 14px; border-radius: 12px; background: #1B2A23; border: 1px solid #2C4A3B; color: #DDEFE5;
  font: 13px/1.6 inherit; font-family: inherit; white-space: pre-wrap; overflow-wrap: anywhere;
}

/* Packing */
.pk-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 12px 16px; margin-bottom: 14px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; font-size: 15px; }
.pk-meter { flex: 1; min-width: 80px; max-width: 320px; height: 8px; border-radius: 999px; background: var(--bg-hover); overflow: hidden; }
.pk-meter div { height: 100%; background: #2DD4BF; transition: width .2s; }
.pk-toggle { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-3); }
.pk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; align-items: start; }
.pk-card { display: flex; flex-direction: column; padding: 12px 14px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; }
.pk-card-head { display: flex; gap: 8px; padding-bottom: 6px; font-size: 13px; }
.pk-item { display: flex; align-items: center; gap: 10px; min-height: 34px; border-top: 1px solid var(--border); font-size: 13px; }
.pk-box { flex: none; width: 20px; height: 20px; padding: 0; border: 1.5px solid var(--border-strong); border-radius: 5px; background: transparent; color: #04201C; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.pk-item.packed .pk-box { background: #2DD4BF; border-color: #2DD4BF; }
.pk-item.packed .pk-text { color: var(--text-3); text-decoration: line-through; }
.pk-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.pk-hide { flex: none; border: 0; background: none; padding: 2px 6px; border-radius: 5px; color: var(--text-3); font-size: 12px; opacity: 0; }
.pk-item:hover .pk-hide, .pk-hide:focus-visible { opacity: 1; }
.pk-hide:hover { background: var(--bg-hover); color: var(--text); }
.pk-hidden { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; }
.pk-hidden-list { display: contents; }
.pk-restore { border: 1px dashed var(--border-strong); background: none; border-radius: 999px; padding: 3px 10px; color: var(--text-3); font-size: 12px; }
.pk-restore:hover { color: var(--text); }

/* Dialog + menu */
.dn-scrim { position: fixed; inset: 0; z-index: 110; background: rgba(5, 6, 8, 0.6); display: grid; place-items: start center; padding: 90px 16px 16px; }
.dn-dialog { width: 480px; max-width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; padding: 22px; background: var(--bg-elev); border: 1px solid var(--border-strong); border-radius: 14px; box-shadow: 0 24px 60px rgba(0, 0, 0, .5); }
.dn-dialog-title { font-size: 16px; }
.dn-fields { display: flex; gap: 12px; flex-wrap: wrap; }
.dn-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-3); }
.dn-field--time { width: 120px; }
.dn-field--grow { flex: 1; min-width: 180px; }
.dn-field--hall { width: 150px; }
.dn-field input { height: 40px; box-sizing: border-box; padding: 0 12px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--bg); color: var(--text); font-size: 14px; outline: 0; color-scheme: inherit; }
.dn-field input:focus { border-color: var(--accent); }
.dn-seg { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--bg); }
.dn-seg button { flex: 1; height: 32px; border: 0; border-radius: 6px; background: transparent; color: var(--text-3); font-size: 13px; }
.dn-seg .dn-seg--combined { color: #8FB4FF; }
.dn-seg .dn-seg--split { color: #FF9C9C; }
.dn-seg button.on { background: var(--bg-hover); color: var(--text); font-weight: 600; }
.dn-place { margin: 0; padding: 10px 12px; border-radius: 8px; background: var(--bg); color: var(--text-3); font-size: 13px; }
.dn-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dn-menu-scrim { position: fixed; inset: 0; z-index: 120; }
.dn-menu { position: fixed; width: 220px; display: flex; flex-direction: column; padding: 4px; background: var(--bg-elev); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 18px 40px rgba(0, 0, 0, .5); }
.dn-menu button { height: 34px; padding: 0 10px; border: 0; border-radius: 6px; background: transparent; color: var(--text); text-align: left; font-size: 13px; }
.dn-menu button:hover { background: var(--bg-hover); }
.dn-menu .danger { color: var(--danger); }
.dn-flash {
  position: fixed; left: 50%; top: 66px; transform: translateX(-50%); z-index: 130;
  padding: 9px 14px; border-radius: 10px; background: var(--bg-elev); border: 1px solid var(--border-strong);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .45); font-size: 13px; white-space: nowrap; max-width: calc(100vw - 32px); overflow: hidden; text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .nw, .vn { flex-direction: column; align-items: stretch; }
  .nw-side, .vn-side { width: auto; }
}
@media (max-width: 640px) {
  .dn-top { padding: 10px 16px; }
  .dn-body { padding: 16px 16px 84px; }
  .dn-title { font-size: 22px; }
  .dn-crumb-title { max-width: 30vw; }
  .dn-tabs {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 105; margin: 0; padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border: 0; border-top: 1px solid var(--border); border-radius: 0; background: var(--bg-sidebar);
  }
  .dn-tab { flex: 1; height: 44px; font-size: 13px; }
  .dn-tab.on { background: transparent; color: var(--accent); font-weight: 700; }
  .dn-row { grid-template-columns: 170px repeat(var(--cols), minmax(170px, 1fr)); }
  .dn-table { min-width: calc(170px + var(--cols) * 170px); }
  .vn-sess { display: none; }
  .vn-contact { margin-left: 0; }
}
@media (hover: none) {
  .dn-cell-add, .dn-sess-more, .pk-hide { display: block; opacity: 1; }
}
</style>
