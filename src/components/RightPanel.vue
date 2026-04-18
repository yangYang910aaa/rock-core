<template>
  <div class="right-panel">
    <!-- 顶部操作按钮：保持不变，已经对齐 -->
    <div class="action-btns">
      <el-button type="danger" block class="panel-btn"><el-icon><DocumentAdd /></el-icon>生成分析报告</el-button>
      <el-button type="warning" block class="panel-btn"><el-icon><Refresh /></el-icon>重置分析</el-button>
    </div>

    <!-- 可滚动的参数&结果区域：核心优化右内边距，给右侧留足留白 -->
    <div class="panel-content">
      <el-collapse v-model="activeNames">
        <!-- 阈值设置面板 -->
        <el-collapse-item title="阈值设置" name="1">
          <el-form label-width="80px" size="default" class="panel-form">
            <el-form-item label="最小阈值">
              <el-slider v-model="minThreshold" :min="0" :max="255" class="panel-slider" />
            </el-form-item>
            <el-form-item label="最大阈值">
              <el-slider v-model="maxThreshold" :min="0" :max="255" class="panel-slider" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 分析结果面板 -->
        <el-collapse-item title="分析结果" name="2">
          <el-descriptions :column="1" size="default" border class="result-table">
            <el-descriptions-item label="孔洞总数">{{ holeCount }}</el-descriptions-item>
            <el-descriptions-item label="孔洞总面积">{{ totalArea }} mm²</el-descriptions-item>
            <el-descriptions-item label="平均孔径">{{ avgDiameter }} mm</el-descriptions-item>
            <el-descriptions-item label="最大孔径">{{ maxDiameter }} mm</el-descriptions-item>
            <el-descriptions-item label="最小孔径">{{ minDiameter }} mm</el-descriptions-item>
            <el-descriptions-item label="面孔率">{{ faceRate }} %</el-descriptions-item>
          </el-descriptions>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 响应式数据
const activeNames = ref<string[]>(['1','2'])
const minThreshold = ref<number>(0)
const maxThreshold = ref<number>(128)

// 分析结果数据
const holeCount = ref<number>(0)
const totalArea = ref<number>(0)
const avgDiameter = ref<number>(0)
const maxDiameter = ref<number>(0)
const minDiameter = ref<number>(0)
const faceRate = ref<number>(0)
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
}

/* 顶部按钮区：保持不变 */
.action-btns {
  flex-shrink: 0;
  padding: 16px 24px; /* 按钮区也加了左右内边距，和内容区对齐 */
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-right: 16px;
}

/* 按钮样式：保持不变，已经对齐 */
.panel-btn {
  height: 44px;
  line-height: 42px;
  font-size: 16px;
  border-radius: 6px;
}
/* 【核心优化】内容区整体加了充足的右内边距，给右侧留足留白 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  /* 左16px + 右32px的内边距，右侧留白充足，不会贴边 */
  padding: 12px 32px 12px 16px;
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

/* 【关键优化】滑块加了左右内边距，两端不会被截断，视觉更舒适 */
:deep(.panel-slider) {
  margin-top: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 4px; /* 滑块左右加了留白，不会贴到边缘 */
}

/* 分析结果表格：加了右内边距，和整体对齐 */
:deep(.result-table) {
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;
}

:deep(.el-descriptions__label) {
  width: 90px;
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