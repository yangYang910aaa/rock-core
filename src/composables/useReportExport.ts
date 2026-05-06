import { useAnalysisStore, type CrackResults, type HoleResults, type SizeResults } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportToExcel, exportToPDF } from '@/utils/reportGenerator'

export const useReportExport = () => {
  const analysisStore = useAnalysisStore()
  const imageStore = useImageStore()

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    const { coreBasicInfo, currentMode, regionMode, holeResults, crackResults, sizeResults } = analysisStore
    const { scaleType } = imageStore

    const hasResults =
      (currentMode === 'hole' && holeResults.totalCount > 0) ||
      (currentMode === 'crack' && crackResults.totalCount > 0) ||
      (currentMode === 'size' && sizeResults.totalParticleCount > 0)

    if (!hasResults) {
      ElMessage.warning('请先进行分析,生成结果后再导出报告')
      return
    }

    const isBasicInfoFilled =
      coreBasicInfo.wellNo &&
      coreBasicInfo.wellDepth &&
      coreBasicInfo.horizon &&
      coreBasicInfo.lithology

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
        return
      }
    }

    const basicInfo = {
      wellNo: coreBasicInfo.wellNo || '未填写',
      wellDepth: coreBasicInfo.wellDepth || '未填写',
      horizon: coreBasicInfo.horizon || '未填写',
      lithology: coreBasicInfo.lithology || '未填写',
      sampleDate: coreBasicInfo.sampleDate || new Date().toISOString().slice(0, 10)
    }

    const params = {
      mode: currentMode,
      regionMode,
      scaleType,
      threshold: currentMode === 'hole' ? analysisStore.holeThreshold
        : currentMode === 'crack' ? analysisStore.crackThreshold
        : analysisStore.sizeThreshold,
    }

    let results: any
    if (currentMode === 'hole') {
      results = holeResults
    } else if (currentMode === 'crack') {
      results = crackResults
    } else {
      results = sizeResults
    }

    try {
      if (format === 'excel') {
        await exportToExcel(basicInfo, params, results)
        ElMessage.success('Excel报告导出成功')
      } else {
        await exportToPDF(basicInfo, params, results)
        ElMessage.success('PDF报告导出成功')
      }
    } catch (error) {
      console.error('导出报告失败:', error)
      ElMessage.error('导出报告失败,请重试')
    }
  }

  return { handleExportReport }
}
