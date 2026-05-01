import {defineStore} from 'pinia'
import {ref,shallowRef, markRaw} from 'vue' // 【关键】导入markRaw
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'

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
    minThreshold:number//最小阈值(0-255)
    maxThreshold:number//最大阈值(0-255)
}

//裂缝分析阈值
export interface CrackThreshold{
    minWidth:number//最小裂缝宽度(0-1)
    maxWidth:number//最大裂缝宽度(0-1)
    minLength:number//最小裂缝长度(像素)
    cannyLow:number//Canny低检测阈值(0-255)
    cannyHigh:number//Canny高检测阈值(0-255)
}

//粒度分析阈值
export interface SizeThreshold{
    rockBrightnessThreshold:number//岩石亮度阈值(0-255):分离岩石实体和空隙
    coarseSensitivity:number//粗粒度敏感度(0-100):大岩块/粗纹理的检测灵敏度
    fineSensitivity:number//细粒度敏感度(0-100):细纹理/细颗粒的检测灵敏度
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
    totalParticleCount:number // 总颗粒区域数
    avgParticleSize:number // 平均粒径(mm)
    coarseParticleRatio:number // 粗颗粒占比(%)
    fineParticleRatio:number // 细颗粒占比(%)
    particleUniformity:number // 颗粒均匀度
    rockParticleRate:number // 岩石颗粒占比(%)
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
    // 【关键】目标区域掩码矩阵，shallowRef不会递归代理内部属性，配合markRaw使用
    const targetMaskMat = shallowRef<cv.Mat | null>(null)
   // ==========================================
   // 4.3 阈值状态
   // ==========================================
    const holeThreshold=ref<HoleThreshold>({
        minThreshold:0,
        maxThreshold:128,
    })
    const crackThreshold=ref<CrackThreshold>({
        minWidth:0.1,
        maxWidth:5.0,
        minLength:10,
        cannyLow:50,
        cannyHigh:150,
    })
    const sizeThreshold=ref<SizeThreshold>({
        rockBrightnessThreshold:80,
        coarseSensitivity:50,
        fineSensitivity:50,
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
        totalParticleCount:0,
        avgParticleSize:0,
        coarseParticleRatio:0,
        fineParticleRatio:0,
        particleUniformity:0,
        rockParticleRate:0,
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
            totalParticleCount:0,
            avgParticleSize:0,
            coarseParticleRatio:0,
            fineParticleRatio:0,
            particleUniformity:0,
            rockParticleRate:0,
        }
    }
    //重置所有阈值
    const resetThresholds=()=>{
        holeThreshold.value={
            minThreshold:0,
            maxThreshold:128,
        }
        crackThreshold.value={
            minWidth:0.1,
            maxWidth:5.0,
            minLength:10,
            cannyLow:50,
            cannyHigh:150,
        }
        sizeThreshold.value={
            rockBrightnessThreshold:80,
            coarseSensitivity:50,
            fineSensitivity:50,
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
        deleteMatSafe(targetMaskMat.value)
        targetMaskMat.value = null
        // 重置时清空历史
        disposeMasks()
    }

    // ==========================================
    // 蒙版操作历史（用于撤销/还原）
    // ==========================================
    const maskHistory = ref<cv.Mat[]>([]) // 蒙版历史栈
    const historyIndex = ref<number>(-1) // 当前历史索引
    const MAX_HISTORY_LENGTH = 20 // 最大历史记录数，避免内存占用过大

    // ==========================================
    // 蒙版历史与内存管理辅助函数（核心修复：非响应式+安全操作）
    // ==========================================
    /** 复制一个 Mat，返回新实例，标记为非响应式 */
    const copyMat = (m: cv.Mat): cv.Mat => {
      const out = new cv.Mat()
      m.copyTo(out)
      return markRaw(out) // 【关键】告诉Vue不要代理这个Mat对象
    }

    /** 安全删除 Mat（容错处理，避免代理对象报错） */
    const deleteMatSafe = (m?: cv.Mat | null) => {
      try {
        // 先判断是否有delete方法，再判断是否非空
        if (m && typeof m.delete === 'function' && !m.empty()) {
          m.delete()
        }
      } catch (e) {
        console.warn('Mat释放失败，已跳过:', e)
      }
    }

    /** 保证 historyIndex 在合法范围内 */
    const clampHistoryIndex = () => {
      historyIndex.value = Math.min(Math.max(historyIndex.value, -1), maskHistory.value.length - 1)
    }

    /** 丢弃当前索引之后的历史并释放对应 Mat 内存 */
    const discardFutureHistory = () => {
      const from = historyIndex.value + 1
      if (from < maskHistory.value.length) {
        const removed = maskHistory.value.splice(from)
        removed.forEach(m => deleteMatSafe(m))
      }
    }

    /** 把新的蒙版推入历史记录 */
    const pushHistory = (newMask: cv.Mat) => {
      if(!newMask || newMask.empty()) return
      
      // 先删除当前索引之后的历史
      discardFutureHistory()
      
      // 复制新蒙版，推入历史栈（已经是markRaw非响应式）
      const copy = copyMat(newMask)
      maskHistory.value.push(copy)
      historyIndex.value = maskHistory.value.length - 1

      // 控制最大历史长度
      if(maskHistory.value.length > MAX_HISTORY_LENGTH) {
        const oldest = maskHistory.value.shift()
        deleteMatSafe(oldest)
        historyIndex.value = Math.max(historyIndex.value - 1, 0)
      }
    }

    /** 安全替换当前 targetMaskMat（替换时释放旧 Mat） */
    const safeReplaceTarget = (newMat: cv.Mat) => {
      const old = targetMaskMat.value
      targetMaskMat.value = markRaw(newMat) // 【关键】标记为非响应式
      deleteMatSafe(old)
    }

    // 清空蒙版
    const clearTargetMask = () => {
        deleteMatSafe(targetMaskMat.value)
        targetMaskMat.value = null
    }

    /**
     * 释放所有蒙版资源并清空历史
     */
    const disposeMasks = () => {
        // 释放当前目标蒙版
        deleteMatSafe(targetMaskMat.value)
        targetMaskMat.value = null

        // 释放并清空历史中的所有 Mat
        if (maskHistory.value && maskHistory.value.length > 0) {
            maskHistory.value.forEach(m => deleteMatSafe(m))
            maskHistory.value.length = 0
        }

        // 重置历史索引
        historyIndex.value = -1
    }

    // ==========================================
    // 蒙版操作相关方法
    // ==========================================

    /**
     * 保存当前蒙版到历史记录
     */
    const saveMaskToHistory = () => {
      if (!targetMaskMat.value || targetMaskMat.value.empty()) return

      clampHistoryIndex()
      discardFutureHistory()
      pushHistory(targetMaskMat.value)
    }

    /**
     * 分析完成后，初始化历史记录
     */
    const initMaskHistory = () => {
        if(!targetMaskMat.value || targetMaskMat.value.empty()) return

        // 只清空历史栈，不释放当前targetMaskMat
        if (maskHistory.value && maskHistory.value.length > 0) {
            maskHistory.value.forEach(m => deleteMatSafe(m))
            maskHistory.value.length = 0
        }
        historyIndex.value = -1

        // 把初始蒙版推入历史
        pushHistory(targetMaskMat.value)
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
      const historyMask = maskHistory.value[historyIndex.value]
      if (!historyMask) {
        ElMessage.warning('历史记录无效')
        return
      }

      // 复制历史项并替换当前蒙版
      const copied = copyMat(historyMask)
      safeReplaceTarget(copied)
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
      const historyMask = maskHistory.value[historyIndex.value]
      if (!historyMask) {
        ElMessage.warning('历史记录无效')
        return
      }

      // 复制历史项并替换当前蒙版
      const copied = copyMat(historyMask)
      safeReplaceTarget(copied)
      ElMessage.success('已还原')
    }

    /**
     * 【核心】更新蒙版（所有二次编辑操作的通用入口）
     * @param newMask 新的蒙版
     * @param saveHistory 是否保存历史，默认true
     */
    const updateMask = (newMask: cv.Mat, saveHistory: boolean = true) => {
      if (!newMask || newMask.empty()) {
        ElMessage.warning('无效的蒙版输入')
        return
      }

      // 先替换蒙版
      const copied = copyMat(newMask)
      safeReplaceTarget(copied)

      // 再把新蒙版保存到历史记录
      if (saveHistory) {
        pushHistory(targetMaskMat.value!)
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
      const initial = maskHistory.value[0]
      if (!initial || initial.empty()) {
        ElMessage.warning('初始蒙版无效')
        return
      }

      const copied = copyMat(initial)
      safeReplaceTarget(copied)
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
    initMaskHistory
  }
})