<template>
  <div class="left-sidebar-wrapper">
    <div class="left-sidebar">
      <div class="sidebar-content">
        <el-collapse v-model="activeNames">
          <!-- 1. 标尺设置面板 -->
          <el-collapse-item title="标尺设置" name="1">
            <ScalePanel />
          </el-collapse-item>

          <!-- 2. 图像预处理面板 -->
          <el-collapse-item title="图像预处理" name="2">
            <PreprocessPanel />
          </el-collapse-item>

          <!-- 3. 分析模式面板 -->
          <el-collapse-item title="分析模式" name="3">
            <AnalysisPanel />
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ScalePanel from './sidebar/ScalePanel.vue'
import PreprocessPanel from './sidebar/PreprocessPanel.vue'
import AnalysisPanel from './sidebar/AnalysisPanel.vue'

// 折叠面板状态（父组件统一管理）
const activeNames = ref<string[]>(['1'])
</script>

<style scoped>
/* ==================== 根容器 & 侧边栏主体【核心修复】==================== */
.left-sidebar-wrapper {
  /* 核心1：固定宽度，和原来完全一致 */
  width: 320px;
  height: 100%;
  /* 核心2：禁止flex布局压缩，永远保持320px宽度 */
  flex-shrink: 0;
  /* 禁止横向溢出 */
  overflow: hidden;
}

.left-sidebar {
  /* 填满父容器，宽度100%继承父容器的320px */
  width: 100%;
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

/* ==================== 滚动条样式统一 ==================== */
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

/* ==================== 折叠面板通用样式 ==================== */
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

/* ==================== 通用按钮样式 ==================== */
.btn-wrapper {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

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
  margin: 0;
}

.small-btn {
  flex: 1;
  height: 36px !important;
  line-height: 34px !important;
  font-size: 14px !important;
}

.start-btn {
  margin-top: 0 !important;
}

.btn-group-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

/* ==================== 单选按钮组通用样式 ==================== */
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

/* 分析范围样式 */
.region-mode-group {
  margin-bottom: 20px;
}

.region-radio-group {
  width: 100%;
  display: flex;
}

.region-radio-group :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.region-radio-group :deep(.el-radio-button) {
  flex: 1;
  text-align: center;
}

.region-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

.region-tip {
  margin: 8px 0 0 4px;
  font-size: 12px;
  color: #909399;
}

/* ==================== 通用分组标题样式 ==================== */
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}

.operate-group {
  margin-bottom: 16px;
}

/* ==================== 标尺校准区域样式 ==================== */
.calibrate-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.calibrate-form {
  margin-bottom: 12px;
}

.unit-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.calibrate-btns {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.calibrate-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
  padding-left: 4px;
}

/* ==================== 图像预处理按钮样式 ==================== */
.preprocess-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box; 
}

/* ==================== 参数调节区域样式 ==================== */
.param-section {
  padding: 10px 12px;
  margin-bottom: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.param-item {
  margin-bottom: 12px;
}

.param-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.param-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.param-value {
  min-width: 30px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #409EFF;
}

.param-slider {
  flex: 1;
}

.param-reset {
  text-align: right;
}

/* ==================== 弹窗通用样式 ==================== */
.bc-adjust-panel,
.saturation-adjust-panel {
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

/* ==================== 区域去噪弹窗专属样式 ==================== */
.denoise-dialog-content {
  padding: 10px 0;
}

.dialog-item {
  margin-bottom: 24px;
}

.dialog-tip {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px 0;
  padding-left: 2px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.condition-row :deep(.el-radio-group) {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.condition-row :deep(.el-radio) {
  margin: 0;
  display: inline-flex;
  align-items: center;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.slider-label {
  min-width: 70px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.unit {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}
</style>