import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { storeToRefs } from 'pinia'
import cv from '@techstark/opencv-js'

/**
 * 核心画布逻辑
 * 职责：画布初始化、图片绘制、三层Canvas管理、坐标转换、缩放
 */
export const useImageCanvasCore = () => {
  // ==========================================
  // 1. Store 引入
  // ==========================================
  const imageStore = useImageStore()
  const analysisStore = useAnalysisStore()
  const { processedImageDataUrl } = storeToRefs(imageStore)
  const { targetMaskMat } = storeToRefs(analysisStore)

  // ==========================================
  // 2. DOM 引用
  // ==========================================
  const containerRef = ref<HTMLDivElement | null>(null)
  const imageCanvasRef = ref<HTMLCanvasElement | null>(null)
  const maskCanvasRef = ref<HTMLCanvasElement | null>(null)
  const targetMaskCanvasRef = ref<HTMLCanvasElement | null>(null)

  // ==========================================
  // 3. 图片绘制和缩放状态
  // ==========================================
  const scale = ref(1) //当前缩放比例
  const imageScale = ref<number>(1) //图片像素到Canvas的缩放比
  const imageOffset = ref<{ x: number, y: number }>({ x: 0, y: 0 }) //图片偏移量，用于缩放时保持图片居中
  const imageDrawParams = ref({
    drawX: 0, //绘制时的x坐标偏移量
    drawY: 0, //绘制时的y坐标偏移量
    drawWidth: 0, //绘制时的宽度
    drawHeight: 0, //绘制时的高度
  })

  //缩放常量
  const SCALE_STEP = 0.1 //缩放步长
  const MIN_SCALE = 0.5 //最小缩放比例
  const MAX_SCALE = 2.0 //最大缩放比例

  //容器尺寸变化监听
  let resizeObserver: ResizeObserver | null = null

  // ==========================================
  // 4. 核心方法
  // =========================================

  /**
   * 初始化三层Canvas的尺寸，和容器保持一致
   */
  const initCanvasSize = async () => {
    //等待两次nextTick，确保DOM更新完成
    await nextTick()
    await nextTick()
    if (!containerRef.value || !imageCanvasRef.value || !maskCanvasRef.value || !targetMaskCanvasRef.value) {
      return
    }
    //获取容器尺寸
    const containerWidth = containerRef.value.clientWidth || containerRef.value.offsetWidth || 800
    const containerHeight = containerRef.value.clientHeight || containerRef.value.offsetHeight || 600

    //容器尺寸为0,延迟重试
    if (containerWidth === 0 || containerHeight === 0) {
      setTimeout(initCanvasSize, 100)
      return
    }
    // 三层Canvas尺寸统一
    imageCanvasRef.value.width = containerWidth
    imageCanvasRef.value.height = containerHeight
    maskCanvasRef.value.width = containerWidth
    maskCanvasRef.value.height = containerHeight
    targetMaskCanvasRef.value.width = containerWidth
    targetMaskCanvasRef.value.height = containerHeight

    //如果有图片，立即绘制
    if (processedImageDataUrl.value) {
      drawImage()
    }
  }

  /**
   * 绘制图片到底层Canvas，保持宽高比居中显示
   */
  const drawImage = () => {
    if (!processedImageDataUrl.value || !imageCanvasRef.value) {
      return
    }
    const canvas = imageCanvasRef.value
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      //清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      //计算图片和Canvas的宽高比
      const imgRatio = img.width / img.height
      const canvasRatio = canvas.width / canvas.height
      // 根据宽高比计算绘制位置尺寸,保持居中
      let drawWidth, drawHeight, drawX, drawY
      if (imgRatio > canvasRatio) {
        //图片更宽，以宽度为准
        drawWidth = canvas.width * scale.value
        drawHeight = (canvas.width / imgRatio) * scale.value // ✅ 修复
      } else {
        //图片更高，以高度为准
        drawHeight = canvas.height * scale.value
        drawWidth = (canvas.height * imgRatio) * scale.value
      }
      //居中偏移
      drawX = (canvas.width - drawWidth) / 2
      drawY = (canvas.height - drawHeight) / 2

      //保存绘制参数,给蒙版复用
      imageDrawParams.value = { drawX, drawY, drawWidth, drawHeight }
      imageScale.value = drawWidth / img.width
      imageOffset.value = { x: drawX, y: drawY }

      //绘制图片
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
    }
    img.src = processedImageDataUrl.value
  }

  /**
   * 绘制红色目标蒙版，和图片完全对齐
   * @param customDrawCallback 可选：自定义绘制回调（用于绘制校准线等）
   */
  const drawTargetMask = (customDrawCallback?: () => void) => {
    if (!targetMaskCanvasRef.value) {
      return
    }
    const ctx = targetMaskCanvasRef.value.getContext('2d')!
    //先清空画布
    ctx.clearRect(0, 0, targetMaskCanvasRef.value.width, targetMaskCanvasRef.value.height)
    //绘制OpenCV蒙版
    if (targetMaskMat.value && !targetMaskMat.value.empty()) {
      const { drawX, drawY, drawWidth, drawHeight } = imageDrawParams.value
      //创建临时Canvas绘制OpenCV蒙版
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = targetMaskMat.value.cols
      tempCanvas.height = targetMaskMat.value.rows
      cv.imshow(tempCanvas, targetMaskMat.value)

      //把蒙版绘制到和图片完全一致的位置
      ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight)
    }
    //执行自定义绘制回调，用于绘制校准线等
    if (customDrawCallback) {
      customDrawCallback()
    }
  }

  // ==========================================
  // 5. 坐标转换（核心工具函数）
  // ==========================================

  /**
   * Canvas屏幕坐标 -> 图片真实像素坐标
   * 适配缩放和偏移
   */
  const canvasToImageCoords = (canvasX: number, canvasY: number): { x: number, y: number } => {
    const x = (canvasX - imageOffset.value.x) / imageScale.value
    const y = (canvasY - imageOffset.value.y) / imageScale.value
    return { x, y }
  }

  /**
   * 图片真实像素坐标 -> Canvas屏幕坐标
   * 适配缩放和偏移
   */
  const imageToCanvasCoords = (imgX: number, imgY: number) => {
    return {
      x: imgX * imageScale.value + imageOffset.value.x,
      y: imgY * imageScale.value + imageOffset.value.y
    }
  }

  // ==========================================
  // 6. 图片缩放
  // ==========================================
  const handleImageZoom = (e: WheelEvent) => {
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    const newScale = scale.value + delta
    if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
      scale.value = newScale
      drawImage()
    }
  }

  // ==========================================
  // 7. 监听
  // ==========================================
  // 监听processedImageDataUrl变化，重新初始化Canvas大小和绘制图片
  watch(() => processedImageDataUrl.value, () => {
    if (processedImageDataUrl.value) {
      initCanvasSize().then(() => {
        drawImage()
      })
    }
  })
  // 监听targetMaskMat变化，重新绘制目标蒙版
  watch(targetMaskMat, () => {
    drawTargetMask()
  })
  // 监听缩放比例变化，重新绘制目标蒙版
  watch(scale, () => {
    drawTargetMask()
  })

  // ==========================================
  // 8. 生命周期
  // ==========================================
  onMounted(async () => {
    // 初始化OpenCV
    await imageStore.initOpenCV()
    // 延迟初始化Canvas
    setTimeout(initCanvasSize, 200)

    // 修复：监听容器尺寸变化
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        initCanvasSize()
      })
      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    // 清理ResizeObserver
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    // 清理OpenCV资源
    if (targetMaskMat.value) {
      targetMaskMat.value.delete()
    }
  })

  // ==========================================
  // 9. 暴露给组件
  // ==========================================
  return {
    // DOM 引用
    containerRef,
    imageCanvasRef,
    maskCanvasRef,
    targetMaskCanvasRef,
    // 状态
    scale,
    imageScale,
    imageOffset,
    imageDrawParams,
    // 核心方法
    initCanvasSize,
    drawImage,
    drawTargetMask,
    // 坐标转换
    canvasToImageCoords,
    imageToCanvasCoords,
    // 缩放
    handleImageZoom
  }
}