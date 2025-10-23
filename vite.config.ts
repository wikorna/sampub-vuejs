import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'

const analyze = (() => {
  const v = process.env.ANALYZE
  return v === '1' || v === 'true'
})()

const isPlugin = (p: unknown): p is PluginOption => Boolean(p)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    vue(),
    vueJsx(),
    mode === 'development' ? vueDevTools() : undefined,
    analyze ? visualizer({ filename: 'stats.html', template: 'treemap', gzipSize: true }) : undefined,
  ].filter(isPlugin)

  return {
    plugins,
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    define: {
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 600,
      modulePreload: { polyfill: false },
      rollupOptions: {
        // ✅ ใช้รูปแบบ object และกำหนด preset ให้ชัด
        treeshake:
          mode === 'production'
            ? {
              preset: 'smallest',
              moduleSideEffects: false,
              propertyReadSideEffects: false,
              tryCatchDeoptimization: false,
            }
            : false, // ปิด treeshake เวลา dev ให้บิลด์เร็วขึ้น
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-axios': ['axios'],
            'vendor-bootstrap': ['bootstrap'],
          },
        },
      },
    },
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
    preview: { port: 5173 },
  }
})
