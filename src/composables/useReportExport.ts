// ----
// 报告导出逻辑：组装数据 → 校验 → 调 reportGenerator 导出 Excel/PDF
// TitleBar 和 RightPanel 共用
// ----
import { useAnalysisStore } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportToExcel, exportToPDF } from '@/utils/reportGenerator'

export const useReportExport = () => {
  const analysisStore = useAnalysisStore()
  const imageStore = useImageStore()

  /** 导出报告主流程：校验 → 组装参数 → 调生成器 → 下载文件 */
  const handleExportReport = async (format: 'excel' | 'pdf') => {
    const { coreBasicInfo, currentMode, regionMode, holeResults, crackResults, particleResults } = analysisStore
    const { scaleType } = imageStore

    // 1. 校验：当前模式必须有分析结果
    const hasResults =
      (currentMode === 'hole' && holeResults.totalCount > 0) ||
      (currentMode === 'crack' && crackResults.totalCount > 0) ||
      (currentMode === 'size' && particleResults.totalParticleCount > 0)

    if (!hasResults) {
      ElMessage.warning('请先进行分析,生成结果后再导出报告')
      return
    }

    // 2. 校验：基础信息未填完整时弹出确认对话框
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
        return // 用户取消
      }
    }

    // 3. 组装基础信息（空值用"未填写"填充）
    const basicInfo = {
      wellNo: coreBasicInfo.wellNo || '未填写',
      wellDepth: coreBasicInfo.wellDepth || '未填写',
      horizon: coreBasicInfo.horizon || '未填写',
      lithology: coreBasicInfo.lithology || '未填写',
      sampleDate: coreBasicInfo.sampleDate || new Date().toISOString().slice(0, 10)
    }

    // 4. 组装分析参数（模式、区域、标尺、阈值）
    const params = {
      mode: currentMode,
      regionMode,
      scaleType,
      threshold: currentMode === 'hole' ? analysisStore.holeThreshold
        : currentMode === 'crack' ? analysisStore.crackThreshold
        : analysisStore.particleThreshold,
    }

    // 5. 获取当前模式的分析结果
    let results: any
    if (currentMode === 'hole') {
      results = holeResults
    } else if (currentMode === 'crack') {
      results = crackResults
    } else {
      results = particleResults
    }

    // 6. 调用生成器导出
    try {
      if (format === 'excel') {
        await exportToExcel(basicInfo, params, results)
        ElMessage.success('Excel报告导出成功')
      } else {
        await exportToPDF(basicInfo, params, results)
        ElMessage.success('PDF报告导出成功')
      }
    } catch (error: any) {
      console.error('导出报告失败:', error)
      ElMessage.error(error?.message || '导出报告失败,请重试')
    }
  }

  return { handleExportReport }
}
