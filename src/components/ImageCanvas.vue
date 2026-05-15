<template>
  <div class="image-canvas-wrapper">
    <!-- 空状态提示 -->
    <div class="empty-state" v-if="!imageStore.isImageLoaded">
      <el-icon size="64" color="#909399"><PictureFilled /></el-icon>
      <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
    </div>

    <!-- 图片显示区域 -->
    <div class="image-container" v-else>
      <!-- 悬浮/定位 Tooltip -->
      <CanvasTooltip
        :visible="tooltipVisible"
        :data="tooltipData"
        :x="tooltipX"
        :y="tooltipY"
        :mode="analysisStore.currentMode"
        :is-located="isLocated"
        :title-prefix="tooltipTitlePrefix"
        :unit="currentUnit"
        @clear-located="clearLocated"
      />

      <!-- 孔洞点击编辑卡片 -->
      <EditCard
        v-if="selectedHole"
        mode="hole"
        title="孔洞"
        :data="selectedHole"
        :position="holeCardPos"
        :unit-scale="unitScale"
        :current-unit="currentUnit"
        @close="interactionStore.clearHoleSelection()"
      />
      <!-- 裂缝点击编辑卡片 -->
      <EditCard
        v-if="selectedCrack"
        mode="crack"
        title="裂缝"
        :data="selectedCrack"
        :position="crackCardPos"
        :unit-scale="unitScale"
        :current-unit="currentUnit"
        @close="interactionStore.clearCrackSelection()"
      />
      <!-- 颗粒点击编辑卡片 -->
      <EditCard
        v-if="selectedParticle"
        mode="size"
        title="颗粒"
        :data="selectedParticle"
        :position="particleCardPos"
        :unit-scale="unitScale"
        :current-unit="currentUnit"
        @close="interactionStore.clearParticleSelection()"
      />

      <!-- 三层 Canvas 容器 -->
      <div class="canvas-wrapper" ref="containerRef">
        <canvas
          ref="imageCanvasRef"
          class="image-canvas"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseLeave"
          @wheel.prevent="handleImageZoom"
        />
        <canvas ref="maskCanvasRef" class="mask-canvas region-mask" />
        <canvas
          ref="targetMaskCanvasRef"
          class="mask-canvas target-mask"
          v-show="maskStore.showMaskOverlay"
        />
      </div>

      <!-- 图片信息栏 -->
      <div class="image-info">
        <span class="image-item">文件路径:{{ imageStore.currentImagePath }}</span>
        <span class="image-tag" v-if="imageStore.isImageProcessed" style="margin-left: 12px; color: #67c23a;">
          <el-icon><Check /></el-icon> 已处理
        </span>
        <span class="image-tag" v-if="imageStore.isProcessing" style="margin-left: 12px; color: #e6a23c;">
          <el-icon><Loading /></el-icon> 处理中...
        </span>
        <span class="image-tag" style="margin-left: 12px; color: #909399;">
          缩放: {{ (scale * 100).toFixed(0) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ----
// 画布主组件：三层 Canvas 管理 + 鼠标事件分发
// Tooltip / 编辑卡片 / 交互逻辑已拆分到 imageCanvas/ 和 useCanvasInteraction
// ----
import { watch, computed } from 'vue'
import { PictureFilled, Check, Loading } from '@element-plus/icons-vue'
import { useImageStore } from '@/stores/imageStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { storeToRefs } from 'pinia'
import { useImageCanvasCore } from '@/composables/useImageCanvasCore'
import { useRegionSelection } from '@/composables/useRegionSelection'
import { useCalibrate } from '@/composables/useCalibrate'
import { useMaskStore } from '@/stores/maskStore'
import { useInteractionStore } from '@/stores/interactionStore'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'
import CanvasTooltip from './imageCanvas/CanvasTooltip.vue'
import EditCard from './imageCanvas/EditCard.vue'

const imageStore = useImageStore()
  const maskStore = useMaskStore()
  const interactionStore = useInteractionStore()
const analysisStore = useAnalysisStore()

const { isCalibrating, scaleType } = storeToRefs(imageStore)
const { analysisRegion } = storeToRefs(analysisStore)

// ----
// 单位换算
// ----
const currentUnit = computed(() => scaleType.value === 'macro' ? 'mm' : 'μm')
const unitScale = computed(() => scaleType.value === 'macro' ? 1 : 1000)

// ----
// 核心画布逻辑
// ----
const {
  containerRef, imageCanvasRef, maskCanvasRef, targetMaskCanvasRef,
  imageDrawParams, scale,
  drawTargetMask, canvasToImageCoords, imageToCanvasCoords, handleImageZoom,
} = useImageCanvasCore()

// ----
// 局部分析选框
// ----
const { drawRegionMask, handleMouseDown: handleRegionMouseDown, handleMouseMove: handleRegionMouseMove, handleMouseUp: handleRegionMouseUp } = useRegionSelection(canvasToImageCoords, imageToCanvasCoords, maskCanvasRef)

// ----
// 标尺校准
// ----
const { handleCalibrateClick, handleCalibrateMouseMove, handleCalibrateMouseLeave } = useCalibrate(canvasToImageCoords, imageToCanvasCoords, drawTargetMask, targetMaskCanvasRef, imageDrawParams)

// ----
// 画布交互：Tooltip / 点击选中 / 悬停检测 / 定位 watcher
// ----
const {
  tooltipVisible, tooltipX, tooltipY,
  tooltipData, isLocated, tooltipTitlePrefix, clearLocated,
  selectedHole, selectedCrack, selectedParticle,
  holeCardPos, crackCardPos, particleCardPos,
  trySelectItemAt, detectHoveredItemAt, clearHoverIfNotLocated,
  setupLocateWatchers,
} = useCanvasInteraction(canvasToImageCoords, imageToCanvasCoords, imageCanvasRef, unitScale, currentUnit)

setupLocateWatchers()

// ==========================================
// 鼠标事件分发
// ==========================================
const handleMouseDown = (e: MouseEvent) => {
  const rect = imageCanvasRef.value!.getBoundingClientRect()
  const canvasX = e.clientX - rect.left
  const canvasY = e.clientY - rect.top

  // 1. 颜色匹配取色
  if (analysisStore.isPickingColor) {
    const ctx = imageCanvasRef.value!.getContext('2d')!
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data
    analysisStore.pickedColor = { r: pixel[0]!, g: pixel[1]!, b: pixel[2]! }
    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    analysisStore.pickedColorImageX = Math.round(imageCoords.x)
    analysisStore.pickedColorImageY = Math.round(imageCoords.y)
    analysisStore.isPickingColor = false
    return
  }

  // 2. 标尺校准
  if (isCalibrating.value) {
    handleCalibrateClick(canvasX, canvasY)
    return
  }

  // 3. 尝试点击选中孔洞/裂缝/颗粒
  if (trySelectItemAt(canvasX, canvasY, e.clientX, e.clientY)) return

  // 4. 局部选框
  handleRegionMouseDown(e, imageCanvasRef.value!)
}

const handleMouseMove = (e: MouseEvent) => {
  const rect = imageCanvasRef.value!.getBoundingClientRect()
  const canvasX = e.clientX - rect.left
  const canvasY = e.clientY - rect.top

  if (isCalibrating.value) {
    handleCalibrateMouseMove(canvasX, canvasY)
    return
  }

  handleRegionMouseMove(e, imageCanvasRef.value!)

  // 颜色匹配模式：实时显示鼠标处像素颜色
  if (analysisStore.colorMatchEnabled && !analysisStore.isPickingColor && imageCanvasRef.value) {
    const ctx = imageCanvasRef.value.getContext('2d')!
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data
    analysisStore.currentHoverColor = { r: pixel[0]!, g: pixel[1]!, b: pixel[2]! }
  }

  detectHoveredItemAt(canvasX, canvasY, rect)
}

const handleMouseUp = () => {
  if (isCalibrating.value) { handleCalibrateMouseLeave(); return }
  handleRegionMouseUp()
}

const handleMouseLeave = () => {
  clearHoverIfNotLocated()
}

// ----
// 选框变化 → 重绘
// ----
watch(() => analysisRegion.value, () => { drawRegionMask() }, { deep: true })
watch(() => analysisStore.regionMode, () => { drawRegionMask() })
watch([isCalibrating, () => imageStore.calibrateStartPoint, () => imageStore.calibrateEndPoint], () => { drawTargetMask() })
watch(() => imageDrawParams.value, () => {
  if (imageDrawParams.value.drawWidth > 0) { drawRegionMask(); drawTargetMask() }
}, { deep: true })
</script>

<style scoped>
.image-canvas-wrapper {
  width: 100%; height: 100%;
  background-color: #f0f2f5;
  display: flex; 
  align-items: center; 
  justify-content: center;
  position: relative; 
  overflow: hidden;
}
.empty-state { 
  text-align: center; 
  color: #909399; 
}
.empty-text { 
  margin-top: 16px; 
  font-size: 16px; 
}
.image-container {
  width: 100%; 
  height: 100%;
  display: flex; 
  flex-direction: column;
  align-items: center; 
  justify-content: center;
  padding: 20px; 
  box-sizing: border-box;
}
.canvas-wrapper {
  position: relative; 
  width: 100%; 
  height: 85%;
  background-color: #2b2b2b;
  border: 1px solid #dcdfe6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 4px; 
  overflow: hidden;
}
.image-canvas { 
  position: absolute; 
  top: 0; 
  left: 0; 
  z-index: 1; 
  cursor: crosshair; 
}
.mask-canvas { 
  position: absolute; 
  top: 0; 
  left: 0; 
  pointer-events: none; 
}
.region-mask { 
  z-index: 2; 
}
.target-mask { 
  z-index: 3; 
}
.image-info {
  margin-top: 16px; 
  padding: 8px 16px;
  background-color: #fff; 
  border: 1px solid #e4e7ed;
  border-radius: 4px; 
  color: #606266; 
  font-size: 12px;
  max-width: 90%; 
  overflow: hidden; 
  text-overflow: ellipsis;
  white-space: nowrap; 
  display: flex; 
  align-items: center;
}
.image-tag { 
  display: flex; 
  align-items: center; 
  gap: 4px; 
  font-weight: 500; 
}
</style>
