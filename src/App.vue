<template>
  <div class="app-container">
    <!-- 顶部标题栏 -->
    <TitleBar />

    <!-- 主内容区：三栏布局 -->
    <el-container class="main-container">
      <!-- 左侧功能栏 -->
      <LeftSidebar />
      
      <!-- 中间画布核心区 -->
      <el-main class="canvas-wrapper">
        <ImageCanvas />
      </el-main>
      
      <!-- 右侧参数结果面板 -->
      <RightPanel />
    </el-container>
  </div>
</template>

<script setup lang="ts">
import TitleBar from '@/components/TitleBar.vue'
import ImageCanvas from '@/components/ImageCanvas.vue'
import LeftSidebar from '@/components/LeftSidebar.vue'
import RightPanel from '@/components/RightPanel.vue'
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

/* 严格控制主容器高度，占满剩余空间 */
.main-container {
  flex: 1;
  overflow: hidden;
  height: 0; /* 关键：flex布局下强制占满剩余高度，避免内容溢出 */
}

/* 画布容器，无内边距，完全占满 */
.canvas-wrapper {
  padding: 0;
  overflow: hidden;
  background-color: #f0f2f5;
}
</style>