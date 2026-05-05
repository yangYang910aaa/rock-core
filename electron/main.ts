import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

// 解决ESModule下__dirname兼容问题
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 全局窗口实例，防止GC回收
let mainWindow: BrowserWindow | null = null

// 创建窗口函数
function createWindow() {
  try {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      frame: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      }
    })

    // 窗口控制事件
    ipcMain.on('window-min', () => mainWindow?.minimize())
    ipcMain.on('window-max', () => {
      if (!mainWindow) return
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
    })
    ipcMain.on('window-close', () => mainWindow?.close())
    ipcMain.on('window-reload', () => mainWindow?.webContents.reload())
    ipcMain.on('window-devtools', () => mainWindow?.webContents.toggleDevTools())

    // 打开岩心图片事件
    ipcMain.handle('open-image-dialog', async () => {
      if (!mainWindow) return null
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: '请选择岩心图片',
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })
      if (canceled || filePaths.length === 0) return null

      const filePath = filePaths[0]
      try {
        const fileBuffer = fs.readFileSync(filePath)
        const base64Data = fileBuffer.toString('base64')
        let ext = path.extname(filePath).slice(1).toLowerCase()
        if (ext === 'tif') ext = 'tiff'
        if (ext === 'jpg') ext = 'jpeg'
        const dataUrl = `data:image/${ext};base64,${base64Data}`
        return { filePath, dataUrl }
      } catch (error) {
        return null
      }
    })

    /**
     * 生成PDF报告事件
     */
    ipcMain.handle('generate-pdf', async (event, htmlContent: string) => {
      if (!mainWindow) return null
      let pdfWindow: BrowserWindow | null = null
      try {
        
        // 1. 创建隐藏的临时窗口
        pdfWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
          }
        })

        // 2. 生成data URL
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`

        // 3. 直接await加载完成，data URL无外部依赖，加载完就可以直接生成PDF
        await pdfWindow.loadURL(dataUrl)

        // 4. 生成PDF（边距单位：英寸，20mm≈0.8英寸）
        const pdfBuffer = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: {
            top: 0.8,
            bottom: 0.8,
            left: 0.8,
            right: 0.8
          }
        })

        // 5. 转Base64返回
        const base64 = pdfBuffer.toString('base64')
        return base64

      } catch (error) {
        return null
      } finally {
        // 【关键】无论成功失败，必须关闭临时窗口
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.close()
        }
      }
    })
    // 加载应用
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173')
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow?.on('closed', () => {
      mainWindow = null
    })

  } catch (error) {
    console.error('窗口创建失败：', error)
    app.quit()
  }
}

// Electron生命周期
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})  