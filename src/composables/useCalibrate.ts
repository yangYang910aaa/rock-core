import { ref, type Ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia'

/**
 * 标尺校准逻辑 
 * 职责：校准线绘制、鼠标事件处理、校准系数计算
 */
export const useCalibrate = (
  canvasToImageCoords: (x: number, y: number) => { x: number, y: number },
  imageToCanvasCoords: (x: number, y: number) => { x: number, y: number },
  drawTargetMask: (callback: () => void) => void,
  targetMaskCanvasRef: Ref<HTMLCanvasElement | null>,
  imageDrawParams: Ref<{ drawX: number, drawY: number, drawWidth: number, drawHeight: number }> // 虽然没用到，但保留接口一致性
) => {
  // ==========================================
  // 1. Store 引入
  // ==========================================
  const imageStore = useImageStore()
  const { isCalibrating, calibrateStartPoint, calibrateEndPoint } = storeToRefs(imageStore)

  // ==========================================
  // 2. 校准状态
  // ==========================================
  const currentCalibrateMousePos = ref<{ x: number, y: number } | null>(null)

  // ==========================================
  // 3. 校准线绘制
  // ==========================================
  const drawCalibrateLine = () => { 
    drawTargetMask(() => {
      if (!isCalibrating.value || !targetMaskCanvasRef.value) {
        return
      }
      const canvas = targetMaskCanvasRef.value
      const ctx = canvas.getContext('2d')!
      
      // 先保存当前的绘图状态
      ctx.save()
      
      // 设置校准线的样式：蓝色虚线，醒目不遮挡图片
      ctx.strokeStyle = '#409eff'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.fillStyle = '#409eff'
      
      // 1. 绘制起点
      if (calibrateStartPoint.value) {
        const startCanvas = imageToCanvasCoords(calibrateStartPoint.value.x, calibrateStartPoint.value.y)
        
        // 画起点的实心圆
        ctx.beginPath()
        ctx.arc(startCanvas.x, startCanvas.y, 6, 0, Math.PI * 2)
        ctx.fill()
        
        // 2. 绘制[起点到当前鼠标]的实时预览线
        if (currentCalibrateMousePos.value && !calibrateEndPoint.value) {
          const mouseCanvas = imageToCanvasCoords(currentCalibrateMousePos.value.x, currentCalibrateMousePos.value.y)
          ctx.beginPath()
          ctx.moveTo(startCanvas.x, startCanvas.y)
          ctx.lineTo(mouseCanvas.x, mouseCanvas.y)
          ctx.stroke()
        }
      }
      
      // 3. 绘制完整的校准线和终点
      if (calibrateStartPoint.value && calibrateEndPoint.value) {
        const startCanvas = imageToCanvasCoords(calibrateStartPoint.value.x, calibrateStartPoint.value.y)
        const endCanvas = imageToCanvasCoords(calibrateEndPoint.value.x, calibrateEndPoint.value.y)
        
        // 画校准线
        ctx.beginPath()
        ctx.moveTo(startCanvas.x, startCanvas.y)
        ctx.lineTo(endCanvas.x, endCanvas.y)
        ctx.stroke()
        
        // 画终点的实心圆
        ctx.beginPath()
        ctx.arc(endCanvas.x, endCanvas.y, 6, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // 恢复之前的绘图状态
      ctx.restore()
    })
  }

  // ==========================================
  // 4. 鼠标事件
  // ==========================================

  const handleCalibrateClick = (canvasX: number, canvasY: number) => {
    if (!isCalibrating.value) {
      return
    }
    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    if (!calibrateStartPoint.value) {
      imageStore.setCalibrateStart({ x: imageCoords.x, y: imageCoords.y })
    } else if (!calibrateEndPoint.value) {
      imageStore.setCalibrateEnd({ x: imageCoords.x, y: imageCoords.y })
    }
  }

  const handleCalibrateMouseMove = (canvasX: number, canvasY: number) => {
    if (!isCalibrating.value) {
      return
    }
    const imageCoords = canvasToImageCoords(canvasX, canvasY)
    currentCalibrateMousePos.value = { x: imageCoords.x, y: imageCoords.y }
    drawCalibrateLine()
  }

  const handleCalibrateMouseLeave = () => {
    currentCalibrateMousePos.value = null
    drawCalibrateLine()
  }

  // ==========================================
  // 5. 暴露给组件
  // ==========================================
  return {
    currentCalibrateMousePos,
    drawCalibrateLine, 
    handleCalibrateClick,
    handleCalibrateMouseMove,
    handleCalibrateMouseLeave
  }
}