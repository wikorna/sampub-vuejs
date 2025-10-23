// src/main.ts
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUserStore } from '@/stores/user.store'
import { setupHttp, getHttp } from '@/shared/auth/http'
import { loadAppConfig } from '@/config/app.config'
import { initEndpoints } from '@/shared/api/endpoints' // ⬅️ ไม่ต้องใส่ .ts

async function bootstrap() {
  const app = createApp(App)

  // 1) init plugins
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  // 2) โหลด config runtime แล้วตั้ง http (DI)
  const cfg = await loadAppConfig()
  setupHttp(cfg, router) // ⬅️ เรียกครั้งเดียวพอ
  initEndpoints(cfg)

  // 3) init store + ตั้ง Authorization รอบแรก (กรณีรีเฟรชหน้า)
  const user = useUserStore(pinia)
  {
    const http = getHttp()
    if (user.token) {
      http.defaults.headers.common['Authorization'] = `Bearer ${user.token}`
    } else {
      delete http.defaults.headers.common['Authorization']
    }
  }

  // 4) sync header ทุกครั้งที่ token เปลี่ยน
  user.$subscribe((_mutation, state) => {
    const http = getHttp()
    if (state.token) {
      http.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
      if (import.meta.env.DEV)
        console.debug('[Auth] Token updated:', state.token.substring(0, 12) + '…')
    } else {
      delete http.defaults.headers.common['Authorization']
      if (import.meta.env.DEV) console.debug('[Auth] Token cleared')
    }
  })

  // 5) Global error handler (option)
  app.config.errorHandler = (err, instance, info) => {
    console.error('[GlobalError]', err, info)
  }

  // 6) mount
  app.mount('#app')
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err)
})
