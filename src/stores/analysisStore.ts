import {defineStore} from 'pinia'
import {ref,shallowRef, markRaw} from 'vue'
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'
import { maskToVisual } from '@/utils/opencv'
import { copyMat, deleteMatSafe } from '@/utils/opencv/core'

// ----
//  类型定义
// ----
export type AnalysisMode='hole'|'crack'|'size'
export type RegionMode='full'|'rect'

// 有效性评价类型
export type ValidityType = 'effective' | 'semiEffective' | 'ineffective' | ''
// 充填物类型
export type FillingMaterial = 'mud' | 'calcite' | 'dolomite' | 'asphalt' | 'gypsum' | 'pyrite' | 'kaolinite' | 'quartz' | ''

export interface AnalysisRegion{
    x:number
    y:number
    width:number
    height:number
}

// 孔洞分析阈值
export interface HoleThreshold{
    minThreshold:number
    maxThreshold:number
}

// 裂缝分析阈值
export interface CrackThreshold{
    minWidth:number
    maxWidth:number
    minLength:number
    cannyLow:number
    cannyHigh:number
}

// 粒度分析阈值
export interface SizeThreshold{
    rockBrightnessThreshold:number
    coarseSensitivity:number
    fineSensitivity:number
}

// 单个孔洞详情（用于逐孔列表展示和编辑）
export interface HoleInfo{
    index:number            // 孔洞序号（从1开始）
    diameter:number         // 等效直径 mm
    area:number             // 面积 mm²
    centerX:number          // 孔洞中心 X（图像像素坐标）
    centerY:number          // 孔洞中心 Y（图像像素坐标）
    category:'large'|'medium'|'small'|'pinhole'
    validity:ValidityType   // 有效性评价
    fillingMaterial:FillingMaterial // 充填物类型
}

// 孔洞分析结果
export interface HoleResults{
    totalCount:number
    totalArea:number
    avgDiameter:number
    maxDiameter:number
    minDiameter:number
    faceRate:number
    largeCount:number
    mediumCount:number
    smallCount:number
    pinholeCount:number
    holeList:HoleInfo[]   // 逐孔详情列表
}

// 单个裂缝详情（用于逐条列表展示和编辑）
export interface CrackInfo{
    index:number            // 裂缝序号（从1开始）
    length:number           // 长度 mm
    width:number            // 宽度 mm
    area:number             // 面积 mm²
    centerX:number          // 裂缝中心 X（图像像素坐标）
    centerY:number          // 裂缝中心 Y（图像像素坐标）
    validity:ValidityType   // 有效性评价
    fillingMaterial:FillingMaterial // 充填物类型
}

// 裂缝分析结果
export interface CrackResults{
    totalCount:number
    totalLength:number
    avgWidth:number
    faceRate:number
    lineDensity:number
    areaDensity:number
    crackList:CrackInfo[]
}

// 粒度分析结果
export interface SizeResults{
    totalParticleCount:number
    avgParticleSize:number
    coarseParticleRatio:number
    fineParticleRatio:number
    particleUniformity:number
    rockParticleRate:number
}

// ----
// 岩心基础信息类型定义
// ----
export interface CoreBasicInfo{
    wellNo:string       //井号
    wellDepth:string    //井深
    horizon:string      //层位
    lithology:string    //岩性
    sampleDate:string   //取样日期
}

// ----
// Store 定义
// ----
export const useAnalysisStore=defineStore('analysis',()=>{
   // ----
   // 基础状态
   // ----
    const currentMode=ref<AnalysisMode>('hole')
    const regionMode=ref<RegionMode>('full')
    const isSelectingRegion=ref<boolean>(false)
    const isAnalyzing=ref<boolean>(false)
    const showMaskOverlay=ref<boolean>(true)
    const reportPreviewVisible=ref<boolean>(false)
    const isLoadingProject=ref<boolean>(false)

   // ----
   // 岩心基础信息状态
   // ----
    const coreBasicInfo=ref<CoreBasicInfo>({
        wellNo:'',
        wellDepth:'',
        horizon:'',
        lithology:'',
        sampleDate:new Date().toISOString().slice(0,10) // 默认当前日期
    })

   // ----
   // 蒙版核心状态（彻底拆分二值/可视化蒙版）
   // ----
    const analysisRegion=ref<AnalysisRegion>({x:0,y:0,width:0,height:0})
    // 可视化RGBA蒙版（仅用于画布显示，不参与计算）
    const targetMaskMat = shallowRef<cv.Mat | null>(null)
    // 单通道二值蒙版（仅用于计算，所有形态学操作都基于它）
    const binaryMaskMat = shallowRef<cv.Mat | null>(null)
    // 原图全图尺寸（用于生成全图大小的蒙版，确保坐标匹配）
    const sourceImageSize = ref<{ width: number, height: number }>({ width: 0, height: 0 })

   // ----
   // 阈值状态
   // ----
    const holeThreshold=ref<HoleThreshold>({minThreshold:0,maxThreshold:128})
    const crackThreshold=ref<CrackThreshold>({minWidth:0.1,maxWidth:10.0,minLength:1,cannyLow:50,cannyHigh:150})
    const sizeThreshold=ref<SizeThreshold>({rockBrightnessThreshold:80,coarseSensitivity:50,fineSensitivity:50})

   // ----
   // 颜色匹配状态（替代手动阈值，点击图片取色）
   // ----
    const colorMatchEnabled=ref<boolean>(false)
    const isPickingColor=ref<boolean>(false) // 是否正在等待用户在图片上点击取色
    const pickedColor=ref<{r:number,g:number,b:number}|null>(null)
    const colorMatchTolerance=ref<number>(30) // 匹配度 0-100，默认30
    const contiguousRegionEnabled=ref<boolean>(false) // 连续区域：只提取点击处连通区域
    const pickedColorImageX=ref<number>(0) // 取色点在图片上的像素坐标
    const pickedColorImageY=ref<number>(0)
    const currentHoverColor=ref<{r:number,g:number,b:number}|null>(null) // 鼠标悬停处像素颜色（实时显示）

   // ----
   // 分析结果状态
   // ----
    const holeResults=ref<HoleResults>({totalCount:0,totalArea:0,avgDiameter:0,maxDiameter:0,minDiameter:0,faceRate:0,largeCount:0,mediumCount:0,smallCount:0,pinholeCount:0,holeList:[]})
    const crackResults=ref<CrackResults>({totalCount:0,totalLength:0,avgWidth:0,faceRate:0,lineDensity:0,areaDensity:0,crackList:[]})
    const sizeResults=ref<SizeResults>({totalParticleCount:0,avgParticleSize:0,coarseParticleRatio:0,fineParticleRatio:0,particleUniformity:0,rockParticleRate:0})

   // ----
   // 鼠标悬停状态
   // ----
    // 悬停的孔洞索引（从1开始，null表示没有悬停）
    const hoveredHoleIndex = ref<number | null>(null)
    // 悬停的孔洞信息（用于Tooltip显示）
    const hoveredHoleInfo = ref<{
      index: number
      diameter: number
      area: number
      centerX: number
      centerY: number
    } | null>(null)

    // 定位状态（"查看孔洞详情"弹窗中点击"定位"触发，持久保持）
    const locatedHoleIndex = ref<number | null>(null)
    const locatedHoleInfo = ref<{
      index: number
      diameter: number
      area: number
      centerX: number
      centerY: number
    } | null>(null)

    // ----
    // 基础操作
    // ----
    const setMode=(mode:AnalysisMode)=>{
        currentMode.value=mode
        resetResults()
    }
    const setRegionMode=(mode:RegionMode)=>{
        regionMode.value=mode
        if(mode==='full') resetAnalysisRegion()
    }
    const setAnalysisRegion=(region:AnalysisRegion)=>{
        analysisRegion.value={...region}
    }
    const resetAnalysisRegion=()=>{
        analysisRegion.value={x:0,y:0,width:0,height:0}
    }
    const resetResults=()=>{
        holeResults.value={totalCount:0,totalArea:0,avgDiameter:0,maxDiameter:0,minDiameter:0,faceRate:0,largeCount:0,mediumCount:0,smallCount:0,pinholeCount:0,holeList:[]}
        crackResults.value={totalCount:0,totalLength:0,avgWidth:0,faceRate:0,lineDensity:0,areaDensity:0,crackList:[]}
        sizeResults.value={totalParticleCount:0,avgParticleSize:0,coarseParticleRatio:0,fineParticleRatio:0,particleUniformity:0,rockParticleRate:0}
    }
    const resetThresholds=()=>{
        holeThreshold.value={minThreshold:0,maxThreshold:128}
        crackThreshold.value={minWidth:0.1,maxWidth:10.0,minLength:1,cannyLow:50,cannyHigh:150}
        sizeThreshold.value={rockBrightnessThreshold:80,coarseSensitivity:50,fineSensitivity:50}
        colorMatchEnabled.value=false
        isPickingColor.value=false
        pickedColor.value=null
        colorMatchTolerance.value=30
        contiguousRegionEnabled.value=false
        pickedColorImageX.value=0
        pickedColorImageY.value=0
        currentHoverColor.value=null
    }
    const resetCoreBasicInfo=()=>{
        coreBasicInfo.value={
            wellNo:'',
            wellDepth:'',
            horizon:'',
            lithology:'',
            sampleDate:new Date().toISOString().slice(0,10)
        }
    }
    const setCoreBasicInfo=(info:CoreBasicInfo)=>{
        coreBasicInfo.value={...info}
    }
    
    // ----
    // 鼠标悬停操作
    // ----
    const setHoveredHoleInfo = (info: {
      index: number
      diameter: number
      area: number
      centerX: number
      centerY: number
    } | null) => {
      hoveredHoleInfo.value = info
      hoveredHoleIndex.value = info ? info.index : null
    }
    const clearHoveredHole = () => {
      hoveredHoleInfo.value = null
      hoveredHoleIndex.value = null
    }

    // 裂缝悬停状态
    const hoveredCrackIndex = ref<number | null>(null)
    const hoveredCrackInfo = ref<{
      index: number; length: number; width: number; centerX: number; centerY: number
    } | null>(null)
    const setHoveredCrackInfo = (info: {
      index: number; length: number; width: number; centerX: number; centerY: number
    } | null) => {
      hoveredCrackInfo.value = info
      hoveredCrackIndex.value = info ? info.index : null
    }
    const clearHoveredCrack = () => {
      hoveredCrackInfo.value = null
      hoveredCrackIndex.value = null
    }

    // 定位孔洞（弹窗"定位"按钮触发，持久保持）
    const setLocatedHole = (info: {
      index: number; diameter: number; area: number; centerX: number; centerY: number
    }) => {
      locatedHoleInfo.value = info
      locatedHoleIndex.value = info.index
    }
    const clearLocatedHole = () => {
      locatedHoleInfo.value = null
      locatedHoleIndex.value = null
    }

    // 裂缝定位状态（裂缝详情弹窗中点击"定位"触发）
    const locatedCrackIndex = ref<number | null>(null)
    const locatedCrackInfo = ref<{
      index: number; length: number; width: number; centerX: number; centerY: number
    } | null>(null)
    const setLocatedCrack = (info: {
      index: number; length: number; width: number; centerX: number; centerY: number
    }) => {
      locatedCrackInfo.value = info
      locatedCrackIndex.value = info.index
    }
    const clearLocatedCrack = () => {
      locatedCrackInfo.value = null
      locatedCrackIndex.value = null
    }

    // 画布点击选中孔洞（弹出属性编辑卡片）
    const selectedHoleIndex = ref<number | null>(null)
    const selectHole = (index: number) => {
      selectedHoleIndex.value = index
    }
    const clearHoleSelection = () => {
      selectedHoleIndex.value = null
    }

    // 画布点击选中裂缝
    const selectedCrackIndex = ref<number | null>(null)
    const selectCrack = (index: number) => {
      selectedCrackIndex.value = index
    }
    const clearCrackSelection = () => {
      selectedCrackIndex.value = null
    }
    
    const resetAll=()=>{
        currentMode.value='hole'
        regionMode.value='full'
        isSelectingRegion.value=false
        isAnalyzing.value=false
        showMaskOverlay.value=true
        resetAnalysisRegion()
        resetResults()
        resetThresholds()
        resetCoreBasicInfo()
        disposeMasks()
        clearHoveredHole()
        clearHoveredCrack()
        clearLocatedHole()
        clearLocatedCrack()
        clearHoleSelection()
        clearCrackSelection()
    }

    // ----
    // 蒙版操作历史（用于撤销/还原）
    // ----
    const maskHistory = ref<cv.Mat[]>([])
    const historyIndex = ref<number>(-1)
    const MAX_HISTORY_LENGTH = 20

    // ----
    // 蒙版内存管理辅助函数
    // ----
    
    /// 保持 historyIndex 在有效范围内
    const clampHistoryIndex = () => {
      historyIndex.value = Math.min(Math.max(historyIndex.value, -1), maskHistory.value.length - 1)
    }
    
    /// 丢弃未来历史记录（包括当前索引）
    const discardFutureHistory = () => {
      const from = historyIndex.value + 1
      if (from < maskHistory.value.length) {
        const removed = maskHistory.value.splice(from)
        removed.forEach(deleteMatSafe)
      }
    }

    /** 把新的二值蒙版推入历史记录 */
    const pushHistory = (newBinaryMask: cv.Mat) => {
      if(!newBinaryMask || newBinaryMask.empty()) return
      
      discardFutureHistory()
      const copy = copyMat(newBinaryMask)
      maskHistory.value.push(copy)
      historyIndex.value = maskHistory.value.length - 1

      if(maskHistory.value.length > MAX_HISTORY_LENGTH) {
        const oldest = maskHistory.value.shift()
        deleteMatSafe(oldest)
        historyIndex.value = Math.max(historyIndex.value - 1, 0)
      }
    }

    /** 安全替换双蒙版，严格区分可视化/二值蒙版 */
    const safeReplaceTarget = (newVisualMat: cv.Mat, newBinaryMat: cv.Mat) => {
      // 替换可视化蒙版
      const oldVisual = targetMaskMat.value
      targetMaskMat.value = markRaw(newVisualMat)
      deleteMatSafe(oldVisual)

      // 替换二值蒙版
      const oldBinary = binaryMaskMat.value
      binaryMaskMat.value = markRaw(newBinaryMat)
      deleteMatSafe(oldBinary)
    }

    /// 清空当前双蒙版
    const clearTargetMask = () => {
        deleteMatSafe(targetMaskMat.value)
        deleteMatSafe(binaryMaskMat.value)
        targetMaskMat.value = null
        binaryMaskMat.value = null
    }

    /** 释放所有蒙版资源并清空历史 */
    const disposeMasks = () => {
        clearTargetMask()
        // 清空历史
        if (maskHistory.value && maskHistory.value.length > 0) {
            maskHistory.value.forEach(deleteMatSafe)
            maskHistory.value.length = 0
        }
        historyIndex.value = -1
    }

    // ----
    // 蒙版操作相关方法
    // ----
    const saveMaskToHistory = () => {
      if (!binaryMaskMat.value || binaryMaskMat.value.empty()) return
      clampHistoryIndex()
      discardFutureHistory()
      pushHistory(binaryMaskMat.value)
    }

    /**
     * 分析完成后，初始化历史记录（必须在生成双蒙版后调用）
     */
    const initMaskHistory = () => {
        if(!binaryMaskMat.value || binaryMaskMat.value.empty()) return

        // 只清空历史，不释放当前蒙版
        if (maskHistory.value && maskHistory.value.length > 0) {
            maskHistory.value.forEach(deleteMatSafe)
            maskHistory.value.length = 0
        }
        historyIndex.value = -1

        // 把初始二值蒙版推入历史
        pushHistory(binaryMaskMat.value)
    }

    /**
     * 撤销
     */
    const undoMask = () => {
      if (historyIndex.value <= 0) {
        ElMessage.warning('没有可撤销的操作')
        return
      }
      
      historyIndex.value--
      const historyBinaryMask = maskHistory.value[historyIndex.value]
      if (!historyBinaryMask || historyBinaryMask.empty()) {
        ElMessage.warning('历史记录无效')
        return
      }

       // 用全图尺寸生成可视化蒙版
      const newBinaryMask = copyMat(historyBinaryMask)
      const { width, height } = sourceImageSize.value
      const newVisualMask = maskToVisual(newBinaryMask, {
        width,
        height
      })

      // 安全替换双蒙版
      safeReplaceTarget(newVisualMask, newBinaryMask)
      ElMessage.success('已撤销')
    }

    /**
     * 重做（还原撤销操作）
     */
    const redoMask = () => {
      if (historyIndex.value >= maskHistory.value.length - 1) {
        ElMessage.warning('没有可还原的操作')
        return
      }

      historyIndex.value++
      const historyBinaryMask = maskHistory.value[historyIndex.value]
      if (!historyBinaryMask || historyBinaryMask.empty()) {
        ElMessage.warning('历史记录无效')
        return
      }

       // 用全图尺寸生成可视化蒙版
      const newBinaryMask = copyMat(historyBinaryMask)
      const { width, height } = sourceImageSize.value
      const newVisualMask = maskToVisual(newBinaryMask, {
        width,
        height
      })

      // 第二个参数必须是二值蒙版
      safeReplaceTarget(newVisualMask, newBinaryMask)
      ElMessage.success('已还原')
    }

    /**
     * 更新蒙版（所有二次编辑操作的唯一入口）
     * @param newBinaryMask 新的单通道二值蒙版
     * @param saveHistory 是否保存历史，默认true
     */
    const updateMask = (newBinaryMask: cv.Mat, saveHistory: boolean = true) => {
      // 严格校验输入的二值蒙版
      if (!newBinaryMask || newBinaryMask.empty() || newBinaryMask.channels() !== 1) {
        ElMessage.warning('无效的蒙版输入')
        return
      }
       // 用原图全图尺寸生成可视化蒙版，而不是binaryMask的尺寸
      const { width, height } = sourceImageSize.value
        if (width === 0 || height === 0) {
          ElMessage.warning('原图尺寸无效')
          deleteMatSafe(newBinaryMask)
          return
        }
      // 从新的二值蒙版生成可视化蒙版
      const newVisualMask = maskToVisual(newBinaryMask, {
        width,
        height
      })

      // 安全替换双蒙版
      safeReplaceTarget(newVisualMask, newBinaryMask)

      // 保存到历史记录
      if (saveHistory) {
        pushHistory(binaryMaskMat.value!)
      }
    }

    /**
     * 重置蒙版到初始状态
     */
    const resetMaskToInitial = () => {
      if (!maskHistory.value || maskHistory.value.length === 0) {
        ElMessage.warning('没有历史蒙版可重置')
        return
      }
      const initialBinaryMask = maskHistory.value[0]
      if (!initialBinaryMask || initialBinaryMask.empty()) {
        ElMessage.warning('初始蒙版无效')
        return
      }
      // 用全图尺寸生成可视化蒙版
      const newBinaryMask = copyMat(initialBinaryMask)
       const { width, height } = sourceImageSize.value
      const newVisualMask = maskToVisual(newBinaryMask, {
        width,
        height
      })

      safeReplaceTarget(newVisualMask, newBinaryMask)
      historyIndex.value = 0
      ElMessage.success('已重置到初始状态')
    }

    // ----
    // 7. 暴露给组件的状态和方法
    // ----
  return {
    // 基础状态
    currentMode,
    regionMode,
    isSelectingRegion,
    isAnalyzing,
    // 分析区域
    analysisRegion,
    targetMaskMat,
    binaryMaskMat, // 导出二值蒙版
    sourceImageSize, // 原图全图尺寸
    // 岩心基础信息
    coreBasicInfo,
    // 阈值
    holeThreshold,
    crackThreshold,
    sizeThreshold,
    // 结果
    holeResults,
    crackResults,
    sizeResults,
    // 悬停状态
    hoveredHoleIndex,
    hoveredHoleInfo,
    locatedHoleIndex,
    locatedHoleInfo,
    locatedCrackIndex,
    locatedCrackInfo,
    // 方法
    setMode,
    setRegionMode,
    setAnalysisRegion,
    resetAnalysisRegion,
    resetResults,
    resetThresholds,
    resetCoreBasicInfo,
    setCoreBasicInfo,
    setHoveredHoleInfo,
    clearHoveredHole,
    hoveredCrackIndex,
    hoveredCrackInfo,
    setHoveredCrackInfo,
    clearHoveredCrack,
    setLocatedHole,
    clearLocatedHole,
    setLocatedCrack,
    clearLocatedCrack,
    selectedHoleIndex,
    selectHole,
    clearHoleSelection,
    selectedCrackIndex,
    selectCrack,
    clearCrackSelection,
    resetAll,
    showMaskOverlay,
    reportPreviewVisible,
    isLoadingProject,
    colorMatchEnabled,
    isPickingColor,
    pickedColor,
    colorMatchTolerance,
    contiguousRegionEnabled,
    pickedColorImageX,
    pickedColorImageY,
    currentHoverColor,
    clearTargetMask,
    saveMaskToHistory,
    undoMask,
    redoMask,
    updateMask,
    resetMaskToInitial,
    disposeMasks,
    initMaskHistory,
  }
})