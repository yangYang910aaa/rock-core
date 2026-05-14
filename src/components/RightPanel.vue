<template>
  <div class="right-panel">
    <!-- 顶部操作按钮 -->
    <div class="action-btns">
      <!-- 生成分析报告:下拉菜单选择格式 -->
      <el-dropdown @command="handleDropdownCommand" trigger="click">
        <el-button type="danger" block class="panel-btn">
          <el-icon><DocumentAdd /></el-icon>
          生成分析报告
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="preview">预览导出结果</el-dropdown-item>
            <el-dropdown-item command="excel" divided>导出Excel</el-dropdown-item>
            <el-dropdown-item command="pdf">导出PDF</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="warning" block class="panel-btn" @click="handleReset"><el-icon><Refresh /></el-icon>重置分析</el-button>
      <el-button type="primary" block class="panel-btn" @click="handleStartAnalysis" :loading="analysisStore.isAnalyzing"><el-icon><Search /></el-icon>开始分析</el-button>
      <div class="mask-toggle-row">
        <el-switch v-model="analysisStore.showMaskOverlay" size="small" />
        <span class="mask-toggle-label">是否显示蒙版</span>
      </div>
    </div>

    <!-- 可滚动的参数&结果区域 -->
    <div class="panel-content">
      <el-collapse v-model="activeNames">
        <BasicInfoPanel />
        <ThresholdPanel />
        <ResultsPanel />
      </el-collapse> 
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DocumentAdd, Refresh, ArrowDown } from '@element-plus/icons-vue'
import { useAnalysisStore, type CrackResults, type HoleResults, type ParticleResults } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { executeFullAnalysis, previewAnalysisMask } from '@/services/analysisProcessService'
import { useReportExport } from '@/composables/useReportExport'
import BasicInfoPanel from './rightPanel/BasicInfoPanel.vue'
import ThresholdPanel from './rightPanel/ThresholdPanel.vue'
import ResultsPanel from './rightPanel/ResultsPanel.vue'

const analysisStore = useAnalysisStore()
const { handleExportReport } = useReportExport()
const imageStore = useImageStore()

const {
  targetMaskMat,
  currentMode,
  holeThreshold,
  crackThreshold,
  particleThreshold,
} = storeToRefs(analysisStore)

const activeNames = ref<string[]>(['2'])

// ---- 报告下拉 ----
const handleDropdownCommand = (command: string) => {
  if (command === 'preview') {
    analysisStore.reportPreviewVisible = true
  } else {
    handleExportReport(command as 'excel' | 'pdf')
  }
}

// ---- 防抖预览 ----
let previewDebounceTimer: NodeJS.Timeout | null = null
const isResetting = ref(false)

const debouncePreview = () => {
  if (isResetting.value || analysisStore.isAnalyzing) return
  if (!imageStore.processedImageDataUrl) return
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer)

  previewDebounceTimer = setTimeout(async () => {
    let threshold
    switch (currentMode.value) {
      case 'hole': threshold = holeThreshold.value; break
      case 'crack': threshold = crackThreshold.value; break
      case 'size': threshold = particleThreshold.value; break
    }
    await previewAnalysisMask(
      currentMode.value,
      imageStore.processedImageDataUrl,
      threshold,
      analysisStore.analysisRegion,
      targetMaskMat
    )
  }, 200)
}

// ---- 重置分析 ----
const handleReset = () => {
  isResetting.value = true
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
    previewDebounceTimer = null
  }
  imageStore.resetImage()
  analysisStore.resetAll()
  analysisStore.clearTargetMask()
  setTimeout(() => { isResetting.value = false }, 300)
  ElMessage.success('重置成功')
}

// ---- 开始分析 ----
const handleStartAnalysis = async () => {
  if (!imageStore.processedImageDataUrl) {
    ElMessage.warning('请先打开图片')
    return
  }
  analysisStore.isAnalyzing = true
  try {
    let threshold
    switch (currentMode.value) {
      case 'hole': threshold = holeThreshold.value; break
      case 'crack': threshold = crackThreshold.value; break
      case 'size': threshold = particleThreshold.value; break
    }
    const results = await executeFullAnalysis(
      currentMode.value,
      imageStore.processedImageDataUrl,
      threshold!,
      analysisStore.analysisRegion,
      imageStore.pixelToMm
    )
    if (results) {
      switch (currentMode.value) {
        case 'hole': analysisStore.holeResults = results as HoleResults; break
        case 'crack': analysisStore.crackResults = results as CrackResults; break
        case 'size': analysisStore.particleResults = results as ParticleResults; break
      }
    }
  } catch (error) {
    ElMessage.error('分析失败')
  } finally {
    analysisStore.isAnalyzing = false
  }
}

// 加载项目期间跳过所有 watcher
const skipWatch = () => analysisStore.isLoadingProject || isResetting.value

// ---- 阈值/模式/区域变化时实时预览 ----
watch(() => holeThreshold.value, () => {
  if (!skipWatch() && currentMode.value === 'hole') debouncePreview()
}, { deep: true })

watch(() => [crackThreshold.value.cannyLow, crackThreshold.value.cannyHigh], () => {
  if (!skipWatch() && currentMode.value === 'crack') debouncePreview()
})

watch(() => [
  particleThreshold.value.rockBrightnessThreshold,
  particleThreshold.value.coarseSensitivity,
  particleThreshold.value.fineSensitivity,
], () => {
  if (!skipWatch() && currentMode.value === 'size') debouncePreview()
})

// 切换分析模式时清空旧蒙版和结果
watch(() => currentMode.value, (newMode, oldMode) => {
  if (analysisStore.isLoadingProject) return
  if (newMode !== oldMode) {
    analysisStore.clearTargetMask()
    analysisStore.resetResults()
  }
})

// 切换分析区域时实时预览
watch(() => analysisStore.analysisRegion, () => {
  if (!skipWatch()) debouncePreview()
}, { deep: true })

// 分析区域模式从全图切到局部时清空
watch(() => analysisStore.regionMode, (newMode, oldMode) => {
  if (analysisStore.isLoadingProject) return
  if (oldMode === 'full' && newMode === 'rect') {
    analysisStore.resetResults()
    analysisStore.clearTargetMask()
  }
})

// 颜色匹配：取色或容差变化时实时预览
watch(() => analysisStore.pickedColor, () => {
  if (!skipWatch() && analysisStore.colorMatchEnabled && currentMode.value === 'hole') debouncePreview()
})
watch(() => analysisStore.colorMatchTolerance, () => {
  if (!skipWatch() && analysisStore.colorMatchEnabled && currentMode.value === 'hole') debouncePreview()
})
// 颜色匹配开关切换时触发预览
watch(() => analysisStore.colorMatchEnabled, (enabled) => {
  if (!skipWatch() && enabled && analysisStore.pickedColor && currentMode.value === 'hole') {
    debouncePreview()
  }
})
// 连续区域开关切换时触发预览
watch(() => analysisStore.contiguousRegionEnabled, () => {
  if (!skipWatch() && analysisStore.colorMatchEnabled && analysisStore.pickedColor && currentMode.value === 'hole') {
    debouncePreview()
  }
})

// 切换图片时清空旧蒙版
watch(() => imageStore.processedImageDataUrl, (newUrl, oldUrl) => {
  if (analysisStore.isLoadingProject) return
  if (newUrl && newUrl !== oldUrl) {
    analysisStore.clearTargetMask()
  }
})
</script>

<style scoped>
.right-panel {
  width: 320px;
  height: 100%;
  background-color: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 24px;
}

/* 顶部按钮区 */
.action-btns {
  flex-shrink: 0;
  padding: 16px 10px 0 0;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
}

.panel-btn {
  width: 100%;
  max-width: 100%;
  height: 44px;
  line-height: 42px;
  font-size: 16px;
  border-radius: 8px;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* 蒙版叠加开关 */
.mask-toggle-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}
.mask-toggle-label {
  font-size: 13px;
  color: #606266;
}

/* 滚动内容区 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  box-sizing: border-box;
}

/* 折叠面板通用样式 */
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

/* 表单通用样式 */
:deep(.panel-form) {
  width: 100%;
  box-sizing: border-box;
}
:deep(.el-form-item) {
  margin-bottom: 18px;
  width: 100%;
  box-sizing: border-box;
}

/* 滑块通用样式 */
:deep(.panel-slider) {
  margin-top: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 6px;
}

/* 滚动条 */
.panel-content::-webkit-scrollbar { width: 6px; }
.panel-content::-webkit-scrollbar-thumb { background-color: #dcdfe6; border-radius: 3px; }
.panel-content::-webkit-scrollbar-track { background-color: #f5f7fa; }
</style>
