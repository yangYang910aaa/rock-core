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
    region:AnalysisRegion={x:0,y:0,width:0,height:0},
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
// ==========================================
// Mat 生命周期管理工具
// ==========================================
import { markRaw } from 'vue'

/** 复制一个 Mat，返回非响应式新实例（调用方负责管理生命周期） */
export const copyMat = (m: cv.Mat): cv.Mat => {
  const out = new cv.Mat()
  m.copyTo(out)
  return markRaw(out)
}

/** 安全删除 Mat，避免访问已释放的C++指针 */
export const deleteMatSafe = (m?: cv.Mat | null) => {
  if (!m) return
  try {
    m.delete()
  } catch {
    // 已释放则忽略
  }
}

/**
 * 检测鼠标位置对应的孔洞/裂缝
 * @param binaryMask 二值蒙版
 * @param mouseX 鼠标X坐标（原图坐标）
 * @param mouseY 鼠标Y坐标（原图坐标）
 * @param region 分析区域
 * @param pixelToMm 像素转毫米系数
 * @returns 孔洞信息（序号、直径、面积），未检测到返回null
 */
export interface HoleInfo {
  index: number
  diameter: number
  area: number
  centerX: number
  centerY: number
}
export const detectHoveredHole = (
  binaryMask: cv.Mat,
  mouseX: number,
  mouseY: number,
  region: AnalysisRegion = { x: 0, y: 0, width: 0, height: 0 },
  pixelToMm: number = 0.1
): HoleInfo | null => {
  // 检查坐标是否在蒙版范围内
  if (mouseX < 0 || mouseX >= binaryMask.cols || mouseY < 0 || mouseY >= binaryMask.rows) {
    return null
  }
  
  // 检查是否在分析区域内（如果有定义）
  if (region.width > 0 && region.height > 0) {
    if (mouseX < region.x || mouseX >= region.x + region.width || 
        mouseY < region.y || mouseY >= region.y + region.height) {
      return null
    }
  }
  
  // 检查该点是否在蒙版内（使用全图坐标）
  const pixelValue = binaryMask.ucharPtr(mouseY, mouseX)[0]
  if (pixelValue < 128) {
    return null
  }
  
  // 查找所有轮廓（先 clone 一份，因为 findContours 会修改原图）
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  const maskForContours = binaryMask.clone()
  cv.findContours(maskForContours, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
  maskForContours.delete()

  let resultInfo: HoleInfo | null = null

  try {
    // 遍历轮廓，找到包含该点的轮廓
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)

      if (area < 10) {
        contour.delete()
        continue
      }

      // 检查点是否在轮廓内（使用全图坐标）
      const result = cv.pointPolygonTest(contour, new cv.Point(mouseX, mouseY), false)
      if (result >= 0) {
        // 计算孔洞参数
        const diameter = Math.sqrt(4 * area / Math.PI) * pixelToMm
        const holeArea = area * pixelToMm * pixelToMm

        // 计算中心坐标（全图坐标）
        const moments = cv.moments(contour)
        let centerX = mouseX
        let centerY = mouseY
        if (moments.m00 > 0) {
          centerX = Math.round(moments.m10 / moments.m00)
          centerY = Math.round(moments.m01 / moments.m00)
        }

        resultInfo = {
          index: i + 1,
          diameter: Number(diameter.toFixed(4)),
          area: Number(holeArea.toFixed(4)),
          centerX,
          centerY
        }

        contour.delete()
        break  // 找到后退出循环，不在 try 块内删除 contours/hierarchy
      }

      contour.delete()
    }
  } finally {
    // 只在 finally 块中释放资源，避免重复删除
    contours.delete()
    hierarchy.delete()
  }
  
  return resultInfo
}

/**
 * 根据悬停的孔洞索引生成高亮蒙版
 * @param binaryMask 原始二值蒙版
 * @param hoverIndex 悬停的孔洞索引（从1开始）
 * @param srcSize 原图尺寸
 * @param region 分析区域
 * @param normalColor 正常颜色（红色）
 * @param highlightColor 高亮颜色（亮蓝色）
 * @returns 带高亮效果的可视化蒙版
 */
export const maskToVisualWithHighlight = (
  binaryMask: cv.Mat,
  hoverIndex: number | null,
  srcSize: { width: number; height: number },
  region: AnalysisRegion = { x: 0, y: 0, width: 0, height: 0 },
  normalColor: { r: number; g: number; b: number; a: number } = { r: 255, g: 0, b: 0, a: 128 },
  highlightColor: { r: number; g: number; b: number; a: number } = { r: 0, g: 255, b: 255, a: 192 }
): cv.Mat => {
  const isLocalMode = region.width > 0 && region.height > 0

  // maskToVisual 要求传入的 binaryMask 与 ROI 尺寸一致。
  // Store 中的 binaryMask 是全图尺寸，局部分析时需要 crop 到 region 大小再传入。
  const maskForVisual = isLocalMode
    ? binaryMask.roi(new cv.Rect(
        Math.max(0, region.x),
        Math.max(0, region.y),
        Math.min(srcSize.width - region.x, region.width),
        Math.min(srcSize.height - region.y, region.height)
      ))
    : binaryMask

  const visualMask = maskToVisual(maskForVisual, srcSize, region, normalColor)

  if (isLocalMode) {
    maskForVisual.delete()
  }

  // 如果有悬停的孔洞，在上面叠加蓝色高亮
  if (hoverIndex !== null && hoverIndex > 0) {
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    // 先 clone 一份，避免 findContours 修改 Store 中的原始蒙版
    const maskForContours = binaryMask.clone()
    cv.findContours(maskForContours, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    maskForContours.delete()

    try {
      const targetIndex = hoverIndex - 1
      if (targetIndex >= 0 && targetIndex < contours.size()) {
        const contour = contours.get(targetIndex)
        const area = cv.contourArea(contour)
        if (area >= 10) {
          // 创建高亮区域蒙版（全图尺寸，轮廓坐标也是全图坐标）
          const highlightMask = new cv.Mat(binaryMask.rows, binaryMask.cols, cv.CV_8UC1, new cv.Scalar(0))
          cv.drawContours(highlightMask, contours, targetIndex, new cv.Scalar(255), cv.FILLED)

          // 将高亮区域叠加到可视化蒙版上
          if (isLocalMode) {
            const offsetX = Math.max(0, region.x)
            const offsetY = Math.max(0, region.y)
            const roi = visualMask.roi(new cv.Rect(
              offsetX,
              offsetY,
              Math.min(srcSize.width - offsetX, region.width),
              Math.min(srcSize.height - offsetY, region.height)
            ))

            // ROI 坐标是局部的，highlightMask 是全图坐标，需要加偏移
            for (let y = 0; y < roi.rows; y++) {
              for (let x = 0; x < roi.cols; x++) {
                if (highlightMask.ucharPtr(y + offsetY, x + offsetX)[0] > 127) {
                  roi.ucharPtr(y, x)[0] = highlightColor.r
                  roi.ucharPtr(y, x)[1] = highlightColor.g
                  roi.ucharPtr(y, x)[2] = highlightColor.b
                  roi.ucharPtr(y, x)[3] = highlightColor.a
                }
              }
            }

            roi.delete()
          } else {
            // 全图模式：坐标系统一致，直接绘制
            for (let y = 0; y < visualMask.rows; y++) {
              for (let x = 0; x < visualMask.cols; x++) {
                if (highlightMask.ucharPtr(y, x)[0] > 127) {
                  visualMask.ucharPtr(y, x)[0] = highlightColor.r
                  visualMask.ucharPtr(y, x)[1] = highlightColor.g
                  visualMask.ucharPtr(y, x)[2] = highlightColor.b
                  visualMask.ucharPtr(y, x)[3] = highlightColor.a
                }
              }
            }
          }

          highlightMask.delete()
        }
        contour.delete()
      }
    } finally {
      contours.delete()
      hierarchy.delete()
    }
  }

  return visualMask
}