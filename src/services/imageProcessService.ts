// 图像预处理业务层：统一入口 → 调用 OpenCV 工具 → 统一提示
import { ElMessage } from "element-plus";
import cv from '@techstark/opencv-js'
import type {PreprocessType} from '@/stores/imageStore'
import {
  loadImageToMat,
  matToDataUrl,
  grayscaleProcess,
  negativeEffectProcess,
  edgeDetectProcess,
  filterSmoothProcess,
  autoLevelsProcess,
  sharpenProcess,
  brightnessContrastProcess,
  saturationProcess,
  gammaCorrectionProcess,
} from '@/utils/opencv'

interface ProcessParams{
    imageDataUrl:string
    bcParams:{ alpha:number; beta:number }
    saturationFactor:number
    gammaValue:number
}

/** 统一图像处理入口：加载图片 → 执行算法 → 返回 DataURL */
export const executeImageProcess=async(type:PreprocessType,params:ProcessParams):Promise<string>=>{
    const {imageDataUrl,bcParams,saturationFactor,gammaValue}=params
    let src:cv.Mat|null =null
    let dst:cv.Mat|null =null
    try {
        const matResult=await loadImageToMat(imageDataUrl)
        src=matResult.src

        switch(type){
            case 'grayscale':
                dst=grayscaleProcess(src)
                ElMessage.success('灰度化完成')
                break

            case 'negativeEffect':
                dst = negativeEffectProcess(src)
                ElMessage.success('底片效果完成')
                break

            case 'edgeDetect':
                dst = edgeDetectProcess(src)
                ElMessage.success('边缘检测完成')
                break

            case 'filterSmooth':
                dst = filterSmoothProcess(src)
                ElMessage.success('滤波平滑完成')
                break

            case 'autoLevels':
                dst = autoLevelsProcess(src)
                ElMessage.success('自动色阶完成')
                break

            case 'sharpen':
                dst = sharpenProcess(src)
                ElMessage.success('锐化完成')
                break

            case 'brightnessContrast':
                dst = brightnessContrastProcess(src, bcParams.alpha, bcParams.beta)
                ElMessage.success(`亮度/对比度调整完成(对比度：${bcParams.alpha.toFixed(1)}，亮度：${bcParams.beta})`)
                break

            case 'saturation':
                dst = saturationProcess(src, saturationFactor)
                ElMessage.success(`饱和度调节完成(系数：${saturationFactor.toFixed(1)})`)
                break
                
            case 'gammaCorrection':
                 const gamma = gammaValue || 1.0
                 dst = gammaCorrectionProcess(src, gamma)
                 if (Math.abs(gamma - 1.0) < 0.01) {
                     ElMessage.info('伽马值为1.0,无需调整')
                } else {
                ElMessage.success(`伽马校正完成(伽马值：${gamma.toFixed(1)})`)
                }
                break                
            default:
                throw new Error(`未实现的处理类型：${type}`)    
        }
        //3.转换为DataURL
        const dataUrl=matToDataUrl(dst!)
        return dataUrl
    } catch (error:any) {
        ElMessage.error(`处理失败：${error.message}`)
        throw error
    }finally{
        if(src) src.delete()
        if(dst) dst.delete()
    }
}