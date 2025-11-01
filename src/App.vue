<!-- src/App.vue -->
<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useUserStore } from '@/stores/user.store'
import { storeToRefs } from 'pinia'

const user = useUserStore()
const { token } = storeToRefs(user)

// สำหรับปุ่มลิงก์บนแถบขวาบน (desktop)
// ถ้าชอบสไตล์ nav-link มากกว่า ปรับเป็น 'nav-link' ได้
function linkClass(isActive: boolean) {
  return [
    'btn btn-sm btn-light rounded-3',
    isActive ? 'active' : 'btn-outline-secondary'
  ]
}
</script>

<template>
  <!-- Skip to main content (Bootstrap style) -->
  <a href="#main" class="visually-hidden-focusable skip-link">
    Skip to content
  </a>

  <div class="min-vh-100 d-flex flex-column bg-body text-body">
    <!-- Top App Bar -->
    <header class="navbar navbar-expand-md bg-body border-bottom sticky-top">
      <div class="container" style="max-width: 72rem;">
        <RouterLink to="/" class="navbar-brand fw-semibold">sampub-app</RouterLink>

        <!-- Toggler สำหรับจอเล็ก (ถ้าอยากทำเมนูพับเก็บ) สามารถเติมได้ภายหลัง -->

        <!-- ✅ เมนูหลัก (แสดงเมื่อมี token) -->
        <nav v-if="token" class="d-none d-md-flex align-items-center gap-2 ms-auto me-3">
          <RouterLink to="/" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)" :aria-current="isActive ? 'page' : undefined">Home</a>
          </RouterLink>
          <RouterLink to="/activity" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Activity</a>
          </RouterLink>
          <RouterLink to="/report" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Report</a>
          </RouterLink>
          <RouterLink to="/settings" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Setup</a>
          </RouterLink>
        </nav>

        <!-- Login / Logout -->
        <div class="d-none d-md-flex align-items-center gap-2">
          <RouterLink v-if="!token" to="/login" class="btn btn-primary btn-sm">Login</RouterLink>
          <button v-else class="btn btn-outline-secondary btn-sm" @click="user.logout()">Logout</button>
        </div>
      </div>
    </header>

    <!-- Sub nav (desktop) — แสดงเฉพาะเมื่อ login แล้ว -->
    <div v-if="token" class="d-none d-md-block border-bottom bg-body">
      <div class="container" style="max-width: 72rem;">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <RouterLink to="/activity" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" class="nav-link" :class="{ active: isActive }">Activity-1</a>
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/report" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" class="nav-link" :class="{ active: isActive }">Report</a>
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/settings" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" class="nav-link" :class="{ active: isActive }">Setup</a>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Content -->
    <main id="main" class="flex-grow-1">
      <div class="container py-4" style="max-width: 72rem;">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ให้ลิงก์ Skip มองเห็นเมื่อโฟกัส (แนว Bootstrap) */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: .5rem .75rem;
  background: var(--bs-light);
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color);
  border-radius: .375rem;
  z-index: 1050;
}
.skip-link:focus {
  top: .5rem;
  left: .5rem;
}

/* ระยะห่างด้านล่างสำหรับจอเล็ก (เหมือนเดิม) */
@media (max-width: 767.98px) {
  #main { padding-bottom: 6rem; }
}
</style>
