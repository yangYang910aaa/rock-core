<template>
  <div class="right-panel">
    <!-- 顶部操作按钮 -->
    <div class="action-btns">
      <!-- 生成分析报告:下拉菜单选择格式 -->
      <el-dropdown @command="handleDropdownCommand" trigger="click">
        <el-button type="danger" block class="panel-btn">
          <el-icon><DocumentAdd /></el-icon>
          生成分析报告
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="preview">预览导出结果</el-dropdown-item>
            <el-dropdown-item command="excel" divided>导出Excel</el-dropdown-item>
            <el-dropdown-item command="pdf">导出PDF</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="warning" block class="panel-btn" @click="handleReset"><el-icon><Refresh /></el-icon>重置分析</el-button>
      <el-button type="primary" block class="panel-btn" @click="handleStartAnalysis" :loading="analysisStore.isAnalyzing"><el-icon><Search /></el-icon>开始分析</el-button>
      <div class="mask-toggle-row">
        <el-switch v-model="analysisStore.showMaskOverlay" size="small" />
        <span class="mask-toggle-label">是否显示蒙版</span>
      </div>
    </div>

    <!-- 可滚动的参数&结果区域 -->
    <div class="panel-content">
      <el-collapse v-model="activeNames">
        <!-- 岩心基础信息面板 -->
        <el-collapse-item title="岩心基础信息" name="0">
          <el-form label-width="80px" size="default" class="panel-form">
            <el-form-item label="井号">
              <el-input v-model="analysisStore.coreBasicInfo.wellNo" placeholder="请输入井号" />
            </el-form-item>
            <el-form-item label="井深">
              <el-input v-model="analysisStore.coreBasicInfo.wellDepth" placeholder="请输入井深" />
            </el-form-item>
            <el-form-item label="层位">
              <el-input v-model="analysisStore.coreBasicInfo.horizon" placeholder="请输入层位" />
            </el-form-item>
            <el-form-item label="岩性">
              <el-input v-model="analysisStore.coreBasicInfo.lithology" placeholder="请输入岩性" />
            </el-form-item>
            <el-form-item label="取样日期">
              <el-date-picker
                v-model="analysisStore.coreBasicInfo.sampleDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%;"
              />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 阈值设置面板 :根据分析模式动态显示-->
        <el-collapse-item title="阈值设置" name="1">
          <el-form label-width="90px" size="default" class="panel-form">
            <!-- 分析区域切换 -->
            <el-form-item label="分析区域">
              <el-radio-group v-model="analysisStore.regionMode">
                <el-radio value="full">全图</el-radio>
                <el-radio value="rect">局部</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <!-- 孔洞分析阈值 -->
          <template v-if="analysisStore.currentMode === 'hole'">
            <el-form label-width="90px" size="default" class="panel-form">
              <!-- 暂时先不做颜色匹配度调整 -->
              <!-- <el-form-item label="颜色匹配度">
                <el-slider v-model="analysisStore.holeThreshold.colorMatch" :min="0" :max="100" class="panel-slider" />
              </el-form-item> -->
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
              <!-- Canny低阈值 -->
              <el-form-item label="Canny低阈值">
                <el-slider v-model="analysisStore.crackThreshold.cannyLow" :min="0" :max="255"  class="panel-slider" />
              </el-form-item>
              <!-- Canny高阈值 -->
              <el-form-item label="Canny高阈值">
                <el-slider v-model="analysisStore.crackThreshold.cannyHigh" :min="0" :max="255" class="panel-slider" />
              </el-form-item>
              <!-- 最小宽度 -->
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
            <!-- label-width从10px改成110px，和整体风格统一 -->
            <el-form label-width="110px" size="default" class="panel-form">
              <el-form-item label="岩石亮度阈值">
                <el-slider v-model="analysisStore.sizeThreshold.rockBrightnessThreshold" :min="0" :max="255" class="panel-slider" />
              </el-form-item>
              <el-form-item label="粗颗粒灵敏度">
                <el-slider v-model="analysisStore.sizeThreshold.coarseSensitivity" :min="0" :max="100" class="panel-slider" />
              </el-form-item>
              <el-form-item label="细颗粒灵敏度">
                <el-slider v-model="analysisStore.sizeThreshold.fineSensitivity" :min="0" :max="100" class="panel-slider" />
              </el-form-item>
            </el-form>
           </template>
          </el-collapse-item>

        <!-- 分析结果面板:根据分析模式动态显示 -->
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

          <!-- 查看孔洞详情按钮（仅孔洞模式） -->
          <el-button
            v-if="analysisStore.currentMode === 'hole' && analysisStore.holeResults.holeList.length > 0"
            type="primary" size="small" style="margin-top:12px;width:100%;"
            @click="openHoleDetail"
          >
            查看孔洞详情（{{ analysisStore.holeResults.holeList.length }} 个）
          </el-button>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 孔洞详情弹窗 -->
    <el-dialog
      v-model="holeDetailVisible"
      title="孔洞详情"
      width="780px"
      top="3vh"
      destroy-on-close
    >
      <!-- 筛选栏 -->
      <div class="hole-filter-bar">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch,computed } from 'vue'
import { DocumentAdd, Refresh, ArrowDown } from '@element-plus/icons-vue'
import {useAnalysisStore, type CrackResults, type HoleResults, type SizeResults} from '@/stores/analysisStore'
import {useImageStore} from '@/stores/imageStore'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { executeFullAnalysis, previewAnalysisMask } from '@/services/analysisProcessService'
import { useReportExport } from '@/composables/useReportExport'

const analysisStore = useAnalysisStore()
const { handleExportReport } = useReportExport()
const imageStore = useImageStore()

//点击生成分析报告
const handleDropdownCommand = (command: string) => {
  if (command === 'preview') {
    analysisStore.reportPreviewVisible = true
  } else {
    handleExportReport(command as 'excel' | 'pdf')
  }
}

// 孔洞详情弹窗 + 筛选
const holeDetailVisible = ref(false)
const openHoleDetail = () => {
  categoryFilter.value = ''
  validityFilter.value = ''
  materialFilter.value = ''
  holeDetailVisible.value = true
}
const categoryFilter = ref('')
const validityFilter = ref('')
const materialFilter = ref('')

const filteredHoleList = computed(() => {
  let list = analysisStore.holeResults.holeList
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
const {
  targetMaskMat,
  currentMode,
  holeThreshold,
  crackThreshold,
  sizeThreshold,
} = storeToRefs(analysisStore)


const {scaleType}=storeToRefs(imageStore)
// 根据标尺类型动态切换单位
const currentUnit=computed(()=>{
  return scaleType.value==='macro'?'mm':'μm'
})

// 根据标尺类型动态切换单位缩放系数,mm转换为μm乘以1000
const unitScale=computed(()=>{
  return scaleType.value==='macro'?1:1000
})

const activeNames = ref<string[]>(['2'])
// 防抖处理，避免频繁调用
let previewDebounceTimer: NodeJS.Timeout | null = null
//是否正在重置分析
let isResetting = ref(false)
// 防抖函数
const debouncePreview = () => {
  if (isResetting.value || analysisStore.isAnalyzing) {
    return
  }
  if (!imageStore.processedImageDataUrl) return
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
  }
  previewDebounceTimer = setTimeout(async () => {
    let threshold
    switch (currentMode.value) {
      case 'hole':
        threshold = holeThreshold.value
        break
      case 'crack':
        threshold = crackThreshold.value
        break
      case 'size':
        threshold = sizeThreshold.value
        break
    }
    await previewAnalysisMask(
      currentMode.value,
      imageStore.processedImageDataUrl,
      threshold,
      analysisStore.analysisRegion,
      targetMaskMat
    )
  }, 200)
}
// 重置分析
const handleReset=()=>{
  isResetting.value = true
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer)
    previewDebounceTimer = null
  }
  imageStore.resetImage()
  analysisStore.resetAll()
  analysisStore.clearTargetMask()
  setTimeout(() => {
    isResetting.value = false
  }, 300)
  ElMessage.success('重置成功')
}

// 开始分析
const handleStartAnalysis=async()=>{
  if(!imageStore.processedImageDataUrl){
    ElMessage.warning('请先打开图片')
    return
  }
  analysisStore.isAnalyzing=true
  try {
    let threshold
    switch(currentMode.value){
      case 'hole':
        threshold=holeThreshold.value
        break
      case 'crack':
        threshold=crackThreshold.value
        break
      case 'size':
        threshold=sizeThreshold.value
        break
      default:
        break
    }
    const results =await executeFullAnalysis(
      currentMode.value,
      imageStore.processedImageDataUrl,
      threshold!,
      analysisStore.analysisRegion,
      imageStore.pixelToMm
    )
    if(results){
      switch(currentMode.value){
        case 'hole':
          analysisStore.holeResults=results as HoleResults
          break
        case 'crack':
          analysisStore.crackResults=results as CrackResults
          break
        case 'size':
          analysisStore.sizeResults=results as SizeResults
          break
        default:
          break
      }
    }
  } catch (error) {
    ElMessage.error('分析失败')
  }finally{
    analysisStore.isAnalyzing=false
  }
}

// 孔洞分析切换阈值时：实时预览
watch(()=>holeThreshold.value,()=>{
  if (!isResetting.value && currentMode.value === 'hole') debouncePreview()
},{deep:true})

// 裂缝分析切换阈值时：实时预览
watch(()=>[crackThreshold.value.cannyLow,crackThreshold.value.cannyHigh],()=>{
    if (!isResetting.value && currentMode.value === 'crack') {
    debouncePreview()
  }
})

// 粒度分析切换阈值时：实时预览
watch(()=>[
  sizeThreshold.value.rockBrightnessThreshold,
  sizeThreshold.value.coarseSensitivity,
  sizeThreshold.value.fineSensitivity],()=>{
    if (!isResetting.value && currentMode.value === 'size') debouncePreview()
  })
// 切换分析模式时：清空旧的蒙版和结果
watch(() => currentMode.value, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    analysisStore.clearTargetMask()
    analysisStore.resetResults()
  }
})
// 切换分析区域时：实时预览
watch(() => analysisStore.analysisRegion, () => {
  if (!isResetting.value) debouncePreview()
}, { deep: true })

// 切换分析区域模式时：清空旧的蒙版和结果
watch(() => analysisStore.regionMode, (newMode, oldMode) => {
  if (oldMode === 'full' && newMode === 'rect') {
    analysisStore.resetResults()
    analysisStore.clearTargetMask()
  }
})

// 切换图片时：清空旧的蒙版
watch(() => imageStore.processedImageDataUrl, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    analysisStore.clearTargetMask()
  }
})

</script>

<style scoped>
.right-panel {
  width: 320px;
  height: 100%;
  background-color: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 24px;
}

/* 顶部按钮区：统一内边距 */
.action-btns {
  flex-shrink: 0;
  padding: 16px 10px 0 0; 
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
}

/* 按钮样式*/
.panel-btn {
  width: 100% ;
  max-width: 100% ;
  height: 44px;
  line-height: 42px;
  font-size: 16px;
  border-radius: 8px;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* 蒙版叠加开关 */
.mask-toggle-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}

.mask-toggle-label {
  font-size: 13px;
  color: #606266;
}
/*内容区整体加了充足的右内边距，给右侧留足留白 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0px;
  box-sizing: border-box;
}

/* 折叠面板样式优化：给箭头和标题留足空间 */
:deep(.el-collapse-item__header) {
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  padding-right: 40px;
  box-sizing: border-box;
}

:deep(.el-collapse-item__arrow) {
  right: 8px;
  font-size: 14px;
}

/* 折叠面板内容区：加了右内边距，和整体对齐 */
:deep(.el-collapse-item__content) {
  padding: 12px 4px 12px 0;
}

/* 表单宽度适配：确保不会超出容器 */
:deep(.panel-form) {
  width: 100%;
  box-sizing: border-box;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
  width: 100%;
  box-sizing: border-box;
}

/* 滑块加了左右内边距，两端不会被截断，视觉更舒适 */
:deep(.panel-slider) {
  margin-top: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 6px; 
}

/* 分析结果表格：加了右内边距，和整体对齐 */
:deep(.result-table) {
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;
}

:deep(.el-descriptions__label) {
  width: 120px; /* 统一标签宽度，三个模式完全对齐 */
  font-weight: 500;
}

/* 滚动条样式优化：和内容区分开，不会挤压内容 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}

/* 原生 select 替代 el-select，极轻量渲染 */
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
</style>