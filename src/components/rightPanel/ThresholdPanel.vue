<template>
  <el-collapse-item title="阈值设置" name="1">
    <el-form label-width="90px" size="default" class="panel-form">
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
        <el-form-item label="Canny低阈值">
          <el-slider v-model="analysisStore.crackThreshold.cannyLow" :min="0" :max="255" class="panel-slider" />
        </el-form-item>
        <el-form-item label="Canny高阈值">
          <el-slider v-model="analysisStore.crackThreshold.cannyHigh" :min="0" :max="255" class="panel-slider" />
        </el-form-item>
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
</template>

<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysisStore'
const analysisStore = useAnalysisStore()
</script>
