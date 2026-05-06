<template>
  <div class="preprocess-panel">
    <div class="preprocess-btns">
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('autoLevels')">自动色阶</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="imageStore.openGammaDialog()">曲线调节</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('grayscale')">灰度化</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="imageStore.openBCDialog()">亮度/对比度</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="imageStore.openSaturationDialog()">饱和度调节</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('filterSmooth')">滤波平滑</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('sharpen')">锐化</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('edgeDetect')">边缘检测</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('negativeEffect')">底片效果</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useImageStore, type PreprocessType } from '@/stores/imageStore'

const imageStore = useImageStore()

const handlePreprocess = (type: PreprocessType) => {
  imageStore.executeProcess(type)
}
</script>

<style scoped>
.preprocess-panel {
  width: 100%;
}

.preprocess-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.btn-wrapper {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.sidebar-btn {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 44px;
  line-height: 42px;
  font-size: 15px;
  border-radius: 6px;
  box-sizing: border-box !important;
  padding: 0 12px;
  margin: 0;
}
</style>