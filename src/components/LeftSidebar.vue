<template>
  <div class="left-sidebar">
    <!-- 可滚动的内容区域 -->
    <div class="sidebar-content">
      <el-collapse v-model="activeNames">
        <!-- 标尺设置面板 -->
        <el-collapse-item title="标尺设置" name="1">
          <el-radio-group v-model="scaleType" type="button" class="scale-radio-group">
            <el-radio-button label="macro">宏观(mm)</el-radio-button>
            <el-radio-button label="micro">微观(μm)</el-radio-button>
          </el-radio-group>
        </el-collapse-item>

        <!-- 图像预处理面板：补充文档要求的缺失功能 -->
        <el-collapse-item title="图像预处理" name="2">
          <div class="preprocess-btns">
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('autoLevels')">自动色阶</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('curveAdjust')">曲线调节</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('grayscale')">灰度化</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="openBCDialog">亮度/对比度</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="openSaturationDialog">饱和度调节</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('filterSmooth')">滤波平滑</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('sharpen')">锐化</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('edgeDetect')">边缘检测</el-button></div>  
            <div class="btn-wrapper"><el-button class="sidebar-btn" @click="handlePreprocess('negativeEffect')">底片效果</el-button></div>
          </div>
        </el-collapse-item>

        <!-- 分析模式面板：补充文档要求的核心分析操作 -->
        <el-collapse-item title="分析模式" name="3">
          <el-radio-group v-model="analysisMode" type="button" class="analysis-radio-group">
            <el-radio-button label="hole">孔洞分析</el-radio-button>
            <el-radio-button label="crack">裂缝分析</el-radio-button>
            <el-radio-button label="size">粒度分析</el-radio-button>
          </el-radio-group>

          <!-- 核心分析操作区 -->
        <div class="analysis-operate">
          <!-- 分组1：提取操作 -->
          <div class="operate-group">
            <div class="group-title">提取操作</div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">区域分割</el-button></div>
            <div class="btn-group-row">
              <el-button class="sidebar-btn small-btn">反选</el-button>
              <el-button class="sidebar-btn small-btn">撤销</el-button>
              <el-button class="sidebar-btn small-btn">还原</el-button>
            </div>
          </div>

        <!-- 分组2：二次编辑 -->
          <div class="operate-group">
            <div class="group-title">二次编辑</div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">区域去噪</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">孔洞填充</el-button></div>
            <div class="btn-group-row">
              <el-button class="sidebar-btn small-btn">区域膨胀</el-button>
              <el-button class="sidebar-btn small-btn">区域腐蚀</el-button>
            </div>
          </div>
        </div>

          <div class="btn-wrapper">
            <el-button type="success" class="sidebar-btn start-btn" size="default">开始提取</el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
  <!-- 亮度/对比度调整弹窗 -->
  <el-dialog v-model="bcDialogVisible" title="亮度/对比度调整" width="400px" destroy-on-close > 
    <div class="bc-adjust-panel">
      <!-- 对比度调节 -->
      <div class="adjust-item">
        <p class="adjust-tip">1.0=原始对比度,大于1增强,小于1减弱</p>
        <label class="adjust-label">
          对比度 ({{ imageStore.bcParams.alpha.toFixed(1) }})
        </label>
        <el-slider v-model="imageStore.bcParams.alpha" :min="0.0" :max="3.0" :step="0.1" show-input class="adjust-slider"/>
      </div>
           <!-- 亮度调节 -->
      <div class="adjust-item">
        <label class="adjust-label">
          <p class="adjust-tip">0=原始亮度,大于0变亮,小于0变暗</p>
          亮度 ({{ imageStore.bcParams.beta }})
        </label>
        <el-slider
          v-model="imageStore.bcParams.beta" :min="-100" :max="100" :step="1" show-input class="adjust-slider"/>
      </div>
    </div>
    <template #footer>
      <el-button type="danger"  @click="bcDialogVisible=false">取消</el-button>
      <el-button type="warning" @click="resetBCParams">重置参数</el-button>
      <el-button type="primary" @click="confirmBCAdjust">确定应用</el-button>
    </template>
  </el-dialog>

  <!-- 饱和度调整弹窗 -->
  <el-dialog v-model="saturationDialogVisible" title="饱和度调整" width="400px" destroy-on-close > 
    <div class="saturation-adjust-panel">
      <div class="adjust-item">
        <p class="adjust-tip">1.0=原始饱和度,大于1增强,小于1减弱,0为纯灰度</p>
        <label class="adjust-label">
          饱和度 ({{ imageStore.saturationFactor.toFixed(1) }})
        </label>
        <el-slider v-model="imageStore.saturationFactor" :min="0.0" :max="3.0" :step="0.1" show-input class="adjust-slider"/>
      </div>
    </div>
    <template #footer>
      <el-button type="danger"  @click="saturationDialogVisible=false">取消</el-button>
      <el-button type="warning" @click="resetSaturationParams">重置参数</el-button>
      <el-button type="primary" @click="confirmSaturationAdjust">确定应用</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref,watch } from 'vue'
import { useAnalysisStore, type AnalysisMode,type PreprocessType } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { ElMessage } from 'element-plus'
import { open } from 'fs'

const analysisStore=useAnalysisStore()
const imageStore=useImageStore()

const activeNames = ref<string[]>(['1']) // 标尺设置面板默认展开
const scaleType = ref<'macro' | 'micro'>('macro') // 标尺类型，默认宏观
const analysisMode = ref<AnalysisMode>('hole') // 分析模式，默认孔洞分析
//处理图像预处理的点击事件
const handlePreprocess=(type:PreprocessType)=>{
    imageStore.executeProcess(type)
}
// 监听分析模式变化,同步到Store
watch(analysisMode,(newMode)=>{
  analysisStore.setMode(newMode)
})
// 亮度/对比度弹窗状态
const bcDialogVisible = ref<boolean>(false)
// 打开亮度/对比度弹窗
const openBCDialog = () => {
  if(!imageStore.isImageLoaded){
    ElMessage.warning('请先打开图片再进行调节')
    return
  }
  bcDialogVisible.value = true
}
//重置亮度/对比度参数
const resetBCParams = () => {
  imageStore.resetBCParams()
}
// 确认应用亮度/对比度参数
const confirmBCAdjust=async()=>{
  await imageStore.executeProcess('brightnessContrast')
  bcDialogVisible.value=false
}
//饱和度弹窗状态
const saturationDialogVisible = ref<boolean>(false)
//打开饱和度弹窗
const openSaturationDialog=()=>{
  if(!imageStore.isImageLoaded){
    ElMessage.warning('请先打开图片再进行调节')
    return
  }
  saturationDialogVisible.value = true
}
const resetSaturationParams = () => {
  imageStore.resetSaturationParams()
}
const confirmSaturationAdjust=async()=>{
  await imageStore.executeProcess('saturation')
  saturationDialogVisible.value=false
}
</script>

<style scoped>
.left-sidebar {
  width: 320px; 
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 32px 12px 16px; 
  box-sizing: border-box;
}
/* 标尺按钮组样式 */
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
/* 分析模式按钮组样式 */
.analysis-radio-group {
  width: 100%;
  display: flex;
  margin-bottom: 16px;
}
.analysis-radio-group :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}
.analysis-radio-group :deep(.el-radio-button) {
  flex: 1;
  text-align: center;
}
.analysis-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  height: 48px;
  font-size: 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}
/* 操作分组样式 */
.operate-group {
  margin-bottom: 16px;
}
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}
.btn-group-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.small-btn {
  flex: 1;
  height: 36px !important;
  line-height: 34px !important;
  font-size: 14px !important;
}
/* 图像预处理按钮样式 */
.preprocess-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box; 
}
.btn-wrapper{
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
/* 按钮基础样式 */
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
  margin: 0 
}
.start-btn {
  margin-top: 0 !important;
}
/* 折叠面板样式统一 */
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
:deep(.el-collapse-item__content) {
  padding: 16px 4px 16px 0;
  box-sizing: border-box;
}
/* 滚动条样式统一 */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}
.sidebar-content::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}
.sidebar-content::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}
.bc-adjust-panel {
  padding: 10px 0;
}
.adjust-item {
  margin-bottom: 20px;
}
.adjust-label {
  display: block;
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
  font-weight: 500;
}
.adjust-slider {
  margin-bottom: 4px;
}
.adjust-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
  padding-left: 2px;
}
</style>