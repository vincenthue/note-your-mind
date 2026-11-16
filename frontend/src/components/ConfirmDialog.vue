<template>
  <Transition name="fade">
    <div v-if="confirmState.open" class="cd-overlay" @mousedown.self="settleConfirm(false)">
      <div class="cd" role="alertdialog" aria-modal="true" :aria-label="confirmState.title">
        <h3 class="cd-title">{{ confirmState.title }}</h3>
        <p v-if="confirmState.message" class="cd-msg">{{ confirmState.message }}</p>
        <div class="cd-actions">
          <button class="btn btn-ghost" @click="settleConfirm(false)">Cancel</button>
          <button
            ref="okBtn"
            class="btn"
            :class="confirmState.danger ? 'cd-danger' : 'btn-primary'"
            @click="settleConfirm(true)"
          >{{ confirmState.confirmText }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { confirmState, settleConfirm } from '../confirm'

const okBtn = ref(null)
watch(() => confirmState.open, async open => {
  if (open) { await nextTick(); okBtn.value?.focus() }
})

function onKey(e) {
  if (!confirmState.open) return
  if (e.key === 'Escape') { e.stopPropagation(); settleConfirm(false) }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.cd-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: var(--overlay);
  display: grid; place-items: center; padding: 16px;
}
.cd {
  width: 100%; max-width: 380px;
  background: var(--bg-elev); border-radius: 12px; box-shadow: var(--shadow);
  padding: 20px;
}
.cd-title { margin: 0 0 6px; font-size: 15px; font-weight: 600; }
.cd-msg { margin: 0; color: var(--text-2); font-size: 13.5px; }
.cd-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.cd-danger { background: var(--danger); border-color: transparent; color: #fff; }
.cd-danger:hover { filter: brightness(1.08); background: var(--danger) !important; }
</style>
