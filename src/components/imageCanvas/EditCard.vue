<template>
  <div class="hole-edit-card" :style="{ left: position.x + 'px', top: position.y + 'px' }" @click.stop>
    <div class="card-header">
      <span>{{ title }} #{{ data.index }}</span>
      <span class="card-close" @click="$emit('close')">×</span>
    </div>
    <div class="card-body">
      <!-- 孔洞模式特有字段 -->
      <template v-if="mode === 'hole'">
        <div class="card-row">
          <span class="card-label">直径:</span>
          <span>{{ (data.diameter * unitScale).toFixed(3) }} {{ currentUnit }}</span>
        </div>
        <div class="card-row">
          <span class="card-label">面积:</span>
          <span>{{ (data.area * unitScale * unitScale).toFixed(4) }} {{ currentUnit }}²</span>
        </div>
        <div class="card-row">
          <span class="card-label">分类:</span>
          <el-tag :type="categoryTagType(data.category)" size="small">{{ categoryLabel(data.category) }}</el-tag>
        </div>
      </template>
      <!-- 裂缝模式特有字段 -->
      <template v-else-if="mode === 'crack'">
        <div class="card-row">
          <span class="card-label">长度:</span>
          <span>{{ (data.length * unitScale).toFixed(3) }} {{ currentUnit }}</span>
        </div>
        <div class="card-row">
          <span class="card-label">宽度:</span>
          <span>{{ (data.width * unitScale).toFixed(3) }} {{ currentUnit }}</span>
        </div>
      </template>
      <!-- 粒度模式特有字段 -->
      <template v-else-if="mode === 'size'">
        <div class="card-row">
          <span class="card-label">粒径:</span>
          <span>{{ (data.diameter * unitScale).toFixed(3) }} {{ currentUnit }}</span>
        </div>
        <div class="card-row">
          <span class="card-label">面积:</span>
          <span>{{ (data.area * unitScale * unitScale).toFixed(4) }} {{ currentUnit }}²</span>
        </div>
      </template>
      <!-- 通用：有效性 + 充填物 -->
      <div class="card-row card-select">
        <span class="card-label">有效性:</span>
        <select v-model="data.validity" class="native-select">
          <option value="">-</option>
          <option value="effective">有效（未充填）</option>
          <option value="semiEffective">较有效（半充填）</option>
          <option value="ineffective">无效（全充填）</option>
        </select>
      </div>
      <div class="card-row card-select">
        <span class="card-label">充填物:</span>
        <select v-model="data.fillingMaterial" class="native-select">
          <option value="">-</option>
          <option value="mud">泥质</option>
          <option value="calcite">方解石</option>
          <option value="dolomite">白云石</option>
          <option value="asphalt">沥青</option>
          <option value="gypsum">石膏</option>
          <option value="pyrite">黄铁矿</option>
          <option value="kaolinite">高岭石</option>
          <option value="quartz">石英</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ----
// 画布点击属性编辑卡片：孔洞 / 裂缝 / 颗粒三种模式共用
// data 直接修改 store 中的响应式对象（by reference），无需额外 emit
// ----
defineProps<{
  mode: 'hole' | 'crack' | 'size'
  data: Record<string, any>
  position: { x: number; y: number }
  title: string
  unitScale: number
  currentUnit: string
}>()

defineEmits<{ close: [] }>()

const categoryLabel = (cat: string) => {
  const map: Record<string, string> = { large: '大洞', medium: '中洞', small: '小洞', pinhole: '针孔' }
  return map[cat] || cat
}
const categoryTagType = (cat: string) => {
  const map: Record<string, string> = { large: 'danger', medium: 'warning', small: 'success', pinhole: 'info' }
  return map[cat] || ''
}
</script>

<style scoped>
.hole-edit-card {
  position: fixed;
  background: #fff;
  border: 1px solid #409eff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  padding: 0;
  z-index: 1001;
  min-width: 200px;
  pointer-events: auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #409eff;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 7px 7px 0 0;
}
.card-close { 
  cursor: pointer; 
  font-size: 16px; 
  line-height: 1; 
  opacity: 0.8;
 }
.card-close:hover {
   opacity: 1; 
}
.card-body { padding: 8px 12px; }
.card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #303133;
}
.card-select { margin-bottom: 8px; }
.card-label { color: #606266; min-width: 40px; font-weight: 500; }
.native-select {
  flex: 1;
  height: 26px;
  padding: 0 4px;
  font-size: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  outline: none;
}
.native-select:focus { border-color: #409eff; }
</style>
