import {defineStore} from 'pinia'
import {ref} from 'vue'

//定义分析模式类型
export type AnalysisMode='hole'|'crack'|'size' //孔洞、裂缝、粒度
//定义图像预处理的操作类型
export type PreprocessType=
| 'autoLevels' //自动色阶
| 'curveAdjust'//曲线调节
| 'grayscale' //灰度化
| 'brightnessContrast' //亮度/对比度调整
| 'saturation' //饱和度调节
| 'filterSmooth' //滤波平滑
| 'sharpen' //锐化
| 'edgeDetect' //边缘检测
| 'negativeEffect' //底片效果

export const useAnalysisStore=defineStore('analysis',()=>{
//1.核心状态:当前分析模式
    const currentMode=ref<AnalysisMode>('hole')//默认孔洞分析
    //图像预处理状态
    const currentPreprocess=ref<PreprocessType|null>(null) //当前执行的预处理操作
    const preprocessHistory=ref<PreprocessType[]>([]) //预处理操作历史
//2.阈值设置状态(根据模式动态变化)
    //孔洞分析阈值
    const holeThreshold=ref({
        minThreshold:0,//初始最小阈值为0
        maxThreshold:128,//初始最大阈值为128
        colorMatch:80 //文档要求的颜色匹配度
    })
    //裂缝分析阈值
    const crackThreshold=ref({
        minWidth:0.1,//最小裂缝宽度
        maxWidth:5.0,//最大裂缝宽度
        minLength:20,//最小裂缝长度
    })
    //粒度分析阈值
    const sizeThreshold=ref({
        minSize:0.1,//最小粒度大小
        maxSize:10.0,//最大粒度大小
        gradeCount:5//默认5个等级的粒度分析
    })
//3.分析结果状态
    //孔洞分析结果
    const holeResults=ref({
        totalCount:0,//总孔洞数
        totalArea:0,//总孔洞面积
        avgDiameter:0,//平均孔洞直径
        maxDiameter:0,//最大孔洞直径
        minDiameter:0,//最小孔洞直径
        faceRate:0,//孔洞面占比
    })
    //裂缝分析结果
    const crackResults=ref({
        totalCount:0,//总裂缝数
        totalLength:0,//总裂缝长度
        avgWidth:0,//平均裂缝宽度
        faceRate:0,//裂缝面占比
        lineDensity:0,//裂缝密度占比
        areaDensity:0,//裂缝面积占比占比
    })
    //粒度分析结果
    const sizeResults=ref({
        avgSize:0,//平均粒度大小
        sortingCoefficient:0,//排序度系数
        distribution:[] as number[],//粒度分布
    })
//操作:切换分析模式
    const setMode=(mode:AnalysisMode)=>{
        currentMode.value=mode
        console.log(`切换到${mode}分析模式`)
    }
    //执行图像预处理操作
    const executePreprocess=(type:PreprocessType)=>{
        currentPreprocess.value=type
        preprocessHistory.value.push(type)
        console.log(`执行图像预处理操作:${type}`)
    }
    //清空预处理操作历史
    const clearPreprocessHistory=()=>{
        preprocessHistory.value=[]
        currentPreprocess.value=null
    }
    return{
        currentMode,
        holeThreshold,
        crackThreshold,
        sizeThreshold,
        holeResults,
        crackResults,
        sizeResults,
        setMode,
        currentPreprocess,
        preprocessHistory,
        executePreprocess,
        clearPreprocessHistory
    }
})
