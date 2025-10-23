// src/services/auth.api.ts
import axios from 'axios'
import { getHttp } from '@/shared/auth/http'
import { useEndpoints } from '@/shared/api/endpoints' // ✅ ใช้ runtime endpoints
import { tokenStore } from '@/stores/auth.store'

/* =========================================================
 * Types
 * =======================================================*/

export type ApiResponse<T> = { data: T }

export type LoginPayload = {
  username: string
  password: string
}

export type LoginResult = {
  accessToken: string
  refreshToken?: string
  /** ISO string หรือ epoch (ms/s) */
  expiration?: string | number
  /** อื่นๆ จากแบ็กเอนด์ */
  [k: string]: unknown
}

export type AuthUser = {
  sub: string
  name?: string
  roles: string[]
}

import { extractServerMessage } from '@/shared/auth/http'

/* =========================================================
 * Internal helpers
 * =======================================================*/

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}
function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

/** รองรับทั้ง envelope และ non-envelope */
function unwrapEnvelope<T>(payload: ApiResponse<T> | T): T {
  return (isRecord(payload) && 'data' in payload ? (payload as ApiResponse<T>).data : payload) as T
}

/** base64url decode (ไม่ verify) เพื่ออ่าน payload ของ JWT */
function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 ? 4 - (normalized.length % 4) : 0
  const padded = normalized + '='.repeat(pad)
  if (typeof atob === 'function') return atob(padded)
  // Node polyfill (เผื่อรันบน SSR/Node)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return Buffer.from(padded, 'base64').toString('binary')
}

function parseJwtPayload(token?: string): Record<string, unknown> | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  if (!parts[1] || parts[1].length === 0) return null // Add this check
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** ดึง exp(ms) จาก JWT ถ้ามี */
function deriveExpMsFromJwt(accessToken?: string): number | undefined {
  const payload = parseJwtPayload(accessToken)
  const exp = payload?.['exp']
  if (typeof exp === 'number') {
    // exp เป็นวินาทีตามมาตรฐาน JWT
    return exp * 1000
  }
  return undefined
}

/** แปลงค่า expiration ที่อาจเป็น ISO หรือ epoch(ms/s) → epoch(ms) */
function toEpochMs(exp?: string | number): number | undefined {
  if (typeof exp === 'number') return exp < 10_000_000_000 ? exp * 1000 : exp
  if (typeof exp === 'string') {
    const parsed = Date.parse(exp)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/** ใช้กับการอ่าน error ของ axios แบบ normalize */
function normalizeAxiosError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const serverMsg = extractServerMessage(err) || err.message
    const status = err.response?.status ? ` (HTTP ${err.response.status})` : ''
    return new Error(`${serverMsg}${status}`)
  }
  if (err instanceof Error) {
    return err
  }
  return new Error('Unknown error')
}

/** รองรับ payload login หลายทรง (flat / envelope / {data:{...}} / {token:{...}}) */
function pickTokenFromLogin(r: unknown): {
  accessToken?: string
  refreshToken?: string
  expiration?: string | number
} {
  if (!isRecord(r)) return {}

  const unwrapped = unwrapEnvelope<unknown>(r as ApiResponse<unknown> | unknown)

  const tryPick = (src: Record<string, unknown>) => {
    // ดึง nested token object แบบ type-safe
    const tokenObj = isRecord(src['token']) ? (src['token'] as Record<string, unknown>) : undefined

    const accessToken =
      pickString(src, 'accessToken') ??
      pickString(src, 'access_token') ??
      (tokenObj ? (pickString(tokenObj, 'accessToken') ?? pickString(tokenObj, 'access_token')) : undefined)

    const refreshToken =
      pickString(src, 'refreshToken') ??
      pickString(src, 'refresh_token') ??
      (tokenObj ? (pickString(tokenObj, 'refreshToken') ?? pickString(tokenObj, 'refresh_token')) : undefined)

    const expiration = (() => {
      const e1 = src['expiration']
      if (typeof e1 === 'string' || typeof e1 === 'number') return e1
      if (tokenObj) {
        const e2 = tokenObj['expiration']
        if (typeof e2 === 'string' || typeof e2 === 'number') return e2
      }
      return undefined
    })()

    return { accessToken, refreshToken, expiration }
  }

  if (isRecord(unwrapped)) {
    const direct = tryPick(unwrapped)
    if (direct.accessToken || direct.refreshToken || direct.expiration) return direct

    // ✅ อ่าน data แบบปลอดภัยด้วย bracket-access + narrowing
    const maybeData = (unwrapped as Record<string, unknown>)['data']
    if (isRecord(maybeData)) {
      const nested = tryPick(maybeData)
      if (nested.accessToken || nested.refreshToken || nested.expiration) return nested
    }
  }

  return {}
}


/* =========================================================
 * Public API
 * =======================================================*/

/**
 * Login
 * - ใช้ instance จาก getHttp() (interceptor ของคุณจะไม่แนบ Bearer กับ /auth/login)
 * - withCredentials: true (รองรับกรณีเซิร์ฟเวอร์ตั้งคุกกี้ร่วม)
 * - รองรับ abort signal และ timeout
 */
export async function login(dto: LoginPayload, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<LoginResult> {
  const http = getHttp()
  const ep = useEndpoints()

  try {
    const res = await http.post<ApiResponse<LoginResult> | LoginResult>(
      ep.auth.login,
      {
        // รองรับ backend ที่ยอมรับ username หรือ email
        username: dto.username,
        email: dto.username,
        password: dto.password,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
        signal: opts?.signal,
        timeout: opts?.timeoutMs ?? 15_000,
      },
    )

    const data = unwrapEnvelope<LoginResult>(res.data)
    const picked = pickTokenFromLogin(data)

    if (!picked.accessToken) throw new Error('Login response missing accessToken')

    // หา expiration:
    // 1) ใช้จาก response ถ้ามี
    // 2) ถ้าไม่มี ลองถอดจาก JWT 'exp'
    const expMs = toEpochMs(picked.expiration) ?? deriveExpMsFromJwt(picked.accessToken)

    persistTokens({
      accessToken: picked.accessToken,
      refreshToken: picked.refreshToken,
      expiration: expMs,
    })

    return {
      accessToken: picked.accessToken,
      refreshToken: picked.refreshToken,
      expiration: expMs,
    }
  } catch (err) {
    throw normalizeAxiosError(err)
  }
}

/**
 * Refresh token
 * - ใช้ axios instance แยก (เลี่ยง request interceptor loop)
 * - ใช้ runtime endpoint ที่แท้จริง
 * - แนบ refreshToken ใน body (ปรับชื่อคีย์ตาม backend ที่คุณใช้)
 */
export async function refreshTokenApi(opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<LoginResult> {
  const refreshToken = tokenStore.getRefresh()
  if (!refreshToken) throw new Error('No refresh token')

  const ep = useEndpoints()

  // baseURL ยึดตาม http หลัก (ซิงก์กับ runtime config เสมอ)
  const baseURL = getHttp().defaults.baseURL ?? '/'

  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: opts?.timeoutMs ?? 15_000,
  })

  try {
    const res = await client.post<ApiResponse<LoginResult> | LoginResult>(
      ep.auth.refresh,
      { refreshToken },
      { signal: opts?.signal },
    )

    const data = unwrapEnvelope<LoginResult>(res.data)
    const picked = pickTokenFromLogin(data)

    const accessToken = picked.accessToken ?? data.accessToken
    if (!accessToken) throw new Error('Refresh response missing accessToken')

    const expMs =
      toEpochMs(picked.expiration ?? data.expiration) ?? deriveExpMsFromJwt(accessToken)

    persistTokens({
      accessToken,
      refreshToken: picked.refreshToken ?? data.refreshToken, // บาง backend อาจออก refresh ใหม่
      expiration: expMs,
    })

    return { accessToken, refreshToken: picked.refreshToken ?? data.refreshToken, expiration: expMs }
  } catch (err) {
    throw normalizeAxiosError(err)
  }
}

/**
 * ดึงโปรไฟล์ผู้ใช้
 * รองรับ payload หลายตระกูล (A/B) และเคส claim ชื่อ role / roles
 */
export async function getProfile(opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<AuthUser> {
  const http = getHttp()
  const ep = useEndpoints()

  try {
    const { data: raw } = await http.get<ApiResponse<unknown> | unknown>(ep.auth.me, {
      signal: opts?.signal,
      timeout: opts?.timeoutMs ?? 15_000,
    })
    const payload = unwrapEnvelope<unknown>(raw)
    if (!isRecord(payload)) throw new Error('Invalid /me response')

    const sub =
      pickString(payload, 'sub') ??
      pickString(payload, 'id') ??
      pickString(payload, 'userId') ??
      pickString(payload, 'userName') ??
      pickString(payload, 'email') ??
      ''

    const name =
      pickString(payload, 'name') ??
      (pickString(payload, 'firstName') || pickString(payload, 'lastName')
        ? `${pickString(payload, 'firstName') ?? ''} ${pickString(payload, 'lastName') ?? ''}`.trim()
        : undefined)

    // roles: รองรับทั้ง roles: string[], roleNames: string[], หรือ role: string|string[]
    const roles = ((): string[] => {
      const r1 = payload['roles']
      const r2 = payload['roleNames']
      const r3 = payload['role']
      if (Array.isArray(r1) && r1.every(x => typeof x === 'string')) return r1
      if (Array.isArray(r2) && r2.every(x => typeof x === 'string')) return r2
      if (typeof r3 === 'string') return [r3]
      if (Array.isArray(r3) && r3.every(x => typeof x === 'string')) return r3
      return []
    })()

    if (!sub) throw new Error('Invalid /me: missing sub/id/userName/email')
    return { sub, name, roles }
  } catch (err) {
    throw normalizeAxiosError(err)
  }
}

/**
 * Logout:
 * - พยายามเรียก endpoint เสมอ แล้วล้าง token ไม่ว่าสำเร็จหรือไม่
 */
export async function logoutApi(opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<void> {
  const http = getHttp()
  const ep = useEndpoints()
  try {
    await http.post(ep.auth.logout, {}, { signal: opts?.signal, timeout: opts?.timeoutMs ?? 10_000 })
  } catch {
    // ignore
  } finally {
    tokenStore.clear()
  }
}

/* =========================================================
 * Token persistence
 * =======================================================*/

function persistTokens(payload: Pick<LoginResult, 'accessToken' | 'refreshToken' | 'expiration'>): void {
  tokenStore.set(payload.accessToken)

  if (payload.refreshToken) {
    tokenStore.setRefresh(payload.refreshToken)
  }

  // ✅ ตั้งค่า expiration เฉพาะเมื่อคำนวณได้เท่านั้น
  const expRaw = payload.expiration
  const expMs = typeof expRaw === 'number' ? expRaw : toEpochMs(expRaw)

  if (typeof expMs === 'number' && Number.isFinite(expMs)) {
    tokenStore.setExp(expMs)
  } else {
    // หมายเหตุ:
    // ถ้าอยาก "ลบ" ค่าหมดอายุเก่า แนะนำเพิ่มเมธอดใน tokenStore เช่น tokenStore.clearExp()
    // เพื่อเลี่ยงการรู้ค่า key ภายในของ tokenStore จากไฟล์นี้
    // (ตอนนี้เลือกไม่ตั้งค่าเพื่อไม่ทับของเดิม)
    tokenStore.clearExp()
  }
}
