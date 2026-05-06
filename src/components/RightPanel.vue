<template>
  <div class="right-panel">
    <!-- 顶部操作按钮 -->
    <div class="action-btns">
      <!-- 生成分析报告:下拉菜单选择格式 -->
      <el-dropdown @command="handleExportReport" trigger="click">
        <el-button type="danger" block class="panel-btn">
          <el-icon><DocumentAdd /></el-icon>
          生成分析报告
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="excel">导出Excel</el-dropdown-item>
            <el-dropdown-item command="pdf">导出PDF</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="warning" block class="panel-btn" @click="handleReset"><el-icon><Refresh /></el-icon>重置分析</el-button>
      <el-button type="primary" block class="panel-btn" @click="handleStartAnalysis"><el-icon><Search /></el-icon>开始分析</el-button>
      <div class="mask-toggle-row">
        <el-switch v-model="analysisStore.showMaskOverlay" size="small" />
        <span class="mask-toggle-label">允许显示蒙版</span>
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
            <!-- 【修复1】label-width从10px改成110px，和整体风格统一 -->
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
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch,computed } from 'vue'
import { DocumentAdd, Refresh, ArrowDown } from '@element-plus/icons-vue'
import {useAnalysisStore, type CrackResults, type HoleResults, type SizeResults} from '@/stores/analysisStore'
import {useImageStore} from '@/stores/imageStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import { executeFullAnalysis, previewAnalysisMask } from '@/services/analysisProcessService'
import { exportToExcel, exportToPDF } from '@/utils/reportGenerator'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()
const { 
  targetMaskMat, 
  currentMode, 
  regionMode,
  holeThreshold, 
  crackThreshold, 
  sizeThreshold, 
  holeResults,
  crackResults,
  sizeResults,
  analysisRegion,
  coreBasicInfo
} = storeToRefs(analysisStore)


const {pixelToMm,scaleType}=storeToRefs(imageStore)
// 根据标尺类型动态切换单位
const currentUnit=computed(()=>{
  return imageStore.scaleType==='macro'?'mm':'μm'
})

// 根据标尺类型动态切换单位缩放系数,mm转换为μm乘以1000
const unitScale=computed(()=>{
  return imageStore.scaleType==='macro'?1:1000
})

const activeNames = ref<string[]>(['0','1','2'])
// 防抖处理，避免频繁调用
let previewDebounceTimer: NodeJS.Timeout | null = null
//是否正在重置分析
let isResetting = ref(false)
// 防抖函数
const debouncePreview = () => {
  if (isResetting.value) {
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
      analysisRegion.value,
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
    // 点击开始分析时，才显示预览蒙版
    debouncePreview()
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
      analysisRegion.value,
      pixelToMm.value 
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
watch(() => analysisRegion.value, () => {
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

//导出报告
const handleExportReport=async(format:'excel'|'pdf')=>{
  // 1.检查是否有分析结果
  const hasResults=
  (currentMode.value==='hole' && holeResults.value.totalCount>0)||
  (currentMode.value==='crack' && crackResults.value.totalCount>0)||
  (currentMode.value==='size' && sizeResults.value.totalParticleCount>0)
  if(!hasResults){
    ElMessage.warning('请先进行分析,生成结果后再导出报告')
    return
  }
  
  // 2.检查岩心基础信息是否填写完整
  const isBasicInfoFilled = 
    coreBasicInfo.value.wellNo &&
    coreBasicInfo.value.wellDepth &&
    coreBasicInfo.value.horizon &&
    coreBasicInfo.value.lithology
  
  // 3.如果未填写完整，弹出确认框
  if (!isBasicInfoFilled) {
    try {
      await ElMessageBox.confirm(
        '岩心基础信息未填写完整，确定要导出报告吗？',
        '提示',
        {
          confirmButtonText: '确定导出',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      // 用户点击取消
      return
    }
  }
  
  // 4.准备岩心基础信息（从Store获取用户输入）
  const basicInfo={
    wellNo: coreBasicInfo.value.wellNo || '未填写',
    wellDepth: coreBasicInfo.value.wellDepth || '未填写',
    horizon: coreBasicInfo.value.horizon || '未填写',
    lithology: coreBasicInfo.value.lithology || '未填写',
    sampleDate: coreBasicInfo.value.sampleDate || new Date().toISOString().slice(0,10)
  }

  // 5.准备分析参数
  const params={
    mode:currentMode.value,
    regionMode:regionMode.value,
    scaleType:scaleType.value,
    threshold:currentMode.value==='hole'?holeThreshold.value:currentMode.value==='crack'?crackThreshold.value:sizeThreshold.value,
  }

  // 6. 获取分析结果
  let results:any
  if(currentMode.value==='hole'){
    results=holeResults.value
  }else if(currentMode.value==='crack'){
    results=crackResults.value
  }else if(currentMode.value==='size'){
    results=sizeResults.value
  }

  // 7.导出报告
  try {
    if(format==='excel'){
      await exportToExcel(basicInfo,params,results)
      ElMessage.success('Excel报告导出成功')
    }else{
     await exportToPDF(basicInfo,params,results)
      ElMessage.success('PDF报告导出成功')
    }
  } catch (error) {
    console.error('导出报告失败:', error)
    ElMessage.error('导出报告失败,请重试')
  }
}
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
</style>