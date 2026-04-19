<template>
    <div class="image-canvas-wrapper">
        <!-- 空状态提示 -->
        <div class="empty-state" v-if="!isImageLoaded">
            <el-icon size="64" color="#909399"><PictureFilled/></el-icon>
            <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
        </div>

        <!-- 图片显示区域 -->
         <div class="image-container" v-else>
            <img :src="displayImageDataUrl" alt="岩心图片" class="core-image" @load="onImageLoad" @error="onImageError">
            <div class="image-info">
                <span class="image-item">文件路径:{{ currentImagePath}}</span>
                  <span class="image-tag" v-if="isImageProcessed" style="margin-left: 12px; color: #67c23a;">
                      <el-icon><Check /></el-icon> 已处理
                   </span>
                  <span class="image-tag" v-if="isProcessing" style="margin-left: 12px; color: #e6a23c;">
                      <el-icon><Loading /></el-icon> 处理中...
                  </span>
            </div>
         </div>
    </div>
</template>
<script setup lang="ts">
import { PictureFilled,Check,Loading } from '@element-plus/icons-vue';
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia';
import { computed,onMounted } from 'vue';

//引入Store
const imageStore = useImageStore()

//解构Store的状态
const {currentImagePath,isImageLoaded,isImageProcessed,isProcessing}=storeToRefs(imageStore)

//显示的图片:优先显示处理后的图片,没有处理则显示原始图片
const displayImageDataUrl=computed(()=>{
  return imageStore.isImageProcessed?imageStore.processedImageDataUrl:imageStore.currentImageDataUrl
})
//组件挂载时初始化OpenCV.js
onMounted(()=>{
  imageStore.initOpenCV()
})
// 图片加载回调
const onImageLoad = () => {
  console.log('✅ 图片渲染成功', currentImagePath.value)
}
const onImageError = (e: Event) => {
  console.error('❌ 图片渲染失败！', e)
}


</script>
<style scoped>
.image-canvas-wrapper {
  width: 100%;
  height: 100%;
  background-color: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  color: #909399;
}

.empty-text {
  margin-top: 16px;
  font-size: 16px;
}

/* 图片显示样式 */
.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.core-image {
  max-width: 90%;
  max-height: 85%;
  object-fit: contain;
  border: 1px solid #dcdfe6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.image-info {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  color: #606266;
  font-size: 12px;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
}
.image-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}
</style>
