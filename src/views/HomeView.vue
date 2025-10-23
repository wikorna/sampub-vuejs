<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user.store'
import { getHttp } from '@/shared/auth/http.ts'

// --- Pinia: user ---
const user = useUserStore()
const { name } = storeToRefs(user)

// --- HTTP (ตามของเดิม) ---
const http = getHttp()

// --- Local state ---
interface HelloResponse { message?: string }
const hello = ref<string>('')
const isLoading = ref(false)
const error = ref<string | null>(null)

// --- Mock KPI (เปลี่ยนเป็นข้อมูลจริงภายหลัง) ---
const stats = ref([
  { k: 'todayScans', label: 'Today Scans', value: 0, hint: '+12%' },
  { k: 'inStock', label: 'Items in Stock', value: 0, hint: '-1.3%' },
  { k: 'pending', label: 'Pending Tasks', value: 0, hint: '0' },
  { k: 'lowStock', label: 'Low Stock', value: 0, hint: '+3' },
])

const router = useRouter()

async function loadHello() {
  isLoading.value = true
  error.value = null
  hello.value = ''
  try {
    const res = await http.get<HelloResponse>('/hello')
    hello.value = res.data?.message ?? 'Service is healthy'
    // demo KPI
    stats.value = [
      { k: 'todayScans', label: 'Today Scans', value: 248, hint: '+12%' },
      { k: 'inStock', label: 'Items in Stock', value: 18324, hint: '-1.3%' },
      { k: 'pending', label: 'Pending Tasks', value: 7, hint: '0' },
      { k: 'lowStock', label: 'Low Stock', value: 32, hint: '+3' },
    ]
  } catch (err: unknown) {
    error.value = (err as Error)?.message ?? 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

// --- Quick routes ---
function goScan() { router.push({ name: 'scan' }) }
function goInventory() { router.push({ name: 'inventory' }) }
function goGenerate() { router.push({ name: 'barcode-generate' }) }
function goSettings() { router.push({ name: 'settings' }) }

onMounted(loadHello)
</script>

<template>
  <main class="container py-4 pb-5">
    <!-- Header -->
    <header class="d-flex align-items-start justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">SAM-Dashboard</h1>
        <p class="text-muted mb-0">
          Welcome, <span class="fw-medium">{{ name }}</span>
        </p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-primary btn-sm" @click="goScan">📷 Scan</button>
        <button class="btn btn-outline-secondary btn-sm" @click="goGenerate">🧾 Generate</button>
      </div>
    </header>

    <!-- KPI Stats -->
    <section class="mb-4">
      <div class="row g-3">
        <div v-for="s in stats" :key="s.k" class="col-12 col-sm-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-muted small">{{ s.label }}</div>
              <div class="display-6 text-primary my-1">
                {{ isLoading ? '—' : s.value.toLocaleString() }}
              </div>
              <div class="small text-muted">Trend {{ s.hint }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="mb-4">
      <div class="card shadow-sm">
        <div class="card-body">
          <h3 class="h5 mb-3">Quick Actions</h3>
          <div class="row row-cols-2 row-cols-md-4 g-3">
            <div class="col">
              <button class="btn btn-primary w-100" @click="goScan">
                📷 <span class="ms-2">Scan</span>
              </button>
            </div>
            <div class="col">
              <button class="btn btn-secondary w-100" @click="goGenerate">
                🧾 <span class="ms-2">Generate</span>
              </button>
            </div>
            <div class="col">
              <button class="btn btn-info w-100" @click="goInventory">
                📦 <span class="ms-2">Inventory</span>
              </button>
            </div>
            <div class="col">
              <button class="btn btn-outline-secondary w-100" @click="goSettings">
                ⚙️ <span class="ms-2">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- System Status + Tips -->
    <section class="row g-4">
      <div class="col-12 col-md-6">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h3 class="h5 mb-3">System Status</h3>
            <div v-if="isLoading" class="text-muted small">Checking backend…</div>
            <template v-else>
              <div v-if="error" class="alert alert-danger py-2" role="alert">
                Backend error: {{ error }}
              </div>
              <div v-else class="alert alert-success py-2" role="alert">
                {{ hello || 'Service is healthy' }}
              </div>
            </template>
            <div class="d-flex justify-content-end">
              <button class="btn btn-outline-secondary btn-sm" @click="loadHello">Refresh</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tips -->
      <div class="col-12 col-md-6">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h3 class="h5 mb-3">Tips</h3>
            <ul class="small ps-3 mb-0">
              <li>Use <b>Scan</b> to capture barcodes with camera (ZXing).</li>
              <li><b>Generate</b> to create printable labels (JsBarcode).</li>
              <li><b>Inventory</b> supports offline via IndexedDB (Dexie).</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="mt-4 text-muted small">
      <p class="mb-0">sampub-app · Vue 3 · Vite · Pinia · <span class="fw-semibold">Bootstrap 5</span></p>
    </footer>
  </main>
</template>

<style scoped>
main { padding-bottom: 6rem; }
</style>
