<!-- src/components/AppToaster.vue -->
<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { Toast } from 'bootstrap'
import { ToastType, type ToastType as TType } from '@/types/toast-types'
import { beepOk, beepErr,beepBreakingNews } from '@/shared/sounds'

type ToastItem = { id: number; msg: string; type: TType }
const toasts = ref<ToastItem[]>([])
const instances = new Map<number, Toast>()

/** เล่นเสียงแบบปลอดภัย (กัน error จาก autoplay policy) */
function safePlay(a?: HTMLAudioElement | null) {
  try {
    if (!a) return
    a.currentTime = 0
    const p = a.play()
    // บางเบราว์เซอร์คืน promise; เงียบ error ถ้า user gesture ไม่พอ

    p?.catch(() => {})
  } catch {}
}

/** mapping เสียงตามประเภท */
const soundByType: Record<TType, HTMLAudioElement | null> = {
  [ToastType.Success]: beepOk,
  [ToastType.Error]:   beepErr,
  [ToastType.Info]:    beepBreakingNews, // ถ้าไม่อยากมีเสียง info ก็ใส่ null ได้
}

/**
 * แสดง Toast
 * @param msg ข้อความ
 * @param type ประเภท Toast
 * @param ms ระยะเวลาแสดง (ms)
 * @param opts.sound:
 *   - true (default): เล่นเสียงตาม type
 *   - false: ไม่เล่นเสียง
 *   - HTMLAudioElement: กำหนดเสียงเองเป็นรายครั้ง
 */
function showToast(
  msg: string,
  type: TType = ToastType.Success,
  ms = 2500,
  opts?: { sound?: boolean | HTMLAudioElement }
) {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, msg, type })

  // เล่นเสียงทันที (หรือจะย้ายไปหลัง inst.show() ก็ได้)
  const snd = opts?.sound
  if (snd === false) {
    // ไม่เล่นเสียง
  } else if (snd instanceof HTMLAudioElement) {
    safePlay(snd)
  } else {
    safePlay(soundByType[type])
  }

  nextTick(() => {
    const el = document.getElementById(`bs-toast-${id}`)
    if (el) {
      const inst = new Toast(el, { autohide: true, delay: ms })
      instances.set(id, inst)

      el.addEventListener('hidden.bs.toast', () => {
        toasts.value = toasts.value.filter(t => t.id !== id)
        instances.delete(id)
      })

      inst.show()
    }
  })
}

const clsByType: Record<TType, string> = {
  [ToastType.Success]: 'text-bg-success',
  [ToastType.Error]:   'text-bg-danger',
  [ToastType.Info]:    'text-bg-info',
}

onBeforeUnmount(() => {
  instances.forEach(i => i.dispose())
  instances.clear()
})

defineExpose({ showToast, ToastType })
</script>

<template>
  <!-- มุมขวาล่าง -->
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080">
    <div
      v-for="t in toasts"
      :key="t.id"
      :id="`bs-toast-${t.id}`"
      class="toast align-items-center border-0"
      :class="clsByType[t.type]"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">{{ t.msg }}</div>
        <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          data-bs-dismiss="toast"
          aria-label="Close"
        ></button>
      </div>
    </div>
  </div>
</template>
