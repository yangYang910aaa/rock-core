<template>
  <!-- 亮度/对比度调整弹窗 -->
  <el-dialog
    v-model="imageStore.bcDialogVisible"
    title="亮度/对比度调整"
    width="400px"
    destroy-on-close
  >
    <div class="adjust-panel">
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
      <el-button type="danger" @click="imageStore.bcDialogVisible=false">取消</el-button>
      <el-button type="warning" @click="imageStore.resetBCParams()">重置参数</el-button>
      <el-button type="primary" @click="confirmBCAdjust">确定应用</el-button>
    </template>
  </el-dialog>

  <!-- 饱和度调整弹窗 -->
  <el-dialog
    v-model="imageStore.saturationDialogVisible"
    title="饱和度调整"
    width="400px"
    destroy-on-close
  >
    <div class="adjust-panel">
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
      <el-button type="danger" @click="imageStore.saturationDialogVisible=false">取消</el-button>
      <el-button type="warning" @click="imageStore.resetSaturationParams()">重置参数</el-button>
      <el-button type="primary" @click="confirmSaturationAdjust">确定应用</el-button>
    </template>
  </el-dialog>

  <!-- 曲线调节弹窗 -->
  <el-dialog
    v-model="imageStore.gammaDialogVisible"
    title="伽马校正(明暗层次调节)"
    width="400px"
    destroy-on-close
  >
    <div class="adjust-panel">
      <div class="adjust-item">
        <p class="adjust-tip">1.0=原图,大于1亮部变暗,小于1暗部变亮</p>
        <label class="adjust-label">
          伽马值 ({{ imageStore.gammaValue.toFixed(1) }})
        </label>
        <el-slider
          v-model="imageStore.gammaValue"
          :min="0.3"
          :max="3.0"
          :step="0.1"
          show-input
          class="adjust-slider"
        />
        <div class="gamma-hint">
          <span class="hint-left">暗部变亮</span>
          <span class="hint-center">原图</span>
          <span class="hint-right">亮部变暗</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="danger" @click="imageStore.gammaDialogVisible=false">取消</el-button>
      <el-button type="warning" @click="imageStore.resetGammaParams()">重置参数</el-button>
      <el-button type="primary" @click="confirmGammaAdjust">确定应用</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()

const confirmBCAdjust = async () => {
  await imageStore.executeProcess('brightnessContrast')
  imageStore.bcDialogVisible = false
}

const confirmSaturationAdjust = async () => {
  await imageStore.executeProcess('saturation')
  imageStore.saturationDialogVisible = false
}

const confirmGammaAdjust = async () => {
  await imageStore.executeProcess('gammaCorrection')
  imageStore.gammaDialogVisible = false
}
</script>

<style scoped>
.adjust-panel {
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

.gamma-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
  padding: 0 4px;
}

.gamma-hint .hint-left {
  color: #409EFF;
  font-weight: 500;
}

.gamma-hint .hint-center {
  color: #909399;
}

.gamma-hint .hint-right {
  color: #F56C6C;
  font-weight: 500;
}
</style>
