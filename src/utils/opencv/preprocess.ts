// 图像预处理工具（灰度化、自动色阶、亮度/对比度等）
// 图像预处理工具函数
import cv from '@techstark/opencv-js'

/**
 * 1. 灰度化
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（灰度）
 */
export const grayscaleProcess = (src: cv.Mat): cv.Mat => {
  const dst = new cv.Mat()
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY)
  return dst
}

/**
 * 2. 底片效果（只对RGB通道取反，保留Alpha）
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（BGRA）
 */
export const negativeEffectProcess = (src: cv.Mat): cv.Mat => {
  const dst = new cv.Mat()
  const channels = new cv.MatVector()
  cv.split(src, channels)
  
    // 只对 B、G、R 通道取反，Alpha 通道保持不变
  cv.bitwise_not(channels.get(0), channels.get(0))//B通道
  cv.bitwise_not(channels.get(1), channels.get(1))//G通道
  cv.bitwise_not(channels.get(2), channels.get(2))//R通道
  cv.merge(channels, dst)//通道合并
  channels.delete()//释放中间变量
  return dst
}

/**
 * 3. 边缘检测（Canny算法）
 * @param src 输入 Mat（BGRA）
 * @param threshold1 Canny低阈值（默认50）
 * @param threshold2 Canny高阈值（默认150）
 * @returns 输出 Mat（灰度边缘图）
 */
export const edgeDetectProcess = (src: cv.Mat, threshold1: number = 50, threshold2: number = 150): cv.Mat => {
  const gray = new cv.Mat()
  const dst = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  cv.Canny(gray, dst, threshold1, threshold2)
  gray.delete()
  return dst
}

/**
 * 4. 滤波平滑（高斯模糊）
 * @param src 输入 Mat（BGRA）
 * @param kernelSize 卷积核大小（默认5x5）
 * @returns 输出 Mat（BGRA）
 */
export const filterSmoothProcess = (src: cv.Mat, kernelSize: number = 5): cv.Mat => {
  const dst = new cv.Mat()
  cv.GaussianBlur(src, dst, new cv.Size(kernelSize, kernelSize), 0, 0)
  return dst
}

/**
 * 5. 自动色阶（直方图均衡化）
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（BGR）
 */
export const autoLevelsProcess = (src: cv.Mat): cv.Mat => {
  const bgrMat = new cv.Mat()
  const ycrcb = new cv.Mat()
  const channels = new cv.MatVector()
  const dst = new cv.Mat()
  
    //BGRA->BGR->YCrCb
  cv.cvtColor(src, bgrMat, cv.COLOR_BGRA2BGR)
  cv.cvtColor(bgrMat, ycrcb, cv.COLOR_BGR2YCrCb)
  cv.split(ycrcb, channels)
  
  //只对亮度通道Y进行直方图均衡化
  cv.equalizeHist(channels.get(0), channels.get(0))
  
  //合并通道并转回BGR
  cv.merge(channels, ycrcb)
  cv.cvtColor(ycrcb, dst, cv.COLOR_YCrCb2BGR)
    
  //释放中间变量
  bgrMat.delete()
  ycrcb.delete()
  channels.delete()
  return dst
}

/**
 * 6. 锐化（自定义3x3卷积核）
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（BGRA）
 */
export const sharpenProcess = (src: cv.Mat): cv.Mat => {
  const dst = new cv.Mat()
  //自定义3x3卷积核
  const kernel = cv.matFromArray(3, 3, cv.CV_32F, [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ])
  cv.filter2D(src, dst, cv.CV_8U, kernel)
  kernel.delete()
  return dst
}

/**
 * 7. 亮度/对比度调整
 * @param src 输入 Mat（BGRA）
 * @param alpha 对比度系数（0.0~3.0）
 * @param beta 亮度偏移量（-100~100）
 * @returns 输出 Mat（BGRA）
 */
export const brightnessContrastProcess = (src: cv.Mat, alpha: number, beta: number): cv.Mat => {
  const clampedAlpha = Math.max(0.0, Math.min(3.0, alpha))//限制alpha在0.0~3.0之间
  const clampedBeta = Math.max(-100, Math.min(100, beta))//限制beta在-100~100之间
  const dst = new cv.Mat(src.rows, src.cols, src.type())
  src.convertTo(dst, -1, clampedAlpha, clampedBeta)
  return dst
}

/**
 * 8. 饱和度调节
 * @param src 输入 Mat（BGRA）
 * @param factor 饱和度系数（0.0~3.0，1.0=不变）
 * @returns 输出 Mat（BGR）
 */
export const saturationProcess = (src: cv.Mat, factor: number): cv.Mat => {
  const bgrMat = new cv.Mat()
  const hsvMat = new cv.Mat()
  const channels = new cv.MatVector()
  const dst = new cv.Mat()
    
  //BGRA->BGR->HSV
  cv.cvtColor(src, bgrMat, cv.COLOR_BGRA2BGR)
  cv.cvtColor(bgrMat, hsvMat, cv.COLOR_BGR2HSV)
  cv.split(hsvMat, channels)
  
  //调整饱和度通道S
  const sChannel = channels.get(1)!
  sChannel.convertTo(sChannel, cv.CV_8U, factor, 0)
  
  //合并通道并转回BGR
  cv.merge(channels, hsvMat)
  cv.cvtColor(hsvMat, dst, cv.COLOR_HSV2BGR)
  
  bgrMat.delete()
  hsvMat.delete()
  channels.delete()
  return dst
}