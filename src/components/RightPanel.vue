<template>
  <div class="right-panel">
    <!-- 顶部操作按钮：保持不变，已经对齐 -->
    <div class="action-btns">
      <el-button type="danger" block class="panel-btn" @click="handleGenerateReport"><el-icon><DocumentAdd /></el-icon>生成分析报告</el-button>
      <el-button type="warning" block class="panel-btn" @click="handleReset"><el-icon><Refresh /></el-icon>重置分析</el-button>
    </div>

    <!-- 可滚动的参数&结果区域 -->
    <div class="panel-content">
      <el-collapse v-model="activeNames">
        <!-- 阈值设置面板 :根据分析模式动态显示-->
        <el-collapse-item title="阈值设置" name="1">
          <!-- 孔洞分析阈值 -->
          <template v-if="analysisStore.currentMode === 'hole'">
            <el-form label-width="90px" size="default" class="panel-form">
              <el-form-item label="颜色匹配度">
                <el-slider v-model="analysisStore.holeThreshold.colorMatch" :min="0" :max="100" class="panel-slider" />
              </el-form-item>
              <el-form-item label="最小阈值">
                <el-slider v-model="analysisStore.holeThreshold.minThreshold" :min="0" :max="255" class="panel-slider" />
              </el-form-item>
              <el-form-item label="最大阈值">
                <el-slider v-model="analysisStore.holeThreshold.maxThreshold" :min="0" :max="255" class="panel-slider" />
              </el-form-item>
            </el-form>
          </template>
          <!-- 裂缝分析阈值 -->
          <template v-else-if="analysisStore.currentMode === 'crack'">
            <el-form label-width="90px" size="default" class="panel-form">
              <el-form-item label="最小宽度">
                <el-input-number v-model="analysisStore.crackThreshold.minWidth" :min="0" :step="0.1" style="width: 100%;" />
              </el-form-item>
              <el-form-item label="最大宽度">
                <el-input-number v-model="analysisStore.crackThreshold.maxWidth" :min="0" :step="0.1" style="width: 100%;" />
              </el-form-item>
              <el-form-item label="最小长度">
                <el-input-number v-model="analysisStore.crackThreshold.minLength" :min="0" :step="1" style="width: 100%;" />
              </el-form-item>
            </el-form>
          </template>
          <!-- 粒度分析阈值 -->
           <template v-else-if="analysisStore.currentMode === 'size'">
            <el-form label-width="90px" size="default" class="panel-form">
              <el-form-item label="最小粒径">
                <el-input-number v-model="analysisStore.sizeThreshold.minSize" :min="0" :step="0.1" style="width: 100%;" />
              </el-form-item>
              <el-form-item label="最大粒径">
                <el-input-number v-model="analysisStore.sizeThreshold.maxSize" :min="0" :step="0.1" style="width: 100%;" />
              </el-form-item>
              <el-form-item label="分级数">
                <el-input-number v-model="analysisStore.sizeThreshold.gradeCount" :min="2" :max="10" :step="1" style="width: 100%;" />
              </el-form-item>
            </el-form>
           </template>
          </el-collapse-item>

        <!-- 分析结果面板:根据分析模式动态显示 -->
        <el-collapse-item title="分析结果" name="2">
          <!-- 孔洞分析结果 -->
          <template v-if="analysisStore.currentMode === 'hole'">
            <el-descriptions :column="1" size="default" border class="result-table">
              <el-descriptions-item label="孔洞总数">{{ analysisStore.holeResults.totalCount }}</el-descriptions-item>
              <el-descriptions-item label="孔洞总面积">{{ analysisStore.holeResults.totalArea }} mm²</el-descriptions-item>
              <el-descriptions-item label="平均孔径">{{ analysisStore.holeResults.avgDiameter }} mm</el-descriptions-item>
              <el-descriptions-item label="最大孔径">{{ analysisStore.holeResults.maxDiameter }} mm</el-descriptions-item>
              <el-descriptions-item label="最小孔径">{{ analysisStore.holeResults.minDiameter }} mm</el-descriptions-item>
              <el-descriptions-item label="面孔率">{{ analysisStore.holeResults.faceRate }} %</el-descriptions-item>
            </el-descriptions>
          </template>
          <!-- 裂缝分析结果 -->
           <template v-else-if="analysisStore.currentMode === 'crack'">
              <el-descriptions :column="1" size="default" border class="result-table">
              <el-descriptions-item label="裂缝总数">{{ analysisStore.crackResults.totalCount }}</el-descriptions-item>
              <el-descriptions-item label="裂缝总长度">{{ analysisStore.crackResults.totalLength }} mm</el-descriptions-item>
              <el-descriptions-item label="平均宽度">{{ analysisStore.crackResults.avgWidth }} mm</el-descriptions-item>
              <el-descriptions-item label="裂缝面孔率">{{ analysisStore.crackResults.faceRate }} %</el-descriptions-item>
              <el-descriptions-item label="线密度">{{ analysisStore.crackResults.lineDensity }} 条/m</el-descriptions-item>
              <el-descriptions-item label="面密度">{{ analysisStore.crackResults.areaDensity }} m/m²</el-descriptions-item>
            </el-descriptions>
           </template>

           <!-- 粒度分析结果 -->
            <template v-else-if="analysisStore.currentMode === 'size'">
                 <el-descriptions :column="1" size="default" border class="result-table">
              <el-descriptions-item label="平均粒径">{{ analysisStore.sizeResults.avgSize }} mm</el-descriptions-item>
              <el-descriptions-item label="分选系数">{{ analysisStore.sizeResults.sortingCoefficient }}</el-descriptions-item>
              <el-descriptions-item label="粒度分布">
                <div v-if="analysisStore.sizeResults.distribution.length > 0">
                  <div v-for="(item, index) in analysisStore.sizeResults.distribution" :key="index" style="font-size: 12px; margin-bottom: 4px;">
                    第{{ index + 1 }}级: {{ item }}%
                  </div>
                </div>
                <div v-else>暂无数据</div>
              </el-descriptions-item>
            </el-descriptions>
            </template>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { DocumentAdd, Refresh } from '@element-plus/icons-vue'
import {useAnalysisStore} from '@/stores/analysisStore'
import {useImageStore} from '@/stores/imageStore'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { previewAnalysisMask } from '@/services/analysisProcessService'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()
const { 
  targetMaskMat, 
  currentMode, 
  holeThreshold, 
  crackThreshold, 
  sizeThreshold, 
  analysisRegion 
} = storeToRefs(analysisStore)

const activeNames = ref<string[]>(['1','2'])//默认展开阈值设置和分析结果
// 防抖定时器，用于节流预览分析结果
let previewDebounceTimer: NodeJS.Timeout | null = null
// 【关键新增】防抖预览蒙版
const debouncePreview = () => {
  if (!imageStore.processedImageDataUrl) return

  // 清除之前的定时器
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
  }

  // 200ms防抖，避免频繁调用
  previewDebounceTimer = setTimeout(async () => {
    // 获取当前阈值
    let threshold
    switch (currentMode.value) {
      case 'hole':
        threshold = holeThreshold.value
        break
      case 'crack':
        threshold = crackThreshold.value
        break
      case 'size':
        threshold = sizeThreshold.value
        break
    }

    // 调用预览，传入targetMaskMat
    await previewAnalysisMask(
      currentMode.value,
      imageStore.processedImageDataUrl,
      threshold,
      analysisRegion.value,
      targetMaskMat
    )
  }, 200)
}
//重置按钮点击事件
const handleReset=()=>{
  imageStore.resetImage()
  ElMessage.success('重置成功')
}
//生成分析报告点击事件
const handleGenerateReport=()=>{
  ElMessage.success('生成分析报告成功')
}

// ==========================================
// 【关键新增】监听：阈值变化时实时预览
// ==========================================
watch(
  () => [
    holeThreshold.value,
    crackThreshold.value,
    sizeThreshold.value
  ],
  () => {
    debouncePreview()
  },
  { deep: true }
)

// 监听：分析模式变化时重新预览
watch(() => currentMode.value, () => {
  debouncePreview()
})

// 监听：分析区域变化时重新预览
watch(() => analysisRegion.value, () => {
  debouncePreview()
}, { deep: true })

// 监听：图片变化时重新预览
watch(() => imageStore.processedImageDataUrl, () => {
  if (imageStore.processedImageDataUrl) {
    debouncePreview()
  }
})

// 组件挂载时初始化
onMounted(() => {
  if (imageStore.processedImageDataUrl) {
    debouncePreview()
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
}

/* 顶部按钮区：保持不变 */
.action-btns {
  flex-shrink: 0;
  padding: 16px 24px; /* 按钮区也加了左右内边距，和内容区对齐 */
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-right: 16px;
}

/* 按钮样式：保持不变，已经对齐 */
.panel-btn {
  height: 44px;
  line-height: 42px;
  font-size: 16px;
  border-radius: 6px;
}
/* 【核心优化】内容区整体加了充足的右内边距，给右侧留足留白 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  /* 左16px + 右32px的内边距，右侧留白充足，不会贴边 */
  padding: 12px 32px 12px 16px;
  box-sizing: border-box;
}

/* 折叠面板样式优化：给箭头和标题留足空间 */
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

/* 折叠面板内容区：加了右内边距，和整体对齐 */
:deep(.el-collapse-item__content) {
  padding: 12px 4px 12px 0;
}

/* 表单宽度适配：确保不会超出容器 */
:deep(.panel-form) {
  width: 100%;
  box-sizing: border-box;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
  width: 100%;
  box-sizing: border-box;
}

/* 【关键优化】滑块加了左右内边距，两端不会被截断，视觉更舒适 */
:deep(.panel-slider) {
  margin-top: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 4px; /* 滑块左右加了留白，不会贴到边缘 */
}

/* 分析结果表格：加了右内边距，和整体对齐 */
:deep(.result-table) {
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;
}

:deep(.el-descriptions__label) {
  width: 90px;
  font-weight: 500;
}

/* 滚动条样式优化：和内容区分开，不会挤压内容 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}
</style>