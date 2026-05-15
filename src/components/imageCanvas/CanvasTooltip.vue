<template>
  <Transition name="tooltip">
    <div
      v-if="visible && data"
      class="hole-tooltip"
      :class="{ 'located-tooltip': isLocated }"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <div class="tooltip-title">
        {{ titlePrefix }}{{ data.index > 0 ? ' #' + data.index : '' }}
        <span v-if="isLocated" class="locate-badge">已定位</span>
      </div>
      <div class="tooltip-content">
        <template v-if="mode === 'hole'">
          <div class="tooltip-item">
            <span class="tooltip-label">直径:</span>
            <span class="tooltip-value">{{ data.diameter?.toFixed(3) ?? '-' }} {{ unit }}</span>
          </div>
          <div class="tooltip-item">
            <span class="tooltip-label">面积:</span>
            <span class="tooltip-value">{{ data.area?.toFixed(4) ?? '-' }} {{ unit }}²</span>
          </div>
        </template>
        <template v-else-if="mode === 'crack'">
          <div class="tooltip-item">
            <span class="tooltip-label">长度:</span>
            <span class="tooltip-value">{{ data.length > 0 ? data.length.toFixed(3) + ' ' + unit : '-' }}</span>
          </div>
          <div class="tooltip-item">
            <span class="tooltip-label">宽度:</span>
            <span class="tooltip-value">{{ data.width > 0 ? data.width.toFixed(3) + ' ' + unit : '-' }}</span>
          </div>
        </template>
        <template v-else-if="mode === 'size'">
          <div class="tooltip-item">
            <span class="tooltip-label">粒径:</span>
            <span class="tooltip-value">{{ data.diameter.toFixed(3) }} {{ unit }}</span>
          </div>
          <div class="tooltip-item">
            <span class="tooltip-label">面积:</span>
            <span class="tooltip-value">{{ data.area.toFixed(4) }} {{ unit }}²</span>
          </div>
        </template>
      </div>
      <el-button
        v-if="isLocated"
        size="small" type="danger" plain
        class="locate-dismiss-btn"
        @click.stop="$emit('clearLocated')"
      >取消定位</el-button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// ----
// 悬浮/定位 Tooltip：显示孔洞/裂缝/颗粒的实时信息
// 完全由父组件通过 props 驱动，无内部状态
// ----
defineProps<{
  visible: boolean
  data: Record<string, any> | null
  x: number
  y: number
  mode: 'hole' | 'crack' | 'size'
  isLocated: boolean
  titlePrefix: string
  unit: string
}>()

defineEmits<{ clearLocated: [] }>()
</script>

<style scoped>
.hole-tooltip {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 12px;
  z-index: 1000;
  min-width: 140px;
  pointer-events: none;
}
.hole-tooltip.located-tooltip {
  pointer-events: auto;
  border-color: #409eff;
}
.tooltip-title {
  font-weight: 600;
  color: #409eff;
  font-size: 13px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}
.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tooltip-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.tooltip-label { color: #606266; }
.tooltip-value { color: #303133; font-weight: 500; }

.tooltip-enter-active, .tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-enter-from, .tooltip-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.locate-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #409eff;
  color: #fff;
  margin-left: 8px;
  vertical-align: middle;
}
.locate-dismiss-btn {
  margin-top: 8px;
  width: 100%;
  font-size: 12px;
}
</style>
