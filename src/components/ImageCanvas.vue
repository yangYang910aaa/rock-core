<template>
    <div class="image-canvas-wrapper">
        <!-- 空状态提示 -->
        <div class="empty-state" v-if="!isImageLoaded">
            <el-icon size="64" color="#909399"><PictureFilled/></el-icon>
            <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
        </div>

        <!-- 图片显示区域 -->
        <div class="image-container" v-else>
            <!-- 三层 Canvas 容器 -->
            <div class="canvas-wrapper" ref="containerRef">
                <!-- 底层 Canvas：显示图片 -->
                <canvas
                    ref="imageCanvasRef"
                    class="image-canvas"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseUp"
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
                />
            </div>

            <!-- 图片信息栏 -->
            <div class="image-info">
                <span class="image-item">文件路径:{{ currentImagePath }}</span>
                <span class="image-tag" v-if="isImageProcessed" style="margin-left: 12px; color: #67c23a;">
                    <el-icon><Check /></el-icon> 已处理
                </span>
                <span class="image-tag" v-if="isProcessing" style="margin-left: 12px; color: #e6a23c;">
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
import { watch } from 'vue'
import { PictureFilled, Check, Loading } from '@element-plus/icons-vue';
import { useImageStore } from '@/stores/imageStore';
import { useAnalysisStore } from '@/stores/analysisStore'
import { storeToRefs } from 'pinia';
import {useImageCanvasCore} from '@/composables/useImageCanvasCore'
import { useRegionSelection } from '@/composables/useRegionSelection';
import { useCalibrate } from '@/composables/useCalibrate';
// ==========================================
// 1. Store 引入
// ==========================================
const imageStore = useImageStore();
const analysisStore = useAnalysisStore()

const {currentImagePath,isImageLoaded,isImageProcessed,isProcessing,isCalibrating,calibrateStartPoint,calibrateEndPoint} = storeToRefs(imageStore)
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
    drawImage,
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
  // 【优化】只获取一次 rect
  const rect = imageCanvasRef.value!.getBoundingClientRect()
  const canvasX = e.clientX - rect.left
  const canvasY = e.clientY - rect.top

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
}

const handleMouseUp = () => {
  if (isCalibrating.value) {
    handleCalibrateMouseLeave()
    return
  }

  handleRegionMouseUp()
}

// ==========================================
// 6. 监听：选框变化时重绘
// ==========================================
watch(() => analysisStore.analysisRegion, () => {
  drawRegionMask()
}, { deep: true })

watch(() => analysisStore.regionMode, () => {
  drawRegionMask()
})

// 监听校准状态变化
watch([isCalibrating, calibrateStartPoint, calibrateEndPoint], () => {
  drawTargetMask()
})

//监听图片绘制完成后,直接重绘所有蒙版
watch(()=>imageDrawParams.value,()=>{
    if(imageDrawParams.value.drawWidth>0){
        drawRegionMask()
        drawTargetMask()
    }
},{deep:true})
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