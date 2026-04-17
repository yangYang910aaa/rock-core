// electron/main.ts
import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// 解决ESModule下__dirname兼容问题
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 全局窗口实例，防止GC回收
let mainWindow: BrowserWindow | null = null

// 创建窗口函数，增加try/catch容错
function createWindow() {
  try {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      }
    })

    // 主进程用Node原生方式判断环境，100%兼容
    const isDev = process.env.NODE_ENV === 'development'

    // 加载应用
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173')
      // mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // 空值保护，防止null调用on方法
    mainWindow?.on('closed', () => {
      mainWindow = null
    })

  } catch (error) {
    console.error('窗口创建失败：', error)
    app.quit()
  }
}

// Electron初始化完成后创建窗口
app.whenReady().then(createWindow)

// 适配Windows/macOS窗口关闭逻辑
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})