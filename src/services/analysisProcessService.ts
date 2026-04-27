// 本函数用来 封装分析模式业务逻辑
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue'
//类型和函数分开导入
import type {
  AnalysisMode,
  AnalysisRegion,
  HoleThreshold,
  CrackThreshold,
  SizeThreshold,
  HoleResults,
  CrackResults,
  SizeResults,
  useAnalysisStore
} from '@/stores/analysisStore'
import {
  loadImageToMat,
  holeSegmentation,
  crackSegmentation,
  sizeSegmentation,
  maskToVisual
} from '@/utils/opencv'

/**
 * 实时预览：根据当前分析模式和阈值，生成目标蒙版
 * @param mode 当前分析模式
 * @param imageDataUrl 原图DataURL
 * @param threshold 对应模式的阈值
 * @param region 分析区域
 * @param targetMaskMat 从Store传入的蒙版Ref对象
 */
export const previewAnalysisMask = async (
  mode: AnalysisMode,
  imageDataUrl: string,
  threshold: HoleThreshold | CrackThreshold | SizeThreshold,
  region: AnalysisRegion,
  targetMaskMat: Ref<cv.Mat | null> // 明确是Ref类型
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

    // 正确修改Ref的.value属性！
    const oldMask = targetMaskMat.value // 先拿到旧的Mat值
    targetMaskMat.value = visualMask // 正确修改Ref的value，更新Store里的值
    
    // 安全释放旧蒙版内存
    if (oldMask !== null && !oldMask.empty()) {
      oldMask.delete()
    }

    // 5. 释放临时内存
    src.delete()
    if (binaryMask !== null && !binaryMask.empty()) {
      binaryMask.delete()
    }
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
        // 裂缝分析结果计算
        const binaryMask=crackSegmentation(src, threshold as CrackThreshold, region)
        const contours=new cv.MatVector()       
        const hierarchy=new cv.Mat()
        // 1. 查找裂缝轮廓
        cv.findContours(binaryMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
        
        // 2. 获取裂缝过滤参数
        const crackThresh=threshold as CrackThreshold
        const minWidth=crackThresh.minWidth
        const maxWidth=crackThresh.maxWidth
        const minLength=crackThresh.minLength
        const pixelToMm=0.1 // 默认1像素=0.1mm，后续对接标尺设置

        // 3. 计算裂缝参数
        let totalCount=0 
        let totalLength=0
        let totalWidth=0 
        let totalCrackArea=0 

        for(let i=0;i<contours.size();i++){
          const contour=contours.get(i)
          //计算裂缝长度(弧长,不考虑方向)
          const length=cv.arcLength(contour,false)*pixelToMm
          if(length<minLength) continue // 过滤长度小于最小值的裂缝

          //计算裂缝宽度(用最小外接矩形的短边近似)
          const rect=cv.minAreaRect(contour)
          const width=Math.min(rect.size.width,rect.size.height)*pixelToMm
          if(width<minWidth||width>maxWidth) continue // 过滤宽度不在范围的裂缝

          //计算裂缝面积(用最小外接矩形的面积)
          const area=cv.contourArea(contour)*pixelToMm*pixelToMm

          //统计符合条件的裂缝
          totalCount++
          totalLength+=length
          totalWidth+=width
          totalCrackArea+=area
        }
        //4.计算分析区域总面积(平方毫米)
        const regionAreaMm2=region.width>0
        ? region.width*region.height*pixelToMm*pixelToMm
        :width*height*pixelToMm*pixelToMm
        // 分析区域面积转成平方米（1平方米 = 1000000平方毫米）
        const regionAreaM2=regionAreaMm2/1000000
        // 裂缝总长度转成米
        const totalLengthM = totalLength / 1000
        
        //5.计算分析区域对角线长度（用于线密度，单位：米）
        const regionDiagonalLength=region.width>0
        ? Math.sqrt(region.width*region.width+region.height*region.height)*pixelToMm/1000
        : Math.sqrt(width*width+height*height)*pixelToMm/1000

        //6.组装结果
        results = {
          totalCount: totalCount,
          totalLength: Number(totalLength.toFixed(4)),
          avgWidth: totalCount>0? Number((totalWidth/totalCount).toFixed(4)):0,
          faceRate: Number(((totalCrackArea/regionAreaMm2)*100).toFixed(2)),
          lineDensity: regionDiagonalLength>0 ?Number((totalCount/regionDiagonalLength).toFixed(4)):0, //条/m
          areaDensity: regionAreaM2>0 ? Number((totalLengthM/regionAreaM2).toFixed(4)):0 // //m/m²
        } as CrackResults
        //7.释放内存
        binaryMask.delete()
        contours.delete()
        hierarchy.delete()
        break
      }

      case 'size': {
        // 粒度分析结果计算
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
    return null
  }
}