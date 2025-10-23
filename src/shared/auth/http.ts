// src/services/http.ts
import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { Router } from 'vue-router'
import type { AppConfig } from '@/config/app.config'
import { tokenStore } from '@/stores/auth.store'
import { useToast } from '@/shared/ui/useToast'   // ✅ ใช้ DaisyUI toast ของคุณเอง
import { ToastType } from '@/types/toast-types'
// ----------------- module singletons -----------------
let http: AxiosInstance | null = null
let appRouter: Router | null = null
let appConfig: AppConfig | null = null

// ----------------- refresh queue state -----------------
let isRefreshing = false
let waitQueue: Array<(tok: string | null) => void> = []

// ----------------- utils -----------------
function dedupeToastFactory() {
  let last = 0
  const toast = useToast()
  return (msg: string, type: ToastType = ToastType.Error, gapMs = 1500) => {
    const now = Date.now()
    if (now - last >= gapMs) {
      last = now
      toast.showToast(msg, type)
    }
  }
}
const dedupeToast = dedupeToastFactory()

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key]
  return typeof val === 'string' ? val : undefined
}

/** ดึงข้อความ error จาก payload ฝั่งเซิร์ฟเวอร์ (type-safe) */
export function extractServerMessage(err: AxiosError<unknown>): string | undefined {
  const data = err.response?.data

  if (typeof data === 'string') return data
  if (typeof data === 'number' || typeof data === 'boolean') return String(data)

  if (isRecord(data)) {
    const topMsg = pickString(data, 'message') ?? pickString(data, 'title')
    if (topMsg) return topMsg

    const nested = data['error']
    if (isRecord(nested)) {
      const m = pickString(nested, 'message')
      if (m) return m
    }

    const errs = data['errors']
    if (Array.isArray(errs)) {
      const lines = errs.filter((x): x is string => typeof x === 'string')
      if (lines.length) return lines.join('\n')
      return undefined
    }
    if (isRecord(errs)) {
      const parts: string[] = []
      for (const [k, v] of Object.entries(errs)) {
        if (Array.isArray(v)) {
          const vs = v.filter((x): x is string => typeof x === 'string')
          if (vs.length) parts.push(`${k}: ${vs.join(', ')}`)
        } else if (typeof v === 'string') {
          parts.push(`${k}: ${v}`)
        }
      }
      if (parts.length) return parts.join('\n')
    }
  }
  return err.response?.statusText || undefined
}

// ----------------- refresh flow -----------------
/**
 * เรียก refresh token ผ่าน endpoint ที่กำหนดใน cfg.refreshEndpoint
 * - ใช้ axios instance แยก (ไม่มีอินเตอร์เซปเตอร์) เพื่อเลี่ยง loop
 * - รองรับ cookie-based refresh (withCredentials: true)
 * - คืน accessToken ใหม่ หรือ null ถ้าล้มเหลว
 */
async function doRefresh(): Promise<string | null> {
  const refreshEndpoint = appConfig?.refreshEndpoint
  if (!refreshEndpoint) return null

  const rt = tokenStore.getRefresh()
  if (!rt) return null

  // baseURL เดียวกับ instance กลาง (ถ้าตั้งไว้)
  const baseURL = http?.defaults.baseURL ?? appConfig?.apiBaseUrl ?? ''

  try {
    const client = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    })

    // ปรับ key body ให้ตรงกับฝั่ง API ของคุณ
    const { data } = await client.post<{
      accessToken?: string
      refreshToken?: string
      expiration?: string | number
    }>(refreshEndpoint, { refreshToken: rt })

    const newToken = data.accessToken
    if (!newToken) throw new Error('Missing accessToken from refresh')

    // เก็บ refreshToken/expiration ใหม่ (ถ้าส่งมา)
    tokenStore.set(newToken)
    if (typeof data.refreshToken === 'string' && data.refreshToken) {
      tokenStore.setRefresh(data.refreshToken)
    }

    // แปลง expiration → epoch ms
    if (typeof data.expiration === 'number') {
      const ms = data.expiration < 10_000_000_000 ? data.expiration * 1000 : data.expiration
      tokenStore.setExp(Number.isFinite(ms) ? ms : undefined)
    } else if (typeof data.expiration === 'string') {
      const ms = Date.parse(data.expiration)
      tokenStore.setExp(Number.isFinite(ms) ? ms : undefined)
    }

    if (import.meta.env.DEV) console.debug('[http:refresh] success')
    return newToken
  } catch (e) {
    if (import.meta.env.DEV) {
      const ax = e as AxiosError
      console.warn('[http:refresh] failed', ax.response?.status, ax.response?.data)
    }
    tokenStore.clear()
    return null
  }
}

// ----------------- public: setup & accessor -----------------
export function setupHttp(cfg: AppConfig, router: Router): void {
  appConfig = cfg
  appRouter = router

  // สร้าง baseURL จาก config (รองรับ apiVersion)
  const base = cfg.apiBaseUrl?.replace(/\/+$/, '') ?? ''
  const baseURL = cfg.apiVersion ? `${base}/${cfg.apiVersion}` : base

  http = axios.create({
    baseURL,
    timeout: 10000,
    validateStatus: (status) => status >= 200 && status < 300,
    withCredentials: false, // เปิดเป็น true เฉพาะเมื่อทุก call ต้องส่งคุกกี้
    headers: { 'Content-Type': 'application/json' },
  })

  // -------- request: แนบ Authorization ถ้ามี token --------
  http.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
    const tok = tokenStore.get()
    if (tok) {
      cfg.headers = cfg.headers ?? {}
      cfg.headers['Authorization'] = `Bearer ${tok}`
    }
    if (import.meta.env.DEV) {
      console.debug('[http:req]', cfg.method?.toUpperCase(), cfg.url, { hasAuth: !!tok })
    }
    return cfg
  })

  // -------- response: จัดการ error + refresh queue + redirect --------
  http.interceptors.response.use(
    (r) => {
      if (import.meta.env.DEV) {
        console.debug('[http:res]', r.config?.method?.toUpperCase(), r.config?.url, r.status)
      }
      return r
    },
    async (error: AxiosError<unknown>) => {
      // network/CORS
      if (!error.response) {
        dedupeToast('Network error: กรุณาตรวจการเชื่อมต่อหรือเซิร์ฟเวอร์')
        return Promise.reject(error)
      }

      const status = error.response.status
      const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
      const serverMsg = extractServerMessage(error)

      // 5xx
      if (status >= 500) {
        dedupeToast(serverMsg || 'Server error: โปรดลองใหม่อีกครั้ง')
        return Promise.reject(error)
      }

      // 4xx (non-401)
      if (status !== 401) {
        if (status === 403) dedupeToast(serverMsg || 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
        if (status === 400 && serverMsg) dedupeToast(serverMsg)
        return Promise.reject(error)
      }

      // 401 → refresh flow (ถ้ามี config)
      if (!cfg || cfg._retry) {
        return Promise.reject(error)
      }
      cfg._retry = true

      // ไม่มี refreshEndpoint หรือไม่มี refresh token → เด้ง login
      if (!appConfig?.refreshEndpoint || !tokenStore.getRefresh()) {
        dedupeToast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
        tokenStore.clear()
        const redirect = encodeURIComponent(appRouter?.currentRoute.value.fullPath ?? '/')
        appRouter?.replace({ name: 'login', query: { redirect } })
        return Promise.reject(error)
      }

      // มี refresh flow
      if (!isRefreshing) {
        isRefreshing = true
        const newTok = await doRefresh()
        isRefreshing = false

        // ปลุกคิวทั้งหมด
        waitQueue.forEach((fn) => fn(newTok))
        waitQueue = []

        if (!newTok) {
          dedupeToast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
          const redirect = encodeURIComponent(appRouter?.currentRoute.value.fullPath ?? '/')
          appRouter?.replace({ name: 'login', query: { redirect } })
          return Promise.reject(error)
        }

        // แนบ token ใหม่แล้วรีทริก
        cfg.headers = cfg.headers ?? {}
        cfg.headers['Authorization'] = `Bearer ${newTok}`
        return http!.request(cfg)
      }

      // ระหว่างกำลัง refresh → รอคิว
      return new Promise((resolve, reject) => {
        waitQueue.push((tok) => {
          if (!tok) {
            reject(error)
            return
          }
          cfg.headers = cfg.headers ?? {}
          cfg.headers['Authorization'] = `Bearer ${tok}`
          resolve(http!.request(cfg))
        })
      })
    },
  )
}

export function getHttp(): AxiosInstance {
  if (!http) throw new Error('HTTP not initialized. Call setupHttp() first.')
  return http
}
