import {defineStore} from 'pinia'
import {ref} from 'vue'
export const useImageStore=defineStore('image',()=>{
    //状态:当前打开的图片文件路径
    const currentImagePath=ref<string>('')
    //状态:当前图片的DataURL(用于在页面上显示)
    const currentImageDataUrl=ref<string>('')
    //状态:当前图片是否已加载
    const isImageLoaded=ref<boolean>(false)

    //操作:设置图片信息
    const setImage=(filePath:string,dataURL:string)=>{
        currentImagePath.value=filePath
        currentImageDataUrl.value=dataURL
        isImageLoaded.value=true
    }
    //操作:重置图片信息
    const resetImage=()=>{
        currentImagePath.value=''
        currentImageDataUrl.value=''
        isImageLoaded.value=false
    }
    return{
        currentImagePath,
        currentImageDataUrl,
        isImageLoaded,
        setImage,
        resetImage
    }
})