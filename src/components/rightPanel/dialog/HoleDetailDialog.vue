<template>
  <el-dialog v-model="visible" title="孔洞详情" width="900px" top="3vh">
    <div class="hole-filter-bar">
      <input v-model="indexSearch" class="native-select" style="width:80px;" placeholder="#序号" />
      <select v-model="categoryFilter" class="native-select" style="width:110px;">
        <option value="">全部分类</option>
        <option value="large">大洞</option>
        <option value="medium">中洞</option>
        <option value="small">小洞</option>
        <option value="pinhole">针孔/溶孔</option>
      </select>
      <select v-model="validityFilter" class="native-select" style="width:150px;">
        <option value="">全部有效性</option>
        <option value="effective">有效</option>
        <option value="semiEffective">较有效</option>
        <option value="ineffective">无效</option>
        <option value="unset">未设置</option>
      </select>
      <select v-model="materialFilter" class="native-select" style="width:110px;">
        <option value="">全部充填物</option>
        <option value="mud">泥质</option>
        <option value="calcite">方解石</option>
        <option value="dolomite">白云石</option>
        <option value="asphalt">沥青</option>
        <option value="gypsum">石膏</option>
        <option value="pyrite">黄铁矿</option>
        <option value="kaolinite">高岭石</option>
        <option value="quartz">石英</option>
        <option value="unset">未设置</option>
      </select>
      <span class="filter-count">共 {{ filteredHoleList.length }} / {{ analysisStore.holeResults.holeList.length }} 个</span>
    </div>
    <div v-if="holeSelected.length" class="batch-bar">
      <span class="batch-label">已选 {{ holeSelected.length }} 个</span>
      <select v-model="batchHoleValidity" class="native-select" style="width:140px;">
        <option value="">- 批量有效性 -</option>
        <option value="__reset__">重置有效性</option>
        <option value="effective">有效（未充填）</option>
        <option value="semiEffective">较有效（半充填）</option>
        <option value="ineffective">无效（全充填）</option>
      </select>
      <select v-model="batchHoleMaterial" class="native-select" style="width:110px;">
        <option value="">- 批量充填物 -</option>
        <option value="__reset__">重置充填物</option>
        <option value="mud">泥质</option>
        <option value="calcite">方解石</option>
        <option value="dolomite">白云石</option>
        <option value="asphalt">沥青</option>
        <option value="gypsum">石膏</option>
        <option value="pyrite">黄铁矿</option>
        <option value="kaolinite">高岭石</option>
        <option value="quartz">石英</option>
      </select>
      <el-button type="danger" plain @click="batchResetHole">全部重置</el-button>
      <input v-model="holeRangeInput" class="native-select" style="width:100px;" placeholder="5 8 1-10" @keyup.enter="applyHoleRange" />
      <el-button @click="applyHoleRange">选择范围</el-button>
    </div>
    <el-table ref="holeTableRef" :data="pagedHoleList" max-height="580" stripe @selection-change="onHoleSelectionChange">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="index" label="#" width="50" />
      <el-table-column prop="diameter" label="直径" width="100">
        <template #default="{ row }">{{ (row.diameter * unitScale).toFixed(3) }} {{ currentUnit }}</template>
      </el-table-column>
      <el-table-column prop="area" label="面积" width="110">
        <template #default="{ row }">{{ (row.area * unitScale * unitScale).toFixed(4) }} {{ currentUnit }}²</template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="90">
        <template #default="{ row }">
          <el-tag :type="categoryTagType(row.category)">{{ categoryLabel(row.category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效性" width="170">
        <template #default="{ row }">
          <select v-model="row.validity" class="native-select">
            <option value="">-</option>
            <option value="effective">有效（未充填）</option>
            <option value="semiEffective">较有效（半充填）</option>
            <option value="ineffective">无效（全充填）</option>
          </select>
        </template>
      </el-table-column>
      <el-table-column label="充填物" width="140">
        <template #default="{ row }">
          <select v-model="row.fillingMaterial" class="native-select">
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
        </template>
      </el-table-column>
      <el-table-column label="定位" width="60" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="locateHole(row)">定位</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="filteredHoleList.length > 100"
      v-model:current-page="holePage"
      :page-size="100"
      :total="filteredHoleList.length"
      layout="prev, pager, next"
      class="table-pagination"
    />
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// ----
// 孔洞详情弹窗：逐孔列表展示 + 筛选 / 批量编辑 / 范围选择 / 分页 / 定位
// 通过 defineExpose({ open }) 暴露打开方法，由 ResultsPanel 通过 ref 调用
// ----
import { ref, computed, watch, nextTick } from 'vue'
import { useAnalysisStore, type HoleInfo } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()

// ----
// 基础状态
// ----
const visible = ref(false)
const holeTableRef = ref<any>(null)

// 单位换算
const currentUnit = computed(() => imageStore.scaleType === 'macro' ? 'mm' : 'μm')
const unitScale = computed(() => imageStore.scaleType === 'macro' ? 1 : 1000)

// ----
// 对外方法
// ----
const open = () => {
  indexSearch.value = ''
  categoryFilter.value = ''
  validityFilter.value = ''
  materialFilter.value = ''
  holeSelected.value = []
  batchHoleValidity.value = ''
  batchHoleMaterial.value = ''
  holeRangeInput.value = ''
  holePage.value = 1
  visible.value = true
  nextTick(() => holeTableRef.value?.clearSelection())
}

const locateHole = (row: HoleInfo) => {
  analysisStore.setLocatedHole({ index: row.index, diameter: row.diameter, area: row.area, centerX: row.centerX, centerY: row.centerY })
  visible.value = false
}

// ----
// 筛选状态 + 过滤逻辑
// ----
const indexSearch = ref('')
const categoryFilter = ref('')
const validityFilter = ref('')
const materialFilter = ref('')

// 支持序号 / 分类 / 有效性 / 充填物四维组合过滤
const filteredHoleList = computed(() => {
  let list = analysisStore.holeResults.holeList
  if (indexSearch.value) { const n = parseInt(indexSearch.value); if (!isNaN(n)) list = list.filter(h => h.index === n) }
  if (categoryFilter.value) list = list.filter(h => h.category === categoryFilter.value)
  if (validityFilter.value) {
    if (validityFilter.value === 'unset') list = list.filter(h => !h.validity)
    else list = list.filter(h => h.validity === validityFilter.value)
  }
  if (materialFilter.value) {
    if (materialFilter.value === 'unset') list = list.filter(h => !h.fillingMaterial)
    else list = list.filter(h => h.fillingMaterial === materialFilter.value)
  }
  return list
})

// ----
// 分页
// ----
const holePage = ref(1)
const pagedHoleList = computed(() => filteredHoleList.value.slice((holePage.value - 1) * 100, holePage.value * 100))

// ----
// 批量编辑
// ----
const holeSelected = ref<any[]>([])
const batchHoleValidity = ref('')
const batchHoleMaterial = ref('')
const holeRangeInput = ref('')
const onHoleSelectionChange = (rows: any[]) => { holeSelected.value = rows }
// 选择下拉值后立即应用到所有勾选行，然后复位下拉
watch(batchHoleValidity, (v) => { if (!v) return; holeSelected.value.forEach((r: any) => r.validity = v === '__reset__' ? '' : v); batchHoleValidity.value = '' })
watch(batchHoleMaterial, (v) => { if (!v) return; holeSelected.value.forEach((r: any) => r.fillingMaterial = v === '__reset__' ? '' : v); batchHoleMaterial.value = '' })
const batchResetHole = () => holeSelected.value.forEach((r: any) => { r.validity = ''; r.fillingMaterial = '' })
// 解析 "5 8 1-10" 格式，勾选对应序号的表格行
const applyHoleRange = () => {
  const s = new Set<number>()
  holeRangeInput.value.split(/\s+/).forEach(part => {
    if (!part) return
    const seg = part.split('-'); const a = parseInt(seg[0]!); const b = parseInt(seg[1] ?? seg[0]!)
    if (isNaN(a) || isNaN(b)) return
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) s.add(i)
  })
  if (!s.size) return
  filteredHoleList.value.forEach(row => { (holeTableRef.value as any)?.toggleRowSelection(row, s.has(row.index)) })
}

// ----
// 分类标签映射
// ----
const categoryLabel = (cat: string) => {
  const map: Record<string, string> = { large: '大洞', medium: '中洞', small: '小洞', pinhole: '针孔' }
  return map[cat] || cat
}
const categoryTagType = (cat: string) => {
  const map: Record<string, string> = { large: 'danger', medium: 'warning', small: 'success', pinhole: 'info' }
  return map[cat] || ''
}

defineExpose({ open })
</script>

<style scoped>
.native-select {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
  border: 1px solid #dcdfe6; 
  border-radius: 4px; 
  background: #fff;
  border-radius: 4px; 
  background: #fff;
  color: #606266; 
  outline: none; 
  cursor: pointer;
}
.native-select:focus {
   border-color: #409eff; 
}
.hole-filter-bar {
  display: flex;
  align-items: center; 
  gap: 10px;
  margin-bottom: 12px; 
  padding-bottom: 10px; 
  border-bottom: 1px solid #ebeef5;
}
.filter-count {
   font-size: 12px; 
   color: #909399; 
   margin-left: auto; 
}
.batch-bar {
  display: flex;
  align-items: center; 
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 10px; 
  background: #f0f9ff; 
  border: 1px solid #b3d8ff; 
  border-radius: 4px;
}
.batch-label { 
   font-size: 12px; 
   font-weight: 600; 
   color: #409eff; 
   white-space: nowrap; 
}
.table-pagination { 
   margin-top: 8px; 
   display: flex; 
   justify-content: center; 
}
</style>
