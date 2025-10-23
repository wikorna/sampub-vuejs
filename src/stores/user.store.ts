// src/stores/user.store.ts
import { defineStore } from 'pinia'

const STORAGE_KEY = 'app.auth.v1' // เปลี่ยนชื่อได้ถ้า version ใหม่

export interface UserState {
  name: string
  token: string
}

function loadInitialState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // กันฟิลด์ขาด / เวอร์ชันไม่ตรง
      return {
        name: typeof parsed.name === 'string' ? parsed.name : 'Guest',
        token: typeof parsed.token === 'string' ? parsed.token : '',
      }
    }
  } catch { /* ignore */ }
  return { name: 'Guest', token: '' }
}

export const useUserStore = defineStore('user', {
  state: (): UserState => loadInitialState(),
  getters: {
    isAuthenticated: (s) => s.token.length > 0,
    displayName: (s) => s.name || 'Guest',
  },
  actions: {
    setToken(t: string) {
      this.token = t
      this._persist()
    },
    setName(n: string) {
      this.name = n
      this._persist()
    },
    logout() {
      this.token = ''
      this.name = 'Guest'
      this._persist()
    },
    // ใช้ตอน migrate schema หรือเคลียร์ทั้งหมด
    reset() {
      this.$reset()
      this._persist()
    },
    _persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: this.name, token: this.token })
        )
      } catch { /* storage เต็ม / ถูกปิดใช้งาน */ }
    },
  },
})
