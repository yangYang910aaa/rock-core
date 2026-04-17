// electron/main.ts
import { app, BrowserWindow, Menu, type MenuItemConstructorOptions} from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// 解决ESModule下__dirname兼容问题
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 全局窗口实例，防止GC回收
let mainWindow: BrowserWindow | null = null

//自定义菜单模版
const template:MenuItemConstructorOptions[]=[
  {
    label:'文件',
    submenu:[
      {label:'打开岩心图片',click:()=>mainWindow?.webContents.send('open-image')},
      {label:'保存项目',click:()=>mainWindow?.webContents.send('save-project')},
      {type:'separator'},
      {label:'退出',role:'quit'}
    ]
  },
  {
    label:'图像处理',
    submenu:[
      {label:'自动色阶',click:()=>mainWindow?.webContents.send('image-auto-level')},
      {label:'灰度化',click:()=>mainWindow?.webContents.send('image-gray')},
      {label:'亮度/对比度调整',click:()=>mainWindow?.webContents.send('image-brightness')},
      {label:'滤波平滑',click:()=>mainWindow?.webContents.send('image-filter')}
    ]
  },
  {
    label:'分析',
    submenu:[
      {label:'孔洞提取',click:()=>mainWindow?.webContents.send('analysis-hole')},
      {label:'裂隙分析',click:()=>mainWindow?.webContents.send('analysis-crack')},
      {label:'参数计算',click:()=>mainWindow?.webContents.send('analysis-calc')}
    ]
  },
  {
    label:'报告',
    submenu:[
      {label:'预览分析报告',click:()=>mainWindow?.webContents.send('report-preview')},
      {label:'导出PDF报告',click:()=>mainWindow?.webContents.send('report-export-pdf')},
      {label:'导出Excel数据',click:()=>mainWindow?.webContents.send('report-export-excel')}
    ]
  },
  {
    label:'视图',
    submenu:[
      {label:'重新加载',role:'reload'},
      {label:'强制重新加载',role:'forceReload'},
      {label:'切换开发者工具',role:'toggleDevTools'},
      {type:'separator'},
      {label:'实际大小',role:'resetZoom'},
      {label:'放大',role:'zoomIn'},
      {label:'缩小',role:'zoomOut'},
      {type:'separator'},
      {label:'全屏切换',role:'togglefullscreen'}
    ]
  }
]
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
    // 设置菜单,使用自定义菜单模版
    const menu=Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
    // 主进程用Node原生方式判断环境，100%兼容
    const isDev = process.env.NODE_ENV === 'development'

    // 加载应用
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173')
      //打开时自动打开开发者工具
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