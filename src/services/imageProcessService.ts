//本函数用来 封装图像处理业务逻辑（调用工具函数 + 处理异常 + 统一提示）
import { ElMessage } from "element-plus";
import cv from '@techstark/opencv-js'
import type {PreprocessType} from '@/stores/imageStore'
import {
  loadImageToMat,
  matToDataUrl,
  grayscaleProcess,//灰度化
  negativeEffectProcess,//底片检测
  edgeDetectProcess,//边缘检测
  filterSmoothProcess,//平滑处理
  autoLevelsProcess,//自动色阶
  sharpenProcess,//锐化
  brightnessContrastProcess,//亮度/对比度调整
  saturationProcess//饱和度调节
} from '@/utils/opencvUtils'
//处理参数类型
interface ProcessParams{
    imageDataUrl:string
    bcParams:{
        alpha:number
        beta:number
    }
    saturationFactor:number
}
/**
 * 统一图像处理业务入口
 * @param type 预处理类型
 * @param params 处理参数
 * @returns 处理后的图片 DataURL
 */
export const executeImageProcess=async(type:PreprocessType,params:ProcessParams):Promise<string>=>{
    const {imageDataUrl,bcParams,saturationFactor}=params
    let src:cv.Mat|null =null
    let dst:cv.Mat|null =null
    try {
        //1.加载图片为Mat
        const matResult=await loadImageToMat(imageDataUrl)
        src=matResult.src
        //2.根据类型执行对应处理
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
                
            case 'curveAdjust':
                ElMessage.warning('曲线调整功能暂未实现')
                dst=src.clone()
                break                
            default:
                throw new Error(`未实现的处理类型：${type}`)    
        }
        //3.转换为DataURL
        const dataUrl=matToDataUrl(dst)
        return dataUrl
    } catch (error:any) {
        ElMessage.error(`处理失败：${error.message}`)
        throw error
    }finally{
        if(src) src.delete()
        if(dst) dst.delete()
    }
}