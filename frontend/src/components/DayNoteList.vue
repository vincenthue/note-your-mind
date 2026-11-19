<template>
  <div class="dl">
    <article v-for="n in notes" :key="n.id" class="dl-card" tabindex="0" role="button"
      @click="$emit('open', n)" @keydown.enter="$emit('open', n)">
      <div class="dl-head">
        <span class="dl-title">{{ n.title }}</span>
        <span class="dl-date">{{ formatDay(n.day) }} · {{ n.data.start }} – {{ n.data.end }}</span>
      </div>
      <div v-if="preview(n).length" class="dl-rows">
        <div v-for="e in preview(n)" :key="e.id" class="dl-row">
          <span class="dl-time">{{ e.time }}</span>
          <span class="dl-pill"><span class="dl-ring" aria-hidden="true"></span><span class="dl-pill-text">{{ e.text }}</span></span>
        </div>
      </div>
      <p v-else class="dl-empty">No entries yet</p>
      <div class="dl-foot">
        <span>{{ count(n) }} entr{{ count(n) === 1 ? 'y' : 'ies' }}</span>
        <span>{{ relativeDate(n.updated_at) }}</span>
      </div>
    </article>
    <button class="dl-new" @click="$emit('create')">
      <span class="dl-plus">+</span>New note
    </button>
  </div>
</template>

<script setup>
import { allEntries, formatDay } from '../daynote'
import { relativeDate } from '../utils'

defineProps({ notes: { type: Array, required: true } })
defineEmits(['open', 'create'])

const preview = n => allEntries(n.data).slice(0, 3)
const count = n => allEntries(n.data).length
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
.dl-rows { display: flex; flex-direction: column; gap: 5px; }
.dl-row { display: flex; align-items: center; gap: 10px; font-size: 12px; min-width: 0; }
.dl-time { width: 38px; flex: none; color: var(--text-3); font-variant-numeric: tabular-nums; }
.dl-pill {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 7px; height: 22px; padding: 0 10px 0 6px;
  border-radius: 999px; background: #F5C542; color: #1F1700; font-weight: 500;
}
.dl-ring { flex: none; width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid currentColor; }
.dl-pill-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-empty { margin: 0; color: var(--text-3); font-size: 12.5px; }
.dl-foot { display: flex; justify-content: space-between; margin-top: auto; color: var(--text-3); font-size: 12px; }
.dl-new {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 170px;
  background: transparent; border: 1.5px dashed var(--border-strong); border-radius: 12px;
  color: var(--accent); font-weight: 500; font-size: 13.5px;
}
.dl-new:hover { background: var(--accent-bg); }
.dl-plus { font-size: 26px; line-height: 1; }
</style>
