// ----
// 蒙版管理 Store：双蒙版（二值/可视化）、历史栈、undo/redo/update
// 从 analysisStore 拆分，独立管理所有蒙版相关状态和操作
// ----
import { defineStore } from 'pinia'
import { ref, shallowRef, markRaw } from 'vue'
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'
import { maskToVisual } from '@/utils/opencv'
import { copyMat, deleteMatSafe } from '@/utils/opencv/core'

export const useMaskStore = defineStore('mask', () => {
  // ----
  // 蒙版核心状态
  // ----
  // 可视化 RGBA 蒙版（仅用于画布显示，不参与计算）
  const targetMaskMat = shallowRef<cv.Mat | null>(null)
  // 单通道二值蒙版（仅用于计算，所有形态学操作都基于它）
  const binaryMaskMat = shallowRef<cv.Mat | null>(null)
  // 原图全图尺寸（用于生成全图大小的蒙版，确保坐标匹配）
  const sourceImageSize = ref<{ width: number; height: number }>({ width: 0, height: 0 })
  // 控制顶层红色蒙版的显示/隐藏
  const showMaskOverlay = ref<boolean>(true)

  // ----
  // 蒙版操作历史（最多 20 步，用于撤销/还原）
  // ----
  const maskHistory = ref<cv.Mat[]>([])
  // 当前历史位置：-1 表示无历史，0 表示初始状态
  const historyIndex = ref<number>(-1)
  const MAX_HISTORY_LENGTH = 20

  // ----
  // 内部辅助
  // ----

  /** 将 historyIndex 钳制在合法范围内 [-1, maskHistory.length-1] */
  const clampHistoryIndex = () => {
    historyIndex.value = Math.min(Math.max(historyIndex.value, -1), maskHistory.value.length - 1)
  }

  /** 丢弃当前索引之后的所有历史记录（在 push 新记录前调用，避免分支历史） */
  const discardFutureHistory = () => {
    const from = historyIndex.value + 1
    if (from < maskHistory.value.length) {
      const removed = maskHistory.value.splice(from)
      removed.forEach(deleteMatSafe)
    }
  }

  /** 将二值蒙版副本推入历史栈末尾，超出上限时移除最旧记录 */
  const pushHistory = (newBinaryMask: cv.Mat) => {
    if (!newBinaryMask || newBinaryMask.empty()) return
    discardFutureHistory()
    const copy = copyMat(newBinaryMask)
    maskHistory.value.push(copy)
    historyIndex.value = maskHistory.value.length - 1
    if (maskHistory.value.length > MAX_HISTORY_LENGTH) {
      const oldest = maskHistory.value.shift()
      deleteMatSafe(oldest)
      historyIndex.value = Math.max(historyIndex.value - 1, 0)
    }
  }

  // ----
  // 蒙版替换
  // ----

  /** 原子替换双蒙版：同时更新 targetMaskMat（可视化）和 binaryMaskMat（二值），并释放旧 Mat 内存 */
  const safeReplaceTarget = (newVisualMat: cv.Mat, newBinaryMat: cv.Mat) => {
    const oldVisual = targetMaskMat.value
    targetMaskMat.value = markRaw(newVisualMat)
    deleteMatSafe(oldVisual)

    const oldBinary = binaryMaskMat.value
    binaryMaskMat.value = markRaw(newBinaryMat)
    deleteMatSafe(oldBinary)
  }

  /** 清空当前双蒙版并释放内存 */
  const clearTargetMask = () => {
    deleteMatSafe(targetMaskMat.value)
    deleteMatSafe(binaryMaskMat.value)
    targetMaskMat.value = null
    binaryMaskMat.value = null
  }

  // ----
  // 蒙版操作（对外方法）
  // ----

  /** 将当前二值蒙版保存到历史栈（撤销前调用，确保可还原） */
  const saveMaskToHistory = () => {
    if (!binaryMaskMat.value || binaryMaskMat.value.empty()) return
    clampHistoryIndex()
    discardFutureHistory()
    pushHistory(binaryMaskMat.value)
  }

  /** 分析完成后初始化历史栈：清空旧历史，将当前蒙版作为第 0 个快照 */
  const initMaskHistory = () => {
    if (!binaryMaskMat.value || binaryMaskMat.value.empty()) return
    if (maskHistory.value && maskHistory.value.length > 0) {
      maskHistory.value.forEach(deleteMatSafe)
      maskHistory.value.length = 0
    }
    historyIndex.value = -1
    pushHistory(binaryMaskMat.value)
  }

  /** 撤销到上一步：回退 historyIndex，从历史取出二值蒙版并重新生成可视化蒙版 */
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
    const newBinaryMask = copyMat(historyBinaryMask)
    const { width, height } = sourceImageSize.value
    const newVisualMask = maskToVisual(newBinaryMask, { width, height })
    safeReplaceTarget(newVisualMask, newBinaryMask)
    ElMessage.success('已撤销')
  }

  /** 重做下一步：前进 historyIndex，从历史取出二值蒙版并重新生成可视化蒙版 */
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
    const newBinaryMask = copyMat(historyBinaryMask)
    const { width, height } = sourceImageSize.value
    const newVisualMask = maskToVisual(newBinaryMask, { width, height })
    safeReplaceTarget(newVisualMask, newBinaryMask)
    ElMessage.success('已还原')
  }

  /** 二次编辑的统一入口：将新的二值蒙版转为可视化蒙版，替换双蒙版，可选保存历史 */
  const updateMask = (newBinaryMask: cv.Mat, saveHistory: boolean = true) => {
    if (!newBinaryMask || newBinaryMask.empty() || newBinaryMask.channels() !== 1) {
      ElMessage.warning('无效的蒙版输入')
      return
    }
    const { width, height } = sourceImageSize.value
    if (width === 0 || height === 0) {
      ElMessage.warning('原图尺寸无效')
      deleteMatSafe(newBinaryMask)
      return
    }
    const newVisualMask = maskToVisual(newBinaryMask, { width, height })
    safeReplaceTarget(newVisualMask, newBinaryMask)
    if (saveHistory) {
      pushHistory(binaryMaskMat.value!)
    }
  }

  /** 重置蒙版到历史第 0 个快照（分析完成时的初始状态） */
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
    const { width, height } = sourceImageSize.value
    const newVisualMask = maskToVisual(newBinaryMask, { width, height })
    safeReplaceTarget(newVisualMask, newBinaryMask)
    historyIndex.value = 0
    ElMessage.success('已重置到初始状态')
  }

  /** 释放所有蒙版内存并清空历史（项目关闭或重置时调用） */
  const disposeMasks = () => {
    clearTargetMask()
    if (maskHistory.value && maskHistory.value.length > 0) {
      maskHistory.value.forEach(deleteMatSafe)
      maskHistory.value.length = 0
    }
    historyIndex.value = -1
  }

  /** 重置所有蒙版相关状态到初始值 */
  const resetAll = () => {
    showMaskOverlay.value = true
    sourceImageSize.value = { width: 0, height: 0 }
    disposeMasks()
  }

  return {
    targetMaskMat,
    binaryMaskMat,
    sourceImageSize,
    showMaskOverlay,
    maskHistory,
    historyIndex,
    clearTargetMask,
    saveMaskToHistory,
    undoMask,
    redoMask,
    updateMask,
    resetMaskToInitial,
    disposeMasks,
    initMaskHistory,
    pushHistory,
    safeReplaceTarget,
    resetAll,
  }
})
