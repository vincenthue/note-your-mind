<template>
  <div
    class="pill"
    :class="[`pill--${state}`, { 'pill--big': big, 'pill--check': mode === 'check' }]"
    :title="mode === 'table' ? 'Click to copy · double-click to copy and mark done' : 'Click to mark done · hold to copy'"
    @mousedown.stop
    @click="onClick"
    @dblclick="mode === 'table' && $emit('done')"
    @pointerdown="startHold"
    @pointerup="endHold"
    @pointerleave="endHold"
    @pointercancel="endHold"
    @contextmenu="onContext"
  >
    <button class="pill-ring" :aria-label="entry.status === 'done' ? 'Mark as waiting' : 'Mark as done'" @click.stop="$emit('toggle')">
      <span aria-hidden="true">{{ state === 'done' ? '✓' : state === 'overdue' ? '!' : '' }}</span>
    </button>
    <span class="pill-text">
      <template v-for="(p, i) in textParts(entry.text)" :key="i"><b v-if="p.name" class="pill-name">{{ p.text }}</b><template v-else>{{ p.text }}</template></template>
    </span>
    <span v-if="label" class="pill-label">{{ label }}</span>
    <button v-if="mode === 'table'" class="pill-more" aria-label="Entry options" @click.stop="$emit('menu', $event.currentTarget)">⋯</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { textParts } from '../daynote'

const props = defineProps({
  entry: { type: Object, required: true },
  overdue: { type: Boolean, default: false },
  mode: { type: String, default: 'table' }, // 'table': click copies · 'check': click toggles done
  big: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
const emit = defineEmits(['copy', 'done', 'toggle', 'menu'])

const state = computed(() => (props.entry.status === 'done' ? 'done' : props.overdue ? 'overdue' : 'waiting'))

// Press and hold copies the text (handy on a phone)
let timer = null
let held = false
function startHold(e) {
  if (e.button !== 0 || props.mode !== 'check') return
  held = false
  timer = setTimeout(() => { held = true; emit('copy') }, 500)
}
function endHold() { clearTimeout(timer) }
function onContext(e) { if (props.mode === 'check') e.preventDefault() }
function onClick() {
  if (held) { held = false; return }
  emit(props.mode === 'table' ? 'copy' : 'toggle')
}
</script>

<style scoped>
.pill {
  display: flex; align-items: center; gap: 8px; min-height: 26px; padding: 3px 4px 3px 6px;
  border-radius: 13px; font-size: 13px; font-weight: 500; cursor: pointer; user-select: none;
  -webkit-touch-callout: none;
}
.pill--big { min-height: 34px; padding: 4px 10px 4px 8px; font-size: 14px; border-radius: 17px; }
.pill--waiting { background: #F5C542; color: #1F1700; }
.pill--done { background: #2DD4BF; color: #04201C; }
.pill--overdue { background: #F26D6D; color: #2A0606; }
.pill-ring {
  flex: none; width: 16px; height: 16px; padding: 0; border-radius: 50%;
  border: 1.5px solid currentColor; background: transparent; color: inherit;
  display: grid; place-items: center; font-size: 10px; font-weight: 700; line-height: 1;
}
.pill--big .pill-ring { width: 18px; height: 18px; font-size: 11px; }
.pill-ring:hover { background: rgba(0, 0, 0, 0.12); }
.pill-text { flex: 1; min-width: 0; overflow-wrap: anywhere; line-height: 1.35; white-space: pre-line; }
.pill-name { font-weight: 700; padding: 0 5px; margin: 0 1px; border-radius: 999px; background: rgba(0, 0, 0, 0.14); }
.pill-label { flex: none; font-size: 11px; opacity: .7; padding-right: 6px; }
.pill-more {
  flex: none; width: 22px; height: 20px; border: 0; border-radius: 999px; padding: 0;
  background: transparent; color: inherit; font-weight: 700; letter-spacing: 1px; opacity: 0;
}
.pill:hover .pill-more, .pill-more:focus-visible { opacity: .75; }
.pill-more:hover { opacity: 1; background: rgba(0, 0, 0, 0.12); }
@media (hover: none) { .pill-more { opacity: .6; } }
</style>
