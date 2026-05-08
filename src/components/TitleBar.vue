<template>
  <div class="title-bar-wrapper">
    <!-- 窗口可拖动区域 -->
    <div class="drag-area">
      <!-- 优化logo区域，增加视觉层次 -->
      <div class="app-logo">
        <span class="logo-icon">🪨</span>
        <span class="logo-text">岩心孔洞分析软件</span>
      </div>
      
      <!-- 自定义菜单 -->
      <el-menu
        mode="horizontal"
        :ellipsis="false"
        background-color="transparent"
        active-text-color="#409eff"
        class="title-menu no-drag"
        @select="handleMenuSelect"
      >
        <el-sub-menu index="file">
          <template #title>文件</template>
          <el-menu-item index="file-open">打开岩心图片</el-menu-item>
          <el-menu-item index="file-save">保存项目</el-menu-item>
          <el-menu-item index="file-quit">退出软件</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="process">
          <template #title>图像处理</template>
          <el-menu-item index="process-level">自动色阶</el-menu-item>
          <el-menu-item index="process-curve">曲线调节</el-menu-item>
          <el-menu-item index="process-gray">灰度化</el-menu-item>
          <el-menu-item index="process-brightContrast">亮度/对比度</el-menu-item>
          <el-menu-item index="process-saturation">饱和度调节</el-menu-item>
          <el-menu-item index="process-filter">滤波平滑</el-menu-item>
          <el-menu-item index="process-sharpen">锐化</el-menu-item>
          <el-menu-item index="process-edgeDetect">边缘检测</el-menu-item>
          <el-menu-item index="process-negativeEffect">底片效果</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="analysis">
          <template #title>图像分析</template>
          <el-menu-item index="analysis-hole">孔洞分析</el-menu-item>
          <el-menu-item index="analysis-crack">裂缝分析</el-menu-item>
          <el-menu-item index="analysis-size">粒度分析</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="report">
          <template #title>报告</template>
          <el-menu-item index="report-preview">预览分析报告</el-menu-item>
          <el-menu-item index="report-export-pdf">导出PDF报告</el-menu-item>
          <el-menu-item index="report-export-excel">导出Excel数据</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="view">
            <template #title>视图</template>
            <el-menu-item index="reload">刷新</el-menu-item>
            <el-menu-item index="devtools">打开开发者工具</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </div>
    <!-- 窗口控制按钮 -->
    <div class="window-controls">
      <div class="control-btn min-btn" @click="handleMin">—</div>
      <div class="control-btn max-btn" @click="handleMax">
            <!-- 当 isMaximized 为 true 时，缩小窗口 -->
    <svg v-if="isMaximized" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m14 10 7-7"/>
      <path d="M20 10h-6V4"/>
      <path d="m3 21 7-7"/>
      <path d="M4 14h6v6"/>
    </svg>
           <!-- 当 isMaximized 为 false 时，最大化窗口 -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize2-icon lucide-maximize-2">
      <path d="M15 3h6v6"/>
      <path d="m21 3-7 7"/>
      <path d="m3 21 7-7"/>
      <path d="M9 21H3v-6"/>
    </svg>
  </div>
      <div class="control-btn close-btn" @click="handleClose">🗙</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useImageStore, type PreprocessType } from '@/stores/imageStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useReportExport } from '@/composables/useReportExport'
import { ref } from 'vue' // 只需要导入 ref

const { ipcRenderer } = window.require('electron')
const imageStore = useImageStore()
const analysisStore = useAnalysisStore()
const { handleExportReport } = useReportExport()

// 添加一个简单的状态变量来跟踪最大化状态
const isMaximized = ref(false)

// 窗口控制
const handleMin = () => ipcRenderer.send('window-min')
const handleMax = () => {
  ipcRenderer.send('window-max')
  // 切换最大化状态标志
  isMaximized.value = !isMaximized.value
}
const handleClose = () => ipcRenderer.send('window-close')
const handleReload = () => ipcRenderer.send('window-reload')
const handleOpenDevTools = () => ipcRenderer.send('window-devtools')

// 打开岩心图片
const handleOpenImage = async () => {
  try {
    const result = await ipcRenderer.invoke('open-image-dialog')
    if (result) {
      imageStore.setImage(result.filePath, result.dataUrl)
    }
  } catch (error) {
  }
}

// 图像预处理：不需要弹窗的直接执行
const preprocessActions: Record<string, PreprocessType> = {
  'process-level': 'autoLevels',
  'process-gray': 'grayscale',
  'process-filter': 'filterSmooth',
  'process-sharpen': 'sharpen',
  'process-edgeDetect': 'edgeDetect',
  'process-negativeEffect': 'negativeEffect',
}

// 统一菜单分发
const handleMenuSelect = (index: string) => {
  // 文件
  if (index === 'file-open') handleOpenImage()
  else if (index === 'file-quit') handleClose()
  // 视图
  else if (index === 'reload') handleReload()
  else if (index === 'devtools') handleOpenDevTools()
  // 图像处理：直接执行型
  else if (preprocessActions[index]) {
    imageStore.executeProcess(preprocessActions[index])
  }
  // 图像处理：弹窗型
  else if (index === 'process-curve') imageStore.openGammaDialog()
  else if (index === 'process-brightContrast') imageStore.openBCDialog()
  else if (index === 'process-saturation') imageStore.openSaturationDialog()
  // 图像分析
  else if (index === 'analysis-hole') analysisStore.setMode('hole')
  else if (index === 'analysis-crack') analysisStore.setMode('crack')
  else if (index === 'analysis-size') analysisStore.setMode('size')
  // 报告
  else if (index === 'report-export-excel') handleExportReport('excel')
  else if (index === 'report-export-pdf') handleExportReport('pdf')
  else if (index === 'report-preview') analysisStore.reportPreviewVisible = true
}
</script>

<style scoped>
.title-bar-wrapper {
  width: 100%;
  height: 48px;
  background: linear-gradient(180deg, #233046 0%, #1e293b 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  box-sizing: border-box;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 可拖动区域：关键属性，让窗口可以拖动 */
.drag-area {
  -webkit-app-region: drag;
  height: 100%;
  display: flex;
  align-items: center;
  flex: 1;
}

.app-logo {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-right: 28px;
  display: flex;
  align-items: center;
  gap: 8px; /* 图标和文字间距 */
}

.logo-icon {
  font-size: 18px;
  /* 轻微旋转增加动感 */
  transform: rotate(2deg);
}

.logo-text {
  /* 文字轻微描边，提升辨识度 */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* 核心修复：解除菜单的拖拽事件拦截 */
.no-drag {
  -webkit-app-region: no-drag !important;
}

/* 菜单样式自定义 */
.title-menu {
  height: 100%;
  border: none;
  --el-menu-horizontal-item-height: 48px;
  --el-menu-item-font-size: 15px;
  --el-menu-item-padding: 0 18px; /* 优化菜单内边距 */
}

/* 顶部父菜单样式优化 */
.title-menu :deep(.el-sub-menu__title) {
  color: #fff !important;
  height: 48px;
  line-height: 48px;
  /* 增加圆角，hover更柔和 */
  border-radius: 4px;
  margin: 0 4px;
  /* 过渡动画 */
  transition: all 0.2s ease;
}

/* 父菜单hover效果 */
.title-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 二级下拉菜单样式优化 */
:deep(.el-dropdown-menu__item) {
  color: #333 !important;
  font-size: 14px;
  line-height: 36px;
  border-radius: 4px; /* 下拉菜单项圆角 */
  margin: 2px 4px; /* 菜单项间距 */
}

/* 二级菜单hover样式优化 */
:deep(.el-dropdown-menu__item:hover) {
  color: #409eff !important;
  background-color: #f0f7ff !important; /* 更柔和的hover背景 */
}

/* 控制按钮容器 */
.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  height: 100%;
  /* 增加内边距，让按钮区域更协调 */
  padding: 0 4px;
}

.control-btn {
  width: 44px; /* 微调按钮宽度，更紧凑 */
  height: 80%; /* 按钮高度小于容器，更精致 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px; /* 微调按钮字体大小 */
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px; /* 按钮圆角 */
  margin: 0 2px; /* 按钮间距 */
}

/* 按钮hover效果分层 */
.min-btn:hover, .max-btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.close-btn:hover {
  background-color: #ef4444;
  /* 轻微放大，强化交互反馈 */
  transform: scale(1.05);
}
</style>