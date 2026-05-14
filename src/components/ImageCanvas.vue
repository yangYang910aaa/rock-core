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
                :class="{ 'located-tooltip': isLocated }"
                :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
              >
                <div class="tooltip-title">
                  {{ tooltipTitle }}{{ tooltipData.index > 0 ? ' #' + tooltipData.index : '' }}
                  <span v-if="isLocated" class="locate-badge">已定位</span>
                </div>
                <div class="tooltip-content">
                  <template v-if="analysisStore.currentMode === 'hole'">
                    <div class="tooltip-item">
                      <span class="tooltip-label">直径:</span>
                      <span class="tooltip-value">{{ (tooltipData as any).diameter?.toFixed(3) ?? '-' }} {{ currentUnit }}</span>
                    </div>
                    <div class="tooltip-item">
                      <span class="tooltip-label">面积:</span>
                      <span class="tooltip-value">{{ (tooltipData as any).area?.toFixed(4) ?? '-' }} {{ currentUnit }}²</span>
                    </div>
                  </template>
                  <template v-else-if="analysisStore.currentMode === 'crack'">
                    <div class="tooltip-item">
                      <span class="tooltip-label">长度:</span>
                      <span class="tooltip-value">{{ (tooltipData as any).length > 0 ? (tooltipData as any).length.toFixed(3) + ' ' + currentUnit : '-' }}</span>
                    </div>
                    <div class="tooltip-item">
                      <span class="tooltip-label">宽度:</span>
                      <span class="tooltip-value">{{ (tooltipData as any).width > 0 ? (tooltipData as any).width.toFixed(3) + ' ' + currentUnit : '-' }}</span>
                    </div>
                  </template>
                </div>
                <el-button
                  v-if="isLocated"
                  size="small" type="danger" plain
                  class="locate-dismiss-btn"
                  @click.stop="clearLocated"
                >取消定位</el-button>
              </div>
            </Transition>

            <!-- 孔洞点击选择 → 属性编辑卡片 -->
            <div
              v-if="selectedHole"
              class="hole-edit-card"
              :style="{ left: holeCardPos.x + 'px', top: holeCardPos.y + 'px' }"
              @click.stop
            >
              <div class="card-header">
                <span>孔洞 #{{ selectedHole.index }}</span>
                <span class="card-close" @click="analysisStore.clearHoleSelection()">×</span>
              </div>
              <div class="card-body">
                <div class="card-row">
                  <span class="card-label">直径:</span>
                  <span>{{ (selectedHole.diameter * unitScale).toFixed(3) }} {{ currentUnit }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">面积:</span>
                  <span>{{ (selectedHole.area * unitScale * unitScale).toFixed(4) }} {{ currentUnit }}²</span>
                </div>
                <div class="card-row">
                  <span class="card-label">分类:</span>
                  <el-tag :type="categoryTagType(selectedHole.category)" size="small">{{ categoryLabel(selectedHole.category) }}</el-tag>
                </div>
                <div class="card-row card-select">
                  <span class="card-label">有效性:</span>
                  <select v-model="selectedHole.validity" class="native-select">
                    <option value="">-</option>
                    <option value="effective">有效（未充填）</option>
                    <option value="semiEffective">较有效（半充填）</option>
                    <option value="ineffective">无效（全充填）</option>
                  </select>
                </div>
                <div class="card-row card-select">
                  <span class="card-label">充填物:</span>
                  <select v-model="selectedHole.fillingMaterial" class="native-select">
                    <option value="">-</option>
                    <option value="mud">泥质</option>
                    <option value="calcite">方解石</option>
                    <option value="dolomite">白云石</option>
                    <option value="asphalt">沥青</option>
                    <option value="gypsum">石膏</option>
                    <option value="pyrite">黄铁矿</option>
                    <option value="kaolinite">高岭石</option>
                    <option value="quartz">石英</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 裂缝点击选择 → 属性编辑卡片 -->
            <div
              v-if="selectedCrack"
              class="hole-edit-card"
              :style="{ left: crackCardPos.x + 'px', top: crackCardPos.y + 'px' }"
              @click.stop
            >
              <div class="card-header">
                <span>裂缝 #{{ selectedCrack.index }}</span>
                <span class="card-close" @click="analysisStore.clearCrackSelection()">×</span>
              </div>
              <div class="card-body">
                <div class="card-row">
                  <span class="card-label">长度:</span>
                  <span>{{ (selectedCrack.length * unitScale).toFixed(3) }} {{ currentUnit }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">宽度:</span>
                  <span>{{ (selectedCrack.width * unitScale).toFixed(3) }} {{ currentUnit }}</span>
                </div>
                <div class="card-row card-select">
                  <span class="card-label">有效性:</span>
                  <select v-model="selectedCrack.validity" class="native-select">
                    <option value="">-</option>
                    <option value="effective">有效（未充填）</option>
                    <option value="semiEffective">较有效（半充填）</option>
                    <option value="ineffective">无效（全充填）</option>
                  </select>
                </div>
                <div class="card-row card-select">
                  <span class="card-label">充填物:</span>
                  <select v-model="selectedCrack.fillingMaterial" class="native-select">
                    <option value="">-</option>
                    <option value="mud">泥质</option>
                    <option value="calcite">方解石</option>
                    <option value="dolomite">白云石</option>
                    <option value="asphalt">沥青</option>
                    <option value="gypsum">石膏</option>
                    <option value="pyrite">黄铁矿</option>
                    <option value="kaolinite">高岭石</option>
                    <option value="quartz">石英</option>
                  </select>
                </div>
              </div>
            </div>

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
import { detectHoveredHole, detectHoveredCrack } from '@/utils/opencv/core';
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
// Tooltip 数据源：定位态优先（孔洞或裂缝），否则取悬停态
const tooltipData = computed(() => {
  return analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo
    || analysisStore.hoveredHoleInfo || analysisStore.hoveredCrackInfo
})
const isLocated = computed(() => !!(analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo))
const clearLocated = () => {
  analysisStore.clearLocatedHole()
  analysisStore.clearLocatedCrack()
}

// 孔洞点击选择卡片：当前选中的孔洞数据
const selectedHole = computed(() => {
  const idx = analysisStore.selectedHoleIndex
  if (idx === null) return null
  return analysisStore.holeResults.holeList[idx - 1] ?? null
})
// 分类标签映射（与 ResultsPanel 保持一致）
const categoryLabel = (cat: string) => {
  const map: Record<string, string> = { large: '大洞', medium: '中洞', small: '小洞', pinhole: '针孔' }
  return map[cat] || cat
}
const categoryTagType = (cat: string) => {
  const map: Record<string, string> = { large: 'danger', medium: 'warning', small: 'success', pinhole: 'info' }
  return map[cat] || ''
}

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
    // 同时记录图片像素坐标，供「连续区域」floodFill 使用
    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    analysisStore.pickedColorImageX = Math.round(imageCoords.x)
    analysisStore.pickedColorImageY = Math.round(imageCoords.y)
    analysisStore.isPickingColor = false
    return
  }

  // 校准模式优先
  if (isCalibrating.value) {
    handleCalibrateClick(canvasX, canvasY)
    return
  }

  // 孔洞模式：点击蒙版选中孔洞，弹出属性编辑卡片
  if (analysisStore.currentMode === 'hole' && analysisStore.holeResults.holeList.length > 0
    && analysisStore.binaryMaskMat && !analysisStore.binaryMaskMat.empty()) {
    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    if (!isNaN(imageCoords.x) && !isNaN(imageCoords.y)) {
      const info = detectHoveredHole(analysisStore.binaryMaskMat, imageCoords.x, imageCoords.y, analysisRegion.value, imageStore.pixelToMm)
      if (info) {
        analysisStore.selectHole(info.index)
        holeCardPos.value = { x: e.clientX + 12, y: e.clientY - 12 }
        analysisStore.clearLocatedHole()
        analysisStore.clearLocatedCrack()
        return
      }
    }
    analysisStore.clearHoleSelection()
    analysisStore.clearLocatedHole()
    analysisStore.clearLocatedCrack()
  }

  // 裂缝模式：点击蒙版选中裂缝
  if (analysisStore.currentMode === 'crack' && analysisStore.crackResults.crackList.length > 0
    && analysisStore.binaryMaskMat && !analysisStore.binaryMaskMat.empty()) {
    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    if (!isNaN(imageCoords.x) && !isNaN(imageCoords.y)) {
      const info = detectHoveredCrack(analysisStore.binaryMaskMat, imageCoords.x, imageCoords.y, analysisRegion.value, imageStore.pixelToMm,
        analysisStore.crackThreshold.minLength,
        analysisStore.crackThreshold.minWidth,
        analysisStore.crackThreshold.maxWidth)
      if (info && info.index > 0) {
        analysisStore.selectCrack(info.index)
        crackCardPos.value = { x: e.clientX + 12, y: e.clientY - 12 }
        analysisStore.clearLocatedHole()
        analysisStore.clearLocatedCrack()
        return
      }
    }
    analysisStore.clearCrackSelection()
    analysisStore.clearLocatedHole()
    analysisStore.clearLocatedCrack()
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

  // 颜色匹配模式：实时显示鼠标处像素颜色（取色中则跳过，避免干扰）
  if (analysisStore.colorMatchEnabled && !analysisStore.isPickingColor && imageCanvasRef.value) {
    const ctx = imageCanvasRef.value.getContext('2d')!
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data
    analysisStore.currentHoverColor = { r: pixel[0]!, g: pixel[1]!, b: pixel[2]! }
  }

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
  if (analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo) return  // 定位态下不清理
  analysisStore.clearHoveredHole()
  analysisStore.clearHoveredCrack()
  analysisStore.currentHoverColor = null
  tooltipVisible.value = false
}

// 检测鼠标悬停的孔洞/裂缝（定位态下跳过）
const detectHoveredHoleOnCanvas = (canvasX: number, canvasY: number, rect: DOMRect) => {
  if (analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo) return

  const binaryMask = analysisStore.binaryMaskMat
  if (!binaryMask || binaryMask.empty()) {
    analysisStore.clearHoveredHole()
    analysisStore.clearHoveredCrack()
    tooltipVisible.value = false
    return
  }

  const imageCoords = canvasToImageCoords(canvasX, canvasY)
  if (isNaN(imageCoords.x) || isNaN(imageCoords.y) || imageCoords.x < 0 || imageCoords.y < 0) {
    analysisStore.clearHoveredHole()
    analysisStore.clearHoveredCrack()
    tooltipVisible.value = false
    return
  }

  if (analysisStore.currentMode === 'crack') {
    // 先检查像素是否在裂缝上（同一坐标系统和二值掩码）
    const pv = binaryMask.ucharPtr(Math.round(imageCoords.y), Math.round(imageCoords.x))[0]
    if (pv >= 128) {
      // 尝试精确定位到具体裂缝
      const crackInfo = detectHoveredCrack(binaryMask, imageCoords.x, imageCoords.y, analysisRegion.value, imageStore.pixelToMm,
        analysisStore.crackThreshold.minLength,
        analysisStore.crackThreshold.minWidth,
        analysisStore.crackThreshold.maxWidth)
      if (crackInfo) {
        analysisStore.setHoveredCrackInfo({
          index: crackInfo.index,
          length: crackInfo.length * unitScale.value,
          width: crackInfo.width * unitScale.value,
          centerX: crackInfo.centerX,
          centerY: crackInfo.centerY,
        })
      } else {
        // 像素命中但轮廓未匹配时给占位信息，保证 Tooltip 可见
        analysisStore.setHoveredCrackInfo({
          index: -1, length: 0, width: 0,
          centerX: Math.round(imageCoords.x),
          centerY: Math.round(imageCoords.y),
        })
      }
      tooltipX.value = rect.left + canvasX + 15
      tooltipY.value = rect.top + canvasY - 10
      tooltipVisible.value = true
    } else {
      analysisStore.clearHoveredCrack()
      tooltipVisible.value = false
    }
    return
  }

  // 孔洞/粒度模式：原有逻辑
  const holeInfo = detectHoveredHole(binaryMask, imageCoords.x, imageCoords.y, analysisRegion.value, imageStore.pixelToMm)
  if (holeInfo) {
    analysisStore.setHoveredHoleInfo({
      ...holeInfo,
      diameter: holeInfo.diameter * unitScale.value,
      area: holeInfo.area * unitScale.value * unitScale.value
    })
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

// 定位态：弹窗点击"定位"后，在中心显示 Tooltip
watch(() => analysisStore.locatedHoleInfo, (info) => {
  if (info && info.centerX && info.centerY) {
    const el = imageCanvasRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const canvasPos = imageToCanvasCoords(info.centerX, info.centerY)
    tooltipX.value = rect.left + canvasPos.x
    tooltipY.value = rect.top + canvasPos.y
    tooltipVisible.value = true
  } else {
    if (!analysisStore.hoveredHoleInfo && !analysisStore.locatedCrackInfo) {
      tooltipVisible.value = false
    }
  }
})
watch(() => analysisStore.locatedCrackInfo, (info) => {
  if (info && info.centerX && info.centerY) {
    const el = imageCanvasRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const canvasPos = imageToCanvasCoords(info.centerX, info.centerY)
    tooltipX.value = rect.left + canvasPos.x
    tooltipY.value = rect.top + canvasPos.y
    tooltipVisible.value = true
  } else {
    if (!analysisStore.hoveredHoleInfo && !analysisStore.locatedHoleInfo) {
      tooltipVisible.value = false
    }
  }
})

// 点击蒙版空白处取消定位
// 画布点击选择孔洞 / 裂缝
const holeCardPos = ref({ x: 0, y: 0 })
const crackCardPos = ref({ x: 0, y: 0 })
const selectedCrack = computed(() => {
  const idx = analysisStore.selectedCrackIndex
  if (idx === null) return null
  return analysisStore.crackResults.crackList[idx - 1] ?? null
})
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

/* 孔洞点击选择 → 属性编辑卡片 */
.hole-edit-card {
  position: fixed;
  background: #fff;
  border: 1px solid #409eff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  padding: 0;
  z-index: 1001;
  min-width: 200px;
  pointer-events: auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #409eff;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 7px 7px 0 0;
}
.card-close {
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  opacity: 0.8;
}
.card-close:hover { opacity: 1; }
.card-body {
  padding: 8px 12px;
}
.card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #303133;
}
.card-select {
  margin-bottom: 8px;
}
.card-label {
  color: #606266;
  min-width: 40px;
  font-weight: 500;
}
.card-body .native-select {
  flex: 1;
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  outline: none;
}
.card-body .native-select:focus {
  border-color: #409eff;
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