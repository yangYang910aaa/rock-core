<template>
  <el-dialog v-model="visible" title="颗粒详情" width="900px" top="3vh">
    <div class="hole-filter-bar">
      <input v-model="indexSearch" class="native-select" style="width:80px;" placeholder="#序号" />
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
      <span class="filter-count">共 {{ filteredParticleList.length }} / {{ analysisStore.particleResults.particleList.length }} 个</span>
    </div>
    <div v-if="particleSelected.length" class="batch-bar">
      <span class="batch-label">已选 {{ particleSelected.length }} 个</span>
      <select v-model="batchParticleValidity" class="native-select" style="width:140px;">
        <option value="">- 批量有效性 -</option>
        <option value="__reset__">重置有效性</option>
        <option value="effective">有效（未充填）</option>
        <option value="semiEffective">较有效（半充填）</option>
        <option value="ineffective">无效（全充填）</option>
      </select>
      <select v-model="batchParticleMaterial" class="native-select" style="width:110px;">
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
      <el-button type="danger" plain @click="batchResetParticle">全部重置</el-button>
      <input v-model="particleRangeInput" class="native-select" style="width:100px;" placeholder="5 8 1-10" @keyup.enter="applyParticleRange" />
      <el-button @click="applyParticleRange">选择范围</el-button>
    </div>
    <el-table ref="particleTableRef" :data="pagedParticleList" max-height="580" stripe @selection-change="onParticleSelectionChange">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="index" label="#" width="50" />
      <el-table-column prop="diameter" label="粒径" width="100">
        <template #default="{ row }">{{ (row.diameter * unitScale).toFixed(3) }} {{ currentUnit }}</template>
      </el-table-column>
      <el-table-column prop="area" label="面积" width="110">
        <template #default="{ row }">{{ (row.area * unitScale * unitScale).toFixed(4) }} {{ currentUnit }}²</template>
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
          <el-button type="primary" link @click="locateParticle(row)">定位</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="filteredParticleList.length > 100"
      v-model:current-page="particlePage"
      :page-size="100"
      :total="filteredParticleList.length"
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
// 颗粒详情弹窗：逐颗粒列表展示 + 筛选 / 批量编辑 / 范围选择 / 分页 / 定位
// 通过 defineExpose({ open }) 暴露打开方法，由 ResultsPanel 通过 ref 调用
// ----
import { ref, computed, watch, nextTick } from 'vue'
import { useAnalysisStore, type ParticleInfo } from '@/stores/analysisStore'
import { useInteractionStore } from '@/stores/interactionStore'
import { useImageStore } from '@/stores/imageStore'

const analysisStore = useAnalysisStore()
  const interactionStore = useInteractionStore()
const imageStore = useImageStore()

// ----
// 基础状态
// ----
const visible = ref(false)
const particleTableRef = ref<any>(null)

// 单位换算
const currentUnit = computed(() => imageStore.scaleType === 'macro' ? 'mm' : 'μm')
const unitScale = computed(() => imageStore.scaleType === 'macro' ? 1 : 1000)

// ----
// 对外方法
// ----
const open = () => {
  indexSearch.value = ''
  validityFilter.value = ''
  materialFilter.value = ''
  particleSelected.value = []
  batchParticleValidity.value = ''
  batchParticleMaterial.value = ''
  particleRangeInput.value = ''
  particlePage.value = 1
  visible.value = true
  nextTick(() => particleTableRef.value?.clearSelection())
}

const locateParticle = (row: ParticleInfo) => {
  interactionStore.setLocatedParticle({ index: row.index, diameter: row.diameter, area: row.area, centerX: row.centerX, centerY: row.centerY })
  visible.value = false
}

// ----
// 筛选状态 + 过滤逻辑
// ----
const indexSearch = ref('')
const validityFilter = ref('')
const materialFilter = ref('')

// 支持序号 / 有效性 / 充填物三维组合过滤
const filteredParticleList = computed(() => {
  let list = analysisStore.particleResults.particleList
  if (indexSearch.value) { const n = parseInt(indexSearch.value); if (!isNaN(n)) list = list.filter(p => p.index === n) }
  if (validityFilter.value) {
    if (validityFilter.value === 'unset') list = list.filter(p => !p.validity)
    else list = list.filter(p => p.validity === validityFilter.value)
  }
  if (materialFilter.value) {
    if (materialFilter.value === 'unset') list = list.filter(p => !p.fillingMaterial)
    else list = list.filter(p => p.fillingMaterial === materialFilter.value)
  }
  return list
})

// ----
// 分页
// ----
const particlePage = ref(1)
const pagedParticleList = computed(() => filteredParticleList.value.slice((particlePage.value - 1) * 100, particlePage.value * 100))

// ----
// 批量编辑
// ----
const particleSelected = ref<any[]>([])
const batchParticleValidity = ref('')
const batchParticleMaterial = ref('')
const particleRangeInput = ref('')
const onParticleSelectionChange = (rows: any[]) => { particleSelected.value = rows }
// 选择下拉值后立即应用到所有勾选行，然后复位下拉
watch(batchParticleValidity, (v) => { if (!v) return; particleSelected.value.forEach((r: any) => r.validity = v === '__reset__' ? '' : v); batchParticleValidity.value = '' })
watch(batchParticleMaterial, (v) => { if (!v) return; particleSelected.value.forEach((r: any) => r.fillingMaterial = v === '__reset__' ? '' : v); batchParticleMaterial.value = '' })
const batchResetParticle = () => particleSelected.value.forEach((r: any) => { r.validity = ''; r.fillingMaterial = '' })
// 解析 "5 8 1-10" 格式，勾选对应序号的表格行
const applyParticleRange = () => {
  const s = new Set<number>()
  particleRangeInput.value.split(/\s+/).forEach(part => {
    if (!part) return
    const seg = part.split('-'); const a = parseInt(seg[0]!); const b = parseInt(seg[1] ?? seg[0]!)
    if (isNaN(a) || isNaN(b)) return
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) s.add(i)
  })
  if (!s.size) return
  filteredParticleList.value.forEach(row => { (particleTableRef.value as any)?.toggleRowSelection(row, s.has(row.index)) })
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
