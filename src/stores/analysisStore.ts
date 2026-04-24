import {defineStore} from 'pinia'
import {ref} from 'vue'
import cv from '@techstark/opencv-js'
// ==========================================
// 1. 类型定义
// ==========================================
//分析模式类型
export type AnalysisMode='hole'|'crack'|'size' //孔洞、裂缝、粒度
//区域选择模式类型
export type RegionMode='full'|'rect' //全图、矩形区域
//分析类型区域
export interface AnalysisRegion{
    x:number//左上角x坐标
    y:number//左上角y坐标
    width:number//宽度
    height:number//高度
}
// ==========================================
// 2. 阈值类型定义
// ==========================================

// 孔洞分析阈值
export interface HoleThreshold{
    colorMatch:number//颜色匹配度(0-100)
    minThreshold:number//最小阈值(0-255)
    maxThreshold:number//最大阈值(0-255)
}

//裂缝分析阈值
export interface CrackThreshold{
    minWidth:number//最小裂缝宽度(0-1)
    maxWidth:number//最大裂缝宽度(0-1)
    minLength:number//最小裂缝长度(像素)
}

//粒度分析阈值
export interface SizeThreshold{
    minSize:number//最小粒径(0-1)
    maxSize:number//最大粒径(0-1)
    gradeCount:number//粒度等级数量
}

// ==========================================
// 3. 分析结果类型定义
// ==========================================

///孔洞分析结果
export interface HoleResults{
    totalCount:number//孔洞总数
    totalArea:number//孔洞总面积(mm²)
    avgDiameter:number//平均孔径(mm)
    maxDiameter:number//最大孔径(mm)
    minDiameter:number//最小孔径(mm)
    faceRate:number//面孔率(%)
}

///裂缝分析结果
export interface CrackResults{
    totalCount:number//裂缝总数
    totalLength:number//裂缝总长度(mm)
    avgWidth:number//平均裂缝宽度(mm)
    faceRate:number//裂缝面孔率(%)
    lineDensity:number//线密度(条/m)
    areaDensity:number//面密度(m/m²)
}

///粒度分析结果
export interface SizeResults{
    avgSize:number//平均粒径(mm)
    sortingCoefficient:number//分选系数
    distribution:number[]//粒度分布(每级的百分比)
}

// ==========================================
// 4. Store 定义
// ==========================================

export const useAnalysisStore=defineStore('analysis',()=>{
   // ==========================================
   // 4.1 基础状态
   // ==========================================
    const currentMode=ref<AnalysisMode>('hole')//当前分析模式,默认孔洞分析
    const regionMode=ref<RegionMode>('full')//区域选择模式,默认全图
    const isSelectingRegion=ref<boolean>(false)//是否正在选择区域
    const isAnalyzing=ref<boolean>(false)//是否正在分析图像
   // ==========================================
   // 4.2 分析区域状态
   // ==========================================
    const analysisRegion=ref<AnalysisRegion>({
        x:0,
        y:0,
        width:0,
        height:0,
    })
    const targetMaskMat = ref<cv.Mat | null>(null)//目标区域掩码
   // ==========================================
   // 4.3 阈值状态
   // ==========================================
    const holeThreshold=ref<HoleThreshold>({
        colorMatch:50,
        minThreshold:0,
        maxThreshold:128,//默认阈值
    })
    const crackThreshold=ref<CrackThreshold>({
        minWidth:0.1,
        maxWidth:5.0,
        minLength:10,//默认阈值
    })
    const sizeThreshold=ref<SizeThreshold>({
        minSize:0.1,
        maxSize:10.0,
        gradeCount:5,//默认粒度等级数量
    })
   // ==========================================
   // 4.4 分析结果状态
   // ==========================================
    const holeResults=ref<HoleResults>({
        totalCount:0,
        totalArea:0,
        avgDiameter:0,
        maxDiameter:0,
        minDiameter:0,
        faceRate:0,
    })
    const crackResults=ref<CrackResults>({
        totalCount:0,
        totalLength:0,
        avgWidth:0,
        faceRate:0,
        lineDensity:0,
        areaDensity:0,
    })
    const sizeResults=ref<SizeResults>({
        avgSize:0,
        sortingCoefficient:0,
        distribution:[],
    })
    // ==========================================
    // 5. 基础操作
    // ==========================================
    
    //设置分析模式
    const setMode=(mode:AnalysisMode)=>{
        currentMode.value=mode
        //切换模式时重置结果
        resetResults()
    }
    //设置区域选择模式
    const setRegionMode=(mode:RegionMode)=>{
        regionMode.value=mode
        if(mode==='full'){
        //全图模式时重置分析区域
        resetAnalysisRegion()
        }
    }
    //设置分析区域
    const setAnalysisRegion=(region:AnalysisRegion)=>{
        analysisRegion.value={...region}
    }
    //重置分析区域
    const resetAnalysisRegion=()=>{
        analysisRegion.value={
            x:0,
            y:0,
            width:0,
            height:0,
        }
    }
    //重置所有分析结果
    const resetResults=()=>{
        holeResults.value={
            totalCount:0,
            totalArea:0,
            avgDiameter:0,
            maxDiameter:0,
            minDiameter:0,
            faceRate:0,
        }
        crackResults.value={
            totalCount:0,
            totalLength:0,
            avgWidth:0,
            faceRate:0,
            lineDensity:0,
            areaDensity:0,
        }
        sizeResults.value={
            avgSize:0,
            sortingCoefficient:0,
            distribution:[],
        }
    }
    //重置所有阈值
    const resetThresholds=()=>{
        holeThreshold.value={
            colorMatch:50,
            minThreshold:0,
            maxThreshold:128,//默认阈值
        }
        crackThreshold.value={
            minWidth:0.1,
            maxWidth:5.0,
            minLength:10,//默认阈值
        }
        sizeThreshold.value={
            minSize:0.1,
            maxSize:10.0,
            gradeCount:5,//默认粒度等级数量
        }
    }
    //重置全部状态
    const resetAll=()=>{
        currentMode.value='hole'
        regionMode.value='full'
        isSelectingRegion.value=false
        isAnalyzing.value=false
        resetAnalysisRegion()
        resetResults()
        resetThresholds()
           // 重置蒙版时释放内存
        if (targetMaskMat.value) {
            targetMaskMat.value.delete()
            targetMaskMat.value = null
        }
    }
    // ==========================================
    // 6. 暴露给组件的状态和方法
    // ==========================================
  return {
    // 基础状态
    currentMode,
    regionMode,
    isSelectingRegion,
    isAnalyzing,
    // 分析区域
    analysisRegion,
    targetMaskMat,
    // 阈值
    holeThreshold,
    crackThreshold,
    sizeThreshold,
    // 结果
    holeResults,
    crackResults,
    sizeResults,
    // 方法
    setMode,
    setRegionMode,
    setAnalysisRegion,
    resetAnalysisRegion,
    resetResults,
    resetThresholds,
    resetAll
  }
})