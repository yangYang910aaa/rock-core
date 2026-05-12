<template>
    <div class="image-canvas-wrapper">
        <!-- 空状态提示 -->
        <div class="empty-state" v-if="!imageStore.isImageLoaded">
            <el-icon size="64" color="#909399"><PictureFilled/></el-icon>
            <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
        </div>

        <!-- 图片显示区域 -->
        <div class="image-container" v-else>
            <!-- Tooltip：定位态始终显示，悬停态跟随鼠标 -->
            <Transition name="tooltip">
              <div
                v-if="tooltipVisible && tooltipData"
                class="hole-tooltip"
                :class="{ 'located-tooltip': !!analysisStore.locatedHoleInfo }"
                :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
              >
                <div class="tooltip-title">
                  {{ tooltipTitle }} #{{ tooltipData.index }}
                  <span v-if="analysisStore.locatedHoleInfo" class="locate-badge">已定位</span>
                </div>
                <div class="tooltip-content">
                  <div class="tooltip-item">
                    <span class="tooltip-label">直径:</span>
                    <span class="tooltip-value">{{ tooltipData.diameter.toFixed(3) }} {{ currentUnit }}</span>
                  </div>
                  <div class="tooltip-item">
                    <span class="tooltip-label">面积:</span>
                    <span class="tooltip-value">{{ tooltipData.area.toFixed(4) }} {{ currentUnit }}²</span>
                  </div>
                </div>
                <el-button
                  v-if="analysisStore.locatedHoleInfo"
                  size="small" type="danger" plain
                  class="locate-dismiss-btn"
                  @click.stop="analysisStore.clearLocatedHole()"
                >取消定位</el-button>
              </div>
            </Transition>
            
            <!-- 三层 Canvas 容器 -->
            <div class="canvas-wrapper" ref="containerRef">
                <!-- 底层 Canvas：显示图片 -->
                <canvas
                    ref="imageCanvasRef"
                    class="image-canvas"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseLeave"
                    @wheel.prevent="handleImageZoom"
                />
                <!-- 中层 Canvas：显示蓝色分析区域蒙版 -->
                <canvas
                    ref="maskCanvasRef"
                    class="mask-canvas region-mask"
                />
                <!-- 顶层 Canvas：显示红色目标蒙版 -->
                <canvas
                    ref="targetMaskCanvasRef"
                    class="mask-canvas target-mask"
                    v-show="analysisStore.showMaskOverlay"
                    @click.stop="handleCanvasClick"
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
                <!-- 显示缩放比例 -->
                <span class="image-tag" style="margin-left: 12px; color: #909399;">
                    缩放: {{ (scale * 100).toFixed(0) }}%
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch, ref, computed } from 'vue'
import { PictureFilled, Check, Loading } from '@element-plus/icons-vue';
import { useImageStore } from '@/stores/imageStore';
import { useAnalysisStore } from '@/stores/analysisStore'
import { storeToRefs } from 'pinia';
import {useImageCanvasCore} from '@/composables/useImageCanvasCore'
import { useRegionSelection } from '@/composables/useRegionSelection';
import { useCalibrate } from '@/composables/useCalibrate';
import { detectHoveredHole } from '@/utils/opencv/core';
// ==========================================
// 1. Store 引入
// ==========================================
const imageStore = useImageStore();
const analysisStore = useAnalysisStore()

const {
  isCalibrating,
  scaleType,
} = storeToRefs(imageStore)
const {
  analysisRegion
} = storeToRefs(analysisStore)

// ==========================================
// 2. Tooltip 状态
// ==========================================
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const currentUnit = computed(() => {
  return scaleType.value === 'macro' ? 'mm' : 'μm'
})
const unitScale = computed(() => {
  return scaleType.value === 'macro' ? 1 : 1000
})
// Tooltip 数据源：定位态优先，否则取悬停态
const tooltipData = computed(() => {
  return analysisStore.locatedHoleInfo || analysisStore.hoveredHoleInfo
})

const tooltipTitle=computed(()=>{
  const mode=analysisStore.currentMode
  switch(mode){
    case 'hole':
      return '孔洞'
    case 'crack':
      return '裂缝'
    case 'size':
      return '颗粒'
    default:
      return '未知'
  }
})
// ==========================================
// 2.引入拆分后的核心逻辑
// ==========================================
const {
    containerRef,
    imageCanvasRef,
    maskCanvasRef,
    targetMaskCanvasRef,
    imageDrawParams,
    scale,
    drawTargetMask,
    canvasToImageCoords,
    imageToCanvasCoords,
    handleImageZoom
}=useImageCanvasCore()

// ==========================================
// 3. 引入拆分后的选框逻辑
// ==========================================
const {
  isDragging,
  drawRegionMask,
  handleMouseDown: handleRegionMouseDown,
  handleMouseMove: handleRegionMouseMove,
  handleMouseUp: handleRegionMouseUp
} = useRegionSelection(canvasToImageCoords, imageToCanvasCoords, maskCanvasRef)

// ==========================================
// 4. 引入拆分后的校准逻辑
// ==========================================
const {
  handleCalibrateClick,
  handleCalibrateMouseMove,
  handleCalibrateMouseLeave
} = useCalibrate(canvasToImageCoords, imageToCanvasCoords, drawTargetMask,targetMaskCanvasRef,imageDrawParams)
// ==========================================
// 5. 统一的鼠标事件分发
// ==========================================
const handleMouseDown = (e: MouseEvent) => {
  const rect = imageCanvasRef.value!.getBoundingClientRect()
  const canvasX = e.clientX - rect.left
  const canvasY = e.clientY - rect.top

  // 颜色匹配取色模式：getImageData 用 Canvas 原始像素坐标，不做缩放转换
  if (analysisStore.isPickingColor) {
    const ctx = imageCanvasRef.value!.getContext('2d')!
    // 用 CSS 坐标直接读 Canvas 像素缓冲区（Canvas 尺寸 = CSS 尺寸，无需 devicePixelRatio）
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data
    analysisStore.pickedColor = { r: pixel[0]!, g: pixel[1]!, b: pixel[2]! }
    analysisStore.isPickingColor = false
    return
  }

  // 校准模式优先
  if (isCalibrating.value) {
    handleCalibrateClick(canvasX, canvasY)
    return
  }

  // 局部选框模式
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
  
  // 检测鼠标悬停的孔洞
  detectHoveredHoleOnCanvas(canvasX, canvasY, rect)
}

const handleMouseUp = () => {
  if (isCalibrating.value) {
    handleCalibrateMouseLeave()
    return
  }

  handleRegionMouseUp()
}

const handleMouseLeave = () => {
  if (analysisStore.locatedHoleInfo) return  // 定位态下不清理
  analysisStore.clearHoveredHole()
  tooltipVisible.value = false
}

// 检测鼠标悬停的孔洞（定位态下跳过，不干扰定位 Tooltip 和高亮）
const detectHoveredHoleOnCanvas = (canvasX: number, canvasY: number, rect: DOMRect) => {
  if (analysisStore.locatedHoleInfo) return

  const binaryMask = analysisStore.binaryMaskMat
  if (!binaryMask || binaryMask.empty()) {
    analysisStore.clearHoveredHole()
    tooltipVisible.value = false
    return
  }

  // 转换坐标：Canvas坐标 -> 图片坐标
  const imageCoords = canvasToImageCoords(canvasX, canvasY)
  
  // 检查坐标是否有效
  if (isNaN(imageCoords.x) || isNaN(imageCoords.y) || imageCoords.x < 0 || imageCoords.y < 0) {
    analysisStore.clearHoveredHole()
    tooltipVisible.value = false
    return
  }

  // 检测悬停的孔洞
  const holeInfo = detectHoveredHole(
    binaryMask,
    imageCoords.x,
    imageCoords.y,
    analysisRegion.value,
    imageStore.pixelToMm
  )

  if (holeInfo) {
    // 更新悬停信息
    analysisStore.setHoveredHoleInfo({
      ...holeInfo,
      diameter: holeInfo.diameter * unitScale.value,
      area: holeInfo.area * unitScale.value * unitScale.value
    })
    
    // 更新Tooltip位置
    tooltipX.value = rect.left + canvasX + 15
    tooltipY.value = rect.top + canvasY - 10
    tooltipVisible.value = true
  } else {
    analysisStore.clearHoveredHole()
    tooltipVisible.value = false
  }
}

// ==========================================
// 6. 监听：选框变化时重绘
// ==========================================
watch(() => analysisRegion.value, () => {
  drawRegionMask()
}, { deep: true })

watch(() => analysisStore.regionMode, () => {
  drawRegionMask()
})

// 监听校准状态变化
watch([isCalibrating, () => imageStore.calibrateStartPoint, () => imageStore.calibrateEndPoint], () => {
  drawTargetMask()
})

// 监听图片绘制完成后,直接重绘所有蒙版
watch(()=>imageDrawParams.value,()=>{
    if(imageDrawParams.value.drawWidth>0){
        drawRegionMask()
        drawTargetMask()
    }
},{deep:true})

// 定位态：弹窗点击"定位"后，在孔洞中心显示 Tooltip
watch(() => analysisStore.locatedHoleInfo, (info) => {
  if (info && info.centerX && info.centerY) {
    const canvasPos = imageToCanvasCoords(info.centerX, info.centerY)
    tooltipX.value = canvasPos.x
    tooltipY.value = canvasPos.y
    tooltipVisible.value = true
  } else {
    // 定位清除后，如果没有悬停态则隐藏 Tooltip
    if (!analysisStore.hoveredHoleInfo) {
      tooltipVisible.value = false
    }
  }
})

// 点击蒙版空白处取消定位
const handleCanvasClick = (e: MouseEvent) => {
  if (analysisStore.locatedHoleInfo) {
    analysisStore.clearLocatedHole()
  }
}
</script>

<style scoped>
.image-canvas-wrapper {
    width: 100%;
    height: 100%;
    background-color: #f0f2f5;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

/* Tooltip 样式 */
.hole-tooltip {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 12px;
  z-index: 1000;
  min-width: 140px;
  pointer-events: none;
}
/* 定位态 Tooltip：允许交互（取消定位按钮需要点击） */
.hole-tooltip.located-tooltip {
  pointer-events: auto;
  border-color: #409eff;
}

.tooltip-title {
  font-weight: 600;
  color: #409eff;
  font-size: 13px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.tooltip-label {
  color: #606266;
}

.tooltip-value {
  color: #303133;
  font-weight: 500;
}

/* Tooltip 过渡动画 */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

/* 定位态标识 */
.locate-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #409eff;
  color: #fff;
  margin-left: 8px;
  vertical-align: middle;
}
.locate-dismiss-btn {
  margin-top: 8px;
  width: 100%;
  font-size: 12px;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-5px);
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