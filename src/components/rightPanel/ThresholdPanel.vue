<template>
  <el-collapse-item title="阈值设置" name="1">
    <el-form label-width="90px" size="default" class="panel-form">
      <el-form-item label="分析区域">
        <el-radio-group v-model="analysisStore.regionMode">
          <el-radio value="full">全图</el-radio>
          <el-radio value="rect">局部</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <!-- 孔洞分析阈值 -->
    <template v-if="analysisStore.currentMode === 'hole'">
      <!-- 颜色匹配开关 -->
      <el-form label-width="90px" size="default" class="panel-form">
        <el-form-item label="颜色匹配">
          <el-switch v-model="analysisStore.colorMatchEnabled" />
        </el-form-item>
      </el-form>

      <!-- 颜色匹配模式 -->
      <template v-if="analysisStore.colorMatchEnabled">
        <el-form label-width="90px" size="default" class="panel-form">
          <el-form-item label="取色">
            <el-button
              :type="analysisStore.isPickingColor ? 'warning' : 'primary'"
              size="small"
              style="width:100%;"
              @click="startPickingColor"
            >
              {{ analysisStore.isPickingColor ? '取色中，请点击图片...' : '点击图片取色' }}
            </el-button>
            <div v-if="analysisStore.pickedColor" class="color-swatch">
              <span class="swatch-dot" :style="{ background: pickedColorStyle }"></span>
              <span class="swatch-text">RGB({{ analysisStore.pickedColor.r }}, {{ analysisStore.pickedColor.g }}, {{ analysisStore.pickedColor.b }})</span>
            </div>
          </el-form-item>
          <el-form-item v-if="analysisStore.currentHoverColor" label="当前颜色">
            <span class="swatch-dot" :style="{ background: hoverColorStyle }"></span>
            <span class="swatch-text">RGB({{ analysisStore.currentHoverColor.r }}, {{ analysisStore.currentHoverColor.g }}, {{ analysisStore.currentHoverColor.b }})</span>
          </el-form-item>
          <el-form-item label="连续区域">
            <el-switch v-model="analysisStore.contiguousRegionEnabled" size="small" />
            <span class="contiguous-hint">仅提取点击处连通的相似颜色区域</span>
          </el-form-item>
          <el-form-item label="匹配度">
            <div style="display:flex;align-items:center;gap:4px;">
              <el-button size="small" :icon="Minus" circle style="width:22px;height:22px;" @click="analysisStore.colorMatchTolerance = Math.max(1, analysisStore.colorMatchTolerance - 1)" />
              <el-slider v-model="analysisStore.colorMatchTolerance" :min="1" :max="100" :step="1" style="flex:1;min-width:80px;" />
              <el-button size="small" :icon="Plus" circle style="width:22px;height:22px;" @click="analysisStore.colorMatchTolerance = Math.min(100, analysisStore.colorMatchTolerance + 1)" />
            </div>
            <div style="width:100%;margin-top:4px;">
              <div style="font-size:11px;color:#E6A23C;">数值越低，匹配越精确</div>
              <div style="font-size:11px;color:#E6A23C;">容差 ±{{ Math.round(analysisStore.colorMatchTolerance / 100 * 128) }}</div>
              <div v-if="analysisStore.pickedColor" style="font-size:11px;color:#909399;line-height:1.6;">
                <div>R:[{{ Math.max(0, analysisStore.pickedColor.r - Math.round(analysisStore.colorMatchTolerance / 100 * 128)) }}~{{ Math.min(255, analysisStore.pickedColor.r + Math.round(analysisStore.colorMatchTolerance / 100 * 128)) }}]</div>
                <div>G:[{{ Math.max(0, analysisStore.pickedColor.g - Math.round(analysisStore.colorMatchTolerance / 100 * 128)) }}~{{ Math.min(255, analysisStore.pickedColor.g + Math.round(analysisStore.colorMatchTolerance / 100 * 128)) }}]</div>
                <div>B:[{{ Math.max(0, analysisStore.pickedColor.b - Math.round(analysisStore.colorMatchTolerance / 100 * 128)) }}~{{ Math.min(255, analysisStore.pickedColor.b + Math.round(analysisStore.colorMatchTolerance / 100 * 128)) }}]</div>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </template>

      <!-- 手动阈值模式（颜色匹配关闭时显示） -->
      <el-form v-else label-width="90px" size="default" class="panel-form">
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
      <el-form label-width="100px" size="default" class="panel-form">
        <el-form-item label="Canny低阈值">
          <el-slider v-model="analysisStore.crackThreshold.cannyLow" :min="0" :max="255" class="panel-slider" />
        </el-form-item>
        <el-form-item label="Canny高阈值">
          <el-slider v-model="analysisStore.crackThreshold.cannyHigh" :min="0" :max="255" class="panel-slider" />
        </el-form-item>
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
      <el-form label-width="110px" size="default" class="panel-form">
        <el-form-item label="岩石亮度阈值">
          <el-slider v-model="analysisStore.particleThreshold.rockBrightnessThreshold" :min="0" :max="255" class="panel-slider" />
        </el-form-item>
        <el-form-item label="粗颗粒灵敏度">
          <el-slider v-model="analysisStore.particleThreshold.coarseSensitivity" :min="0" :max="100" class="panel-slider" />
        </el-form-item>
        <el-form-item label="细颗粒灵敏度">
          <el-slider v-model="analysisStore.particleThreshold.fineSensitivity" :min="0" :max="100" class="panel-slider" />
        </el-form-item>
      </el-form>
    </template>
  </el-collapse-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'
import { useAnalysisStore } from '@/stores/analysisStore'
const analysisStore = useAnalysisStore()

// 点击取色前清空旧蒙版，避免残留干扰视觉
const startPickingColor = () => {
  analysisStore.clearTargetMask()
  analysisStore.isPickingColor = !analysisStore.isPickingColor
}

// 颜色色块样式
const pickedColorStyle = computed(() => {
  const c = analysisStore.pickedColor
  return c ? `rgb(${c.r},${c.g},${c.b})` : 'transparent'
})
const hoverColorStyle = computed(() => {
  const c = analysisStore.currentHoverColor
  return c ? `rgb(${c.r},${c.g},${c.b})` : 'transparent'
})
</script>

<style scoped>
/* 颜色取色预览 */
.color-swatch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.swatch-dot {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  flex-shrink: 0;
}
.swatch-text {
  font-size: 12px;
  color: #606266;
}
.contiguous-hint {
  font-size: 11px;
  color: #E6A23C;
  margin-left: 8px;
}
</style>
