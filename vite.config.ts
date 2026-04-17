import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import electron from 'vite-plugin-electron'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    electron({
        //指定主进程入口文件
        entry:'electron/main.ts',
        //主进程打包配置
        vite:{
          build:{
            outDir:'dist/electron',//主进程代码打包到dist/electron目录
          },
        },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  //适配electron应用的相对路径
  base: process.env.NODE_ENV === 'development' ? '/' : './',
   build: {
    rollupOptions: {
      // 把Electron和Node内置模块标记为外部模块，不参与前端打包
      external: ['electron', 'path', 'fs', 'os'],
    },
  },
  optimizeDeps: {
    // 不预构建electron模块，避免Vite处理异常
    exclude: ['electron'],
  },
})
