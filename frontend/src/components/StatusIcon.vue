<template>
  <svg class="status-icon" viewBox="0 0 14 14" :aria-label="status">
    <template v-if="status === 'done'">
      <circle cx="7" cy="7" r="6" fill="var(--st-done)" />
      <path d="M4.3 7.2l1.8 1.8 3.6-3.8" fill="none" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else-if="status === 'doing'">
      <circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--st-doing)" stroke-width="1.5" />
      <path d="M7 3.4 A3.6 3.6 0 0 1 7 10.6 Z" fill="var(--st-doing)" />
    </template>
    <circle v-else cx="7" cy="7" r="5.6" fill="none" stroke="var(--st-todo)" stroke-width="1.5" stroke-dasharray="2.2 1.6" />
  </svg>
</template>

<script setup>
defineProps({ status: { type: String, default: 'todo' } })
</script>
