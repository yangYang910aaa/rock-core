import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component:()=>import('@/components/HelloWorld.vue'),
    },
  
  ],
})

export default router
