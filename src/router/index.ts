import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dateien',
  },
  {
    path: '/dateien',
    name: 'file-manager',
    component: () => import('@/views/FileManagerPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dateien',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;

