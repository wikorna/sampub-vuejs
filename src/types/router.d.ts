// src/types/router.d.ts
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** เข้าถึงได้โดยไม่ต้องล็อกอิน */
    public?: boolean
    /** ต้องล็อกอินก่อนถึงเข้าได้ */
    requiresAuth?: boolean
    /** (ตัวเลือก) ใช้ถ้าต้องการจำกัด role */
    roles?: string[]
    /** (ตัวเลือก) title แสดงในแท็บ/ breadcrumb */
    title?: string
  }
}
