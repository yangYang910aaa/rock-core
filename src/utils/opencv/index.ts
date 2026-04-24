// 把所有模块的函数重新导出

// 核心基础工具
export {
    initOpenCV,
    loadImageToMat,
    matToDataUrl,
    cropAnalysisRegion,
    maskToVisual
} from './core'

// 图像预处理工具
export {
  grayscaleProcess, // 灰度化
  negativeEffectProcess, // 底片效果
  edgeDetectProcess, // 边缘检测
  filterSmoothProcess, // 滤波平滑
  autoLevelsProcess,//自动色阶
  sharpenProcess,//锐化
  brightnessContrastProcess,//亮度对比度调整
  saturationProcess//饱和度调整
} from './preprocess'

// 分析模式工具
export {
  holeSegmentation,
  crackSegmentation,
  sizeSegmentation
} from './analysis'

// 形态学操作工具（预留）
export {
  denoiseRegion,
  fillHoles,
  dilateRegion,
  erodeRegion
} from './morphology'