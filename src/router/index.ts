// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user.store'

const routes: RouteRecordRaw[] = [
  // ✅ Public routes
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue'), meta: { public: true } },

  // ✅ Protected routes (ต้องล็อกอิน)
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/activity', name: 'activity', component: () => import('@/views/ActivityView.vue'), meta: { requiresAuth: true } },
  { path: '/report', name: 'report', component: () => import('@/views/ReportView.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ✅ Global beforeEach: บังคับให้ login ก่อนเข้าหน้า protected
router.beforeEach((to) => {
  const user = useUserStore()
  if (to.meta.public) return true
  if (to.meta.requiresAuth && !user.token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
