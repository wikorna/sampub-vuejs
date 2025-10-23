// src/shared/ui/useToast.ts
import { createApp, type ComponentPublicInstance } from 'vue'
import ToastContainer from './ToastContainer.vue'
import { type ToastType } from '@/types/toast-types'

// Define the exposed methods from ToastContainer
interface ToastContainerInstance {
  showToast: (msg: string, type?: ToastType, ms?: number) => void
  ToastType: typeof ToastType
}

let instance: ToastContainerInstance | null = null

export function useToast(): ToastContainerInstance {
  if (!instance) {
    const app = createApp(ToastContainer)
    const div = document.createElement('div')
    document.body.appendChild(div)
    instance = app.mount(div) as ComponentPublicInstance & ToastContainerInstance
  }
  return instance
}
