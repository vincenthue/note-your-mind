import { reactive } from 'vue'

export const confirmState = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  danger: false,
  resolve: null,
})

export function confirmDialog({ title, message = '', confirmText = 'Confirm', danger = false }) {
  if (confirmState.resolve) confirmState.resolve(false)
  return new Promise(resolve => {
    Object.assign(confirmState, { open: true, title, message, confirmText, danger, resolve })
  })
}

export function settleConfirm(value) {
  const r = confirmState.resolve
  confirmState.open = false
  confirmState.resolve = null
  r?.(value)
}
