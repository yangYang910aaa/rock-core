import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

// ESModule 下 __dirname 兼容
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 主窗口实例
let mainWindow: BrowserWindow | null = null
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

    // ---- 窗口控制 IPC ----
    ipcMain.on('window-min', () => mainWindow?.minimize())
    ipcMain.on('window-max', () => {
      if (!mainWindow) return
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
    })
    ipcMain.on('window-close', () => mainWindow?.close())
    ipcMain.on('window-reload', () => mainWindow?.webContents.reload())
    ipcMain.on('window-devtools', () => mainWindow?.webContents.toggleDevTools())

    // ---- 文件对话框：打开岩心图片 ----
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
    ipcMain.handle('generate-pdf', async (_event, htmlContent: string) => {
      if (!mainWindow) return null
      let pdfWindow: BrowserWindow | null = null
      const tmpPath = path.join(os.tmpdir(), `rock-core-report-${Date.now()}.html`)
      try {
        // 1. 写入临时HTML文件，避免数据URL长度限制和编码问题
        fs.writeFileSync(tmpPath, htmlContent, 'utf-8')

        // 2. 创建隐藏的临时窗口
        pdfWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
          }
        })

        // 3. 加载临时文件
        await pdfWindow.loadFile(tmpPath)

        // 4. 生成PDF
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

        return pdfBuffer.toString('base64')

      } catch (error) {
        console.error('PDF生成失败:', error)
        return null
      } finally {
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.close()
        }
        // 清理临时文件
        try { fs.unlinkSync(tmpPath) } catch (_) {}
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