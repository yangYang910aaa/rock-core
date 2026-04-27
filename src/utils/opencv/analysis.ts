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
 * 完整岩心粒度分析
 * 核心：所有参数可通过界面滑块实时调整，和孔洞/裂缝分析交互一致
 */
export const sizeSegmentation = (
  src: cv.Mat,
  threshold: SizeThreshold,
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
    console.log('🔄 开始岩心粒度分析（实体颗粒提取）...')

    // 1. 预处理：转灰度图 + 基础去噪
    cv.cvtColor(roiSrc, gray, cv.COLOR_BGRA2GRAY)
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
    console.log('✅ 岩石实体区域分离完成，已排除空隙裂缝')

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
    cv.bitwise_and(textureMask, rockMask, textureMask) // 关键：排除空隙区域
    coarseDiff.delete()
    fineDiff.delete()
    console.log('✅ 岩石颗粒纹理提取完成')

    // 6. 形态学优化：去除噪点，连接颗粒轮廓
    const kernelClose = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(4, 4))
    cv.morphologyEx(textureMask, finalMask, cv.MORPH_CLOSE, kernelClose)
    kernelClose.delete()

    const kernelOpen = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(2, 2))
    cv.morphologyEx(finalMask, finalMask, cv.MORPH_OPEN, kernelOpen)
    kernelOpen.delete()

    // 7. 提取颗粒轮廓
    cv.findContours(finalMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    console.log('✅ 粒度分析完成，检测到岩石颗粒区域数：', contours.size())

    return { mask: finalMask,rockMask:rockMask.clone(), contours, hierarchy }
  } catch (error) {
    console.error('❌ 粒度分析失败:', error)
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
    // 注意：rockMask不能在这里释放，要返回给上层使用
    if (!textureMask.empty()) textureMask.delete()
  }
}