<template>
  <div class="dl">
    <article v-for="n in cards" :key="n.id" class="dl-card" tabindex="0" role="button"
      @click="$emit('open', n.note)" @keydown.enter="$emit('open', n.note)">
      <div class="dl-head">
        <span class="dl-title">{{ n.note.title }}</span>
        <span class="dl-date">{{ formatDay(n.note.day) }}<template v-if="n.sessions.length"> · {{ n.sessions[0].time }} – {{ n.sessions[n.sessions.length - 1].time }}</template></span>
      </div>
      <div v-if="n.sessions.length" class="dl-rows">
        <div v-for="s in n.sessions.slice(0, 3)" :key="s.id" class="dl-row">
          <span class="dl-time">{{ s.time }}</span>
          <span class="dl-sess">{{ s.name || 'Untitled session' }}</span>
        </div>
        <span v-if="n.sessions.length > 3" class="dl-more">+ {{ n.sessions.length - 3 }} more</span>
      </div>
      <p v-else class="dl-empty">No sessions yet</p>
      <div v-if="n.total" class="dl-meter" aria-hidden="true"><div :style="{ width: (n.done / n.total) * 100 + '%' }"></div></div>
      <div class="dl-foot">
        <span>{{ n.sessions.length }} session{{ n.sessions.length === 1 ? '' : 's' }}<template v-if="n.total"> · {{ n.done === n.total ? 'all done' : `${n.done} of ${n.total} done` }}</template></span>
        <span>{{ relativeDate(n.note.updated_at) }}</span>
      </div>
    </article>
    <button class="dl-new" @click="$emit('create')">
      <span class="dl-plus">+</span>New note
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { allEntries, sessionsOf, formatDay } from '../daynote'
import { relativeDate } from '../utils'

const props = defineProps({ notes: { type: Array, required: true } })
defineEmits(['open', 'create'])

const cards = computed(() => props.notes.map(note => {
  const entries = allEntries(note.data)
  return { id: note.id, note, sessions: sessionsOf(note.data), total: entries.length, done: entries.filter(e => e.status === 'done').length }
}))
</script>

<style scoped>
.dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; align-content: start; }
.dl-card {
  display: flex; flex-direction: column; gap: 12px; padding: 16px; cursor: pointer;
  background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px;
  transition: border-color .12s;
}
.dl-card:hover, .dl-card:focus-visible { border-color: var(--accent); outline: 0; }
.dl-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dl-title { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-date { color: var(--text-3); font-size: 12.5px; }
.dl-rows { display: flex; flex-direction: column; gap: 6px; }
.dl-row { display: flex; align-items: center; gap: 10px; font-size: 13px; min-width: 0; }
.dl-time { width: 40px; flex: none; color: var(--text-3); font-variant-numeric: tabular-nums; }
.dl-sess { flex: 1; min-width: 0; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-more { color: var(--text-3); font-size: 12px; padding-left: 50px; }
.dl-empty { margin: 0; color: var(--text-3); font-size: 12.5px; }
.dl-meter { height: 6px; border-radius: 999px; background: var(--bg-hover); overflow: hidden; }
.dl-meter div { height: 100%; background: #2DD4BF; }
.dl-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: auto; color: var(--text-3); font-size: 12px; }
.dl-new {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 170px;
  background: transparent; border: 1.5px dashed var(--border-strong); border-radius: 12px;
  color: var(--accent); font-weight: 500; font-size: 13.5px;
}
.dl-new:hover { background: var(--accent-bg); }
.dl-plus { font-size: 26px; line-height: 1; }
</style>
