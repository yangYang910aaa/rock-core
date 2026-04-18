<template>
  <div class="app-container">
    <!-- 一体化标题栏菜单 -->
    <TitleBar />
    <!-- 主内容区,图片画布组件 -->
     <div class="main-content">
      <ImageCanvas />
     </div>
  </div>
</template>

<script setup lang="ts">
import TitleBar from '@/components/TitleBar.vue'
import ImageCanvas from '@/components/ImageCanvas.vue'
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

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>