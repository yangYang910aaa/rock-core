<template>
  <div class="title-bar-wrapper">
    <!-- 窗口可拖动区域 -->
    <div class="drag-area">
      <div class="app-logo">岩心孔洞分析软件</div>
      
      <!-- 自定义菜单：移除全局text-color，改为CSS单独控制父菜单文字颜色 -->
      <el-menu
        mode="horizontal"
        :ellipsis="false"
        background-color="transparent"
        active-text-color="#409eff"
        class="title-menu no-drag"
      >
        <el-sub-menu index="file">
          <template #title>文件</template>
          <el-menu-item index="file-open" @click="handleOpenImage">打开岩心图片</el-menu-item>
          <el-menu-item index="file-save">保存项目</el-menu-item>
          <el-menu-item index="file-quit" @click="handleClose">退出软件</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="process">
          <template #title>图像处理</template>
          <el-menu-item index="process-level">自动色阶</el-menu-item>
          <el-menu-item index="process-gray">灰度化</el-menu-item>
          <el-menu-item index="process-bright">亮度/对比度调整</el-menu-item>
          <el-menu-item index="process-filter">滤波平滑</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="analysis">
          <template #title>分析</template>
          <el-menu-item index="analysis-hole">孔洞提取</el-menu-item>
          <el-menu-item index="analysis-crack">裂缝分析</el-menu-item>
          <el-menu-item index="analysis-calc">参数计算</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="report">
          <template #title>报告</template>
          <el-menu-item index="report-preview">预览分析报告</el-menu-item>
          <el-menu-item index="report-export-pdf">导出PDF报告</el-menu-item>
          <el-menu-item index="report-export-excel">导出Excel数据</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </div>

    <!-- 窗口控制按钮 -->
    <div class="window-controls">
      <div class="control-btn" @click="handleMin">—</div>
      <div class="control-btn" @click="handleMax">□</div>
      <div class="control-btn close-btn" @click="handleClose">×</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 渲染进程正确导入ipcRenderer
const { ipcRenderer } = window.require('electron')

// 窗口控制函数
const handleMin = () => ipcRenderer.send('window-min')
const handleMax = () => ipcRenderer.send('window-max')
const handleClose = () => ipcRenderer.send('window-close')

// 打开岩心图片函数（后续会完善功能，先预留）
const handleOpenImage = () => {
  console.log('点击打开岩心图片')
  // 后续会在这里实现文件选择对话框的逻辑
}
</script>

<style scoped>
.title-bar-wrapper {
  width: 100%;
  height: 48px;
  background-color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-sizing: border-box;
  user-select: none;
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
  font-weight: bold;
  margin-right: 32px;
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
  --el-menu-item-padding: 0 16px;
}

/* 【关键修复】单独给顶部父菜单设置白色文字，不影响二级下拉菜单 */
.title-menu :deep(.el-sub-menu__title) {
  color: #fff !important;
  height: 48px;
  line-height: 48px;
}

/* 【关键修复】给二级下拉菜单设置深色文字，和白色背景区分开 */
:deep(.el-dropdown-menu__item) {
  color: #333 !important;
  font-size: 14px;
  line-height: 36px;
}

/* 二级菜单hover样式优化 */
:deep(.el-dropdown-menu__item:hover) {
  color: #409eff !important;
  background-color: #f5f7fa !important;
}

/* 控制按钮不可拖动 */
.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  height: 100%;
}

.control-btn {
  width: 48px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background-color: #475569;
}

.close-btn:hover {
  background-color: #ef4444;
}
</style>