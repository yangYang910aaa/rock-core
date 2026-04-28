// src/stores/imageStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { initOpenCV as initOpenCVUtil } from '@/utils/opencv'
import { executeImageProcess } from '@/services/imageProcessService'

// ==========================================
// 1. 类型定义
// ==========================================

// 预处理操作类型
export type PreprocessType =
  | 'grayscale' // 灰度化
  | 'autoLevels' // 自动色阶
  | 'curveAdjust' // 曲线调整
  | 'brightnessContrast' // 亮度对比度
  | 'saturation' // 饱和度
  | 'filterSmooth' // 平滑滤波
  | 'sharpen' // 锐化
  | 'edgeDetect' // 边缘检测
  | 'negativeEffect' // 底片效果

// 亮度/对比度调整参数类型
export type BrightContrastParams = {
  alpha: number // 对比度系数(0.0~3.0，默认1.0)
  beta: number // 亮度系数(-100~100，默认0)
}

// 标尺类型
export type ScaleType='macro'|'micro'

// ==========================================
// 2. Store 定义
// ==========================================
export const useImageStore = defineStore('image', () => {
  // ==========================================
  // 2.1 基础状态
  // ==========================================
  const currentImagePath = ref<string>('') // 当前打开的图片文件路径
  const currentImageDataUrl = ref<string>('') // 当前图片的 DataURL
  const isImageLoaded = ref<boolean>(false) // 图片是否已加载
  const processedImageDataUrl = ref<string>('') // 处理后的图片 DataURL
  const isImageProcessed = ref<boolean>(false) // 图片是否已处理

  // ==========================================
  // 2.2 OpenCV 相关状态
  // ==========================================
  const cvReady = ref<boolean>(false) // OpenCV.js 是否加载完成
  const isProcessing = ref<boolean>(false) // 是否正在处理

  // ==========================================
  // 2.3 预处理参数状态
  // ==========================================
  const bcParams = ref<BrightContrastParams>({
    alpha: 1.0,
    beta: 0
  })
  const saturationFactor = ref<number>(1.0) // 饱和度系数

  // ==========================================
  // 2.4 标尺相关状态
  // ==========================================
  // 标尺类型：macro=宏观(mm)，micro=微观(μm)
  const scaleType = ref<ScaleType>('macro')
  // 像素转毫米系数：1像素对应多少毫米（默认0.1，后续可以支持用户手动输入）
  const pixelToMm = ref<number>(0.1)
  // 标尺校准状态
  const isCalibrating = ref<boolean>(false) // 是否正在校准
  const calibrateStartPoint=ref<{x:number,y:number}|null>(null) // 校准开始点
  const calibrateEndPoint=ref<{x:number,y:number}|null>(null) // 校准结束点
  const calibrateRealLength=ref<number>(10) // 校准线的真实长度,默认10mm

  // ==========================================
  // 3. 基础状态操作
  // ==========================================

  /**
   * 设置图片信息
   */
  const setImage = (filePath: string, dataUrl: string) => {
    currentImagePath.value = filePath
    currentImageDataUrl.value = dataUrl
    isImageLoaded.value = true
    processedImageDataUrl.value = dataUrl
    isImageProcessed.value = false
    resetBCParams()
    resetSaturationParams()
  }

  /**
   * 设置处理后的图片信息
   */
  const setProcessedImage = (dataUrl: string) => {
    processedImageDataUrl.value = dataUrl
    isImageProcessed.value = true
  }

  // ==========================================
  // 标尺相关方法
  // ==========================================
  const setScaleType=(type:ScaleType)=>{
    scaleType.value=type
    ElMessage.success(`已切换到${type==='macro'?'宏观(mm)':'微观(μm)'}模式`)
  }
  const setPixelToMm=(value:number)=>{
    pixelToMm.value=value
  }
  //开始/结束校准
  const toggleCalibrate=(status:boolean)=>{
    isCalibrating.value=status
    calibrateStartPoint.value=null
    calibrateEndPoint.value=null
    if(status){
      ElMessage.info('请在图片上点击绘制校准线起点和终点')
    }
  }
  
  //设置校准线起点
  const setCalibrateStart=(point:{x:number,y:number})=>{
    calibrateStartPoint.value=point
    ElMessage.success(`已设置校准线起点,坐标为${point.x},${point.y},请点击设置终点`)
  }

  //设置校准线终点,自动计算校准系数
  const setCalibrateEnd=(point:{x:number,y:number})=>{
    if(!calibrateStartPoint.value){
      ElMessage.warning('请先设置校准线起点')
      return
    }
    calibrateEndPoint.value=point
   
    //计算校准线的像素长度
    const dx=calibrateEndPoint.value.x-calibrateStartPoint.value.x
    const dy=calibrateEndPoint.value.y-calibrateStartPoint.value.y
    const pixelLength=Math.sqrt(dx*dx+dy*dy)
    if(pixelLength<=0){
      ElMessage.error('校准线长度不能为0')
      return
    }

    //计算精准的像素-毫米系数:1像素=真实长度/像素长度
    const newPixelToMm=calibrateRealLength.value/pixelLength
    setPixelToMm(newPixelToMm)
    ElMessage.success(`标尺校准完成! 1像素=${newPixelToMm.toFixed(6)}mm`)
    toggleCalibrate(false) // 结束校准
  }

  //重置校准
  const resetCalibrate=()=>{
    calibrateStartPoint.value=null
    calibrateEndPoint.value=null
    setPixelToMm(0.1) // 重置校准系数为默认值0.1mm
    ElMessage.success('已重置标尺,恢复默认值0.1mm')
  }
  /**
   * 重置图片信息（恢复原图）
   */
  const resetImage = () => {
    processedImageDataUrl.value = currentImageDataUrl.value
    isImageProcessed.value = false
    resetBCParams()
    resetSaturationParams()
  }

  /**
   * 重置全部状态
   */
  const resetAll = () => {
    currentImagePath.value = ''
    currentImageDataUrl.value = ''
    processedImageDataUrl.value = ''
    isImageLoaded.value = false
    isImageProcessed.value = false
    resetBCParams()
    resetSaturationParams()
  }

  /**
   * 重置亮度/对比度参数
   */
  const resetBCParams = () => {
    bcParams.value = { alpha: 1.0, beta: 0 }
  }

  /**
   * 重置饱和度参数
   */
  const resetSaturationParams = () => {
    saturationFactor.value = 1.0
  }

  // ==========================================
  // 4. OpenCV 初始化
  // ==========================================
  const initOpenCV = async () => {
    if (cvReady.value) return
    try {
      await initOpenCVUtil()
      cvReady.value = true
    } catch (error) {
      ElMessage.error('OpenCV.js 初始化失败')
      console.error('OpenCV 初始化错误:', error)
    }
  }

  // ==========================================
  // 5. 核心：图像处理入口
  // ==========================================
  const executeProcess = async (type: PreprocessType) => {
    // 前置校验
    if (!cvReady.value || !isImageLoaded.value || isProcessing.value) {
      if (!cvReady.value) ElMessage.warning('OpenCV.js 未加载完成')
      if (!isImageLoaded.value) ElMessage.warning('请先打开图片')
      if (isProcessing.value) ElMessage.warning('正在处理中，请稍后')
      return
    }

    isProcessing.value = true
    try {
      // 调用业务服务，传入当前状态
      const resultDataUrl = await executeImageProcess(type, {
        imageDataUrl: currentImageDataUrl.value,
        bcParams: bcParams.value,
        saturationFactor: saturationFactor.value
      })

      // 更新处理后的图片
      processedImageDataUrl.value = resultDataUrl
      isImageProcessed.value = true
    } catch (error) {
      ElMessage.error('图像处理失败')
      console.error('图像处理错误:', error)
    } finally {
      isProcessing.value = false
    }
  }

  // ==========================================
  // 6. 暴露给组件的状态和方法
  // ==========================================
  return {
    // 基础状态
    currentImagePath,
    currentImageDataUrl,
    processedImageDataUrl,
    isImageLoaded,
    isImageProcessed,
    // OpenCV 状态
    cvReady,
    isProcessing,
    // 预处理参数
    bcParams,
    saturationFactor,
    // 标尺相关状态
    scaleType,
    pixelToMm,
    isCalibrating,
    calibrateStartPoint,
    calibrateEndPoint,
    calibrateRealLength,
    // 基础方法
    setImage,
    setProcessedImage,
    resetImage,
    resetAll,
    resetBCParams,
    resetSaturationParams,
    // OpenCV 方法
    initOpenCV,
    // 图像处理入口
    executeProcess,
    // 标尺相关方法
    setScaleType,
    setPixelToMm,  
    toggleCalibrate,
    setCalibrateStart,
    setCalibrateEnd,
    resetCalibrate,
  }
})