//本函数用来 封装 OpenCV 通用工具函数（底层能力，纯函数，无状态）
import cv, { exp } from '@techstark/opencv-js'
import { nextTick } from 'vue'

// ==========================================
// 1. 私有变量（仅工具内部使用）
// ==========================================

//临时Canvas 元素，用于处理图像
let inputCanvas:HTMLCanvasElement|null=null
let outputCanvas:HTMLCanvasElement|null=null

// ==========================================
// 2. 基础工具函数
// ==========================================

//OpenCV 初始化
export const initOpenCV=async()=>{
    return new Promise<void>((resolve)=>{
        if(cv.Mat){
            //OpenCV 已初始化，创建临时Canvas
            createTempCanvas()  
            console.log('OpenCV.js 加载完成')
            resolve()
            return
        }
        //OpenCV 未初始化，等待初始化完成
        cv['onRuntimeInitialized']=()=>{
            createTempCanvas()  
            console.log('OpenCV.js 加载完成')
            resolve()
        }
    })
}
//创建临时Canvas 元素
const createTempCanvas=async()=>{
    await nextTick()
    inputCanvas=document.createElement('canvas')
    outputCanvas=document.createElement('canvas')
}
//通用辅助函数1：图片转Mat
export const loadImageToMat=async(imageDataUrl:string):Promise<{src:cv.Mat,width:number,height:number}>=>{
    if(!inputCanvas||!imageDataUrl){
        throw new Error('Canvas未初始化或图片未加载')
    }
    return new Promise((resolve,reject)=>{
        const img=new Image()
        img.crossOrigin='anonymous'
        img.onload=()=>{
            try {
                 //1.将图片绘制到输入Canvas
                inputCanvas!.width=img.width
                inputCanvas!.height=img.height
                const inputCtx=inputCanvas!.getContext('2d')!
                inputCtx.drawImage(img,0,0)
                //2.读取为OpenCV Mat
                const src=cv.imread(inputCanvas!)
                resolve({src,width:img.width,height:img.height})
            } catch (error) {
                reject(error)
            }
        }
        img.onerror=(error)=>reject(error)
        img.src=imageDataUrl
    })
}
//通用辅助函数2：Mat转图片URL
export const matToDataUrl=(dst:cv.Mat):string=>{
    if(!outputCanvas){
        throw new Error('输出Canvas未初始化')
    }
    cv.imshow(outputCanvas,dst)
    return outputCanvas.toDataURL('image/png')
}

// ==========================================
// 3. 具体的图像处理工具函数
// ==========================================

/**
 * 1. 灰度化
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（灰度）
 */
export const grayscaleProcess=(src:cv.Mat):cv.Mat=>{
    const dst=new cv.Mat()
    cv.cvtColor(src,dst,cv.COLOR_RGBA2GRAY)
    return dst
}
/**
 * 2. 底片效果（只对RGB通道取反，保留Alpha）
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（BGRA）
 */
export const negativeEffectProcess=(src:cv.Mat):cv.Mat=>{
    const dst=new cv.Mat()
    const channels=new cv.MatVector()
    cv.split(src,channels)
    // 只对 B、G、R 通道取反，Alpha 通道保持不变
    cv.bitwise_not(channels.get(0), channels.get(0)) // B
    cv.bitwise_not(channels.get(1), channels.get(1)) // G
    cv.bitwise_not(channels.get(2), channels.get(2)) // R
    // 合并通道
    cv.merge(channels, dst)
    channels.delete() // 释放中间变量
    return dst
}
/**
 * 3. 边缘检测（Canny算法）
 * @param src 输入 Mat（BGRA）
 * @param threshold1 Canny低阈值（默认50）
 * @param threshold2 Canny高阈值（默认150）
 * @returns 输出 Mat（灰度边缘图）
 */
export const edgeDetectProcess=(src:cv.Mat,threshold1:number=50,threshold2:number=150):cv.Mat=>{
    const gray=new cv.Mat()
    const dst=new cv.Mat()
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY)
    cv.Canny(gray,dst,threshold1,threshold2)
    gray.delete()
    return dst
}
/**
 * 4. 滤波平滑（高斯模糊）
 * @param src 输入 Mat（BGRA）
 * @param kernelSize 卷积核大小（默认5x5）
 * @returns 输出 Mat（BGRA）
 */
export const filterSmoothProcess=(src:cv.Mat,kernelSize:number=5):cv.Mat=>{
    const dst=new cv.Mat()
    cv.GaussianBlur(src,dst,new cv.Size(kernelSize,kernelSize),0,0)
    return dst
}
/**
 * 5. 自动色阶（直方图均衡化）
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（BGR）
 */
export const autoLevelsProcess=(src:cv.Mat):cv.Mat=>{
    const bgrMat=new cv.Mat()
    const ycrcb=new cv.Mat()
    const channels=new cv.MatVector()
    const dst=new cv.Mat()

    //BGRA->BGR->YCrCb
    cv.cvtColor(src,bgrMat,cv.COLOR_RGBA2BGR)
    cv.cvtColor(bgrMat,ycrcb,cv.COLOR_BGR2YCrCb)
    cv.split(ycrcb,channels)
    //只对亮度通道Y进行直方图均衡化
    cv.equalizeHist(channels.get(0),channels.get(0))
    //合并通道并转回BGR
    cv.merge(channels,ycrcb)
    cv.cvtColor(ycrcb,dst,cv.COLOR_YCrCb2BGR)
    //释放中间变量
    bgrMat.delete()
    ycrcb.delete()
    channels.delete()
    return dst
}
/**
 * 6. 锐化（自定义3x3卷积核）
 * @param src 输入 Mat（BGRA）
 * @returns 输出 Mat（BGRA）
 */
export const sharpenProcess=(src:cv.Mat):cv.Mat=>{
    const dst=new cv.Mat()
    //自定义3x3卷积核
    const kernel=cv.matFromArray(3,3,cv.CV_32F,[
        0,-1,0,
        -1,5,-1,
        0,-1,0
    ])
    cv.filter2D(src,dst,cv.CV_8U,kernel)
    kernel.delete()
    return dst
}
/**
 * 7. 亮度/对比度调整
 * @param src 输入 Mat（BGRA）
 * @param alpha 对比度系数（0.0~3.0）
 * @param beta 亮度偏移量（-100~100）
 * @returns 输出 Mat（BGRA）
 */
export const brightnessContrastProcess=(src:cv.Mat,alpha:number,beta:number):cv.Mat=>{
      // 参数校验
    const clampedAlpha=Math.max(0.0,Math.min(3.0,alpha))//限制alpha在0.0~3.0之间
    const clampedBeta=Math.max(-100,Math.min(100,beta))//限制beta在-100~100之间
    const dst=new cv.Mat(src.rows,src.cols,src.type())
    src.convertTo(dst,-1,clampedAlpha,clampedBeta)
    return dst
}
/**
 * 8. 饱和度调节
 * @param src 输入 Mat（BGRA）
 * @param factor 饱和度系数（0.0~3.0，1.0=不变）
 * @returns 输出 Mat（BGR）
 */
export const saturationProcess=(src:cv.Mat,factor:number):cv.Mat=>{
    const bgrMat=new cv.Mat()
    const hsvMat=new cv.Mat()
    const channels=new cv.MatVector()
    const dst=new cv.Mat()
    
    //BGRA->BGR->HSV
    cv.cvtColor(src,bgrMat,cv.COLOR_BGRA2BGR)
    cv.cvtColor(bgrMat,hsvMat,cv.COLOR_BGR2HSV)
    cv.split(hsvMat,channels)
    
    //调整饱和度通道S
    const sChannel=channels.get(1)!
    sChannel.convertTo(sChannel,cv.CV_8U,factor,0)

    //合并通道并转回BGR
    cv.merge(channels,hsvMat)
    cv.cvtColor(hsvMat,dst,cv.COLOR_HSV2BGR)
    //释放中间变量
    bgrMat.delete()
    hsvMat.delete()
    channels.delete()
    return dst
}
