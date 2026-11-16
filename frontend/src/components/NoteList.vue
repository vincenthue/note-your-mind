<template>
  <div class="list" role="list">
    <div v-for="note in notes" :key="note.id" class="row" role="listitem" tabindex="0"
      @click="!trash && $emit('open', note)" @keydown.enter="!trash && $emit('open', note)">
      <button v-if="!trash" class="row-status" :title="`${statusLabel(note.status)} — click to change`"
        @click.stop="$emit('cycle-status', note)">
        <StatusIcon :status="note.status" />
      </button>
      <div class="row-main">
        <div class="row-title">{{ note.title }}</div>
        <div v-if="excerpt(note)" class="row-excerpt">{{ excerpt(note) }}</div>
      </div>
      <div class="row-tags">
        <span v-for="t in parseTags(note.tags).slice(0, 3)" :key="t" class="tag">
          <span class="tag-dot" :style="{ background: tagColor(t) }"></span>{{ t }}
        </span>
      </div>
      <time class="row-date">{{ trash ? 'Deleted ' + relativeDate(note.deleted_at) : relativeDate(note.updated_at) }}</time>
      <div class="row-actions" @click.stop>
        <template v-if="trash">
          <button class="btn btn-sm" @click="$emit('restore', note)">Restore</button>
          <button class="btn btn-danger btn-sm" @click="$emit('purge', note)">Delete forever</button>
        </template>
        <button v-else class="btn btn-ghost btn-sm btn-icon" title="Move to trash" @click="$emit('delete', note)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.8h4V4M4 4l.7 9.2h6.6L12 4"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatusIcon from './StatusIcon.vue'
import { toPlainText, parseTags, tagColor, relativeDate, statusLabel } from '../utils'

defineProps({
  notes: { type: Array, required: true },
  trash: { type: Boolean, default: false },
})
defineEmits(['open', 'delete', 'restore', 'purge', 'cycle-status'])

const excerpt = note => toPlainText(note.content, 160)
</script>

<style scoped>
.list { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--bg-elev); }
.row {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto auto; align-items: center; gap: 14px;
  min-height: 56px; padding: 8px 12px 8px 14px;
  border-bottom: 1px solid var(--border); cursor: pointer; outline: none;
  transition: background .1s;
}
.row:last-child { border-bottom: 0; }
.row:hover, .row:focus-visible { background: var(--bg-hover); }
.row-status { border: 0; background: none; padding: 4px; margin: -4px; border-radius: 6px; display: grid; }
.row-status:hover { background: var(--bg-elev-2); }
.row-main { min-width: 0; }
.row-title { font-weight: 550; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-excerpt { color: var(--text-3); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.row-tags { display: flex; gap: 4px; }
.row-date { color: var(--text-3); font-size: 12px; white-space: nowrap; min-width: 64px; text-align: right; }
.row-actions { display: flex; gap: 4px; opacity: 0; transition: opacity .1s; }
.row:hover .row-actions, .row:focus-within .row-actions { opacity: 1; }
.list:has(.row-actions .btn-sm:not(.btn-icon)) .row-actions { opacity: 1; }

@media (max-width: 760px) {
  .row { grid-template-columns: auto minmax(0, 1fr) auto; }
  .row-tags { display: none; }
  .row-date { display: none; }
  .row-actions { opacity: 1; grid-column: 3; }
}
</style>
