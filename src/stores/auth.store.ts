// src/stores/auth.store.ts

/**
 * Key prefix เพื่อแยก namespace ของแต่ละ environment (เช่น dev/stg/prod)
 * ป้องกันโทเคนชนกันตอน switch API base
 */
const PREFIX = import.meta.env.VITE_APP_PREFIX ?? 'app'

const K = {
  access: `${PREFIX}.access_token`,
  refresh: `${PREFIX}.refresh_token`,
  exp: `${PREFIX}.token_exp`,
}

/**
 * tokenStore:
 * จัดเก็บ JWT / RefreshToken / Expiration ใน localStorage
 * รองรับ safe remove และป้องกัน 'undefined' string
 */
export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(K.access)
  },

  set(access?: string | null): void {
    if (typeof access === 'string' && access && access !== 'undefined') {
      localStorage.setItem(K.access, access)
    } else {
      localStorage.removeItem(K.access)
    }
  },

  clear(): void {
    for (const key of Object.values(K)) {
      localStorage.removeItem(key)
    }
  },

  getRefresh(): string | null {
    return localStorage.getItem(K.refresh)
  },

  setRefresh(refresh?: string | null): void {
    if (typeof refresh === 'string' && refresh && refresh !== 'undefined') {
      localStorage.setItem(K.refresh, refresh)
    } else {
      localStorage.removeItem(K.refresh)
    }
  },

  getExp(): number | null {
    const v = localStorage.getItem(K.exp)
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  },

  setExp(epochMs?: number | null): void {
    if (typeof epochMs === 'number' && Number.isFinite(epochMs)) {
      localStorage.setItem(K.exp, String(epochMs))
    } else {
      localStorage.removeItem(K.exp)
    }
  },
  /** ✅ ล้างค่า expiration อย่างชัดเจน */
  clearExp() {
    localStorage.removeItem(K.exp)
  },
}

/**
 * Utility helper — ใช้ตรวจว่า accessToken หมดอายุหรือยัง
 * (บวก margin 30 วินาทีเผื่อเวลา request)
 */
export function isAccessTokenExpired(): boolean {
  const exp = tokenStore.getExp()
  if (!exp) return true
  const now = Date.now()
  return now + 30_000 >= exp
}
