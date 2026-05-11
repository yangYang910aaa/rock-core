<template>
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
</template>

<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysisStore'
const analysisStore = useAnalysisStore()
</script>
