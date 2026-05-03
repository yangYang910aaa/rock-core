<template>
  <div class="analysis-panel">
    <el-radio-group v-model="analysisMode" type="button" class="analysis-radio-group">
      <el-radio-button label="hole">孔洞分析</el-radio-button>
      <el-radio-button label="crack">裂缝分析</el-radio-button>
      <el-radio-button label="size">粒度分析</el-radio-button>
    </el-radio-group>

    <!-- 分析范围开关 -->
    <div class="region-mode-group">
      <div class="group-title">分析范围</div>
      <el-radio-group
        v-model="regionMode"
        type="button"
        class="region-radio-group"
        :disabled="!isImageLoaded"
      >
        <el-radio-button label="full">全图分析</el-radio-button>
        <el-radio-button label="rect">局部分析</el-radio-button>
      </el-radio-group>
      <p class="region-tip" v-if="regionMode==='rect'">可在右侧图片上拖拽绘制矩形分析区域</p>
    </div>

    <!-- 核心分析操作区 -->
    <div class="analysis-operate">
      <!-- 分组1：提取操作 -->
      <div class="operate-group">
        <div class="group-title">提取操作</div>
        <div class="btn-group-row">
          <el-button class="sidebar-btn small-btn" @click="handleInverseMask">反选</el-button>
          <el-button class="sidebar-btn small-btn" @click="handleUndo">撤销</el-button>
          <el-button class="sidebar-btn small-btn" @click="handleRedo">还原撤销</el-button>
        </div>
        <div class="btn-wrapper" style="margin-top: 10px;">
          <el-button class="sidebar-btn" type="success" @click="handleResetInitial">
            重置到初始状态
          </el-button>
        </div>
      </div>

      <!-- 分组2：二次编辑 -->
      <div class="operate-group">
        <div class="group-title">二次编辑</div>
        <!-- 参数调节滑块 -->
        <div class="param-section">
          <div class="param-item">
            <span class="param-label">去噪/膨胀/腐蚀强度</span>
            <div class="param-control">
              <span class="param-value">{{ morphKernelSize }}</span>
              <el-slider
                v-model="morphKernelSize"
                :min="1"
                :max="11"
                :step="2"
                class="param-slider"
              />
            </div>
          </div>
          <div class="param-reset">
            <el-button size="small" @click="resetMorphParams">重置默认值</el-button>
          </div>
        </div>
        <!-- 操作按钮 -->
        <div class="btn-wrapper">
          <el-button class="sidebar-btn" @click="openDenoiseDialog">区域去噪</el-button>
        </div>
        <div class="btn-wrapper">
          <el-button class="sidebar-btn" @click="handleFillHoles">孔洞填充</el-button>
        </div>
        <div class="btn-group-row">
          <el-button class="sidebar-btn small-btn" @click="handleDilate">区域膨胀</el-button>
          <el-button class="sidebar-btn small-btn" @click="handleErode">区域腐蚀</el-button>
        </div>
      </div>
    </div>

    <!-- 区域去噪参数设置弹窗 -->
    <el-dialog
      v-model="denoiseDialogVisible"
      title="区域去噪参数设置"
      width="480px"
      destroy-on-close
      @close="handleDenoiseDialogClose"
    >
      <div class="denoise-dialog-content">
        <!-- 过滤条件设置 -->
        <div class="dialog-item">
          <p class="dialog-tip">设置过滤条件，去除符合条件的区域</p>
          <div class="condition-row">
            <el-radio-group v-model="denoiseCondition" inline size="default">
              <el-radio value="less">去除面积小于</el-radio>
              <el-radio value="greater">去除面积大于</el-radio>
            </el-radio-group>
            <el-input-number
              v-model="denoisePixelSize"
              :min="1"
              :step="1"
              size="default"
              controls-position="right"
              style="width: 130px;"
            />
            <span class="unit">像素</span>
          </div>
        </div>

        <!-- 开运算去噪强度设置 -->
        <div class="dialog-item">
          <p class="dialog-tip">开运算去噪强度（值越大，去噪越强）</p>
          <div class="slider-row">
            <span class="slider-label">强度：{{ morphKernelSize }}</span>
            <el-slider
              v-model="morphKernelSize"
              :min="1"
              :max="11"
              :step="2"
              show-input
              style="flex: 1;"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button type="danger" @click="denoiseDialogVisible=false">取消</el-button>
        <el-button type="warning" @click="resetDenoiseParams">重置默认值</el-button>
        <el-button type="primary" @click="handleDenoisePreview">预览</el-button>
        <el-button type="success" @click="handleDenoiseConfirm">确定应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { markRaw, ref, watch } from 'vue'
import { useAnalysisStore, type AnalysisMode, type AnalysisRegion, type RegionMode } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { denoiseRegion, fillHoles, dilateRegion, erodeRegion, inverseMask } from '@/utils/opencv/morphology'
import cv from '@techstark/opencv-js'
import { copyMat, deleteMatSafe, maskToVisual } from '@/utils/opencv/core'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()

// 解构Store状态
const { currentMode: analysisMode, regionMode, binaryMaskMat, analysisRegion, sourceImageSize, targetMaskMat } = storeToRefs(analysisStore)
const { isImageLoaded } = storeToRefs(imageStore)
const { undoMask, redoMask, updateMask, resetMaskToInitial } = analysisStore

// 监听分析模式变化,同步到Store
watch(analysisMode, (newMode) => {
  analysisStore.setMode(newMode)
})

// 监听分析范围切换
watch(regionMode, (newMode: RegionMode) => {
  analysisStore.setRegionMode(newMode)
  if (newMode === 'full') {
    ElMessage.warning('已切换到全图分析模式')
  } else if (newMode === 'rect') {
    ElMessage.warning('已切换到局部分析模式，可在图片上拖拽绘制分析区域')
  }
})

// ==========================================
// 提取操作和二次编辑的事件处理
// ==========================================

/**
 * 检查是否有蒙版
 */
const checkMaskExists = (): boolean => {
  if (!binaryMaskMat.value || binaryMaskMat.value.empty() || binaryMaskMat.value.channels() !== 1) {
    ElMessage.warning('请先进行分析,生成蒙版后再进行操作')
    return false
  }
  return true
}

// 反选
const handleInverseMask = () => {
  if (!checkMaskExists()) return
  const newBinaryMask = inverseMask(binaryMaskMat.value!, undefined, analysisRegion.value)
  updateMask(newBinaryMask)
  ElMessage.success('已反选')
}

/**
 * 撤销
 */
const handleUndo = () => {
  undoMask()
}

/**
 * 还原
 */
const handleRedo = () => {
  redoMask()
}

/**
 * 重置到初始状态
 */
const handleResetInitial = () => {
  if (!checkMaskExists()) return
  resetMaskToInitial()
}

// ==========================================
// 二次编辑功能实现
// ==========================================
// 操作参数
const morphKernelSize = ref<number>(3) // 膨胀/腐蚀/去噪的核大小:1-11的奇数，默认3
const DEFAULT_KERNEL_SIZE = 3 // 膨胀/腐蚀/去噪的默认核大小
const FILL_KERNEL_SIZE = 5 // 孔洞填充的默认核大小

// 区域去噪弹窗状态
const denoiseDialogVisible = ref<boolean>(false)
const denoiseCondition = ref<'less' | 'greater'>('less') // 去噪条件：面积小于或大于
const denoisePixelSize = ref<number>(10) // 过滤像素值,默认10
const DEFAULT_DENOISE_CONDITION = 'less' as const // 默认去噪条件 
const DEFAULT_DENOISE_PIXEL_SIZE = 10 // 默认过滤像素值

// 弹窗打开时的蒙版备份(取消时恢复)
let backupBinaryMask: cv.Mat | null = null

// 重置二次编辑参数
const resetMorphParams = () => {
  morphKernelSize.value = DEFAULT_KERNEL_SIZE
  ElMessage.success('已重置为默认值')
}

// 重置区域去噪参数
const resetDenoiseParams = () => {
  denoiseCondition.value = DEFAULT_DENOISE_CONDITION
  denoisePixelSize.value = DEFAULT_DENOISE_PIXEL_SIZE
  morphKernelSize.value = DEFAULT_KERNEL_SIZE
  ElMessage.success('已重置去噪参数为默认值')
}

// 打开区域去噪弹窗
const openDenoiseDialog = () => {
  if (!checkMaskExists()) return
  // 备份当前蒙版
  backupBinaryMask = copyMat(binaryMaskMat.value!)
  denoiseDialogVisible.value = true
}

// 弹窗关闭时的清理逻辑
const handleDenoiseDialogClose = () => {
  // 关闭弹窗时,释放备份的蒙版内存
  if (backupBinaryMask) {
    deleteMatSafe(backupBinaryMask)
    backupBinaryMask = null
  }
}

// 区域去噪预览
const handleDenoisePreview = () => {
  if (!binaryMaskMat.value) return
  try {
    // 执行去噪,不保留历史,仅预览
    const previewMask = denoiseRegion(
      binaryMaskMat.value,
      morphKernelSize.value,
      analysisRegion.value,
      2,
      denoiseCondition.value,
      denoisePixelSize.value
    )
    // 更新可视化蒙版
    const { width, height } = sourceImageSize.value
    const newVisualMask = maskToVisual(previewMask, { width, height })
    // 替换可视化蒙版
    const oldVisualMask = targetMaskMat.value
    targetMaskMat.value = markRaw(newVisualMask)
    deleteMatSafe(oldVisualMask)
    deleteMatSafe(previewMask)
    ElMessage.success('预览完成')
  } catch (error) {
    ElMessage.error('预览失败，请重试')
  }
}

// 区域去噪确认应用
const handleDenoiseConfirm = () => {
  if (!binaryMaskMat.value) return
  try {
    // 执行去噪
    const newBinaryMask = denoiseRegion(
      binaryMaskMat.value,
      morphKernelSize.value,
      analysisRegion.value,
      2,
      denoiseCondition.value,
      denoisePixelSize.value
    )
    // 更新蒙版并保存历史
    updateMask(newBinaryMask)
    denoiseDialogVisible.value = false
    ElMessage.success('区域去噪完成')
  } catch (error) {
    ElMessage.error('去噪失败，请重试')
  }
}

// 取消时恢复蒙版
watch(denoiseDialogVisible, (newVal) => {
  // 如果是关闭弹窗且有备份蒙版,则恢复
  if (!newVal && backupBinaryMask && !backupBinaryMask.empty()) {
    updateMask(copyMat(backupBinaryMask), false) // 恢复蒙版
    ElMessage.info('已取消去噪操作,恢复原蒙版')
  }
})

/**
 * 【通用函数】执行蒙版操作
 * @param operationName 操作名称（用于提示）
 * @param operationFn 具体的形态学操作函数
 * @param kernelSize 可选的核大小
 */
const executeMaskOperation = (
  operationName: string,
  operationFn: (src: cv.Mat, kernelSize?: number, region?: AnalysisRegion | null) => cv.Mat,
  kernelSize: number = morphKernelSize.value
) => {
  if (!checkMaskExists()) return
  try {
    if (!binaryMaskMat.value) {
      return
    }
    // 执行操作
    const newBinaryMask = operationFn(binaryMaskMat.value, kernelSize, analysisRegion.value)
    // 更新蒙版并保存历史
    updateMask(newBinaryMask)
    ElMessage.success(`${operationName}完成`)
  } catch (error) {
    ElMessage.error(`${operationName}失败，请重试`)
  }
}

// 孔洞填充
const handleFillHoles = () => executeMaskOperation('孔洞填充', fillHoles, FILL_KERNEL_SIZE)
// 区域膨胀
const handleDilate = () => executeMaskOperation('区域膨胀', dilateRegion)
// 区域腐蚀
const handleErode = () => executeMaskOperation('区域腐蚀', erodeRegion)
</script>

<style scoped>
.analysis-panel {
  width: 100%;
}

/* 分析模式按钮组样式 */
.analysis-radio-group {
  width: 100%;
  display: flex;
  margin-bottom: 16px;
}

.analysis-radio-group :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.analysis-radio-group :deep(.el-radio-button) {
  flex: 1;
  text-align: center;
}

.analysis-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  height: 48px;
  font-size: 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

/* 分析范围样式 */
.region-mode-group {
  margin-bottom: 20px;
}

.region-radio-group {
  width: 100%;
  display: flex;
}

.region-radio-group :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.region-radio-group :deep(.el-radio-button) {
  flex: 1;
  text-align: center;
}

.region-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

.region-tip {
  margin: 8px 0 0 4px;
  font-size: 12px;
  color: #909399;
}

/* 操作分组样式 */
.operate-group {
  margin-bottom: 16px;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}

.btn-group-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.small-btn {
  flex: 1;
  height: 36px !important;
  line-height: 34px !important;
  font-size: 14px !important;
}

.btn-wrapper {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.sidebar-btn {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 44px;
  line-height: 42px;
  font-size: 15px;
  border-radius: 6px;
  box-sizing: border-box !important;
  padding: 0 12px;
  margin: 0;
}

/* 参数调节区域样式 */
.param-section {
  padding: 10px 12px;
  margin-bottom: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.param-item {
  margin-bottom: 12px;
}

.param-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.param-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.param-value {
  min-width: 30px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #409EFF;
}

.param-slider {
  flex: 1;
}

.param-reset {
  text-align: right;
}

/* 区域去噪弹窗样式（和现有弹窗风格100%统一） */
.denoise-dialog-content {
  padding: 10px 0;
}

.dialog-item {
  margin-bottom: 24px;
}

.dialog-tip {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px 0;
  padding-left: 2px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 穿透Element单选框样式，确保垂直居中 */
.condition-row :deep(.el-radio-group) {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.condition-row :deep(.el-radio) {
  margin: 0;
  display: inline-flex;
  align-items: center;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.slider-label {
  min-width: 70px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.unit {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}
</style>