<!-- src/views/AboutView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppToaster from '@/components/AppToaster.vue'
import { ToastType } from '@/types/toast-types'
import { beepOk, beepErr } from '@/shared/sounds'

const toasterRef = ref<InstanceType<typeof AppToaster> | null>(null)

function ok() {
  beepOk.play()
  toasterRef.value?.showToast('สแกนสำเร็จ', ToastType.Success)
}
function err() {
  beepErr.play()
  toasterRef.value?.showToast('ไม่พบบาร์โค้ด', ToastType.Error)
}
onMounted(() => {
  toasterRef.value?.showToast('พร้อมสแกนแล้ว', ToastType.Info)
})
</script>

<template>
  <!-- Host สำหรับ Bootstrap Toast -->
  <AppToaster ref="toasterRef" />

  <!-- Layout แบบ Bootstrap -->
  <div class="container py-4">
    <div class="d-flex gap-2">
      <button class="btn btn-success" @click="ok">OK</button>
      <button class="btn btn-danger" @click="err">Error</button>
    </div>
  </div>
</template>
