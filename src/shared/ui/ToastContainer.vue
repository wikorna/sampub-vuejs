<script setup lang="ts">
import { ref } from 'vue'
import { ToastType, type ToastType as TType } from '@/types/toast-types'

// Each toast has an id, message, and type
type Toast = { id: number; msg: string; type: TType }
const toasts = ref<Toast[]>([])

/**
 * Public method exposed to other modules (via useToast composable)
 * - msg: text to show
 * - type: one of ToastType.Success | ToastType.Error | ToastType.Info
 * - ms: duration before auto-dismiss
 */
function showToast(msg: string, type: TType = ToastType.Success, ms = 3000) {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, msg, type })

  // auto-remove
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, ms)
}

/**
 * DaisyUI class mapping per type
 * You can tweak theme colors or add icons here easily.
 */
const clsByType: Record<TType, string> = {
  [ToastType.Success]: 'alert-success',
  [ToastType.Error]: 'alert-error',
  [ToastType.Info]: 'alert-info',
}

// Optional: icons per type for nicer look
const iconByType: Record<TType, string> = {
  [ToastType.Success]: '✅',
  [ToastType.Error]: '❌',
  [ToastType.Info]: 'ℹ️',
}

// expose so `useToast()` can call showToast()
defineExpose({ showToast, ToastType })
</script>

<template>
  <!-- Positioned top-right, stack vertically -->
  <div class="toast toast-top toast-end z-[9999] pointer-events-none space-y-2 p-2">
    <TransitionGroup name="fade" tag="div">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="alert shadow-lg flex items-center gap-3 text-sm pointer-events-auto animate-fadeIn"
        :class="clsByType[t.type]"
      >
        <span class="text-lg">{{ iconByType[t.type] }}</span>
        <span class="flex-1 break-words">{{ t.msg }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeIn {
  animation: fadeIn 0.25s ease-out;
}
</style>
