<template>
  <article class="card" :class="{ 'card--done': note.status === 'done' }" tabindex="0"
    @click="$emit('open', note)" @keydown.enter="$emit('open', note)">
    <h3 class="card-title">{{ note.title }}</h3>
    <p v-if="excerpt" class="card-excerpt">{{ excerpt }}</p>
    <div v-if="tags.length" class="card-tags">
      <span v-for="t in tags" :key="t" class="tag">
        <span class="tag-dot" :style="{ background: tagColor(t) }"></span>{{ t }}
      </span>
    </div>
    <footer class="card-foot">
      <span v-if="progress" class="card-progress" :class="{ complete: progress.done === progress.total }"
        :title="`${progress.done} of ${progress.total} checklist items done`">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2" y="2" width="12" height="12" rx="3"/><path d="M5.2 8.2l1.9 1.9 3.8-4"/></svg>
        {{ progress.done }}/{{ progress.total }}
      </span>
      <time class="card-date">{{ relativeDate(note.updated_at) }}</time>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { toPlainText, parseTags, tagColor, relativeDate, checklistProgress } from '../utils'

const props = defineProps({ note: { type: Object, required: true } })
defineEmits(['open'])

const excerpt  = computed(() => toPlainText(props.note.content, 140))
const tags     = computed(() => parseTags(props.note.tags))
const progress = computed(() => checklistProgress(props.note.content))
</script>

<style scoped>
.card {
  background: var(--bg-elev); border: 1px solid var(--border); border-radius: 10px;
  padding: 11px 12px 9px; cursor: pointer; box-shadow: var(--shadow-sm);
  transition: border-color .12s, background .12s;
  outline: none;
}
.card:hover { border-color: var(--border-strong); }
.card:focus-visible { border-color: var(--accent); }
.card-title { margin: 0; font-size: 13.5px; font-weight: 550; line-height: 1.4; word-break: break-word; }
.card--done .card-title { color: var(--text-2); }
.card-excerpt {
  margin: 4px 0 0; color: var(--text-3); font-size: 12.5px; line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.card-foot { display: flex; align-items: center; gap: 10px; margin-top: 8px; color: var(--text-3); font-size: 11.5px; }
.card-progress { display: inline-flex; align-items: center; gap: 4px; }
.card-progress.complete { color: var(--st-done); }
.card-date { margin-left: auto; }
</style>
