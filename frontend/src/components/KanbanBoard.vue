<template>
  <div class="board">
    <section v-for="col in STATUSES" :key="col.value" class="col">
      <header class="col-head">
        <StatusIcon :status="col.value" />
        <h2 class="col-title">{{ col.label }}</h2>
        <span class="col-count">{{ columns[col.value].length }}</span>
        <button class="btn btn-ghost btn-sm btn-icon col-add" :title="`New note in ${col.label}`" @click="$emit('create', col.value)">
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9"/></svg>
        </button>
      </header>

      <draggable
        v-model="columns[col.value]"
        item-key="id"
        group="board"
        class="col-list"
        ghost-class="card-ghost"
        chosen-class="card-chosen"
        drag-class="card-drag"
        :animation="160"
        :delay="120"
        :delay-on-touch-only="true"
        @change="e => onChange(col.value, e)"
      >
        <template #item="{ element }">
          <NoteCard :note="element" @open="$emit('open', element)" />
        </template>
        <template #footer>
          <div v-if="quickAdd === col.value" class="quick">
            <input
              ref="quickInput"
              v-model="quickTitle"
              class="input quick-input"
              placeholder="Card title, then Enter"
              @keydown.enter.prevent="submitQuick(col.value)"
              @keydown.esc.stop="closeQuick"
              @blur="submitQuick(col.value, true)"
            />
          </div>
          <button v-else class="quick-btn" @click="openQuick(col.value)">
            <svg width="12" height="12" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9"/></svg>
            Add card
          </button>
        </template>
      </draggable>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import NoteCard from './NoteCard.vue'
import StatusIcon from './StatusIcon.vue'
import { STATUSES } from '../utils'

const props = defineProps({ notes: { type: Array, required: true } })
const emit = defineEmits(['open', 'create', 'move', 'quick-add'])

const columns = reactive({ todo: [], doing: [], done: [] })

watch(() => props.notes, notes => {
  for (const s of STATUSES) {
    columns[s.value] = notes
      .filter(n => (n.status || 'todo') === s.value)
      .sort((a, b) => a.position - b.position || b.id - a.id)
  }
}, { immediate: true, deep: true })

function onChange(status, e) {
  const evt = e.added || e.moved
  if (!evt) return
  const list = columns[status]
  const i = evt.newIndex
  const prev = list[i - 1]?.position
  const next = list[i + 1]?.position
  let position
  if (prev !== undefined && next !== undefined) position = (prev + next) / 2
  else if (prev !== undefined) position = prev + 1
  else if (next !== undefined) position = next - 1
  else position = 0
  emit('move', evt.element, status, position)
}

// ── Quick add ──
const quickAdd = ref(null)
const quickTitle = ref('')
const quickInput = ref(null)

async function openQuick(status) {
  quickAdd.value = status
  quickTitle.value = ''
  await nextTick()
  const el = Array.isArray(quickInput.value) ? quickInput.value[0] : quickInput.value
  el?.focus()
}
function closeQuick() { quickAdd.value = null; quickTitle.value = '' }
function submitQuick(status, fromBlur = false) {
  const title = quickTitle.value.trim()
  if (title) emit('quick-add', status, title)
  quickTitle.value = ''
  if (fromBlur || !title) closeQuick()
}
</script>

<style scoped>
.board {
  display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 14px;
  height: 100%; min-height: 0;
  overflow-x: auto; padding: 2px 2px 8px;
}
.col {
  display: flex; flex-direction: column; min-height: 0;
  background: var(--bg-sidebar); border: 1px solid var(--border); border-radius: 12px;
}
.col-head { display: flex; align-items: center; gap: 8px; padding: 10px 8px 6px 14px; }
.col-title { margin: 0; font-size: 13px; font-weight: 600; }
.col-count { color: var(--text-3); font-size: 12px; }
.col-add { margin-left: auto; }
.col-list {
  flex: 1; min-height: 60px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px;
  padding: 4px 10px 10px;
}
.quick-btn {
  display: flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 8px; border: 0; border-radius: 8px;
  background: none; color: var(--text-3); font-size: 12.5px; text-align: left;
}
.quick-btn:hover { background: var(--bg-hover); color: var(--text-2); }
.quick-input { height: 34px; font-size: 13px; }

:deep(.card-ghost) { opacity: .35; border-style: dashed; }
:deep(.card-chosen) { border-color: var(--accent); }
:deep(.card-drag) { transform: rotate(1.5deg); box-shadow: var(--shadow); }

@media (max-width: 900px) {
  .board { grid-template-columns: repeat(3, minmax(78vw, 1fr)); scroll-snap-type: x mandatory; }
  .col { scroll-snap-align: start; }
}
</style>
