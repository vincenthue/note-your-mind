<template>
  <div class="ne-overlay" @mousedown.self="requestClose">
    <div class="ne" role="dialog" aria-modal="true" :aria-label="note ? 'Edit note' : 'New note'">

      <!-- Top bar -->
      <header class="ne-top">
        <div class="ne-status" ref="statusWrap">
          <button class="btn btn-sm ne-status-btn" @click="statusOpen = !statusOpen">
            <StatusIcon :status="form.status" />
            {{ statusLabel(form.status) }}
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" stroke="currentColor" fill="none" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <Transition name="pop">
            <div v-if="statusOpen" class="menu">
              <button v-for="s in STATUSES" :key="s.value" class="menu-item" :class="{ on: s.value === form.status }"
                @click="form.status = s.value; statusOpen = false">
                <StatusIcon :status="s.value" /> {{ s.label }}
              </button>
            </div>
          </Transition>
        </div>
        <span v-if="note" class="ne-meta">Edited {{ relativeDate(note.updated_at) }}</span>
        <div class="ne-top-right">
          <button v-if="note" class="btn btn-ghost btn-sm btn-icon" title="Move to trash" @click="$emit('delete', note)">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.8h4V4M4 4l.7 9.2h6.6L12 4"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Close (Esc)" @click="requestClose">
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>
          </button>
        </div>
      </header>

      <!-- Body -->
      <div class="ne-body">
        <textarea
          ref="titleEl"
          v-model="form.title"
          class="ne-title"
          rows="1"
          placeholder="Untitled"
          maxlength="200"
          @input="autoGrow"
          @keydown.enter.prevent="focusBody"
          @keydown.ctrl.s.prevent="save"
          @keydown.meta.s.prevent="save"
        ></textarea>

        <div class="ne-tags">
          <span v-for="t in form.tags" :key="t" class="tag ne-tag">
            <button class="tag-dot ne-dot" :style="{ background: tagColor(t) }" :title="`Change colour of ${t}`"
              @click="colorFor = colorFor === t ? null : t"></button>
            {{ t }}
            <button class="ne-tag-x" :aria-label="`Remove ${t}`" @click="removeTag(t)">×</button>
            <Transition name="pop">
              <div v-if="colorFor === t" class="menu palette">
                <button v-for="c in TAG_PALETTE" :key="c" class="swatch" :style="{ background: c }"
                  :class="{ on: tagColor(t) === c }" @click="setTagColor(t, c); colorFor = null"></button>
              </div>
            </Transition>
          </span>
          <input
            v-model="tagInput"
            class="ne-tag-input"
            list="ne-tag-suggestions"
            :placeholder="form.tags.length ? '+ tag' : '+ Add tags'"
            @keydown.enter.prevent="addTag"
            @keydown.,.prevent="addTag"
            @keydown.backspace="!tagInput && form.tags.length && form.tags.pop()"
            @blur="addTag"
          />
          <datalist id="ne-tag-suggestions">
            <option v-for="t in suggestions" :key="t" :value="t" />
          </datalist>
        </div>

        <RichEditor ref="editorRef" v-model="form.content" @save="save" />
      </div>

      <!-- Footer -->
      <footer class="ne-foot">
        <span v-if="error" class="ne-error">{{ error }}</span>
        <span v-else class="ne-hint"><span class="kbd">Ctrl</span> <span class="kbd">S</span> to save · <span class="kbd">Esc</span> to close</span>
        <button class="btn btn-ghost" :disabled="saving" @click="requestClose">Cancel</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : note ? 'Save' : 'Create note' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import RichEditor from './RichEditor.vue'
import StatusIcon from './StatusIcon.vue'
import { STATUSES, statusLabel, relativeDate, toHtml, parseTags, joinTags, tagColor, setTagColor, TAG_PALETTE, isEmptyHtml } from '../utils'
import { confirmDialog, confirmState, settleConfirm } from '../confirm'
import { errorMessage } from '../api'

const props = defineProps({
  note: { type: Object, default: null },
  defaultStatus: { type: String, default: 'todo' },
  allTags: { type: Array, default: () => [] },
  onSave: { type: Function, required: true },
})
const emit = defineEmits(['close', 'delete'])

const form = reactive({
  title: props.note?.title || '',
  content: toHtml(props.note?.content || ''),
  tags: parseTags(props.note?.tags || ''),
  status: props.note?.status || props.defaultStatus,
})
const initial = JSON.stringify(form)
let baselineContent = form.content // TipTap normalises HTML on load; re-baseline after first update
let baselineSet = false

const tagInput = ref('')
const statusOpen = ref(false)
const colorFor = ref(null)
const saving = ref(false)
const error = ref('')
const titleEl = ref(null)
const editorRef = ref(null)
const statusWrap = ref(null)

const suggestions = computed(() => props.allTags.filter(t => !form.tags.includes(t)))

const isDirty = computed(() => {
  const snap = JSON.parse(initial)
  return form.title !== snap.title ||
    joinTags(form.tags) !== joinTags(snap.tags) ||
    form.status !== snap.status ||
    form.content !== baselineContent
})

function addTag() {
  const parts = tagInput.value.split(',').map(t => t.trim()).filter(Boolean)
  for (const t of parts) if (!form.tags.includes(t)) form.tags.push(t)
  tagInput.value = ''
}
function focusBody(e) {
  if (e?.isComposing) return
  editorRef.value?.focus()
}
function removeTag(t) { form.tags = form.tags.filter(x => x !== t) }

function autoGrow() {
  const el = titleEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

async function save() {
  if (saving.value) return
  addTag()
  error.value = ''
  if (!form.title.trim()) { error.value = 'Give your note a title.'; titleEl.value?.focus(); return }
  saving.value = true
  try {
    await props.onSave({
      title: form.title.trim(),
      content: isEmptyHtml(form.content) ? '' : form.content,
      tags: joinTags(form.tags),
      status: form.status,
    })
    emit('close')
  } catch (err) {
    error.value = errorMessage(err, 'Could not save.')
  } finally {
    saving.value = false
  }
}

async function requestClose() {
  if (saving.value) return
  if (isDirty.value) {
    const ok = await confirmDialog({ title: 'Discard changes?', message: 'Your edits to this note haven’t been saved.', confirmText: 'Discard', danger: true })
    if (!ok) return
  }
  emit('close')
}

function onKey(e) {
  if (confirmState.open) return
  if (e.key === 'Escape') {
    if (statusOpen.value || colorFor.value) { statusOpen.value = false; colorFor.value = null; return }
    requestClose()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault(); save()
  }
}
function onDocClick(e) {
  if (statusWrap.value && !statusWrap.value.contains(e.target)) statusOpen.value = false
  if (colorFor.value && !e.target.closest('.ne-tag')) colorFor.value = null
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('mousedown', onDocClick)
  await nextTick()
  autoGrow()
  if (props.note) editorRef.value?.focus()
  else titleEl.value?.focus()
  // Let TipTap normalise the initial HTML before comparing for unsaved changes
  setTimeout(() => { if (!baselineSet) { baselineContent = form.content; baselineSet = true } }, 0)
})
onUnmounted(() => {
  if (confirmState.open) settleConfirm(false)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('mousedown', onDocClick)
})
</script>

<style scoped>
.ne-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: var(--overlay);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 6vh 16px 16px;
}
.ne {
  width: 100%; max-width: 820px; max-height: 88vh;
  display: flex; flex-direction: column;
  background: var(--bg-elev); border-radius: 14px; box-shadow: var(--shadow);
  overflow: hidden;
}
.ne-top {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px 10px 16px; border-bottom: 1px solid var(--border);
}
.ne-status { position: relative; }
.ne-status-btn { gap: 7px; }
.ne-meta { color: var(--text-3); font-size: 12px; }
.ne-top-right { margin-left: auto; display: flex; gap: 2px; }

.ne-body { flex: 1; overflow-y: auto; padding: 22px 32px 12px; }
.ne-title {
  width: 100%; resize: none; overflow: hidden;
  border: 0; outline: 0; background: transparent; padding: 0;
  font-size: 26px; font-weight: 650; letter-spacing: -0.015em; line-height: 1.3; color: var(--text);
}
.ne-title::placeholder { color: var(--text-3); }

.ne-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 10px 0 16px; }
.ne-tag { position: relative; height: 24px; padding: 0 4px 0 8px; font-size: 12px; }
.ne-dot { border: 0; padding: 0; cursor: pointer; }
.ne-tag-x { border: 0; background: none; color: var(--text-3); font-size: 15px; line-height: 1; padding: 0 3px; }
.ne-tag-x:hover { color: var(--text); }
.ne-tag-input {
  border: 0; outline: 0; background: transparent; height: 24px; min-width: 90px; flex: 0 1 140px;
  font-size: 12.5px; color: var(--text-2);
}
.ne-tag-input::placeholder { color: var(--text-3); }

.menu {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 10;
  min-width: 170px; padding: 4px;
  background: var(--bg-elev); border-radius: 9px; box-shadow: var(--shadow);
}
.menu-item {
  width: 100%; display: flex; align-items: center; gap: 8px;
  height: 32px; padding: 0 10px; border: 0; border-radius: 6px; background: none;
  font-size: 13px; color: var(--text); text-align: left;
}
.menu-item:hover, .menu-item.on { background: var(--bg-hover); }
.palette { display: grid; grid-template-columns: repeat(5, 22px); gap: 6px; padding: 8px; min-width: 0; }
.swatch { width: 22px; height: 22px; border-radius: 6px; border: 2px solid transparent; padding: 0; }
.swatch.on { border-color: var(--text); }

.ne-foot {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-top: 1px solid var(--border); background: var(--bg-elev-2);
}
.ne-hint { margin-right: auto; color: var(--text-3); font-size: 12px; display: flex; align-items: center; gap: 3px; }
.ne-error { margin-right: auto; color: var(--danger); font-size: 13px; }

@media (max-width: 640px) {
  .ne-overlay { padding: 0; }
  .ne { max-width: none; max-height: none; height: 100%; border-radius: 0; }
  .ne-body { padding: 16px 16px 12px; }
  .ne-title { font-size: 22px; }
  .ne-hint { display: none; }
  .ne-foot .btn-ghost { margin-left: auto; }
}
</style>
