<template>
  <el-dialog
    v-model="visible"
    title="预览导出结果"
    width="800px"
    top="3vh"
    destroy-on-close
    @open="onOpen"
  >
    <!-- 格式选择：PDF 报告 或 Excel 表格 -->
    <div class="preview-format-bar">
      <span class="format-label">导出格式：</span>
      <el-radio-group v-model="selectedFormat" @change="onFormatChange">
        <el-radio value="pdf">PDF 报告</el-radio>
        <el-radio value="excel">Excel 表格</el-radio>
      </el-radio-group>
    </div>

    <!-- 预览区：iframe 渲染生成的 HTML -->
    <div class="preview-container">
      <iframe
        ref="previewIframe"
        :srcdoc="previewHtml"
        class="preview-iframe"
        sandbox="allow-same-origin"
        title="报告预览"
      />
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="handleExport">导出文件</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// ----
// 报告预览弹窗：弹窗打开时自动生成 HTML 预览，通过 iframe 渲染
// 支持 PDF（reportGenerator.generateReportHtml）和 Excel（generateExcelPreviewHtml）两种预览
// ----
import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { generateReportHtml, generateExcelPreviewHtml } from '@/utils/reportGenerator'
import { useReportExport } from '@/composables/useReportExport'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()
const { handleExportReport } = useReportExport()

// 双向绑定弹窗显隐：通过 computed 读写 analysisStore.reportPreviewVisible
const visible = computed({
  get: () => analysisStore.reportPreviewVisible,
  set: (v) => { analysisStore.reportPreviewVisible = v }
})

const selectedFormat = ref<'pdf' | 'excel'>('pdf')
const previewHtml = ref<string>('')

/** 弹窗打开时重置格式为 PDF，生成预览 HTML */
const onOpen = () => {
  selectedFormat.value = 'pdf'
  generatePreview()
}

/** 格式切换时重新生成预览 */
const onFormatChange = () => {
  generatePreview()
}

/** 收集当前分析状态 → 组装参数 → 调用对应格式的 HTML 生成函数 → 写入 iframe srcdoc */
const generatePreview = () => {
  const { coreBasicInfo, currentMode, regionMode, holeResults, crackResults, particleResults } = analysisStore
  const { scaleType } = imageStore

  // 当前模式对应的结果
  let results
  if (currentMode === 'hole') results = holeResults
  else if (currentMode === 'crack') results = crackResults
  else results = particleResults

  // 当前模式对应的阈值
  let threshold
  if (currentMode === 'hole') threshold = analysisStore.holeThreshold
  else if (currentMode === 'crack') threshold = analysisStore.crackThreshold
  else threshold = analysisStore.particleThreshold

  const basicInfo = {
    wellNo: coreBasicInfo.wellNo || '未填写',
    wellDepth: coreBasicInfo.wellDepth || '未填写',
    horizon: coreBasicInfo.horizon || '未填写',
    lithology: coreBasicInfo.lithology || '未填写',
    sampleDate: coreBasicInfo.sampleDate || new Date().toISOString().slice(0, 10)
  }

  const params = {
    mode: currentMode,
    regionMode,
    scaleType,
    threshold,
  }

  if (selectedFormat.value === 'excel') {
    previewHtml.value = generateExcelPreviewHtml(basicInfo, params, results)
  } else {
    previewHtml.value = generateReportHtml(basicInfo, params, results)
  }
}

/** 导出按钮：关闭弹窗 → 调 useReportExport 下载文件 */
const handleExport = () => {
  visible.value = false
  handleExportReport(selectedFormat.value)
}
</script>

<style scoped>
.preview-format-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.format-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.preview-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 520px;
  border: none;
  background: #fff;
}
</style>
