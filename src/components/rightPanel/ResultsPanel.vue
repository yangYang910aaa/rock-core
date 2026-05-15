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
        <el-descriptions-item label="颗粒总数">{{ analysisStore.particleResults.totalParticleCount }}</el-descriptions-item>
        <el-descriptions-item label="平均粒径">{{ (analysisStore.particleResults.avgParticleSize *unitScale).toFixed(4) }} {{currentUnit}}</el-descriptions-item>
        <el-descriptions-item label="粗颗粒占比">{{ analysisStore.particleResults.coarseParticleRatio }} %</el-descriptions-item>
        <el-descriptions-item label="细颗粒占比">{{ analysisStore.particleResults.fineParticleRatio }} %</el-descriptions-item>
        <el-descriptions-item label="颗粒均匀度">{{ analysisStore.particleResults.particleUniformity }}</el-descriptions-item>
        <el-descriptions-item label="岩石颗粒占比">{{ analysisStore.particleResults.rockParticleRate }} %</el-descriptions-item>
      </el-descriptions>
    </template>

    <!-- 孔洞分析附属功能按钮 -->
    <div v-if="analysisStore.currentMode === 'hole' && analysisStore.holeResults.holeList.length > 0" class="hole-extra-btns">
      <el-button type="primary" class="hole-extra-btn" @click="holeDialog?.open()">
        查看孔洞详情（{{ analysisStore.holeResults.holeList.length }} 个）
      </el-button>
      <el-button type="success" class="hole-extra-btn" @click="chartDialogVisible = true">
        查看直径分布图
      </el-button>
    </div>

    <!-- 裂缝分析附属功能按钮 -->
    <div v-if="analysisStore.currentMode === 'crack' && analysisStore.crackResults.crackList.length > 0" class="hole-extra-btns">
      <el-button type="primary" class="hole-extra-btn" @click="crackDialog?.open()">
        查看裂缝详情（{{ analysisStore.crackResults.crackList.length }} 个）
      </el-button>
    </div>

    <!-- 粒度分析附属功能按钮 -->
    <div v-if="analysisStore.currentMode === 'size' && analysisStore.particleResults.particleList.length > 0" class="hole-extra-btns">
      <el-button type="primary" class="hole-extra-btn" @click="particleDialog?.open()">
        查看颗粒详情（{{ analysisStore.particleResults.particleList.length }} 个）
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

  <HoleDetailDialog ref="holeDialog" />
  <CrackDetailDialog ref="crackDialog" />
  <ParticleDetailDialog ref="particleDialog" />
</template>

<script setup lang="ts">
// ----
// 分析结果面板：三个模式的统计数据显示 + 详情弹窗入口 + 直径分布图
// 三个详情弹窗各自独立为 HoleDetailDialog / CrackDetailDialog / ParticleDetailDialog
// ----
import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import HoleDistributionChart from './HoleDistributionChart.vue'
import HoleDetailDialog from './dialog/HoleDetailDialog.vue'
import CrackDetailDialog from './dialog/CrackDetailDialog.vue'
import ParticleDetailDialog from './dialog/ParticleDetailDialog.vue'

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()

// 单位换算
const currentUnit = computed(() => imageStore.scaleType === 'macro' ? 'mm' : 'μm')
const unitScale = computed(() => imageStore.scaleType === 'macro' ? 1 : 1000)

const chartDialogVisible = ref(false)

// 弹窗组件 ref，通过 .open() 方法打开
const holeDialog = ref<InstanceType<typeof HoleDetailDialog>>()
const crackDialog = ref<InstanceType<typeof CrackDetailDialog>>()
const particleDialog = ref<InstanceType<typeof ParticleDetailDialog>>()
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
