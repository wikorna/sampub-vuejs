// src/config/app.config.ts
import { z } from 'zod'

export type AppConfig = {
  apiBaseUrl: string
  apiVersion?: string
  refreshEndpoint?: string
}

// zod schema เพื่อ validate / แปลง type จากไฟล์ JSON หรือ window/meta
const AppConfigPartialSchema = z.object({
  apiBaseUrl: z.string().min(1).optional(),
  apiVersion: z.string().optional(),
  refreshEndpoint: z.string().optional(),
})

function fromEnv(): Partial<AppConfig> {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    apiVersion: import.meta.env.VITE_API_VERSION,
    // refreshEndpoint: import.meta.env.VITE_API_REFRESH, // ถ้ามี
  }
}

function fromMeta(): Partial<AppConfig> {
  const get = (n: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${n}"]`)?.content
  return AppConfigPartialSchema.parse({
    apiBaseUrl: get('app:apiBaseUrl') ?? undefined,
    apiVersion: get('app:apiVersion') ?? undefined,
    refreshEndpoint: get('app:refreshEndpoint') ?? undefined,
  })
}

function fromWindow(): Partial<AppConfig> {
  const w = window as unknown as { __APP_CONFIG__?: unknown }
  const parsed = AppConfigPartialSchema.safeParse(w.__APP_CONFIG__)
  return parsed.success ? parsed.data : {}
}

// รองรับทั้ง /app-config.json และ /app.config.json
async function fromRuntimeJson(): Promise<Partial<AppConfig>> {
  const candidates = ['/app-config.json', '/app.config.json']
  for (const path of candidates) {
    try {
      const res = await fetch(path, { cache: 'no-cache' })
      if (!res.ok) continue
      const raw = await res.json()
      const parsed = AppConfigPartialSchema.safeParse(raw)
      if (parsed.success) return parsed.data
    } catch {
      // ลองตัวถัดไป
    }
  }
  return {}
}

export async function loadAppConfig(): Promise<AppConfig> {
  const json = await fromRuntimeJson()
  const win = fromWindow()
  const meta = fromMeta()
  const env = fromEnv()

  const cfg: AppConfig = {
    apiBaseUrl:
      win.apiBaseUrl ??
      meta.apiBaseUrl ??
      json.apiBaseUrl ??      // ✅ json ถูก type เป็น Partial<AppConfig> แล้ว
      env.apiBaseUrl ??
      '',

    apiVersion:
      win.apiVersion ??
      meta.apiVersion ??
      json.apiVersion ??
      env.apiVersion ??
      undefined,

    refreshEndpoint:
      win.refreshEndpoint ??
      meta.refreshEndpoint ??
      json.refreshEndpoint ??
      env.refreshEndpoint ??
      undefined,
  }

  if (!cfg.apiBaseUrl) {
    console.warn(
      '[Config] apiBaseUrl is empty. Set via /public/app-config.json (or app.config.json) or <meta> or .env'
    )
  }

  return cfg
}
