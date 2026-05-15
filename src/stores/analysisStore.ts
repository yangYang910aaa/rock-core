// ----
// 分析核心 Store：模式、区域、阈值、结果、基础信息、颜色匹配
// 蒙版管理 → maskStore / 交互状态 → interactionStore / 类型 → types
// ----
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AnalysisMode, RegionMode, AnalysisRegion,
  HoleThreshold, CrackThreshold, ParticleThreshold,
  HoleResults, CrackResults, ParticleResults, CoreBasicInfo,
} from './types'

// 重新导出类型，供外部统一从 analysisStore 引用
export type {
  AnalysisMode, RegionMode, ValidityType, FillingMaterial, AnalysisRegion,
  HoleThreshold, CrackThreshold, ParticleThreshold,
  HoleInfo, HoleResults, CrackInfo, CrackResults, ParticleInfo, ParticleResults, CoreBasicInfo,
} from './types'

export const useAnalysisStore = defineStore('analysis', () => {
  // ----
  // 基础状态
  // ----
  const currentMode = ref<AnalysisMode>('hole')        // 当前分析模式
  const regionMode = ref<RegionMode>('full')            // 全图 or 局部分析
  const isSelectingRegion = ref<boolean>(false)         // 是否正在拖拽绘制选框
  const isAnalyzing = ref<boolean>(false)               // 是否正在执行分析（按钮 loading 状态）
  const reportPreviewVisible = ref<boolean>(false)      // 报告预览弹窗是否可见
  const isLoadingProject = ref<boolean>(false)          // 项目加载中标记（阻止 watcher 触发预览）

  // ----
  // 分析区域（局部分析模式下，存储用户拖拽的矩形 ROI）
  // ----
  const analysisRegion = ref<AnalysisRegion>({ x: 0, y: 0, width: 0, height: 0 })

  // ----
  // 岩心基础信息（报告表头数据源）
  // ----
  const coreBasicInfo = ref<CoreBasicInfo>({
    wellNo: '',
    wellDepth: '',
    horizon: '',
    lithology: '',
    sampleDate: new Date().toISOString().slice(0, 10),
  })

  // ----
  // 阈值状态（按模式独立存储，切换模式时保留各自的阈值）
  // ----
  const holeThreshold = ref<HoleThreshold>({ minThreshold: 0, maxThreshold: 128 })
  const crackThreshold = ref<CrackThreshold>({ minWidth: 0.1, maxWidth: 10.0, minLength: 1, cannyLow: 50, cannyHigh: 150 })
  const particleThreshold = ref<ParticleThreshold>({ rockBrightnessThreshold: 80, coarseSensitivity: 50, fineSensitivity: 50 })

  // ----
  // 颜色匹配状态（替代手动阈值，直接在图片上点击取色来设定颜色范围）
  // ----
  const colorMatchEnabled = ref<boolean>(false)           // 是否启用颜色匹配模式
  const isPickingColor = ref<boolean>(false)              // 等待用户点击取色（画布鼠标变为取色光标）
  const pickedColor = ref<{ r: number; g: number; b: number } | null>(null) // 已选取的目标颜色 RGB
  const colorMatchTolerance = ref<number>(30)             // 颜色匹配容差 0-100
  const contiguousRegionEnabled = ref<boolean>(false)     // 连续区域模式：只在取色点连通区域内提取
  const pickedColorImageX = ref<number>(0)                // 取色点在原图上的像素 X
  const pickedColorImageY = ref<number>(0)                // 取色点在原图上的像素 Y
  const currentHoverColor = ref<{ r: number; g: number; b: number } | null>(null) // 鼠标悬停处的实时像素颜色

  // ----
  // 分析结果状态（按模式独立存储，切换模式时清空）
  // ----
  const holeResults = ref<HoleResults>({
    totalCount: 0, totalArea: 0, avgDiameter: 0, maxDiameter: 0, minDiameter: 0,
    faceRate: 0, largeCount: 0, mediumCount: 0, smallCount: 0, pinholeCount: 0, holeList: [],
  })
  const crackResults = ref<CrackResults>({
    totalCount: 0, totalLength: 0, avgWidth: 0, faceRate: 0, lineDensity: 0, areaDensity: 0, crackList: [],
  })
  const particleResults = ref<ParticleResults>({
    totalParticleCount: 0, avgParticleSize: 0, coarseParticleRatio: 0,
    fineParticleRatio: 0, particleUniformity: 0, rockParticleRate: 0, particleList: [],
  })

  // ----
  // 基础操作
  // ----

  /** 切换分析模式（孔洞/裂缝/粒度），同时清空旧模式的旧结果 */
  const setMode = (mode: AnalysisMode) => {
    currentMode.value = mode
    resetResults()
  }

  /** 切换分析区域模式：全图分析时自动清除选框 */
  const setRegionMode = (mode: RegionMode) => {
    regionMode.value = mode
    if (mode === 'full') {
      resetAnalysisRegion()
    }
  }

  /** 设置局部分析的矩形 ROI（由 useRegionSelection 拖拽完成时调用） */
  const setAnalysisRegion = (region: AnalysisRegion) => {
    analysisRegion.value = { ...region }
  }

  /** 清除局部分析选框（恢复全图分析） */
  const resetAnalysisRegion = () => {
    analysisRegion.value = { x: 0, y: 0, width: 0, height: 0 }
  }

  /** 清空三种模式的所有分析结果（切换模式或重置时调用） */
  const resetResults = () => {
    holeResults.value = {
      totalCount: 0, totalArea: 0, avgDiameter: 0, maxDiameter: 0, minDiameter: 0,
      faceRate: 0, largeCount: 0, mediumCount: 0, smallCount: 0, pinholeCount: 0, holeList: [],
    }
    crackResults.value = {
      totalCount: 0, totalLength: 0, avgWidth: 0, faceRate: 0, lineDensity: 0, areaDensity: 0, crackList: [],
    }
    particleResults.value = {
      totalParticleCount: 0, avgParticleSize: 0, coarseParticleRatio: 0,
      fineParticleRatio: 0, particleUniformity: 0, rockParticleRate: 0, particleList: [],
    }
  }

  /** 重置所有阈值到默认值，同时关闭颜色匹配相关状态 */
  const resetThresholds = () => {
    holeThreshold.value = {
      minThreshold: 0,
      maxThreshold: 128,
    }
    crackThreshold.value = {
      minWidth: 0.1,
      maxWidth: 10.0,
      minLength: 1,
      cannyLow: 50,
      cannyHigh: 150,
    }
    particleThreshold.value = {
      rockBrightnessThreshold: 80,
      coarseSensitivity: 50,
      fineSensitivity: 50,
    }
    colorMatchEnabled.value = false
    isPickingColor.value = false
    pickedColor.value = null
    colorMatchTolerance.value = 30
    contiguousRegionEnabled.value = false
    pickedColorImageX.value = 0
    pickedColorImageY.value = 0
    currentHoverColor.value = null
  }

  /** 清空岩心基础信息字段 */
  const resetCoreBasicInfo = () => {
    coreBasicInfo.value = {
      wellNo: '',
      wellDepth: '',
      horizon: '',
      lithology: '',
      sampleDate: new Date().toISOString().slice(0, 10),
    }
  }

  /** 设置岩心基础信息（BasicInfoPanel 表单提交时调用） */
  const setCoreBasicInfo = (info: CoreBasicInfo) => {
    coreBasicInfo.value = { ...info }
  }

  /** 重置整个分析状态：模式回默认 + 清空区域 + 清空结果 + 归零阈值 + 清空基础信息 */
  const resetAll = () => {
    currentMode.value = 'hole'
    regionMode.value = 'full'
    isSelectingRegion.value = false
    isAnalyzing.value = false
    resetAnalysisRegion()
    resetResults()
    resetThresholds()
    resetCoreBasicInfo()
  }

  return {
    currentMode, regionMode, isSelectingRegion, isAnalyzing,
    analysisRegion,
    coreBasicInfo,
    holeThreshold, crackThreshold, particleThreshold,
    holeResults, crackResults, particleResults,
    reportPreviewVisible, isLoadingProject,
    colorMatchEnabled, isPickingColor, pickedColor, colorMatchTolerance,
    contiguousRegionEnabled, pickedColorImageX, pickedColorImageY, currentHoverColor,
    setMode, setRegionMode, setAnalysisRegion, resetAnalysisRegion,
    resetResults, resetThresholds, resetCoreBasicInfo, setCoreBasicInfo,
    resetAll,
  }
})
