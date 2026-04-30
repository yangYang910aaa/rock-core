// src/composables/useRegionSelection.ts
import { ref, type Ref } from 'vue'
import { useAnalysisStore, type AnalysisRegion } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia'

/**
 * 局部分析选框逻辑
 * 职责：选框绘制、临时选框、分析区域设置
 */
export const useRegionSelection = (
  canvasToImageCoords: (x: number, y: number) => { x: number, y: number },
  imageToCanvasCoords: (x: number, y: number) => { x: number, y: number },
  maskCanvasRef: Ref<HTMLCanvasElement | null>
) => {
  // ==========================================
  // 1. Store 引入
  // ==========================================
  const analysisStore = useAnalysisStore()
  const imageStore = useImageStore()
  const { regionMode, analysisRegion } = storeToRefs(analysisStore)
  const { isImageLoaded } = storeToRefs(imageStore)

  // ==========================================
  // 2. 选框状态
  // ==========================================
  const isDragging = ref<boolean>(false)
  const startPoint = ref<{ x: number, y: number }>({ x: 0, y: 0 })
  const tempRegion = ref<AnalysisRegion>({ x: 0, y: 0, width: 0, height: 0 })

  // ==========================================
  // 3. 核心方法：绘制蓝色分析区域蒙版
  // ==========================================
  const drawRegionMask = () => {
    if (!maskCanvasRef.value) return

    const canvas = maskCanvasRef.value
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 【核心】直接用你原来代码里的坐标转换逻辑，最稳妥
    const getCanvasCoords = (region: AnalysisRegion) => {
      const scaleX = imageToCanvasCoords(1, 0).x - imageToCanvasCoords(0, 0).x
      const scaleY = imageToCanvasCoords(0, 1).y - imageToCanvasCoords(0, 0).y
      const offsetX = imageToCanvasCoords(0, 0).x
      const offsetY = imageToCanvasCoords(0, 0).y

      return {
        x: region.x * scaleX + offsetX,
        y: region.y * scaleY + offsetY,
        w: region.width * scaleX,
        h: region.height * scaleY
      }
    }

    // 1. 绘制已保存的蓝色分析区域
    if (regionMode.value === 'rect' && analysisRegion.value.width > 0) {
      const { x, y, w, h } = getCanvasCoords(analysisRegion.value)
      ctx.fillStyle = 'rgba(0, 100, 255, 0.3)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)
    }

    // 2. 绘制临时选框(拖拽中)
    if (isDragging.value && tempRegion.value.width > 0) {
      const { x, y, w, h } = getCanvasCoords(tempRegion.value)
      ctx.fillStyle = 'rgba(0, 100, 255, 0.2)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }
  }

  // ==========================================
  // 4. 鼠标事件
  // ==========================================
  const handleMouseDown = (e: MouseEvent, canvasRef: HTMLCanvasElement) => {
    if (regionMode.value !== 'rect' || !isImageLoaded.value) return
    isDragging.value = true
    analysisStore.isSelectingRegion = true

    const rect = canvasRef.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    startPoint.value = { x: imageCoords.x, y: imageCoords.y }
    tempRegion.value = { x: imageCoords.x, y: imageCoords.y, width: 0, height: 0 }
  }

  const handleMouseMove = (e: MouseEvent, canvasRef: HTMLCanvasElement) => {
    if (!isDragging.value) return
    const rect = canvasRef.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    const x = Math.min(startPoint.value.x, imageCoords.x)
    const y = Math.min(startPoint.value.y, imageCoords.y)
    const width = Math.abs(imageCoords.x - startPoint.value.x)
    const height = Math.abs(imageCoords.y - startPoint.value.y)

    tempRegion.value = { x, y, width, height }
    drawRegionMask()
  }

  const handleMouseUp = () => {
    if (!isDragging.value) return
    isDragging.value = false
    analysisStore.isSelectingRegion = false

    if (tempRegion.value.width > 5 && tempRegion.value.height > 5) {
      analysisStore.setAnalysisRegion(tempRegion.value)
    }
    tempRegion.value = { x: 0, y: 0, width: 0, height: 0 }
    drawRegionMask()
  }

  // ==========================================
  // 5. 暴露给组件
  // ========================================== 
  return {
    isDragging,
    drawRegionMask,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  }
}