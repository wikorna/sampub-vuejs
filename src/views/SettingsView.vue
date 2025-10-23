<!-- src/views/SettingsView.vue -->
<script setup lang="ts"></script>

<template>
  <main class="container py-4" style="max-width: 800px;">
    <!-- Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h5 card-title mb-3">Welcome to sampub-app</h2>
        <p class="text-muted mb-4">
          This system now uses <b>Bootstrap 5</b> for a clean and enterprise-grade look.
        </p>

        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-secondary">Secondary</button>
        </div>
      </div>
    </div>

    <!-- Alert -->
    <div class="alert alert-info d-flex align-items-center" role="alert">
      <i class="bi bi-info-circle-fill me-2"></i>
      <span>
        ดูสิ! โทนสี <b>Bootstrap</b> ให้ลุคสะอาดเรียบหรูเหมาะกับระบบองค์กร
      </span>
    </div>
  </main>
</template>

<style scoped></style>
