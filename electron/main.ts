// electron/main.ts
import { app, BrowserWindow,dialog,ipcMain} from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'//路径模块
import fs from 'node:fs' //读文件
import { P } from 'vue-router/dist/index-BzEKChPW.js'

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
      frame: false, // 隐藏窗口边框
      autoHideMenuBar: true,//自动隐藏菜单栏
      webPreferences: {
        nodeIntegration: true,//允许渲染进程使用Node.js
        contextIsolation: false,//允许window.require调用
        webSecurity: false
      }
    })
       // 监听渲染进程发来的窗口控制事件
    ipcMain.on('window-min',()=>mainWindow?.minimize()) //最小化窗口
    ipcMain.on('window-max',()=>{
      if(!mainWindow) return
      mainWindow.isMaximized()?mainWindow?.unmaximize():mainWindow?.maximize()
    }) //最大化窗口
    ipcMain.on('window-close',()=>mainWindow?.close()) //关闭窗口
    ipcMain.on('window-devtools',()=>mainWindow?.webContents.toggleDevTools()) //打开/关闭开发者工具
    
    //监听打开岩心图片事件
    ipcMain.handle('open-image-dialog',async()=>{
      if(!mainWindow) return null
      //调用系统文件选择对话框
      const {canceled,filePaths}=await dialog.showOpenDialog(mainWindow,{
        title:'请选择岩心图片',
        filters:[
          {name:'图片文件',extensions:['jpg','jpeg','png','bmp','tiff','tif']},
          {name:'所有文件',extensions:['*']}
        ],
        properties:['openFile']
      })
      //如果用户取消选择或未选择任何文件，返回null
      if(canceled ||filePaths.length===0){
        return null
      }
      //读取选中的文件,转换为Base64 DataURl
      const filePath=filePaths[0]
      try {
        const fileBuffer=fs.readFileSync(filePath) //读取文件内容
        const base64Data=fileBuffer.toString('base64') //将文件内容转换为Base64编码
        let ext=path.extname(filePath).slice(1).toLowerCase() //获取文件扩展名,并去掉点号
         // 【修复】处理tiff格式的MIME类型
         if (ext === 'tif') ext = 'tiff'
        // 【修复】处理jpeg格式
         if (ext === 'jpg') ext = 'jpeg'
        const dataUrl=`data:image/${ext};base64,${base64Data}` //构建DataURL
        console.log('图片读取成功，生成DataURL：', dataUrl.slice(0, 50) + '...')
        //返回文件路径和DataURL给渲染进程
        return {
          filePath,
          dataUrl
        }
      } catch (error) {
        console.error('读取文件失败：', error)
        return null
      }
    })
    
    // 主进程用Node原生方式判断环境
    const isDev = process.env.NODE_ENV === 'development'
    // 加载应用
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173')
      //打开时自动打开开发者工具
      mainWindow.webContents.openDevTools()
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