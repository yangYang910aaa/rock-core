// src/utils/opencv/analysis.ts
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
  const roiSrc = cropAnalysisRegion(src, region)
  const gray = new cv.Mat()
  const blur = new cv.Mat()
  const edges = new cv.Mat()
  const dst = new cv.Mat()

  try {
    cv.cvtColor(roiSrc, gray, cv.COLOR_BGRA2GRAY)
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0)
    cv.Canny(blur, edges, 50, 150)
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
    cv.dilate(edges, dst, kernel)
    kernel.delete()
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