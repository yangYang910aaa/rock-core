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
  // 【核心重构】5. 通用辅助函数（提取重复代码）
  // ==========================================

    // 通用辅助函数1：加载图片并转换为 OpenCV Mat
  const loadImageToMat=async():Promise<{ src: cv.Mat, width: number, height: number }>=>{
    if(!inputCanvas||!currentImageDataUrl.value){
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
        img.src=currentImageDataUrl.value
    })
  }
    /**
   * 通用辅助函数2：将处理后的 Mat 保存为图片并更新 Store
   * @param dst 处理后的 OpenCV Mat
   * @param src 原始 Mat（用于释放内存）
   * @param processName 处理名称（用于日志）
   */
  const saveMatToImage=(dst:cv.Mat,src:cv.Mat,processName:string)=>{
    if(!outputCanvas){
        return
    }
    //1.将处理后的Mat绘制到输出Canvas
    cv.imshow(outputCanvas!,dst)
    //2.更新Store
    setProcessedImage(outputCanvas!.toDataURL('image/png'))
    //3.释放内存
    src.delete()
    dst.delete()
  }
  // ==========================================
  // 6. 核心：图像处理函数
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
            case 'grayscale'://灰度化
                await executeGrayscale()
                break
            case 'negativeEffect'://底片效果
                await executeNegativeEffect()
                break
            case 'edgeDetect'://边缘检测
                await executeEdgeDetect()
                break
            case 'filterSmooth'://滤波平滑
                await executeFilterSmooth()
                break
            case 'autoLevels'://自动色阶
                await executeAutoLevels()
                break
            case 'sharpen'://锐化
                await executeSharpen()
                break
            case 'brightnessContrast'://亮度对比度调整
                await executeBrightnessContrast()
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
  //灰度化处理函数:将图片转换为灰度图
  const executeGrayscale=async()=>{
    const {src}=await loadImageToMat()
    const dst=new cv.Mat()
    cv.cvtColor(src,dst,cv.COLOR_RGBA2GRAY)
    saveMatToImage(dst,src,'灰度化')
    ElMessage.success('灰度化完成')
  }

  //底片效果处理函数:像素取反,只对RGB通道取反,Alpha通道不变
  const executeNegativeEffect=async()=>{
   const {src}=await loadImageToMat()
   const dst=new cv.Mat()
   //只对RGB通道取反,Alpha通道保持255
   const channels=new cv.MatVector()
   cv.split(src,channels)
   //对R，G,B通道分别取反
   cv.bitwise_not(channels.get(0),channels.get(0))//B
   cv.bitwise_not(channels.get(1),channels.get(1))//G
   cv.bitwise_not(channels.get(2),channels.get(2))//R
   cv.merge(channels,dst)//合并通道
   channels.delete()
   saveMatToImage(dst,src,'底片效果')
   ElMessage.success('底片效果完成')
  }
  //边缘检测处理函数:Canny边缘检测器
  const executeEdgeDetect=async()=>{
    const {src}=await loadImageToMat()
    const gray=new cv.Mat()
    const dst=new cv.Mat()
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY)
    cv.Canny(gray,dst,50,150)
    saveMatToImage(dst,src,'边缘检测')
    gray.delete()
    ElMessage.success('边缘检测完成')
  }

  //平滑滤波处理函数:高斯模糊
  const executeFilterSmooth=async()=>{
    const {src}=await loadImageToMat()
    const dst=new cv.Mat()
    cv.GaussianBlur(src,dst,new cv.Size(5,5),0,0)
    saveMatToImage(dst,src,'滤波平滑')
  }

  //自动色阶处理函数:根据图像直方图自动调整色阶
  const executeAutoLevels=async()=>{
    const {src}=await loadImageToMat()
    const ycrcb=new cv.Mat()
    const channels=new cv.MatVector()
    const dst=new cv.Mat()
    cv.cvtColor(src,ycrcb,cv.COLOR_RGB2YCrCb)
    cv.split(ycrcb,channels)
    cv.equalizeHist(channels.get(0),channels.get(0))
    cv.merge(channels,ycrcb)
    cv.cvtColor(ycrcb,dst,cv.COLOR_YCrCb2RGB)
    saveMatToImage(dst,src,'自动色阶')
    ycrcb.delete()
    channels.delete()
    ElMessage.success('自动色阶完成')
  }

  //锐化处理函数:自定义卷积核
  const executeSharpen=async()=>{
    const {src}=await loadImageToMat()
    const dst=new cv.Mat()
    //3x3锐化卷积核
    const kernel=cv.matFromArray(3,3,cv.CV_32F,[
        0,-1,0,
        -1,5,-1,
        0,-1,0
    ])
    cv.filter2D(src,dst,cv.CV_8U,kernel)
    kernel.delete()
    saveMatToImage(dst,src,'锐化')
    ElMessage.success('锐化完成')
  }

  //亮度对比度调整处理函数:调整图像的亮度和对比度
  /**
 * 亮度/对比度调节（带参数）
 * @param alpha 对比度系数（1.0=不变，>1增强，<1减弱）
 * @param beta 亮度偏移量（0=不变，>0变亮，<0变暗）
 */
  const executeBrightnessContrast=async(alpha:number=1.0,beta:number=0)=>{
    const {src}=await loadImageToMat()
    const dst=new cv.Mat()
    src.convertTo(dst,-1,alpha,beta)
    saveMatToImage(dst,src,'亮度/对比度')
    ElMessage.success('亮度对比度调整完成')
  }
  // ==========================================
  // 7. 暴露给组件的状态和方法
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
        executeProcess,
        executeBrightnessContrast
    }
})