<template>
  <el-collapse-item title="分析结果" name="2">
    <!-- 孔洞分析结果 -->
    <template v-if="analysisStore.currentMode === 'hole'">
      <el-descriptions :column="1" size="default" border class="result-table">
        <el-descriptions-item label="孔洞总数">{{ analysisStore.holeResults.totalCount }}</el-descriptions-item>
        <el-descriptions-item label="孔洞总面积">{{ (analysisStore.holeResults.totalArea *unitScale*unitScale).toFixed(4) }} {{currentUnit}}²</el-descriptions-item>
        <el-descriptions-item label="平均孔径">{{ (analysisStore.holeResults.avgDiameter *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="最大孔径">{{ (analysisStore.holeResults.maxDiameter *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="最小孔径">{{ (analysisStore.holeResults.minDiameter *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="面孔率">{{ analysisStore.holeResults.faceRate }} %</el-descriptions-item>
      </el-descriptions>
      <!-- 孔洞分类统计 -->
      <el-descriptions :column="1" size="small" border class="result-table" style="margin-top:12px;">
        <template #title>孔洞分类统计</template>
        <el-descriptions-item label="大洞(>10mm)">{{ analysisStore.holeResults.largeCount }} 个</el-descriptions-item>
        <el-descriptions-item label="中洞(5~10mm)">{{ analysisStore.holeResults.mediumCount }} 个</el-descriptions-item>
        <el-descriptions-item label="小洞(1~5mm)">{{ analysisStore.holeResults.smallCount }} 个</el-descriptions-item>
        <el-descriptions-item label="针孔/溶孔(<1mm)">{{ analysisStore.holeResults.pinholeCount }} 个</el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 裂缝分析结果 -->
    <template v-else-if="analysisStore.currentMode === 'crack'">
      <el-descriptions :column="1" size="default" border class="result-table">
        <el-descriptions-item label="裂缝总数">{{ analysisStore.crackResults.totalCount }}</el-descriptions-item>
        <el-descriptions-item label="裂缝总长度">{{ (analysisStore.crackResults.totalLength *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="平均宽度">{{ (analysisStore.crackResults.avgWidth *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="裂缝面孔率">{{ analysisStore.crackResults.faceRate }} %</el-descriptions-item>
        <el-descriptions-item label="线密度">{{ analysisStore.crackResults.lineDensity }} 条/{{imageStore.scaleType==='macro'?'m':'mm'}}</el-descriptions-item>
        <el-descriptions-item label="面密度">{{ (analysisStore.crackResults.areaDensity).toFixed(4) }} {{currentUnit}}/{{ currentUnit }}²</el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 粒度分析结果 -->
    <template v-else-if="analysisStore.currentMode === 'size'">
      <el-descriptions :column="1" size="default" border class="result-table">
        <el-descriptions-item label="颗粒总数">{{ analysisStore.sizeResults.totalParticleCount }}</el-descriptions-item>
        <el-descriptions-item label="平均粒径">{{ (analysisStore.sizeResults.avgParticleSize *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="粗颗粒占比">{{ analysisStore.sizeResults.coarseParticleRatio }} %</el-descriptions-item>
        <el-descriptions-item label="细颗粒占比">{{ analysisStore.sizeResults.fineParticleRatio }} %</el-descriptions-item>
        <el-descriptions-item label="颗粒均匀度">{{ analysisStore.sizeResults.particleUniformity }}</el-descriptions-item>
        <el-descriptions-item label="岩石颗粒占比">{{ analysisStore.sizeResults.rockParticleRate }} %</el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 孔洞分析附属功能按钮 -->
    <div v-if="analysisStore.currentMode === 'hole' && analysisStore.holeResults.holeList.length > 0" class="hole-extra-btns">
      <el-button type="primary" class="hole-extra-btn" @click="openHoleDetail">
        查看孔洞详情（{{ analysisStore.holeResults.holeList.length }} 个）
      </el-button>
      <el-button type="success" class="hole-extra-btn" @click="chartDialogVisible = true">
        查看直径分布图
      </el-button>
    </div>

    <!-- 裂缝分析附属功能按钮 -->
    <div v-if="analysisStore.currentMode === 'crack' && analysisStore.crackResults.crackList.length > 0" class="hole-extra-btns">
      <el-button type="primary" class="hole-extra-btn" @click="openCrackDetail">
        查看裂缝详情（{{ analysisStore.crackResults.crackList.length }} 个）
      </el-button>
    </div>

    <!-- 直径分布图弹窗 -->
    <el-dialog v-model="chartDialogVisible" title="孔洞直径分布" width="900px" top="5vh" destroy-on-close>
      <HoleDistributionChart :height="560" />
      <template #footer>
        <el-button @click="chartDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-collapse-item>

  <!-- 孔洞详情弹窗 -->
  <el-dialog
    v-model="holeDetailVisible"
    title="孔洞详情"
    width="780px"
    top="3vh"
    destroy-on-close
  >
    <!-- 筛选栏：序号搜索 + 三个维度自由组合，实时过滤孔洞列表 -->
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
    <el-table :data="filteredHoleList" size="small" max-height="480" stripe>
      <el-table-column prop="index" label="#" width="50" />
      <el-table-column prop="diameter" label="直径" width="100">
        <template #default="{ row }">{{ (row.diameter * unitScale).toFixed(3) }} {{ currentUnit }}</template>
      </el-table-column>
      <el-table-column prop="area" label="面积" width="110">
        <template #default="{ row }">{{ (row.area * unitScale * unitScale).toFixed(4) }} {{ currentUnit }}²</template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="90">
        <template #default="{ row }">
          <el-tag :type="categoryTagType(row.category)" size="small">{{ categoryLabel(row.category) }}</el-tag>
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
      <el-table-column label="定位" width="60" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="locateHole(row)">定位</el-button>
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
    </el-table>
    <template #footer>
      <el-button @click="holeDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 裂缝详情弹窗 -->
  <el-dialog
    v-model="crackDetailVisible"
    title="裂缝详情"
    width="780px"
    top="3vh"
    destroy-on-close
  >
    <div class="hole-filter-bar">
      <input v-model="crackIndexSearch" class="native-select" style="width:80px;" placeholder="#序号" />
      <select v-model="crackValidityFilter" class="native-select" style="width:150px;">
        <option value="">全部有效性</option>
        <option value="effective">有效</option>
        <option value="semiEffective">较有效</option>
        <option value="ineffective">无效</option>
        <option value="unset">未设置</option>
      </select>
      <select v-model="crackMaterialFilter" class="native-select" style="width:110px;">
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
      <span class="filter-count">共 {{ filteredCrackList.length }} / {{ analysisStore.crackResults.crackList.length }} 个</span>
    </div>
    <el-table :data="filteredCrackList" size="small" max-height="480" stripe>
      <el-table-column prop="index" label="#" width="50" />
      <el-table-column prop="length" label="长度" width="100">
        <template #default="{ row }">{{ (row.length * unitScale).toFixed(3) }} {{ currentUnit }}</template>
      </el-table-column>
      <el-table-column prop="width" label="宽度" width="100">
        <template #default="{ row }">{{ (row.width * unitScale).toFixed(3) }} {{ currentUnit }}</template>
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
          <el-button size="small" type="primary" link @click="locateCrack(row)">定位</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="crackDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnalysisStore, type HoleInfo, type CrackInfo } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import HoleDistributionChart from './HoleDistributionChart.vue'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()

// 点击"定位"：关闭弹窗，在画布上持久高亮该孔洞并显示信息
const locateHole = (row: HoleInfo) => {
  analysisStore.setLocatedHole({
    index: row.index,
    diameter: row.diameter,
    area: row.area,
    centerX: row.centerX,
    centerY: row.centerY,
  })
  holeDetailVisible.value = false
}

// 单位换算（mm/μm）
const currentUnit = computed(() => imageStore.scaleType === 'macro' ? 'mm' : 'μm')
const unitScale = computed(() => imageStore.scaleType === 'macro' ? 1 : 1000)

// ---- 孔洞详情弹窗 + 筛选 ----
const holeDetailVisible = ref(false)
const chartDialogVisible = ref(false)
// 打开弹窗时清空上次筛选条件，避免残留状态
const openHoleDetail = () => {
  indexSearch.value = ''
  categoryFilter.value = ''
  validityFilter.value = ''
  materialFilter.value = ''
  holeDetailVisible.value = true
}
// 筛选维度：序号 + 分类 + 有效性 + 充填物，可自由组合
const indexSearch = ref('')
const categoryFilter = ref('')
const validityFilter = ref('')
const materialFilter = ref('')

// 按序号/分类/有效性/充填物组合过滤（unset = 未填写，快速定位）
const filteredHoleList = computed(() => {
  let list = analysisStore.holeResults.holeList
  if (indexSearch.value) {
    const n = parseInt(indexSearch.value)
    if (!isNaN(n)) list = list.filter(h => h.index === n)
  }
  if (categoryFilter.value) {
    list = list.filter(h => h.category === categoryFilter.value)
  }
  if (validityFilter.value) {
    if (validityFilter.value === 'unset') {
      list = list.filter(h => !h.validity)
    } else {
      list = list.filter(h => h.validity === validityFilter.value)
    }
  }
  if (materialFilter.value) {
    if (materialFilter.value === 'unset') {
      list = list.filter(h => !h.fillingMaterial)
    } else {
      list = list.filter(h => h.fillingMaterial === materialFilter.value)
    }
  }
  return list
})

// 孔洞分类标签映射
const categoryLabel = (cat: string) => {
  const map: Record<string, string> = { large: '大洞', medium: '中洞', small: '小洞', pinhole: '针孔' }
  return map[cat] || cat
}
const categoryTagType = (cat: string) => {
  const map: Record<string, string> = { large: 'danger', medium: 'warning', small: 'success', pinhole: 'info' }
  return map[cat] || ''
}

// ---- 裂缝详情弹窗 + 筛选 ----
const crackDetailVisible = ref(false)
const crackIndexSearch = ref('')
const crackValidityFilter = ref('')
const crackMaterialFilter = ref('')

const openCrackDetail = () => {
  crackIndexSearch.value = ''
  crackValidityFilter.value = ''
  crackMaterialFilter.value = ''
  crackDetailVisible.value = true
}

const locateCrack = (row: CrackInfo) => {
  analysisStore.setLocatedCrack({
    index: row.index,
    length: row.length,
    width: row.width,
    centerX: row.centerX,
    centerY: row.centerY,
  })
  crackDetailVisible.value = false
}

const filteredCrackList = computed(() => {
  let list = analysisStore.crackResults.crackList
  if (crackIndexSearch.value) {
    const n = parseInt(crackIndexSearch.value)
    if (!isNaN(n)) list = list.filter(c => c.index === n)
  }
  if (crackValidityFilter.value) {
    if (crackValidityFilter.value === 'unset') {
      list = list.filter(c => !c.validity)
    } else {
      list = list.filter(c => c.validity === crackValidityFilter.value)
    }
  }
  if (crackMaterialFilter.value) {
    if (crackMaterialFilter.value === 'unset') {
      list = list.filter(c => !c.fillingMaterial)
    } else {
      list = list.filter(c => c.fillingMaterial === crackMaterialFilter.value)
    }
  }
  return list
})
</script>

<style scoped>
:deep(.result-table) {
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;
}
:deep(.el-descriptions__label) {
  width: 120px;
  font-weight: 500;
}

/* 原生 select（表格单元格内） */
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

/* 筛选栏 */
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

/* 孔洞附属功能按钮组，对齐主操作区风格 */
.hole-extra-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}
.hole-extra-btn {
  width: 100% !important;
  max-width: 100% !important;
  height: 38px;
  font-size: 14px;
  border-radius: 6px;
  margin: 0 !important;
  box-sizing: border-box !important;
}
</style>
