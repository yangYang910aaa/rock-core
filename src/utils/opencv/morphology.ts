// 【预留】形态学操作工具（二次编辑：区域去噪、孔洞填充、膨胀、腐蚀等）
import cv from '@techstark/opencv-js'

/**
 * 区域去噪（开运算）
 */
export const denoiseRegion = (src: cv.Mat, kernelSize: number = 3): cv.Mat => {
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize))
  cv.morphologyEx(src, dst, cv.MORPH_OPEN, kernel)
  kernel.delete()
  return dst
}

/**
 * 孔洞填充（闭运算）
 */
export const fillHoles = (src: cv.Mat, kernelSize: number = 5): cv.Mat => {
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize))
  cv.morphologyEx(src, dst, cv.MORPH_CLOSE, kernel)
  kernel.delete()
  return dst
}

/**
 * 区域膨胀
 */
export const dilateRegion = (src: cv.Mat, kernelSize: number = 3): cv.Mat => {
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
  cv.dilate(src, dst, kernel)
  kernel.delete()
  return dst
}

/**
 * 区域腐蚀
 */
export const erodeRegion = (src: cv.Mat, kernelSize: number = 3): cv.Mat => {
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
  cv.erode(src, dst, kernel)
  kernel.delete()
  return dst
}