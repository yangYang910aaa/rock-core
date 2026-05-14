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
      <el-descriptions :column="1" border class="result-table" style="margin-top:12px;">
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

    <!-- 粒度分析附属功能按钮 -->
    <div v-if="analysisStore.currentMode === 'size' && analysisStore.sizeResults.particleList.length > 0" class="hole-extra-btns">
      <el-button type="primary" class="hole-extra-btn" @click="sizeDetailVisible = true">
        查看颗粒详情（{{ analysisStore.sizeResults.particleList.length }} 个）
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
    width="900px"
    top="3vh"
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
    <!-- 批量操作栏，选中行后出现 -->
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
          <el-tag :type="categoryTagType(row.category)" >{{ categoryLabel(row.category) }}</el-tag>
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
          <el-button type="primary" link @click="locateHole(row)">定位</el-button>
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
    <el-pagination
      v-if="filteredHoleList.length > 100"
      v-model:current-page="holePage"
      :page-size="100"
      :total="filteredHoleList.length"
      layout="prev, pager, next"
      class="table-pagination"
    />
    <template #footer>
      <el-button @click="holeDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 裂缝详情弹窗 -->
  <el-dialog
    v-model="crackDetailVisible"
    title="裂缝详情"
    width="900px"
    top="3vh"
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
    <div v-if="crackSelected.length" class="batch-bar">
      <span class="batch-label">已选 {{ crackSelected.length }} 个</span>
      <select v-model="batchCrackValidity" class="native-select" style="width:140px;">
        <option value="">- 批量有效性 -</option>
        <option value="__reset__">- 重置有效性 -</option>
        <option value="effective">有效（未充填）</option>
        <option value="semiEffective">较有效（半充填）</option>
        <option value="ineffective">无效（全充填）</option>
      </select>
      <select v-model="batchCrackMaterial" class="native-select" style="width:110px;">
        <option value="">- 批量充填物 -</option>
        <option value="__reset__">- 重置充填物 -</option>
        <option value="mud">泥质</option>
        <option value="calcite">方解石</option>
        <option value="dolomite">白云石</option>
        <option value="asphalt">沥青</option>
        <option value="gypsum">石膏</option>
        <option value="pyrite">黄铁矿</option>
        <option value="kaolinite">高岭石</option>
        <option value="quartz">石英</option>
      </select>
      <el-button type="danger" plain @click="batchResetCrack">全部重置</el-button>
      <input v-model="crackRangeInput" class="native-select" style="width:100px;" placeholder="5 8 1-10" @keyup.enter="applyCrackRange" />
      <el-button @click="applyCrackRange">选择范围</el-button>
    </div>
    <el-table ref="crackTableRef" :data="pagedCrackList" max-height="580" stripe @selection-change="onCrackSelectionChange">
      <el-table-column type="selection" width="40" />
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
          <el-button type="primary" link @click="locateCrack(row)">定位</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="filteredCrackList.length > 100"
      v-model:current-page="crackPage"
      :page-size="100"
      :total="filteredCrackList.length"
      layout="prev, pager, next"
      class="table-pagination"
    />
    <template #footer>
      <el-button @click="crackDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 粒度详情弹窗 -->
  <el-dialog
    v-model="sizeDetailVisible"
    title="颗粒详情"
    width="900px"
    top="3vh"
  >
    <div class="hole-filter-bar">
      <input v-model="sizeIndexSearch" class="native-select" style="width:80px;" placeholder="#序号" />
      <select v-model="particleValidityFilter" class="native-select" style="width:150px;">
        <option value="">全部有效性</option>
        <option value="effective">有效</option>
        <option value="semiEffective">较有效</option>
        <option value="ineffective">无效</option>
        <option value="unset">未设置</option>
      </select>
      <select v-model="particleMaterialFilter" class="native-select" style="width:110px;">
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
      <span class="filter-count">共 {{ filteredParticleList.length }} / {{ analysisStore.sizeResults.particleList.length }} 个</span>
    </div>
    <div v-if="particleSelected.length" class="batch-bar">
      <span class="batch-label">已选 {{ particleSelected.length }} 个</span>
      <select v-model="batchParticleValidity" class="native-select" style="width:140px;">
        <option value="">- 批量有效性 -</option>
        <option value="effective">有效（未充填）</option>
        <option value="semiEffective">较有效（半充填）</option>
        <option value="ineffective">无效（全充填）</option>
        <option value="__reset__">重置有效性</option>
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
      <el-button @click="sizeDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAnalysisStore, type HoleInfo, type CrackInfo, type ParticleInfo } from '@/stores/analysisStore'
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
  holeSelected.value = []
  batchHoleValidity.value = ''
  batchHoleMaterial.value = ''
  holeRangeInput.value = ''
  holePage.value = 1
  holeDetailVisible.value = true
  nextTick(() => holeTableRef.value?.clearSelection())
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
const holePage = ref(1)
const pagedHoleList = computed(() => {
  const start = (holePage.value - 1) * 100
  return filteredHoleList.value.slice(start, start + 100)
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

// ---- 粒度详情弹窗 ----
const sizeDetailVisible = ref(false)
const sizeIndexSearch = ref('')
const particleValidityFilter = ref('')
const particleMaterialFilter = ref('')
const particlePage = ref(1)
const locateParticle = (row: ParticleInfo) => {
  analysisStore.setLocatedParticle({
    index: row.index, diameter: row.diameter, area: row.area, centerX: row.centerX, centerY: row.centerY,
  })
  sizeDetailVisible.value = false
}
const filteredParticleList = computed(() => {
  let list = analysisStore.sizeResults.particleList
  if (sizeIndexSearch.value) {
    const n = parseInt(sizeIndexSearch.value)
    if (!isNaN(n)) list = list.filter(p => p.index === n)
  }
  if (particleValidityFilter.value) {
    if (particleValidityFilter.value === 'unset') list = list.filter(p => !p.validity)
    else list = list.filter(p => p.validity === particleValidityFilter.value)
  }
  if (particleMaterialFilter.value) {
    if (particleMaterialFilter.value === 'unset') list = list.filter(p => !p.fillingMaterial)
    else list = list.filter(p => p.fillingMaterial === particleMaterialFilter.value)
  }
  return list
})
const pagedParticleList = computed(() => {
  const start = (particlePage.value - 1) * 100
  return filteredParticleList.value.slice(start, start + 100)
})
watch(sizeDetailVisible, (v) => {
  if (v) particlePage.value = 1
})

// 颗粒批量编辑
const particleSelected = ref<any[]>([])
const batchParticleValidity = ref('')
const batchParticleMaterial = ref('')
const particleRangeInput = ref('')
const onParticleSelectionChange = (rows: any[]) => { particleSelected.value = rows }
watch(batchParticleValidity, (v) => {
  if (!v) return
  particleSelected.value.forEach(r => r.validity = v === '__reset__' ? '' : v)
  batchParticleValidity.value = ''
})
watch(batchParticleMaterial, (v) => {
  if (!v) return
  particleSelected.value.forEach(r => r.fillingMaterial = v === '__reset__' ? '' : v)
  batchParticleMaterial.value = ''
})
const batchResetParticle = () => {
  particleSelected.value.forEach(r => { r.validity = ''; r.fillingMaterial = '' })
}
const applyParticleRange = () => {
  const indices = parseRange(particleRangeInput.value)
  if (!indices.size) return
  filteredParticleList.value.forEach(row => {
    (particleTableRef.value as any)?.toggleRowSelection(row, indices.has(row.index))
  })
}

// ---- 批量编辑（孔洞 / 裂缝表格多选）----
const holeTableRef = ref<any>(null)
const crackTableRef = ref<any>(null)
const particleTableRef = ref<any>(null)
const holeSelected = ref<any[]>([])
const batchHoleValidity = ref('')
const batchHoleMaterial = ref('')

const onHoleSelectionChange = (rows: any[]) => { holeSelected.value = rows }
watch(batchHoleValidity, (v) => {
  if (!v) return
  holeSelected.value.forEach(r => r.validity = v === '__reset__' ? '' : v)
  batchHoleValidity.value = ''
})
watch(batchHoleMaterial, (v) => {
  if (!v) return
  holeSelected.value.forEach(r => r.fillingMaterial = v === '__reset__' ? '' : v)
  batchHoleMaterial.value = ''
})
const batchResetHole = () => {
  holeSelected.value.forEach(r => { r.validity = ''; r.fillingMaterial = '' })
}

// 范围选择：解析 "1-10" / "5,8,12-20" 格式并切换选中行
const holeRangeInput = ref('')
const applyHoleRange = () => {
  const indices = parseRange(holeRangeInput.value)
  if (!indices.size) return
  filteredHoleList.value.forEach(row => {
    holeTableRef.value?.toggleRowSelection(row, indices.has(row.index))
  })
}
const crackRangeInput = ref('')
const applyCrackRange = () => {
  const indices = parseRange(crackRangeInput.value)
  if (!indices.size) return
  filteredCrackList.value.forEach(row => {
    crackTableRef.value?.toggleRowSelection(row, indices.has(row.index))
  })
}
const parseRange = (s: string): Set<number> => {
  const set = new Set<number>()
  s.split(/\s+/).forEach(part => {
    if (!part) return
    const seg = part.split('-')
    const a = parseInt(seg[0]!)
    const b = parseInt(seg[1] ?? seg[0]!)
    if (isNaN(a) || isNaN(b)) return
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i)
  })
  return set
}

const crackSelected = ref<any[]>([])
const batchCrackValidity = ref('')
const batchCrackMaterial = ref('')

const onCrackSelectionChange = (rows: any[]) => { crackSelected.value = rows }
watch(batchCrackValidity, (v) => {
  if (!v) return
  crackSelected.value.forEach(r => r.validity = v === '__reset__' ? '' : v)
  batchCrackValidity.value = ''
})
watch(batchCrackMaterial, (v) => {
  if (!v) return
  crackSelected.value.forEach(r => r.fillingMaterial = v === '__reset__' ? '' : v)
  batchCrackMaterial.value = ''
})
const batchResetCrack = () => {
  crackSelected.value.forEach(r => { r.validity = ''; r.fillingMaterial = '' })
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
  crackSelected.value = []
  batchCrackValidity.value = ''
  batchCrackMaterial.value = ''
  crackRangeInput.value = ''
  crackPage.value = 1
  crackDetailVisible.value = true
  nextTick(() => crackTableRef.value?.clearSelection())
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
const crackPage = ref(1)
const pagedCrackList = computed(() => {
  const start = (crackPage.value - 1) * 100
  return filteredCrackList.value.slice(start, start + 100)
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

/* 批量操作栏 */
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

/* 分页器居中 */
.table-pagination {
  margin-top: 8px;
  display: flex;
  justify-content: center;
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
