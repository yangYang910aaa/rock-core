// ----
// 画布交互逻辑：Tooltip 状态、悬停检测、点击选中、定位 watcher
// 从 ImageCanvas.vue 拆分，减少主组件复杂度
// ----
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { detectHoveredHole, detectHoveredCrack } from '@/utils/opencv/core'

export const useCanvasInteraction = (
  canvasToImageCoords: (x: number, y: number) => { x: number; y: number },
  imageToCanvasCoords: (x: number, y: number) => { x: number; y: number },
  imageCanvasRef: Ref<HTMLCanvasElement | null>,
  unitScale: ComputedRef<number>,
  currentUnitVal: ComputedRef<string>,
) => {
  const analysisStore = useAnalysisStore()
  const imageStore = useImageStore()

  // ----
  // Tooltip 状态
  // ----
  const tooltipVisible = ref(false)
  const tooltipX = ref(0)
  const tooltipY = ref(0)
  const tooltipTitlePrefix = computed(() => {
    switch (analysisStore.currentMode) {
      case 'hole': return '孔洞'
      case 'crack': return '裂缝'
      case 'size': return '颗粒'
      default: return '未知'
    }
  })

  // Tooltip 数据源：定位态优先，否则取悬停态
  const tooltipData = computed(() => {
    return analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo || analysisStore.locatedParticleInfo
      || analysisStore.hoveredHoleInfo || analysisStore.hoveredCrackInfo || analysisStore.hoveredParticleInfo
  })
  const isLocated = computed(() => !!(analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo || analysisStore.locatedParticleInfo))
  const clearLocated = () => {
    analysisStore.clearLocatedHole()
    analysisStore.clearLocatedCrack()
    analysisStore.clearLocatedParticle()
  }

  // ----
  // 点击选中卡片
  // ----
  const holeCardPos = ref({ x: 0, y: 0 })
  const crackCardPos = ref({ x: 0, y: 0 })
  const particleCardPos = ref({ x: 0, y: 0 })

  const selectedHole = computed(() => {
    const idx = analysisStore.selectedHoleIndex
    if (idx === null) return null
    return analysisStore.holeResults.holeList[idx - 1] ?? null
  })
  const selectedCrack = computed(() => {
    const idx = analysisStore.selectedCrackIndex
    if (idx === null) return null
    return analysisStore.crackResults.crackList[idx - 1] ?? null
  })
  const selectedParticle = computed(() => {
    const idx = analysisStore.selectedParticleIndex
    if (idx === null) return null
    return analysisStore.particleResults.particleList[idx - 1] ?? null
  })

  // ----
  // 分类标签映射
  // ----
  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = { large: '大洞', medium: '中洞', small: '小洞', pinhole: '针孔' }
    return map[cat] || cat
  }
  const categoryTagType = (cat: string) => {
    const map: Record<string, string> = { large: 'danger', medium: 'warning', small: 'success', pinhole: 'info' }
    return map[cat] || ''
  }

  // ----
  // 点击选中逻辑：尝试在 canvas 坐标处选中孔洞/裂缝/颗粒
  // 返回 true 表示选中成功（阻止后续处理）
  // ----
  const trySelectItemAt = (canvasX: number, canvasY: number, clientX: number, clientY: number): boolean => {
    const mode = analysisStore.currentMode
    const binaryMask = analysisStore.binaryMaskMat
    if (!binaryMask || binaryMask.empty()) return false

    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    if (isNaN(imageCoords.x) || isNaN(imageCoords.y)) return false

    // 孔洞模式
    if (mode === 'hole' && analysisStore.holeResults.holeList.length > 0) {
      const info = detectHoveredHole(binaryMask, imageCoords.x, imageCoords.y, analysisStore.analysisRegion, imageStore.pixelToMm)
      if (info) {
        analysisStore.selectHole(info.index)
        holeCardPos.value = { x: clientX + 12, y: clientY - 12 }
        analysisStore.clearLocatedHole()
        analysisStore.clearLocatedCrack()
        return true
      }
      analysisStore.clearHoleSelection()
      analysisStore.clearLocatedHole()
      analysisStore.clearLocatedCrack()
      return false
    }

    // 裂缝模式
    if (mode === 'crack' && analysisStore.crackResults.crackList.length > 0) {
      const info = detectHoveredCrack(binaryMask, imageCoords.x, imageCoords.y, analysisStore.analysisRegion, imageStore.pixelToMm,
        analysisStore.crackThreshold.minLength,
        analysisStore.crackThreshold.minWidth,
        analysisStore.crackThreshold.maxWidth)
      if (info && info.index > 0) {
        analysisStore.selectCrack(info.index)
        crackCardPos.value = { x: clientX + 12, y: clientY - 12 }
        analysisStore.clearLocatedHole()
        analysisStore.clearLocatedCrack()
        return true
      }
      analysisStore.clearCrackSelection()
      analysisStore.clearLocatedHole()
      analysisStore.clearLocatedCrack()
      return false
    }

    // 粒度模式
    if (mode === 'size' && analysisStore.particleResults.particleList.length > 0) {
      const info = detectHoveredHole(binaryMask, imageCoords.x, imageCoords.y, analysisStore.analysisRegion, imageStore.pixelToMm)
      if (info) {
        analysisStore.selectParticle(info.index)
        particleCardPos.value = { x: clientX + 12, y: clientY - 12 }
        analysisStore.clearLocatedParticle()
        return true
      }
      analysisStore.clearParticleSelection()
      analysisStore.clearLocatedParticle()
      return false
    }

    return false
  }

  // ----
  // 鼠标移动时的悬停检测
  // ----
  const detectHoveredItemAt = (canvasX: number, canvasY: number, canvasRect: DOMRect) => {
    // 定位态下不更新悬停（避免 Tooltip 跳动）
    if (analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo || analysisStore.locatedParticleInfo) {
      if (analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo) return
    }

    const binaryMask = analysisStore.binaryMaskMat
    if (!binaryMask || binaryMask.empty()) {
      analysisStore.clearHoveredHole()
      analysisStore.clearHoveredCrack()
      analysisStore.clearHoveredParticle()
      tooltipVisible.value = false
      return
    }

    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    if (isNaN(imageCoords.x) || isNaN(imageCoords.y) || imageCoords.x < 0 || imageCoords.y < 0) {
      analysisStore.clearHoveredHole()
      analysisStore.clearHoveredCrack()
      analysisStore.clearHoveredParticle()
      tooltipVisible.value = false
      return
    }

    if (analysisStore.currentMode === 'crack') {
      // 先检查像素是否在裂缝上
      const pv = binaryMask.ucharPtr(Math.round(imageCoords.y), Math.round(imageCoords.x))[0]
      if (pv >= 128) {
        const crackInfo = detectHoveredCrack(binaryMask, imageCoords.x, imageCoords.y, analysisStore.analysisRegion, imageStore.pixelToMm,
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
          analysisStore.setHoveredCrackInfo({
            index: -1, length: 0, width: 0,
            centerX: Math.round(imageCoords.x),
            centerY: Math.round(imageCoords.y),
          })
        }
        tooltipX.value = canvasRect.left + canvasX + 15
        tooltipY.value = canvasRect.top + canvasY - 10
        tooltipVisible.value = true
      } else {
        analysisStore.clearHoveredCrack()
        tooltipVisible.value = false
      }
      return
    }

    // 孔洞/粒度模式：共用 blob 检测
    const holeInfo = detectHoveredHole(binaryMask, imageCoords.x, imageCoords.y, analysisStore.analysisRegion, imageStore.pixelToMm)
    if (holeInfo) {
      if (analysisStore.currentMode === 'size') {
        analysisStore.setHoveredParticleInfo({
          index: holeInfo.index,
          diameter: holeInfo.diameter * unitScale.value,
          area: holeInfo.area * unitScale.value * unitScale.value,
          centerX: holeInfo.centerX,
          centerY: holeInfo.centerY,
        })
      } else {
        analysisStore.setHoveredHoleInfo({
          ...holeInfo,
          diameter: holeInfo.diameter * unitScale.value,
          area: holeInfo.area * unitScale.value * unitScale.value,
        })
      }
      tooltipX.value = canvasRect.left + canvasX + 15
      tooltipY.value = canvasRect.top + canvasY - 10
      tooltipVisible.value = true
    } else {
      analysisStore.clearHoveredHole()
      analysisStore.clearHoveredParticle()
      tooltipVisible.value = false
    }
  }

  // 鼠标离开时清除悬停（定位态保持）
  const clearHoverIfNotLocated = () => {
    if (analysisStore.locatedHoleInfo || analysisStore.locatedCrackInfo || analysisStore.locatedParticleInfo) return
    analysisStore.clearHoveredHole()
    analysisStore.clearHoveredCrack()
    analysisStore.clearHoveredParticle()
    analysisStore.currentHoverColor = null
    tooltipVisible.value = false
  }

  // ----
  // 定位态 watcher：定位时计算 Tooltip 的屏幕坐标
  // ----
  const setupLocateWatchers = () => {
    watch(() => analysisStore.locatedHoleInfo, (info) => {
      if (info && info.centerX && info.centerY) {
        const el = imageCanvasRef.value
        if (!el) return
        const rect = el.getBoundingClientRect()
        const canvasPos = imageToCanvasCoords(info.centerX, info.centerY)
        tooltipX.value = rect.left + canvasPos.x
        tooltipY.value = rect.top + canvasPos.y
        tooltipVisible.value = true
      } else if (!analysisStore.hoveredHoleInfo && !analysisStore.locatedCrackInfo) {
        tooltipVisible.value = false
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
      } else if (!analysisStore.hoveredHoleInfo && !analysisStore.locatedHoleInfo && !analysisStore.locatedParticleInfo) {
        tooltipVisible.value = false
      }
    })
    watch(() => analysisStore.locatedParticleInfo, (info) => {
      if (info && info.centerX && info.centerY) {
        const el = imageCanvasRef.value
        if (!el) return
        const rect = el.getBoundingClientRect()
        const canvasPos = imageToCanvasCoords(info.centerX, info.centerY)
        tooltipX.value = rect.left + canvasPos.x
        tooltipY.value = rect.top + canvasPos.y
        tooltipVisible.value = true
      } else if (!analysisStore.hoveredHoleInfo && !analysisStore.locatedHoleInfo && !analysisStore.locatedCrackInfo) {
        tooltipVisible.value = false
      }
    })
  }

  return {
    // Tooltip
    tooltipVisible, tooltipX, tooltipY,
    tooltipData, isLocated, tooltipTitlePrefix, clearLocated,
    // 选中卡片
    selectedHole, selectedCrack, selectedParticle,
    holeCardPos, crackCardPos, particleCardPos,
    // 辅助
    categoryLabel, categoryTagType,
    // 方法
    trySelectItemAt, detectHoveredItemAt, clearHoverIfNotLocated,
    setupLocateWatchers,
  }
}
