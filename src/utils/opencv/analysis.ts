// 分析模式工具函数
import cv from '@techstark/opencv-js'
import type {
  AnalysisRegion,
  HoleThreshold,
  CrackThreshold,
  SizeThreshold
} from '@/stores/analysisStore'
import { cropAnalysisRegion } from './core'

/**
 * 【孔洞分析】阈值分割
 */
export const holeSegmentation = (
  src: cv.Mat,
  threshold: HoleThreshold,
  region: AnalysisRegion
): cv.Mat => {
  const roiSrc = cropAnalysisRegion(src, region)
  const gray = new cv.Mat()
  const binary = new cv.Mat()
  const dst = new cv.Mat()

  try {
    cv.cvtColor(roiSrc, gray, cv.COLOR_BGRA2GRAY)
    
    //创建单通道Mat作为上下界，匹配inRange的类型要求
    const lowerBound = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(threshold.minThreshold))
    const upperBound = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(threshold.maxThreshold))
    
    cv.inRange(gray, lowerBound, upperBound, binary)
    
    // 用完立即释放临时Mat，避免内存泄漏
    lowerBound.delete()
    upperBound.delete()

    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
    cv.morphologyEx(binary, dst, cv.MORPH_CLOSE, kernel)
    cv.morphologyEx(dst, dst, cv.MORPH_OPEN, kernel)
    kernel.delete()
    return dst
  } finally {
    // 释放所有中间变量
    roiSrc.delete()
    gray.delete()
    binary.delete()
  }
}
/**
 * 【裂缝分析】阈值分割
 */
export const crackSegmentation = (
  src: cv.Mat,
  threshold: CrackThreshold,
  region: AnalysisRegion
): cv.Mat => {
  const roiSrc = cropAnalysisRegion(src, region) // 裁剪分析区域
  // 转换为灰度图
  const gray = new cv.Mat()
  // 高斯模糊
  const blur = new cv.Mat()
  // Canny边缘检测
  const edges = new cv.Mat()
  // 膨胀
  const dst = new cv.Mat()

  try {
    // 1.转换为灰度图
    cv.cvtColor(roiSrc, gray, cv.COLOR_BGRA2GRAY)
    // 2. 高斯滤波：去除噪点，核大小5x5
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0)
    // 3. Canny边缘检测：提取裂缝边缘
    cv.Canny(blur, edges, threshold.cannyLow, threshold.cannyHigh)
    // 4. 形态学膨胀：把断裂的裂缝连接起来
    // 核大小2x2，迭代次数2，让裂缝更连续
    const kernelDilate = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
    cv.dilate(edges,dst,kernelDilate,new cv.Point(-1,-1),2)
    kernelDilate.delete()
    
    // 5. 形态学闭运算：填充裂缝内部的小空洞
    const kernelClose=cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernelClose)
    kernelClose.delete()
    
    // 6. 形态学开运算：去除细小的噪点
    const kernelOpen=cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
    cv.morphologyEx(dst, dst, cv.MORPH_OPEN, kernelOpen)
    kernelOpen.delete()
    return dst
  } catch (error) {
    console.error('裂缝分析阈值分割失败:', error)
    return dst
  } finally {
    roiSrc.delete()
    gray.delete()
    blur.delete()
    edges.delete()
  }
}

/**
 * 【粒度分析】阈值分割
 */
export const sizeSegmentation = (
  src: cv.Mat,
  threshold: SizeThreshold,
  region: AnalysisRegion
): { mask: cv.Mat, contours: cv.MatVector } => {
  const roiSrc = cropAnalysisRegion(src, region)
  const gray = new cv.Mat()
  const binary = new cv.Mat()
  const mask = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    cv.cvtColor(roiSrc, gray, cv.COLOR_BGRA2GRAY)
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
    cv.morphologyEx(binary, mask, cv.MORPH_OPEN, kernel)
    kernel.delete()
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    return { mask, contours }
  } finally {
    roiSrc.delete()
    gray.delete()
    binary.delete()
    hierarchy.delete()
  }
}