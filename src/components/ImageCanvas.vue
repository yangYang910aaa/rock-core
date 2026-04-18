<template>
    <div class="image-canvas-wrapper">
        <!-- 空状态提示 -->
        <div class="empty-state" v-if="!isImageLoaded">
            <el-icon size="64" color="#909399"><PictureFilled/></el-icon>
            <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
        </div>

        <!-- 图片显示区域 -->
         <div class="image-container" v-else>
            <img :src="currentImageDataUrl" alt="岩心图片" class="core-image" @load="onImageload" @error="onImageError">
            <div class="image-info">
                <span class="image-item">文件路径:{{ currentImagePath}}</span>
            </div>
         </div>
    </div>
</template>
<script setup lang="ts">
import { PictureFilled } from '@element-plus/icons-vue';
import { useImageStore } from '@/stores/imageStore'
import { storeToRefs } from 'pinia';
const imageStore = useImageStore()
const {currentImagePath,currentImageDataUrl,isImageLoaded}=storeToRefs(imageStore)
// 图片加载成功回调
const onImageload=()=>{
  console.log('图片渲染成功',currentImagePath.value)
}
// 图片加载失败回调
const onImageError = (e:Event) => {
  console.error('图片渲染失败！', e)
  console.log('当前图片DataURL：', currentImageDataUrl.value)
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

/* 【修复】路径信息样式，深色文字+白色背景，清晰可见 */
.image-info {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  color: #606266; /* 深色文字，和浅灰背景完全区分 */
  font-size: 12px;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
