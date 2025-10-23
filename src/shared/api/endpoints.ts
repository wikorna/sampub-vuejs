// src/shared/api/endpoints.ts
import type { AppConfig } from '@/config/app.config.ts'
import { getHttp } from '@/shared/auth/http'

/** -------------------------------
 * Utils
 * ------------------------------*/

/** รวม path อย่างปลอดภัย (กัน // ซ้อน, รองรับ base เป็น '/api' หรือ URL เต็ม) */
function joinPath(base: string | undefined | null, path: string): string {
  const prefix = (base ?? '').replace(/\/+$/, '')
  const suffix = path.replace(/^\/+/, '')
  if (!prefix && !suffix) return '/'
  if (!prefix) return `/${suffix}`
  if (!suffix) return prefix
  return `${prefix}/${suffix}`
}

/** แปลง object → query string (ข้าม undefined/null/empty) */
function toQuery(obj?: Record<string, unknown> | URLSearchParams): string {
  if (!obj) return ''
  const params =
    obj instanceof URLSearchParams
      ? obj
      : Object.entries(obj).reduce((p, [k, v]) => {
        if (v === undefined || v === null || v === '') return p
        if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)))
        else p.append(k, String(v))
        return p
      }, new URLSearchParams())
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** ต่อ query string ให้ endpoint ใดๆ ได้ง่าย */
function withQuery(url: string, query?: Record<string, unknown> | URLSearchParams): string {
  if (!query) return url
  const [u, existing] = url.split('?', 2)
  const qs = toQuery(query)
  if (!existing) return `${u}${qs}`
  // ถ้า endpoint มี query เดิมอยู่แล้ว ให้ merge แบบง่ายๆ (ต่อท้าย)
  return `${u}?${existing}&${qs.slice(1)}`
}

/** -------------------------------
 * Generic resource factory (optional)
 * ------------------------------*/

/** สร้าง endpoint แบบ resource ทั่วไป เพื่อลด boilerplate */
function resource(baseUrl: string, resourceName: string) {
  const root = joinPath(baseUrl, `/${resourceName}`)
  return {
    root,                               // e.g. /api/customers
    list: (q?: Record<string, unknown>) => withQuery(root, q),
    create: root,                        // POST
    byId: (id: string | number) => joinPath(root, `/${id}`),
    update: (id: string | number) => joinPath(root, `/${id}`),  // PUT/PATCH
    remove: (id: string | number) => joinPath(root, `/${id}`),  // DELETE
    // ขยายได้ตามต้องการ เช่น /{id}/activate
    sub: (id: string | number, subpath: string) => joinPath(root, `/${id}/${subpath.replace(/^\/+/, '')}`),
  } as const
}

/** -------------------------------
 * Core factory
 * ------------------------------*/

export type Endpoints = ReturnType<typeof createEndpoints>

/**
 * ฟังก์ชัน factory สำหรับสร้าง ENDPOINTS โดยอิงจาก config/runtime
 * - ปลอดภัยเมื่อเปลี่ยน base URL ตอน runtime (SIT → UAT → PROD) โดยไม่ต้อง rebuild
 * - ถ้า config ไม่มีค่า จะ fallback ไปที่ axios.defaults.baseURL
 */
export function createEndpoints(config?: AppConfig) {
  const base =
    config?.apiBaseUrl ??
    getHttp().defaults.baseURL ?? // fallback จาก instance ปัจจุบัน
    '' // สุดท้ายจริงๆ (ควรหลีกเลี่ยงใน prod)

  // หมายเหตุ: ปรับ path ให้ตรงกับฝั่ง API ของคุณ (lower/upper case)
  // ด้านล่างนี้เป็นตัวอย่างที่ "สอดคล้องกันทั้งระบบ" (lower-case + prefix /api)
  const apiBase = joinPath(base, '/api')

  // --- Auth group ---
  const authBase = joinPath(apiBase, '/auth')
  const auth = {
    login:   joinPath(authBase, '/login'),
    me:      joinPath(authBase, '/me'),
    refresh: joinPath(authBase, '/refresh'),
    logout:  joinPath(authBase, '/logout'),
  } as const

  // --- Customers group (ตัวอย่างเฉพาะ) ---
  const customersRes = resource(apiBase, 'customers')
  const customers = {
    search: (q?: { q?: string; page?: number; pageSize?: number; sort?: string }) => customersRes.list(q),
    byId: (id: string | number) => customersRes.byId(id),
  } as const

  // --- ขยาย resource อื่นๆ ได้ง่าย ---
  const users = resource(apiBase, 'users')
  const products = resource(apiBase, 'products')
  const files = {
    upload: joinPath(apiBase, '/files/upload'),
    download: (id: string | number) => joinPath(apiBase, `/files/${id}/download`),
  } as const

  // --- Health / Misc ---
  const health = {
    ping: joinPath(apiBase, '/health/ping'),
    info: joinPath(apiBase, '/health/info'),
  } as const

  return {
    base,       // base URL ที่ใช้อยู่จริง (เพื่อ debug)
    apiBase,    // /api ที่ normalize แล้ว
    auth,
    customers,
    users,
    products,
    files,
    health,
    // expose helpers เผื่อใช้งานเฉพาะจุด
    _util: { joinPath, withQuery, toQuery, resource },
  } as const
}

/** -------------------------------
 * Singleton accessors
 * ------------------------------*/

let _endpoints: Endpoints | null = null

/**
 * เรียกตอน bootstrap แอปหลังจาก loadAppConfig() เสร็จ
 *   ex) const cfg = await loadAppConfig(); initEndpoints(cfg)
 */
export function initEndpoints(config: AppConfig) {
  _endpoints = createEndpoints(config)
  return _endpoints
}

/**
 * ใช้งานใน code ส่วนอื่นๆ (service, component)
 * - ถ้ายังไม่ได้ init และอยู่ dev: จะ fallback อัตโนมัติจาก Vite env / axios.defaults
 * - ถ้า prod ควร ensure ว่ามี init แล้ว (แนะนำ assert)
 */
export function useEndpoints(): Endpoints {
  if (_endpoints) return _endpoints
  // Fallback dev-friendly: ใช้ Vite env ถ้ามี เพื่อไม่ให้ล่มตอนยังไม่ได้ init
  const rawBase = import.meta.env.VITE_API_BASE ?? getHttp().defaults.baseURL ?? ''
  _endpoints = createEndpoints({ apiBaseUrl: rawBase } as AppConfig)
  return _endpoints!
}

/** -------------------------------
 * Static fallback (legacy/dev only)
 * - ควรใช้เฉพาะช่วงพัฒนา หรือก่อนระบบโหลด config เสร็จ
 * ------------------------------*/

const VITE_API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const DEV_API_BASE = joinPath(VITE_API_BASE, '/api')

const joinDev = (p: string) => joinPath(DEV_API_BASE, p)

export const ENDPOINTS = {
  base: VITE_API_BASE,
  apiBase: DEV_API_BASE,
  auth: {
    login:   joinDev('/auth/login'),
    me:      joinDev('/auth/me'),
    refresh: joinDev('/auth/refresh'),
    logout:  joinDev('/auth/logout'),
  },
  customers: {
    search: (q?: { q?: string; page?: number; pageSize?: number; sort?: string }) =>
      withQuery(joinDev('/customers'), q),
    byId: (id: string | number) => joinDev(`/customers/${id}`),
  },
  users: resource(DEV_API_BASE, 'users'),
  products: resource(DEV_API_BASE, 'products'),
  files: {
    upload: joinDev('/files/upload'),
    download: (id: string | number) => joinDev(`/files/${id}/download`),
  },
  health: {
    ping: joinDev('/health/ping'),
    info: joinDev('/health/info'),
  },
  _util: { joinPath, withQuery, toQuery, resource },
} as const
