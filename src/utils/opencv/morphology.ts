// 形态学操作工具（二次编辑：区域去噪、孔洞填充、膨胀、腐蚀、反选等）
import type { AnalysisRegion } from '@/stores/analysisStore'
import cv from '@techstark/opencv-js'

/**
 * 【内部辅助】裁剪局部区域并执行操作，再贴回原图
 * @param src 输入蒙版
 * @param region 分析区域（可选，不传则全图操作）
 * @param operationFn 对局部区域执行的操作函数
 */
const processRegion = (
  src: cv.Mat,
  region: AnalysisRegion | null,
  operationFn: (roi: cv.Mat) => cv.Mat
): cv.Mat => {
  // 全图模式:直接对src执行操作
  if (!region || region.width === 0 || region.height === 0) {
    return operationFn(src)
  }

  // 局部模式:裁剪-操作-贴回
  const dst = src.clone()
  // 1.裁剪局部区域（严格匹配图片原始坐标）
  const rect = new cv.Rect(
    Math.max(0, region.x),
    Math.max(0, region.y),
    Math.min(src.cols - region.x, region.width),
    Math.min(src.rows - region.y, region.height),
  )
  const roi = dst.roi(rect)
  // 2.对局部区域执行操作
  const processedRoi = operationFn(roi)
  // 3. 把操作后的局部区域贴回原图
  processedRoi.copyTo(roi)
  // 4. 释放资源
  roi.delete()
  processedRoi.delete()
  return dst
}

/**
 * 区域去噪（开运算：先腐蚀后膨胀，去除小噪点）
 * @param src 输入蒙版
 * @param kernelSize 核大小，默认3
 * @param iterations 迭代次数，默认1
 * @param region 分析区域（可选，不传则全图操作）
 */
export const denoiseRegion = (
  src: cv.Mat,
  kernelSize: number = 3,
  region: AnalysisRegion | null = null,
  iterations: number = 1
): cv.Mat => {
  return processRegion(src, region, (roi) => {
    const dst = new cv.Mat()
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize))
    cv.morphologyEx(roi, dst, cv.MORPH_OPEN, kernel, new cv.Point(-1, -1), iterations)
    kernel.delete()
    return dst
  })
}

/**
 * 孔洞填充
 * 原理：从图片边缘开始漫水填充，然后反选得到填充后的孔洞
 * @param src 输入蒙版
 * @param kernelSize 核大小（占位，保持参数统一）
 * @param region 分析区域（可选，不传则全图操作）
 */
export const fillHoles = (
  src: cv.Mat,
  kernelSize?: number,
  region: AnalysisRegion | null = null
): cv.Mat => {
  return processRegion(src, region, (roi) => {
    try {
      // 严格校验输入
      if (roi.empty() || roi.channels() !== 1) {
        const dst = new cv.Mat()
        roi.copyTo(dst) // 【修复】用roi，不是src
        return dst
      }

      const dst = new cv.Mat()
      roi.copyTo(dst) // 【修复】用roi，不是src

      // 1. 创建漫水填充临时蒙版
      const mask = new cv.Mat(dst.rows + 2, dst.cols + 2, cv.CV_8UC1, new cv.Scalar(0))
      
      // 2. 从roi的四个边缘漫水填充（局部区域的边缘，不是全图）
      for (let y = 0; y < dst.rows; y++) {
        if (dst.ucharAt(y, 0) === 0) {
          cv.floodFill(dst, mask, new cv.Point(0, y), new cv.Scalar(255))
        }
        if (dst.ucharAt(y, dst.cols - 1) === 0) {
          cv.floodFill(dst, mask, new cv.Point(dst.cols - 1, y), new cv.Scalar(255))
        }
      }
      for (let x = 0; x < dst.cols; x++) {
        if (dst.ucharAt(0, x) === 0) {
          cv.floodFill(dst, mask, new cv.Point(x, 0), new cv.Scalar(255))
        }
        if (dst.ucharAt(dst.rows - 1, x) === 0) {
          cv.floodFill(dst, mask, new cv.Point(x, dst.rows - 1), new cv.Scalar(255))
        }
      }

      // 3. 反选合并
      cv.bitwise_not(dst, dst)
      cv.bitwise_or(roi, dst, dst) // 【修复】用roi，不是src

      mask.delete()
      return dst
    } catch (e) {
      console.error('fillHoles执行失败:', e)
      const dst = new cv.Mat()
      try { roi.copyTo(dst) } catch {} // 【修复】用roi，不是src
      return dst
    }
  })
}

/**
 * 区域膨胀（扩大识别区域）
 * @param src 输入蒙版
 * @param kernelSize 核大小，默认3
 * @param region 分析区域（可选，不传则全图操作）
 */
export const dilateRegion = (
  src: cv.Mat,
  kernelSize: number = 3,
  region: AnalysisRegion | null = null
): cv.Mat => {
  return processRegion(src, region, (roi) => {
    const dst = new cv.Mat()
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
    cv.dilate(roi, dst, kernel)
    kernel.delete()
    return dst
  })
}

/**
 * 区域腐蚀（缩小识别区域）
 * @param src 输入蒙版
 * @param kernelSize 核大小，默认3
 * @param region 分析区域（可选，不传则全图操作）
 */
export const erodeRegion = (
  src: cv.Mat,
  kernelSize: number = 3,
  region: AnalysisRegion | null = null
): cv.Mat => {
  return processRegion(src, region, (roi) => {
    const dst = new cv.Mat()
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
    cv.erode(roi, dst, kernel)
    kernel.delete()
    return dst
  })
}

/**
 * 蒙版反选
 * @param src 输入蒙版
 * @param kernelSize 核大小（占位，保持参数统一）
 * @param region 分析区域（可选，不传则全图操作）
 */
export const inverseMask = (
  src: cv.Mat,
  kernelSize?: number,
  region: AnalysisRegion | null = null
): cv.Mat => {
  return processRegion(src, region, (roi) => {
    const dst = new cv.Mat()
    cv.bitwise_not(roi, dst)
    return dst
  })
}