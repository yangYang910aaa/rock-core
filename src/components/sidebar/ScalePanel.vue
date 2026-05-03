<template>
  <div class="scale-panel">
    <el-radio-group v-model="scaleType" type="button" class="scale-radio-group">
      <el-radio-button label="macro">宏观(mm)</el-radio-button>
      <el-radio-button label="micro">微观(μm)</el-radio-button>
    </el-radio-group>

    <div class="calibrate-area">
      <div class="group-title">标尺校准</div>
      <el-form label-width="80px" class="calibrate-form">
        <el-form-item label="真实长度">
          <el-input-number
            v-model="imageStore.calibrateRealLength"
            :min="0.1"
            :step="0.1"
            style="width: 100%;"
          ></el-input-number>
          <span class="unit-tip">{{ imageStore.scaleType === 'macro' ? 'mm' : 'μm' }}</span>
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
        <el-button class="sidebar-btn small-btn" @click="imageStore.resetCalibrate">
          重置默认
        </el-button>
      </div>
      <p class="calibrate-tip">点击「开始校准」,在图片上依次点击校准线的起点和终点</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia'

const imageStore = useImageStore()
const { scaleType: storeScaleType } = storeToRefs(imageStore)
const { setScaleType } = imageStore

const scaleType = ref<'macro' | 'micro'>('macro')

// 同步标尺类型
scaleType.value = storeScaleType.value
watch(scaleType, (newType) => {
  setScaleType(newType)
})
</script>

<style scoped>
.scale-panel {
  width: 100%;
}

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

.calibrate-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
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

.calibrate-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
  padding-left: 4px;
}
</style>