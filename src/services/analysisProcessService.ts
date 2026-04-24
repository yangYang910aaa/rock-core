// src/services/analysisProcessService.ts
// 本函数用来 封装分析模式业务逻辑
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue' // 新增：引入Ref类型
import type {
  AnalysisMode,
  AnalysisRegion,
  HoleThreshold,
  CrackThreshold,
  SizeThreshold,
  HoleResults,
  CrackResults,
  SizeResults
} from '@/stores/analysisStore'
import {
  loadImageToMat,
  holeSegmentation,
  crackSegmentation,
  sizeSegmentation,
  maskToVisual
} from '@/utils/opencv' // 【关键修改】改成新路径

/**
 * 实时预览：根据当前分析模式和阈值，生成目标蒙版
 * @param mode 当前分析模式
 * @param imageDataUrl 原图DataURL
 * @param threshold 对应模式的阈值
 * @param region 分析区域
 * @param targetMaskMat 从组件传入的蒙版Ref（关键修改）
 */
export const previewAnalysisMask = async (
  mode: AnalysisMode,
  imageDataUrl: string,
  threshold: HoleThreshold | CrackThreshold | SizeThreshold,
  region: AnalysisRegion,
  targetMaskMat: Ref<cv.Mat | null> // 新增参数
) => {
  try {
    // 1. 加载原图
    const { src, width, height } = await loadImageToMat(imageDataUrl)
    let binaryMask: cv.Mat | null = null

    // 2. 根据分析模式执行分割
    switch (mode) {
      case 'hole':
        binaryMask = holeSegmentation(src, threshold as HoleThreshold, region)
        break
      case 'crack':
        binaryMask = crackSegmentation(src, threshold as CrackThreshold, region)
        break
      case 'size':
        const { mask } = sizeSegmentation(src, threshold as SizeThreshold, region)
        binaryMask = mask
        break
      default:
        throw new Error('未支持的分析模式')
    }

    // 3. 生成可视化红色蒙版
    const visualMask = maskToVisual(binaryMask, { width, height }, region)

    // 4. 更新蒙版，释放内存（无报错写法）
    targetMaskMat.value?.delete()
    targetMaskMat.value = visualMask

    // 5. 释放内存
    src.delete()
    binaryMask.delete()

    return true
  } catch (error: any) {
    console.error('预览蒙版失败:', error)
    return false
  }
}


/**
 * 执行完整分析，计算分析结果
 * @param mode 当前分析模式
 * @param imageDataUrl 原图DataURL
 * @param threshold 对应模式的阈值
 * @param region 分析区域
 * @param pixelToMm 像素转毫米系数（标尺设置）
 * @returns 对应模式的分析结果
 */
export const executeFullAnalysis = async (
  mode: AnalysisMode,
  imageDataUrl: string,
  threshold: HoleThreshold | CrackThreshold | SizeThreshold,
  region: AnalysisRegion,
  pixelToMm: number = 0.1 // 默认1像素=0.1mm，后续对接标尺设置
): Promise<HoleResults | CrackResults | SizeResults | null> => {
  try {
    ElMessage.info('开始分析，请稍候...')
    const { src, width, height } = await loadImageToMat(imageDataUrl)
    let results: HoleResults | CrackResults | SizeResults | null = null

    switch (mode) {
      case 'hole': {
        // 孔洞分析结果计算
        const binaryMask = holeSegmentation(src, threshold as HoleThreshold, region)
        const contours = new cv.MatVector()
        const hierarchy = new cv.Mat()
        cv.findContours(binaryMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        // 计算孔洞参数
        let totalArea = 0
        let maxDiameter = 0
        let minDiameter = Infinity
        const diameters: number[] = []

        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i)
          const area = cv.contourArea(contour)
          if (area < 10) continue // 过滤极小噪点

          // 计算等效直径
          const diameter = Math.sqrt(4 * area / Math.PI) * pixelToMm
          totalArea += area * pixelToMm * pixelToMm
          diameters.push(diameter)
          maxDiameter = Math.max(maxDiameter, diameter)
          minDiameter = Math.min(minDiameter, diameter)
        }

        // 计算分析区域总面积
        const regionArea = region.width > 0
          ? region.width * region.height * pixelToMm * pixelToMm
          : width * height * pixelToMm * pixelToMm

        // 组装结果
        results = {
          totalCount: diameters.length,
          totalArea: Number(totalArea.toFixed(4)),
          avgDiameter: diameters.length > 0 ? Number((diameters.reduce((a, b) => a + b, 0) / diameters.length).toFixed(4)) : 0,
          maxDiameter: Number(maxDiameter.toFixed(4)),
          minDiameter: minDiameter === Infinity ? 0 : Number(minDiameter.toFixed(4)),
          faceRate: Number(((totalArea / regionArea) * 100).toFixed(2))
        } as HoleResults

        // 释放内存
        binaryMask.delete()
        contours.delete()
        hierarchy.delete()
        break
      }

      case 'crack': {
        // 裂缝分析结果计算（后续完善，先预留框架）
        results = {
          totalCount: 0,
          totalLength: 0,
          avgWidth: 0,
          faceRate: 0,
          lineDensity: 0,
          areaDensity: 0
        } as CrackResults
        break
      }

      case 'size': {
        // 粒度分析结果计算（后续完善，先预留框架）
        results = {
          avgSize: 0,
          sortingCoefficient: 0,
          distribution: []
        } as SizeResults
        break
      }
    }

    // 释放原图内存
    src.delete()
    ElMessage.success('分析完成！')
    return results
  } catch (error: any) {
    ElMessage.error(`分析失败：${error.message}`)
    console.error('分析失败:', error)
    return null
  }
}