// 核心基础工具（初始化、图片转Mat、Mat转DataURL等）
// OpenCV 核心基础工具
import cv from '@techstark/opencv-js'
import { nextTick } from 'vue'
import type { AnalysisRegion } from '@/stores/analysisStore'

// 私有变量
let inputCanvas: HTMLCanvasElement | null = null
let outputCanvas: HTMLCanvasElement | null = null

/**
 * OpenCV 初始化
 */
export const initOpenCV = async (): Promise<void> => {
  return new Promise((resolve) => {
    if (cv.Mat) {
        //OpenCV 已初始化，创建临时Canvas
      createTempCanvas()
      resolve()
      return
    }
    //OpenCV 未初始化，等待初始化完成
    cv['onRuntimeInitialized'] = () => {
      createTempCanvas()
      resolve()
    }
  })
}

/**
 * 创建临时 Canvas
 */
const createTempCanvas = async () => {
  await nextTick()
  inputCanvas = document.createElement('canvas')
  outputCanvas = document.createElement('canvas')
}

/**
 * 图片 DataURL 转 OpenCV Mat
 */
export const loadImageToMat = async (imageDataUrl: string): Promise<{ src: cv.Mat, width: number, height: number }> => {
  if (!inputCanvas || !imageDataUrl) {
    throw new Error('Canvas未初始化或图片未加载')
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
          //1.将图片绘制到输入Canvas
        inputCanvas!.width = img.width
        inputCanvas!.height = img.height
        const inputCtx = inputCanvas!.getContext('2d')!
        inputCtx.drawImage(img, 0, 0)
          //2.读取为OpenCV Mat
        const src = cv.imread(inputCanvas!)
        resolve({ src, width: img.width, height: img.height })
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = (error) => reject(error)
    img.src = imageDataUrl
  })
}

/**
 * OpenCV Mat 转图片 DataURL
 */
export const matToDataUrl = (dst: cv.Mat): string => {
  if (!outputCanvas) throw new Error('输出Canvas未初始化')
  cv.imshow(outputCanvas, dst)
  return outputCanvas.toDataURL('image/png')
}

/**
 * 裁剪分析区域
 */
export const cropAnalysisRegion=(src:cv.Mat,region:AnalysisRegion):cv.Mat=>{
    if(region.width===0||region.height===0){
        return src.clone()
    } 
    const rect=new cv.Rect(
        Math.max(0,region.x),
        Math.max(0,region.y),
        Math.min(src.cols-region.x,region.width),
        Math.min(src.rows-region.y,region.height)
    )
    return src.roi(rect)
}
/**
 * 二值蒙版转可视化RGBA蒙版
 */
export const maskToVisual=(
    binaryMask:cv.Mat,
    srcSize:{width:number,height:number},
    region:AnalysisRegion,
    color:{r:number,g:number,b:number,a:number}={r:255,g:0,b:0,a:128}
):cv.Mat=>{
  //创建可视化蒙版
    const visualMask=new cv.Mat(srcSize.height,srcSize.width,cv.CV_8UC4,new cv.Scalar(0,0,0,0))
    if(region.width>0 && region.height>0){
      //裁剪分析区域
      const roi=visualMask.roi(new cv.Rect(
            Math.max(0,region.x),
            Math.max(0,region.y),
            Math.min(srcSize.width-region.x,binaryMask.cols),
            Math.min(srcSize.height-region.y,binaryMask.rows)
        ))
        //将二值蒙版转换为RGBA蒙版
        const channels=new cv.MatVector()
        cv.split(roi,channels)
        cv.threshold(binaryMask, channels.get(0), 127, color.r, cv.THRESH_BINARY)
        cv.threshold(binaryMask, channels.get(1), 127, color.g, cv.THRESH_BINARY)
        cv.threshold(binaryMask, channels.get(2), 127, color.b, cv.THRESH_BINARY)
        cv.threshold(binaryMask, channels.get(3), 127, color.a, cv.THRESH_BINARY)
        cv.merge(channels, roi)
        channels.delete()
        roi.delete()
    }else{
         const channels = new cv.MatVector()
        cv.split(visualMask, channels)
        cv.threshold(binaryMask, channels.get(0), 127, color.r, cv.THRESH_BINARY)
        cv.threshold(binaryMask, channels.get(1), 127, color.g, cv.THRESH_BINARY)
        cv.threshold(binaryMask, channels.get(2), 127, color.b, cv.THRESH_BINARY)
        cv.threshold(binaryMask, channels.get(3), 127, color.a, cv.THRESH_BINARY)
        cv.merge(channels, visualMask)
        channels.delete()
    }
    return visualMask
}