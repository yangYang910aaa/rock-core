import {defineStore} from 'pinia'
import {nextTick, ref} from 'vue'
import cv from '@techstark/opencv-js'
import { ElMessage } from 'element-plus'

//定义预处理操作类型
export type PreprocessType=
| 'grayscale' //灰度化
| 'autoLevels' //自动色阶
| 'curveAdjust' //曲线调整
| 'brightnessContrast' //亮度对比度
| 'saturation' //饱和度
| 'filterSmooth' //平滑滤波
| 'sharpen' //锐化
| 'edgeDetect' //边缘检测
| 'negativeEffect' //底片效果
export const useImageStore=defineStore('image',()=>{
  // ==========================================
  // 1. 基础状态
  // ==========================================
    //状态:当前打开的图片文件路径
    const currentImagePath=ref<string>('')
    //状态:当前图片的DataURL(用于在页面上显示)
    const currentImageDataUrl=ref<string>('')
    //状态:当前图片是否已加载
    const isImageLoaded=ref<boolean>(false)
    //状态:处理后的图片,用于显示灰度化,色阶等效果
    const processedImageDataUrl=ref<string>('')
    //状态:图片是否已经被处理
    const isImageProcessed=ref<boolean>(false)

 // ==========================================
  // 2. OpenCV.js 相关状态
  // ==========================================
  const cvReady=ref<boolean>(false) //OpenCV.js是否加载完成
  const isProcessing=ref<boolean>(false) //是否正在处理

 // 临时 Canvas（用于 OpenCV.js 处理，不暴露给 UI）
  let inputCanvas:HTMLCanvasElement|null=null
  let outputCanvas:HTMLCanvasElement|null=null

// ==========================================
  // 3. 基础操作
  // ==========================================
    //操作:设置图片信息
    const setImage=(filePath:string,dataUrl:string)=>{
        currentImagePath.value=filePath
        currentImageDataUrl.value=dataUrl
        isImageLoaded.value=true
        processedImageDataUrl.value=dataUrl
        isImageProcessed.value=false
    }
    //操作:设置处理后的图片信息
    const setProcessedImage=(dataUrl:string)=>{
        processedImageDataUrl.value=dataUrl
        isImageProcessed.value=true
    }
    //操作:重置图片信息
    const resetImage=()=>{
        processedImageDataUrl.value=currentImageDataUrl.value
        isImageProcessed.value=false
    }
    //重置全部
    const resetAll=()=>{
        currentImagePath.value=''
        currentImageDataUrl.value=''
        processedImageDataUrl.value=''
        isImageLoaded.value=false
        isImageProcessed.value=false
    }

  // ==========================================
  // 4. OpenCV.js 初始化
  // ==========================================
  const initOpenCV=async()=>{
    if(cvReady.value){
      return
    }
    //等待OpenCV.js加载完成
    if(cv.Mat){
        cvReady.value=true
        console.log('OpenCV.js加载完成')
    }else{
        //OpenCV.js未加载,等待加载完成
        cv['onRuntimeInitialized']=()=>{
            cvReady.value=true
            console.log('OpenCV.js加载完成')
        }
    }
    //创建临时Canvas
    await nextTick()
    inputCanvas=document.createElement('canvas')
    outputCanvas=document.createElement('canvas')
  }
  // ==========================================
  // 5. 核心：图像处理函数
  // ==========================================
  const executeProcess=async(type:PreprocessType)=>{
    if(!cvReady.value||!isImageLoaded.value||isProcessing.value){
        if(!cvReady.value)ElMessage.warning('OpenCV.js未加载完成')
        if(!isImageLoaded.value)ElMessage.warning('请先打开图片')
        if(isProcessing.value)ElMessage.warning('正在处理中,请稍后')
                return
    }
    isProcessing.value=true
    try{
        switch(type){
            case 'grayscale':
                await executeGrayscale()
                break
            default:
                ElMessage.error('该预处理操作暂未实现')
                break
        }
    }catch(error){
        ElMessage.error('处理失败')
    }finally{
        isProcessing.value=false
    }
  }
  //灰度化处理函数
  const executeGrayscale=async()=>{
    if(!inputCanvas||!outputCanvas||!currentImageDataUrl.value){
        return
    }
    return new Promise<void>((resolve,reject)=>{
        const img=new Image()
        img.crossOrigin='anonymous'
        img.onload=()=>{
            try {
            //1.画到输入Canvas
            inputCanvas!.width=img.width
            inputCanvas!.height=img.height
            const inputCtx=inputCanvas!.getContext('2d')!
            inputCtx.drawImage(img,0,0)

            //2.OpenCV.js处理灰度化
            const src=cv.imread(inputCanvas!)
            const dst=new cv.Mat()
            cv.cvtColor(src,dst,cv.COLOR_RGBA2GRAY)
            //3.将处理后的灰度化图片画到输出Canvas
            cv.imshow(outputCanvas!,dst)
            //4.更新处理后的图片信息
            setProcessedImage(outputCanvas!.toDataURL('image/png'))
            //5.释放内存
            src.delete()
            dst.delete()
            resolve()
            } catch (error) {
                reject(error)
            }
        }
        img.onerror=(error)=>reject(error)
        img.src=currentImageDataUrl.value
    })
  }
  // ==========================================
  // 6. 暴露给组件的状态和方法
  // ==========================================
    return{
        //基础状态
        currentImagePath,
        currentImageDataUrl,
        processedImageDataUrl,
        isImageLoaded,
        isImageProcessed,
        //OpenCV状态
        cvReady,
        isProcessing,
        //基础方法
        setImage,
        setProcessedImage,
        resetImage,
        resetAll,
        //OpenCV方法
        initOpenCV,
        executeProcess
    }
})