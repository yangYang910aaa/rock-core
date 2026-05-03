<template>
  <div class="preprocess-panel">
    <div class="preprocess-btns">
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('autoLevels')">自动色阶</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('curveAdjust')">曲线调节</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('grayscale')">灰度化</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="openBCDialog">亮度/对比度</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="openSaturationDialog">饱和度调节</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('filterSmooth')">滤波平滑</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('sharpen')">锐化</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('edgeDetect')">边缘检测</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button class="sidebar-btn" @click="handlePreprocess('negativeEffect')">底片效果</el-button>
      </div>
    </div>

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
import { ref } from 'vue'
import { useImageStore, type PreprocessType } from '@/stores/imageStore'
import { ElMessage } from 'element-plus'

const imageStore = useImageStore()

// 亮度/对比度弹窗状态
const bcDialogVisible = ref<boolean>(false)
// 饱和度弹窗状态
const saturationDialogVisible = ref<boolean>(false)

// 处理图像预处理的点击事件
const handlePreprocess = (type: PreprocessType) => {
  imageStore.executeProcess(type)
}

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
</script>

<style scoped>
.preprocess-panel {
  width: 100%;
}

.preprocess-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
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

/* 亮度/对比度、饱和度弹窗样式 */
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
</style>