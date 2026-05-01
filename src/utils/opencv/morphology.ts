// 形态学操作工具（二次编辑：区域去噪、孔洞填充、膨胀、腐蚀、反选等）
import cv from '@techstark/opencv-js'

/**
 * 区域去噪（开运算：先腐蚀后膨胀，去除小噪点）
 * @param src 输入蒙版
 * @param kernelSize 核大小，默认3
 */
export const denoiseRegion = (src: cv.Mat, kernelSize: number = 3): cv.Mat => {
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize))
  cv.morphologyEx(src, dst, cv.MORPH_OPEN, kernel)
  kernel.delete()
  return dst
}

/**
 * 真正的孔洞填充
 * 原理：从图片边缘开始漫水填充，然后反选得到填充后的孔洞
 * @param src 输入蒙版
 */
export const fillHoles = (src: cv.Mat): cv.Mat => {
  const dst = new cv.Mat()
  src.copyTo(dst)
  //1. 创建一个比原图大2像素的临时蒙版,用于漫水填充
  const mask = cv.Mat.zeros(dst.rows + 2, dst.cols + 2, cv.CV_8UC1)

  //2. 从图片的四个边缘开始漫水填充
  //填充白色背景(0值区域)
  for (let y = 0; y < dst.rows; y++) {
    if(dst.ucharAt(y,0) === 0) {
      cv.floodFill(dst, mask, new cv.Point(0, y), new cv.Scalar(255))
    }
    if(dst.ucharAt(y,dst.cols-1) === 0) {
      cv.floodFill(dst, mask, new cv.Point(dst.cols - 1, y), new cv.Scalar(255))
    }
  }
  for (let x = 0; x < dst.cols; x++) {
    if(dst.ucharAt(0,x) === 0) {
      cv.floodFill(dst, mask, new cv.Point(x, 0), new cv.Scalar(255))
    }
    if(dst.ucharAt(dst.rows-1,x) === 0) { 
      cv.floodFill(dst, mask, new cv.Point(x, dst.rows - 1), new cv.Scalar(255))
    }
  }
  //3. 反选得到填充后的孔洞
  cv.bitwise_not(dst, dst)

  //4. 和原图合并,保留原图的白色区域,填充孔洞
  cv.bitwise_and(src, dst, dst)
  mask.delete()
  return dst
}

/**
 * 区域膨胀（扩大识别区域）
 * @param src 输入蒙版
 * @param kernelSize 核大小，默认3
 */
export const dilateRegion = (src: cv.Mat, kernelSize: number = 3): cv.Mat => {
  const dst=new cv.Mat()
  const kernel=cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
  cv.dilate(src, dst, kernel)
  kernel.delete()
  return dst
}

/**
 * 区域腐蚀（缩小识别区域）
 * @param src 输入蒙版
 * @param kernelSize 核大小，默认3
 */
export const erodeRegion = (src: cv.Mat, kernelSize: number = 3): cv.Mat => {
  const dst=new cv.Mat()
  const kernel=cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
  cv.erode(src, dst, kernel)
  kernel.delete()
  return dst
}

/**
 * 蒙版反选
 * @param src 输入蒙版
 */
export const inverseMask = (src: cv.Mat): cv.Mat => {
  const dst = new cv.Mat()
  cv.bitwise_not(src, dst)
  return dst
}
