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

        <!-- 图像预处理面板：修复按钮样式:为每个按钮添加div容器 -->
        <el-collapse-item title="图像预处理" name="2">
          <div class="preprocess-btns">
            <div class="btn-wrapper"><el-button class="sidebar-btn">自动色阶</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">灰度化</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">亮度/对比度</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">滤波平滑</el-button></div>
            <div class="btn-wrapper"><el-button class="sidebar-btn">边缘检测</el-button></div>
          </div>
        </el-collapse-item>

        <!-- 分析模式面板：改为按钮式 -->
        <el-collapse-item title="分析模式" name="3">
          <el-radio-group v-model="analysisMode" type="button" class="analysis-radio-group">
            <el-radio-button label="hole">孔洞分析</el-radio-button>
            <el-radio-button label="crack">裂缝分析</el-radio-button>
            <el-radio-button label="size">粒度分析</el-radio-button>
          </el-radio-group>
          <div class="btn-wrapper">
            <el-button type="primary" class="sidebar-btn start-btn" size="default">开始提取</el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 响应式数据
const activeNames = ref<string[]>(['1'])
const scaleType = ref<'macro' | 'micro'>('macro')
const analysisMode = ref<string>('hole')
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
  box-sizing: border-box; /* 新增：确保边框不溢出 */
}

/* 分析模式按钮组样式（和标尺统一） */
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
  font-size: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

/* 图像预处理按钮：修复右侧截断问题 */
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
  overflow: hidden; /* 新增：防止按钮内容超出容器 */
}
/* 强制重置所有宽度相关属性 */
.sidebar-btn {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 44px;
  line-height: 42px;
  font-size: 15px;
  border-radius: 6px;
  box-sizing: border-box !important;
  padding: 0 12px; /* 新增：统一内边距，避免文字贴边 */
  margin: 0 
}
.start-btn {
  margin-top: 0 !important;/*清除之前的margin,用wrapper包裹*/
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
</style>