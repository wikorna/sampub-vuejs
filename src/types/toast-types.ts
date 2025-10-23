// src/types/toast-types.ts
export const ToastType = {
  Success: 'success',
  Error:   'error',
  Info:    'info',
} as const

export type ToastType = typeof ToastType[keyof typeof ToastType]
