<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { login, getProfile, type LoginPayload } from '@/shared/auth/auth.api.ts'
import { useUserStore } from '@/stores/user.store'
import AppToaster from '@/components/AppToaster.vue'
import { ToastType } from '@/types/toast-types'
import { beepOk, beepErr } from '@/shared/sounds'

const router = useRouter()
const route = useRoute()
const user = useUserStore()

// ✅ Toaster host
const toasterRef = ref<InstanceType<typeof AppToaster> | null>(null)

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<{ username?: string; password?: string }>({})

const loginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอก Username'),
  password: z.string().min(1, 'กรุณากรอก Password'),
})

async function doLogin() {
  error.value = null
  fieldErrors.value = {}

  const parsed = loginSchema.safeParse({
    username: username.value,
    password: password.value,
  })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    error.value = first?.message ?? 'กรุณากรอกข้อมูลให้ครบ'
    for (const i of parsed.error.issues) {
      const k = i.path[0]
      if (k === 'username' || k === 'password') fieldErrors.value[k] = i.message
    }
    // ❗ แจ้งเตือน validation
    toasterRef.value?.showToast(error.value!, ToastType.Error)
    return
  }

  if (isLoading.value) return
  isLoading.value = true

  try {
    const payload: LoginPayload = parsed.data
    const result = await login(payload)
    user.setToken(result.accessToken)

    try {
      const me = await getProfile()
      user.setName(me.name ?? username.value.trim())
    } catch {
      user.setName(username.value.trim())
    }
    beepOk.play()
    // ✅ Toast สำเร็จ
    toasterRef.value?.showToast('เข้าสู่ระบบสำเร็จ', ToastType.Success)

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect || '/')
  } catch (e) {
    const msg = e instanceof Error && e.message?.trim() ? e.message : 'เข้าสู่ระบบไม่สำเร็จ'
    error.value = msg
    // ❗ Toast ข้อผิดพลาดจากเซิร์ฟเวอร์
    beepErr.play()
    toasterRef.value?.showToast(msg, ToastType.Error)
    console.error('[LoginView] login error:', e)
  } finally {
    isLoading.value = false
  }
}

// (ทางเลือก) บอกสถานะตอนเข้าหน้านี้
onMounted(() => {
  toasterRef.value?.showToast('โปรดลงชื่อเข้าใช้', ToastType.Info)
})
</script>

<template>
  <!-- ✅ Toaster host -->
  <AppToaster ref="toasterRef" />

  <main class="d-flex justify-content-center align-items-center min-vh-100 bg-light">
    <div class="card shadow-sm" style="max-width: 420px; width: 100%;">
      <div class="card-body p-4 p-md-5">
        <h1 class="h4 text-center mb-2">Sign in</h1>
        <p class="text-muted text-center mb-4">Use your corporate account</p>

        <form @submit.prevent="doLogin" novalidate>
          <!-- Username -->
          <div class="form-floating mb-3">
            <input
              id="username"
              v-model.trim="username"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': !!fieldErrors.username }"
              placeholder="username"
              autocomplete="username"
              inputmode="email"
              :disabled="isLoading"
              aria-describedby="usernameHelp usernameFeedback"
            />
            <label for="username">Username</label>
            <div id="usernameFeedback" class="invalid-feedback">
              {{ fieldErrors.username }}
            </div>
            <div id="usernameHelp" class="form-text">เช่น ชื่อผู้ใช้/อีเมลองค์กรของคุณ</div>
          </div>

          <!-- Password -->
          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <div class="input-group has-validation">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                :class="{ 'is-invalid': !!fieldErrors.password }"
                placeholder="Password"
                autocomplete="current-password"
                :disabled="isLoading"
                @keyup.enter="doLogin"
                aria-describedby="passwordFeedback"
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="isLoading"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
              <div id="passwordFeedback" class="invalid-feedback">
                {{ fieldErrors.password }}
              </div>
            </div>
          </div>

          <!-- Error (server) -->
          <div v-if="error" class="alert alert-danger py-2" role="alert">
            {{ error }}
          </div>

          <!-- Submit -->
          <div class="d-grid mt-3">
            <button type="submit" class="btn btn-primary" :disabled="isLoading">
              <span v-if="!isLoading">Sign in</span>
              <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.min-vh-100 { min-height: 100vh; }
</style>
