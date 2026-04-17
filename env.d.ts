/// <reference types="vite/client" />
/// <reference types="electron" />

// Vue单文件组件的TS类型支持
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 补充Electron主进程的环境变量类型
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  [key:string]:any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}