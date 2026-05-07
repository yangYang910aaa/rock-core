// Hash 模式路由（Electron 下兼容性最好）；当前单页应用，routes 暂为空
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [

  ],
})

export default router
