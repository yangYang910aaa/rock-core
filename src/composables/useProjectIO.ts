// ----
// 项目保存/加载：将全部应用状态序列化为 JSON 文件
// 通过 Electron IPC 与主进程通信完成文件读写
// ----
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMaskStore } from '@/stores/maskStore'
import { useImageStore } from '@/stores/imageStore'
import { ElMessage } from 'element-plus'
import { previewAnalysisMask } from '@/services/analysisProcessService'
import { storeToRefs } from 'pinia'

const { ipcRenderer } = window.require('electron')

/** 项目文件结构：version 用于向前兼容 */
interface ProjectFile {
  version: number
  savedAt: string
  image: {
    currentImageDataUrl: string
    processedImageDataUrl: string
    isImageProcessed: boolean
  }
  imageStore: {
    scaleType: 'macro' | 'micro'
    pixelToMm: number
    calibrateRealLength: number
  }
  /** 序列化的分析 store 状态（JSON 兼容的子集） */
  analysisStore: Record<string, any>
}

export const useProjectIO = () => {
  const analysisStore = useAnalysisStore()
  const maskStore = useMaskStore()
  const imageStore = useImageStore()
  const { targetMaskMat } = storeToRefs(maskStore)

  /** 保存项目：收集当前所有状态 → JSON 序列化 → IPC 发送给主进程写文件 */
  const saveProject = async () => {
    if (!imageStore.isImageLoaded) {
      ElMessage.warning('请先打开图片再保存项目')
      return
    }

    const project: ProjectFile = {
      version: 1,
      savedAt: new Date().toISOString(),
      // 图片数据（DataURL 字符串，可能较大）
      image: {
        currentImageDataUrl: imageStore.currentImageDataUrl,
        processedImageDataUrl: imageStore.processedImageDataUrl,
        isImageProcessed: imageStore.isImageProcessed,
      },
      // 标尺配置
      imageStore: {
        scaleType: imageStore.scaleType,
        pixelToMm: imageStore.pixelToMm,
        calibrateRealLength: imageStore.calibrateRealLength,
      },
      // 分析状态（展开对象避免响应式引用，结果用 JSON 深拷贝）
      analysisStore: {
        currentMode: analysisStore.currentMode,
        regionMode: analysisStore.regionMode,
        analysisRegion: { ...analysisStore.analysisRegion },
        holeThreshold: { ...analysisStore.holeThreshold },
        crackThreshold: { ...analysisStore.crackThreshold },
        particleThreshold: { ...analysisStore.particleThreshold },
        colorMatchEnabled: analysisStore.colorMatchEnabled,
        pickedColor: analysisStore.pickedColor ? { ...analysisStore.pickedColor } : null,
        colorMatchTolerance: analysisStore.colorMatchTolerance,
        contiguousRegionEnabled: analysisStore.contiguousRegionEnabled,
        pickedColorImageX: analysisStore.pickedColorImageX,
        pickedColorImageY: analysisStore.pickedColorImageY,
        // holeList/crackList/particleList 含自定义字段（validity/fillingMaterial），需深拷贝
        holeResults: JSON.parse(JSON.stringify(analysisStore.holeResults)),
        crackResults: JSON.parse(JSON.stringify(analysisStore.crackResults)),
        particleResults: JSON.parse(JSON.stringify(analysisStore.particleResults)),
        coreBasicInfo: { ...analysisStore.coreBasicInfo },
      },
    }

    const json = JSON.stringify(project, null, 2)
    const result = await ipcRenderer.invoke('project-save', json)
    if (result.success) {
      ElMessage.success('项目保存成功')
    } else if (!result.canceled) {
      ElMessage.error('项目保存失败')
    }
  }

  /** 加载项目：IPC 读取 JSON → 解析 → 逐字段恢复到 store → 有结果则重新生成蒙版 */
  const loadProject = async () => {
    const json = await ipcRenderer.invoke('project-open')
    if (!json) return // 用户取消对话框

    try {
      const project: ProjectFile = JSON.parse(json)

      // 设置加载标志，阻止 watcher 在状态恢复期间触发预览/清空
      analysisStore.isLoadingProject = true

      // 1. 恢复图片
      imageStore.currentImageDataUrl = project.image.currentImageDataUrl
      imageStore.processedImageDataUrl = project.image.processedImageDataUrl
      imageStore.isImageLoaded = true
      imageStore.isImageProcessed = project.image.isImageProcessed

      // 2. 恢复标尺
      imageStore.scaleType = project.imageStore.scaleType
      imageStore.pixelToMm = project.imageStore.pixelToMm
      imageStore.calibrateRealLength = project.imageStore.calibrateRealLength

      // 3. 恢复分析状态（逐字段赋值，保持类型安全）
      const a = project.analysisStore
      analysisStore.setMode(a.currentMode)
      analysisStore.regionMode = a.regionMode
      analysisStore.setAnalysisRegion(a.analysisRegion)
      analysisStore.holeThreshold = a.holeThreshold
      analysisStore.crackThreshold = a.crackThreshold
      analysisStore.particleThreshold = a.particleThreshold
      analysisStore.colorMatchEnabled = a.colorMatchEnabled
      analysisStore.pickedColor = a.pickedColor
      analysisStore.colorMatchTolerance = a.colorMatchTolerance
      analysisStore.contiguousRegionEnabled = a.contiguousRegionEnabled ?? false
      analysisStore.pickedColorImageX = a.pickedColorImageX ?? 0
      analysisStore.pickedColorImageY = a.pickedColorImageY ?? 0
      analysisStore.holeResults = a.holeResults
      analysisStore.crackResults = a.crackResults
      analysisStore.particleResults = a.particleResults
      analysisStore.setCoreBasicInfo(a.coreBasicInfo)

      ElMessage.success('项目加载成功')

      // 释放加载标志
      analysisStore.isLoadingProject = false

      // 4. 如果之前已完成分析，重新生成蒙版
      const hasResults =
        a.holeResults?.holeList?.length > 0 ||
        a.crackResults?.totalCount > 0 ||
        a.particleResults?.totalParticleCount > 0
      if (hasResults) {
        const threshold = a.currentMode === 'hole'
          ? a.holeThreshold
          : a.currentMode === 'crack'
          ? a.crackThreshold
          : a.particleThreshold
        await previewAnalysisMask(
          a.currentMode,
          project.image.processedImageDataUrl,
          threshold,
          a.analysisRegion,
          targetMaskMat
        )
      }
    } catch (error) {
      analysisStore.isLoadingProject = false
      console.error('加载项目失败:', error)
      ElMessage.error('项目文件格式错误')
    }
  }

  return { saveProject, loadProject }
}
