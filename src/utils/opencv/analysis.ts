// 分析模式工具函数
import cv from '@techstark/opencv-js'
import type {
  AnalysisRegion,
  HoleThreshold,
  CrackThreshold,
  ParticleThreshold
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
    cv.cvtColor(roiSrc, gray, cv.COLOR_RGBA2GRAY)
    
    //创建单通道Mat作为上下界，匹配inRange的类型要求
    const lowerBound = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(threshold.minThreshold))
    const upperBound = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(threshold.maxThreshold))
    
    cv.inRange(gray, lowerBound, upperBound, binary)
    
    // 用完立即释放临时Mat，避免内存泄漏
    lowerBound.delete()
    upperBound.delete()

    //卷积核大小3x3
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
    cv.cvtColor(roiSrc, gray, cv.COLOR_RGBA2GRAY)
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

    // 7. 排除孔洞区域：先用固定阈值检测暗区（孔洞），膨胀后从裂缝掩码中去除
    const holeMask = new cv.Mat()
    const lower = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(0))
    const upper = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(80))
    cv.inRange(gray, lower, upper, holeMask)
    lower.delete()
    upper.delete()
    const kernelHole = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
    cv.dilate(holeMask, holeMask, kernelHole)
    kernelHole.delete()
    cv.bitwise_not(holeMask, holeMask)
    cv.bitwise_and(dst, holeMask, dst)
    holeMask.delete()

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
 * 完整岩心粒度分析
 * 核心：所有参数可通过界面滑块实时调整，和孔洞/裂缝分析交互一致
 */
export const particleSegmentation = (
  src: cv.Mat,
  threshold: ParticleThreshold,
  region: AnalysisRegion
): { mask: cv.Mat,rockMask: cv.Mat, contours: cv.MatVector, hierarchy: cv.Mat } => {
  const roiSrc = cropAnalysisRegion(src, region)
  const gray = new cv.Mat()
  const blurBase = new cv.Mat()// 基础去噪
  const voidMask = new cv.Mat() // 空隙/裂缝
  const rockMask = new cv.Mat() // 岩石实体
  const textureMask = new cv.Mat()
  const finalMask = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {

    // 1. 预处理：转灰度图 + 基础去噪
    cv.cvtColor(roiSrc, gray, cv.COLOR_RGBA2GRAY)
    cv.medianBlur(gray, blurBase, 3)
    //先检查裁剪后的图像是否有效
    if (roiSrc.empty()) {
      throw new Error('裁剪后的分析区域为空')
    }
    //2.从阈值参数读取岩石亮度阈值，分离岩石和空隙
    const {rockBrightnessThreshold,coarseSensitivity,fineSensitivity} = threshold
    cv.threshold(blurBase, voidMask, rockBrightnessThreshold, 255, cv.THRESH_BINARY_INV)
    // 取反得到岩石实体掩码：只在岩石实体上做粒度分析
    cv.bitwise_not(voidMask, rockMask)

    //3. 粗颗粒灵敏度：把0-100的滑块值，转换成对应的阈值
    const coarseThreshold = Math.max(2,20-(coarseSensitivity/100)*15) //灵敏度越高,阈值越低,越容易检测到粗颗粒
    const coarseKernelSize=11+Math.floor((coarseSensitivity/100)*7)*2 //11-25的核大小
    const coarseBlur = new cv.Mat()
    const coarseDiff = new cv.Mat()
    cv.GaussianBlur(blurBase, coarseBlur, new cv.Size(coarseKernelSize, coarseKernelSize), 0)
    cv.absdiff(blurBase, coarseBlur, coarseDiff)
    cv.threshold(coarseDiff, coarseDiff, coarseThreshold, 255, cv.THRESH_BINARY)
    coarseBlur.delete()

    //4. 细颗粒灵敏度：把0-100的滑块值，转换成对应的阈值
    const fineThreshold = Math.max(1,10-(fineSensitivity/100)*8) //灵敏度越高,阈值越低,越容易检测到细颗粒
    const fineKernelSize=3+Math.floor((fineSensitivity/100)*4)*2 //3-11的核大小
    const fineBlur = new cv.Mat()
    const fineDiff = new cv.Mat()
    cv.GaussianBlur(blurBase, fineBlur, new cv.Size(fineKernelSize, fineKernelSize), 0)
    cv.absdiff(blurBase, fineBlur, fineDiff)
    cv.threshold(fineDiff, fineDiff, fineThreshold, 255, cv.THRESH_BINARY)
    fineBlur.delete()

    // 5.合并纹理，只保留岩石实体区域
    cv.add(coarseDiff, fineDiff, textureMask)
    cv.bitwise_and(textureMask, rockMask, textureMask) //排除空隙区域
    coarseDiff.delete()
    fineDiff.delete()

    // 6. 形态学优化：先去噪，再闭合连接同一颗粒内的碎片
    const kernelClean = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(2, 2))
    cv.morphologyEx(textureMask, textureMask, cv.MORPH_OPEN, kernelClean)
    kernelClean.delete()
    const kernelClose = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
    cv.morphologyEx(textureMask, textureMask, cv.MORPH_CLOSE, kernelClose)
    kernelClose.delete()

    // 7. 距离变换分离粘连颗粒：距离 > 阈值的内部区域作为"核心区"，从原始掩码中挖去，自然切断粘连桥
    const dist = new cv.Mat()
    cv.distanceTransform(textureMask, dist, cv.DIST_L2, 3)
    const kernels = new cv.Mat()
    cv.threshold(dist, kernels, 3, 255, cv.THRESH_BINARY) // 离边缘 ≥3px 的区域
    kernels.convertTo(kernels, cv.CV_8U)
    dist.delete()
    // 从原始掩码中扣除核心区，仅保留边缘带；粘连桥会在这一步被切断
    cv.subtract(textureMask, kernels, finalMask)
    kernels.delete()
    // 轻微闭合连接受切割影响的同一颗粒碎片
    const kernelRepair = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(2, 2))
    cv.morphologyEx(finalMask, finalMask, cv.MORPH_CLOSE, kernelRepair)
    kernelRepair.delete()

    // 8. 排除孔洞区域：灰度图暗区 → 膨胀 → 反转 → 盖掉孔洞内部的颗粒轮廓
    const holeMask = new cv.Mat()
    const lower = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(0))
    const upper = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(80))
    cv.inRange(gray, lower, upper, holeMask)
    lower.delete()
    upper.delete()
    const kernelHole = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
    cv.dilate(holeMask, holeMask, kernelHole)
    kernelHole.delete()
    cv.bitwise_not(holeMask, holeMask)
    cv.bitwise_and(finalMask, holeMask, finalMask)
    holeMask.delete()

    // 9. 提取颗粒轮廓
    cv.findContours(finalMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    return { mask: finalMask,rockMask:rockMask.clone(), contours, hierarchy }
  } catch (error) {
    console.error('粒度分析失败:', error)
    const emptyMask = new cv.Mat()
    const emptyContours = new cv.MatVector()
    const emptyHierarchy = new cv.Mat()
    return { mask: emptyMask,rockMask: rockMask.clone(), contours: emptyContours, hierarchy: emptyHierarchy }
  } finally {
    // 释放所有中间内存
     if (!roiSrc.empty()) roiSrc.delete()
    if (!gray.empty()) gray.delete()
    if (!blurBase.empty()) blurBase.delete()
    if (!voidMask.empty()) voidMask.delete()
    // rockMask不能在这里释放，要返回给上层使用
    if (!textureMask.empty()) textureMask.delete()
  }
}

// 颜色距离容差转 inRange 边界值：容差 0 ≈ 精确匹配，100 ≈ 全图
const toleranceToBounds = (val: number, tolerance: number): [number, number] => {
  const halfRange = Math.round((tolerance / 100) * 128)
  return [Math.max(0, val - halfRange), Math.min(255, val + halfRange)]
}

/** 【孔洞分析】颜色匹配分割：点击取色 + 容差滑块，替代手动灰度阈值 */
export const colorHoleSegmentation = (
  src: cv.Mat,
  pickedColor: { r: number; g: number; b: number },
  tolerance: number,
  region: AnalysisRegion,
  contiguousRegion?: boolean,
  clickX?: number,
  clickY?: number
): cv.Mat => {
  const roiSrc = cropAnalysisRegion(src, region)
  const rgb = new cv.Mat()
  const binary = new cv.Mat()
  const dst = new cv.Mat()

  try {
    // cv.imread(canvas) 返回 RGBA 四通道；cv.inRange 需要三通道，先去掉 Alpha
    if (roiSrc.channels() === 4) {
      cv.cvtColor(roiSrc, rgb, cv.COLOR_RGBA2RGB)
    } else {
      roiSrc.copyTo(rgb)
    }

    const [rLow, rHigh] = toleranceToBounds(pickedColor.r, tolerance)
    const [gLow, gHigh] = toleranceToBounds(pickedColor.g, tolerance)
    const [bLow, bHigh] = toleranceToBounds(pickedColor.b, tolerance)

    // cv.imread(canvas) 返回 RGBA，通道顺序为 R,G,B → Scalar(r, g, b)
    const lowerBound = new cv.Mat(1, 1, cv.CV_8UC3, new cv.Scalar(rLow, gLow, bLow))
    const upperBound = new cv.Mat(1, 1, cv.CV_8UC3, new cv.Scalar(rHigh, gHigh, bHigh))
    cv.inRange(rgb, lowerBound, upperBound, binary)
    lowerBound.delete()
    upperBound.delete()

    // 连续区域：floodFill 从点击坐标扩展，仅保留连通的匹配区域
    if (contiguousRegion && clickX !== undefined && clickY !== undefined) {
      const roiX = region.width > 0 ? clickX - region.x : clickX
      const roiY = region.height > 0 ? clickY - region.y : clickY
      if (roiX >= 0 && roiY >= 0 && roiX < binary.cols && roiY < binary.rows) {
        // floodFill 直接修改 binary：把 255 改写为 128，loDiff/upDiff=0 限制只在同值像素扩散
        const mask = new cv.Mat(binary.rows + 2, binary.cols + 2, cv.CV_8UC1, new cv.Scalar(0))
        cv.floodFill(binary, mask, new cv.Point(roiX, roiY), new cv.Scalar(128), new cv.Rect(), new cv.Scalar(0), new cv.Scalar(0), 4)
        mask.delete()
        // 只保留被标记为 128 的连通分量
        const lower = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(128))
        const upper = new cv.Mat(1, 1, cv.CV_8UC1, new cv.Scalar(128))
        cv.inRange(binary, lower, upper, binary)
        lower.delete()
        upper.delete()
      }
    }

    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
    cv.morphologyEx(binary, dst, cv.MORPH_CLOSE, kernel)
    cv.morphologyEx(dst, dst, cv.MORPH_OPEN, kernel)
    kernel.delete()
    return dst
  } finally {
    roiSrc.delete()
    if (!rgb.empty()) rgb.delete()
    if (!binary.empty()) binary.delete()
  }
}