/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_PREFIX?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_VERSION?: string
  // เพิ่มคีย์อื่นที่คุณใช้ได้ที่นี่ เช่น:
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

