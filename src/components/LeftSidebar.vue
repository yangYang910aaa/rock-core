<template>
  <!-- 唯一顶级根容器：严格遵循Vue单根节点规范，从根源解决渲染错乱 -->
  <div class="left-sidebar-wrapper">

    <!-- 左侧边栏主体 -->
    <div class="left-sidebar">
      <!-- 可滚动的内容区域 -->
      <div class="sidebar-content">
        <el-collapse v-model="activeNames">

          <!-- 1. 标尺设置面板 -->
          <el-collapse-item title="标尺设置" name="1">
            <el-radio-group
              v-model="scaleType"
              type="button"
              class="scale-radio-group"
            >
              <el-radio-button label="macro">宏观(mm)</el-radio-button>
              <el-radio-button label="micro">微观(μm)</el-radio-button>
            </el-radio-group>

            <!-- 标尺校准区域 -->
            <div class="calibrate-area">
              <div class="group-title">标尺校准</div>
              
              <el-form
                label-width="80px"
                class="calibrate-form"
              >
                <el-form-item label="真实长度">
                  <el-input-number
                    v-model="imageStore.calibrateRealLength"
                    :min="0.1"
                    :step="0.1"
                    style="width: 100%;"
                  ></el-input-number>
                  <span class="unit-tip">
                    {{ imageStore.scaleType === 'macro' ? 'mm' : 'μm' }}
                  </span>
                </el-form-item>
              </el-form>

              <div class="calibrate-btns">
                <el-button
                  :type="imageStore.isCalibrating ? 'danger' : 'primary'"
                  class="sidebar-btn small-btn"
                  @click="imageStore.toggleCalibrate(!imageStore.isCalibrating)"
                >
                  {{ imageStore.isCalibrating ? '取消校准' : '开始校准' }}
                </el-button>
                <el-button
                  class="sidebar-btn small-btn"
                  @click="imageStore.resetCalibrate"
                >
                  重置默认
                </el-button>
              </div>

              <p class="calibrate-tip">点击「开始校准」,在图片上依次点击校准线的起点和终点</p>
            </div>
          </el-collapse-item>

          <!-- 2. 图像预处理面板 -->
          <el-collapse-item title="图像预处理" name="2">
            <div class="preprocess-btns">
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('autoLevels')"
                >
                  自动色阶
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('curveAdjust')"
                >
                  曲线调节
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('grayscale')"
                >
                  灰度化
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="openBCDialog"
                >
                  亮度/对比度
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="openSaturationDialog"
                >
                  饱和度调节
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('filterSmooth')"
                >
                  滤波平滑
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('sharpen')"
                >
                  锐化
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('edgeDetect')"
                >
                  边缘检测
                </el-button>
              </div>
              
              <div class="btn-wrapper">
                <el-button
                  class="sidebar-btn"
                  @click="handlePreprocess('negativeEffect')"
                >
                  底片效果
                </el-button>
              </div>
            </div>
          </el-collapse-item>

          <!-- 3. 分析模式面板 -->
          <el-collapse-item title="分析模式" name="3">
            <el-radio-group
              v-model="analysisMode"
              type="button"
              class="analysis-radio-group"
            >
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
              
              <p class="region-tip" v-if="regionMode==='rect'">
                可在右侧图片上拖拽绘制矩形分析区域
              </p>
            </div>

            <!-- 核心分析操作区 -->
            <div class="analysis-operate">
              <!-- 分组1：提取操作 -->
              <div class="operate-group">
                <div class="group-title">提取操作</div>
                
                <div class="btn-group-row">
                  <el-button
                    class="sidebar-btn small-btn"
                    @click="handleInverseMask"
                  >
                    反选
                  </el-button>
                  <el-button
                    class="sidebar-btn small-btn"
                    @click="handleUndo"
                  >
                    撤销
                  </el-button>
                  <el-button
                    class="sidebar-btn small-btn"
                    @click="handleRedo"
                  >
                    还原撤销
                  </el-button>
                </div>
                
                <div class="btn-wrapper" style="margin-top: 10px;">
                  <el-button
                    class="sidebar-btn"
                    type="success"
                    @click="handleResetInitial"
                  >
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
                    <el-button @click="resetMorphParams">重置默认值</el-button>
                  </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="btn-wrapper">
                  <el-button
                    class="sidebar-btn"
                    @click="openDenoiseDialog"
                  >
                    区域去噪
                  </el-button>
                </div>
                
                <div class="btn-wrapper">
                  <el-button
                    class="sidebar-btn"
                    @click="handleFillHoles"
                  >
                    孔洞填充
                  </el-button>
                </div>
                
                <div class="btn-group-row">
                  <el-button
                    class="sidebar-btn small-btn"
                    @click="handleDilate"
                  >
                    区域膨胀
                  </el-button>
                  <el-button
                    class="sidebar-btn small-btn"
                    @click="handleErode"
                  >
                    区域腐蚀
                  </el-button>
                </div>
              </div>
            </div>
          </el-collapse-item>

        </el-collapse>
      </div>
    </div>

    <!-- ==================== 弹窗统一管理区 ==================== -->
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
            <el-radio-group
              v-model="denoiseCondition"
              inline
              size="default"
            >
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

    <!-- 亮度/对比度调整弹窗 -->
    <el-dialog
      v-model="bcDialogVisible"
      title="亮度/对比度调整"
      width="400px"
      destroy-on-close
    >
      <div class="bc-adjust-panel">
        <div class="adjust-item">
          <p class="adjust-tip">1.0=原始对比度,大于1增强,小于1减弱</p>
          <label class="adjust-label">
            对比度 ({{ imageStore.bcParams.alpha.toFixed(1) }})
          </label>
          <el-slider
            v-model="imageStore.bcParams.alpha"
            :min="0.0"
            :max="3.0"
            :step="0.1"
            show-input
            class="adjust-slider"
          />
        </div>
        
        <div class="adjust-item">
          <p class="adjust-tip">0=原始亮度,大于0变亮,小于0变暗</p>
          <label class="adjust-label">
            亮度 ({{ imageStore.bcParams.beta }})
          </label>
          <el-slider
            v-model="imageStore.bcParams.beta"
            :min="-100"
            :max="100"
            :step="1"
            show-input
            class="adjust-slider"
          />
        </div>
      </div>

      <template #footer>
        <el-button type="danger" @click="bcDialogVisible=false">取消</el-button>
        <el-button type="warning" @click="resetBCParams">重置参数</el-button>
        <el-button type="primary" @click="confirmBCAdjust">确定应用</el-button>
      </template>
    </el-dialog>

    <!-- 饱和度调整弹窗 -->
    <el-dialog
      v-model="saturationDialogVisible"
      title="饱和度调整"
      width="400px"
      destroy-on-close
    >
      <div class="saturation-adjust-panel">
        <div class="adjust-item">
          <p class="adjust-tip">1.0=原始饱和度,大于1增强,小于1减弱,0为纯灰度</p>
          <label class="adjust-label">
            饱和度 ({{ imageStore.saturationFactor.toFixed(1) }})
          </label>
          <el-slider
            v-model="imageStore.saturationFactor"
            :min="0.0"
            :max="3.0"
            :step="0.1"
            show-input
            class="adjust-slider"
          />
        </div>
      </div>

      <template #footer>
        <el-button type="danger" @click="saturationDialogVisible=false">取消</el-button>
        <el-button type="warning" @click="resetSaturationParams">重置参数</el-button>
        <el-button type="primary" @click="confirmSaturationAdjust">确定应用</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
// ==================== 依赖导入（按类型分组） ====================
import { markRaw, ref, watch } from 'vue'

import { useAnalysisStore, type AnalysisMode, type AnalysisRegion, type RegionMode } from '@/stores/analysisStore'
import { useImageStore, type PreprocessType } from '@/stores/imageStore'

import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'

import { denoiseRegion, fillHoles, dilateRegion, erodeRegion, inverseMask } from '@/utils/opencv/morphology'
import cv from '@techstark/opencv-js'
import { copyMat, deleteMatSafe, maskToVisual } from '@/utils/opencv/core'

// ==================== Store 实例化与状态解构 ====================
const analysisStore = useAnalysisStore()
const imageStore = useImageStore()

// 解构Store状态
const {
  currentMode: analysisMode,
  regionMode,
  binaryMaskMat,
  analysisRegion,
  sourceImageSize,
  targetMaskMat
} = storeToRefs(analysisStore)

const { isImageLoaded, scaleType: storeScaleType } = storeToRefs(imageStore)
const { setScaleType } = imageStore
const { undoMask, redoMask, updateMask, resetMaskToInitial } = analysisStore

// ==================== 基础响应式状态 ====================
// 原有状态
const activeNames = ref<string[]>(['1']) // 标尺设置面板默认展开
const scaleType = ref<'macro' | 'micro'>('macro') // 标尺类型，默认宏观

// 操作参数 - 可配置常量集中管理
const morphKernelSize = ref<number>(3) // 膨胀/腐蚀/去噪的核大小:1-11的奇数，默认3
const DEFAULT_KERNEL_SIZE = 3 // 膨胀/腐蚀/去噪的默认核大小
const FILL_KERNEL_SIZE = 5 // 孔洞填充的默认核大小

// 亮度/对比度弹窗状态
const bcDialogVisible = ref<boolean>(false)

// 饱和度弹窗状态
const saturationDialogVisible = ref<boolean>(false)

// 区域去噪弹窗状态
const denoiseDialogVisible = ref<boolean>(false)
const denoiseCondition = ref<'less' | 'greater'>('less') // 去噪条件：面积小于或大于
const denoisePixelSize = ref<number>(10) // 过滤像素值,默认10
const DEFAULT_DENOISE_CONDITION = 'less' // 默认去噪条件 
const DEFAULT_DENOISE_PIXEL_SIZE = 10 // 默认过滤像素值

// 弹窗打开时的蒙版备份(取消时恢复)
let backupBinaryMask: cv.Mat | null = null

// ==================== 基础工具函数 ====================
// 处理图像预处理的点击事件
const handlePreprocess = (type: PreprocessType) => {
  imageStore.executeProcess(type)
}

// ==================== 监听事件 ====================
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

// 监听标尺类型变化,同步到Store
scaleType.value = storeScaleType.value
watch(scaleType, (newType) => {
  setScaleType(newType)
})

// 取消时恢复蒙版
watch(denoiseDialogVisible, newVal => {
  // 如果是关闭弹窗且有备份蒙版,则恢复
  if (!newVal && backupBinaryMask && !backupBinaryMask.empty()) {
    updateMask(copyMat(backupBinaryMask), false) // 恢复蒙版
  }
})

// ==================== 亮度/对比度弹窗相关方法 ====================
// 打开亮度/对比度弹窗
const openBCDialog = () => {
  if (!imageStore.isImageLoaded) {
    ElMessage.warning('请先打开图片再进行调节')
    return
  }
  bcDialogVisible.value = true
}

// 重置亮度/对比度参数
const resetBCParams = () => {
  imageStore.resetBCParams()
}

// 确认应用亮度/对比度参数
const confirmBCAdjust = async () => {
  await imageStore.executeProcess('brightnessContrast')
  bcDialogVisible.value = false
}

// ==================== 饱和度弹窗相关方法 ====================
// 打开饱和度弹窗
const openSaturationDialog = () => {
  if (!imageStore.isImageLoaded) {
    ElMessage.warning('请先打开图片再进行调节')
    return
  }
  saturationDialogVisible.value = true
}

// 重置饱和度参数
const resetSaturationParams = () => {
  imageStore.resetSaturationParams()
}

// 确认应用饱和度参数
const confirmSaturationAdjust = async () => {
  await imageStore.executeProcess('saturation')
  saturationDialogVisible.value = false
}

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
/* ==================== 根容器 & 侧边栏主体 ==================== */
.left-sidebar-wrapper {
  height: 100%;
  display: flex;
}

.left-sidebar {
  width: 320px; 
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 32px 12px 16px; 
  box-sizing: border-box;
}

/* ==================== 滚动条样式统一 ==================== */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}
.sidebar-content::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}
.sidebar-content::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}

/* ==================== 折叠面板通用样式 ==================== */
:deep(.el-collapse-item__header) {
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  padding-right: 40px;
  box-sizing: border-box;
}

:deep(.el-collapse-item__arrow) {
  right: 8px;
  font-size: 14px;
}

:deep(.el-collapse-item__content) {
  padding: 16px 4px 16px 0;
  box-sizing: border-box;
}

/* ==================== 通用按钮样式 ==================== */
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

.small-btn {
  flex: 1;
  height: 36px !important;
  line-height: 34px !important;
  font-size: 14px !important;
}

.start-btn {
  margin-top: 0 !important;
}

.btn-group-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

/* ==================== 单选按钮组通用样式 ==================== */
/* 标尺按钮组样式 */
.scale-radio-group {
  width: 100%;
  display: flex;
  margin-bottom: 16px;
}

.scale-radio-group :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.scale-radio-group :deep(.el-radio-button) {
  flex: 1;
  text-align: center;
}

.scale-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  height: 48px;
  font-size: 18px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
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

/* ==================== 通用分组标题样式 ==================== */
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}

.operate-group {
  margin-bottom: 16px;
}

/* ==================== 标尺校准区域样式 ==================== */
.calibrate-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.calibrate-form {
  margin-bottom: 12px;
}

.unit-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.calibrate-btns {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.calibrate-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
  padding-left: 4px;
}

/* ==================== 图像预处理按钮样式 ==================== */
.preprocess-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box; 
}

/* ==================== 参数调节区域样式 ==================== */
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

/* ==================== 弹窗通用样式 ==================== */
.bc-adjust-panel,
.saturation-adjust-panel {
  padding: 10px 0;
}

.adjust-item {
  margin-bottom: 20px;
}

.adjust-label {
  display: block;
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
  font-weight: 500;
}

.adjust-slider {
  margin-bottom: 4px;
}

.adjust-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
  padding-left: 2px;
}

/* ==================== 区域去噪弹窗专属样式 ==================== */
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