import {defineStore} from 'pinia'
import {ref,shallowRef, markRaw} from 'vue'
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'
import { maskToVisual } from '@/utils/opencv'
import { copyMat, deleteMatSafe } from '@/utils/opencv/core'

// ==========================================
// 1. 类型定义
// ==========================================
export type AnalysisMode='hole'|'crack'|'size'
export type RegionMode='full'|'rect'
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

// 孔洞分析结果
export interface HoleResults{
    totalCount:number
    totalArea:number
    avgDiameter:number
    maxDiameter:number
    minDiameter:number
    faceRate:number
}

// 裂缝分析结果
export interface CrackResults{
    totalCount:number
    totalLength:number
    avgWidth:number
    faceRate:number
    lineDensity:number
    areaDensity:number
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

// ==========================================
// 4. Store 定义
// ==========================================
export const useAnalysisStore=defineStore('analysis',()=>{
   // ==========================================
   // 4.1 基础状态
   // ==========================================
    const currentMode=ref<AnalysisMode>('hole')
    const regionMode=ref<RegionMode>('full')
    const isSelectingRegion=ref<boolean>(false)
    const isAnalyzing=ref<boolean>(false)

   // ==========================================
   // 4.2 蒙版核心状态（彻底拆分二值/可视化蒙版）
   // ==========================================
    const analysisRegion=ref<AnalysisRegion>({x:0,y:0,width:0,height:0})
    // 可视化RGBA蒙版（仅用于画布显示，不参与计算）
    const targetMaskMat = shallowRef<cv.Mat | null>(null)
    // 单通道二值蒙版（仅用于计算，所有形态学操作都基于它）
    const binaryMaskMat = shallowRef<cv.Mat | null>(null)

   // ==========================================
   // 4.3 阈值状态
   // ==========================================
    const holeThreshold=ref<HoleThreshold>({minThreshold:0,maxThreshold:128})
    const crackThreshold=ref<CrackThreshold>({minWidth:0.1,maxWidth:5.0,minLength:10,cannyLow:50,cannyHigh:150})
    const sizeThreshold=ref<SizeThreshold>({rockBrightnessThreshold:80,coarseSensitivity:50,fineSensitivity:50})

   // ==========================================
   // 4.4 分析结果状态
   // ==========================================
    const holeResults=ref<HoleResults>({totalCount:0,totalArea:0,avgDiameter:0,maxDiameter:0,minDiameter:0,faceRate:0})
    const crackResults=ref<CrackResults>({totalCount:0,totalLength:0,avgWidth:0,faceRate:0,lineDensity:0,areaDensity:0})
    const sizeResults=ref<SizeResults>({totalParticleCount:0,avgParticleSize:0,coarseParticleRatio:0,fineParticleRatio:0,particleUniformity:0,rockParticleRate:0})

    // ==========================================
    // 5. 基础操作
    // ==========================================
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
        holeResults.value={totalCount:0,totalArea:0,avgDiameter:0,maxDiameter:0,minDiameter:0,faceRate:0}
        crackResults.value={totalCount:0,totalLength:0,avgWidth:0,faceRate:0,lineDensity:0,areaDensity:0}
        sizeResults.value={totalParticleCount:0,avgParticleSize:0,coarseParticleRatio:0,fineParticleRatio:0,particleUniformity:0,rockParticleRate:0}
    }
    const resetThresholds=()=>{
        holeThreshold.value={minThreshold:0,maxThreshold:128}
        crackThreshold.value={minWidth:0.1,maxWidth:5.0,minLength:10,cannyLow:50,cannyHigh:150}
        sizeThreshold.value={rockBrightnessThreshold:80,coarseSensitivity:50,fineSensitivity:50}
    }
    const resetAll=()=>{
        currentMode.value='hole'
        regionMode.value='full'
        isSelectingRegion.value=false
        isAnalyzing.value=false
        resetAnalysisRegion()
        resetResults()
        resetThresholds()
        disposeMasks()
    }

    // ==========================================
    // 蒙版操作历史（用于撤销/还原）
    // ==========================================
    const maskHistory = ref<cv.Mat[]>([])
    const historyIndex = ref<number>(-1)
    const MAX_HISTORY_LENGTH = 20

    // ==========================================
    // 蒙版内存管理辅助函数
    // ==========================================
    
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

    // ==========================================
    // 蒙版操作相关方法
    // ==========================================
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

      // 从历史二值蒙版生成可视化蒙版
      const newBinaryMask = copyMat(historyBinaryMask)
      const newVisualMask = maskToVisual(newBinaryMask, {
        width: newBinaryMask.cols,
        height: newBinaryMask.rows
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

      // 从历史二值蒙版生成可视化蒙版
      const newBinaryMask = copyMat(historyBinaryMask)
      const newVisualMask = maskToVisual(newBinaryMask, {
        width: newBinaryMask.cols,
        height: newBinaryMask.rows
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

      // 从新的二值蒙版生成可视化蒙版
      const newVisualMask = maskToVisual(newBinaryMask, {
        width: newBinaryMask.cols,
        height: newBinaryMask.rows
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

      const newBinaryMask = copyMat(initialBinaryMask)
      const newVisualMask = maskToVisual(newBinaryMask, {
        width: newBinaryMask.cols,
        height: newBinaryMask.rows
      })

      safeReplaceTarget(newVisualMask, newBinaryMask)
      historyIndex.value = 0
      ElMessage.success('已重置到初始状态')
    }

    // ==========================================
    // 7. 暴露给组件的状态和方法
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
    binaryMaskMat, // 导出二值蒙版
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
    resetAll,
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