<template>
    <div class="image-canvas-wrapper">
        <!-- 空状态提示 -->
        <div class="empty-state" v-if="!isImageLoaded">
            <el-icon size="64" color="#909399"><PictureFilled/></el-icon>
            <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
        </div>

        <!-- 图片显示区域 -->
        <div class="image-container" v-else>
            <!-- 三层 Canvas 容器 -->
            <div class="canvas-wrapper" ref="containerRef">
                <!-- 底层 Canvas：显示图片 -->
                <canvas
                    ref="imageCanvasRef"
                    class="image-canvas"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseUp"
                    @wheel.prevent="handleImageZoom"
                />
                <!-- 中层 Canvas：显示蓝色分析区域蒙版 -->
                <canvas
                    ref="maskCanvasRef"
                    class="mask-canvas region-mask"
                />
                <!-- 顶层 Canvas：显示红色目标蒙版 -->
                <canvas
                    ref="targetMaskCanvasRef"
                    class="mask-canvas target-mask"
                />
            </div>

            <!-- 图片信息栏 -->
            <div class="image-info">
                <span class="image-item">文件路径:{{ currentImagePath }}</span>
                <span class="image-tag" v-if="isImageProcessed" style="margin-left: 12px; color: #67c23a;">
                    <el-icon><Check /></el-icon> 已处理
                </span>
                <span class="image-tag" v-if="isProcessing" style="margin-left: 12px; color: #e6a23c;">
                    <el-icon><Loading /></el-icon> 处理中...
                </span>
                <!-- 显示缩放比例 -->
                <span class="image-tag" style="margin-left: 12px; color: #909399;">
                    缩放: {{ (scale * 100).toFixed(0) }}%
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PictureFilled, Check, Loading } from '@element-plus/icons-vue';
import { useImageStore } from '@/stores/imageStore';
import { useAnalysisStore, type AnalysisRegion } from '@/stores/analysisStore';
import { storeToRefs } from 'pinia';
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import cv from '@techstark/opencv-js';

// ==========================================
// 1. Store 引入
// ==========================================
const imageStore = useImageStore();
const analysisStore = useAnalysisStore();

// ==========================================
// 2. 解构 Store 状态
// ==========================================
const {
    currentImagePath,
    isImageLoaded,
    isImageProcessed,
    isProcessing,
    processedImageDataUrl,
    isCalibrating,
    calibrateStartPoint,
    calibrateEndPoint,
} = storeToRefs(imageStore);
const  {toggleCalibrate,setCalibrateStart,setCalibrateEnd} = imageStore;

//实时鼠标坐标(绘制预览线)
const currentCalibrateMousePos=ref<{ x: number; y: number }|null>(null);

// 从Store里解构目标蒙版状态
const { targetMaskMat, analysisRegion, regionMode } = storeToRefs(analysisStore);

// ==========================================
// 3. Canvas 和选框相关状态
// ==========================================
const containerRef = ref<HTMLDivElement | null>(null);
const imageCanvasRef = ref<HTMLCanvasElement | null>(null);
const maskCanvasRef = ref<HTMLCanvasElement | null>(null);
const targetMaskCanvasRef = ref<HTMLCanvasElement | null>(null);

// 选框状态
const isDragging = ref<boolean>(false);
const startPoint = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const tempRegion = ref<AnalysisRegion>({ x: 0, y: 0, width: 0, height: 0 });

// 图片缩放和偏移
const scale = ref(1);
const imageScale = ref<number>(1.0);
const imageOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 });
// 图片在Canvas上的实际绘制参数，和蒙版绘制100%同步
const imageDrawParams = ref({
    drawX: 0,
    drawY: 0,
    drawWidth: 0,
    drawHeight: 0
});

const SCALE_STEP = 0.1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

// 容器尺寸变化监听
let resizeObserver: ResizeObserver | null = null;

// ==========================================
// 4. 核心方法
// ==========================================

/**
 * 初始化 Canvas 尺寸
 */
const initCanvasSize = async () => {
    await nextTick();
    await nextTick();
    
    if (!containerRef.value || !imageCanvasRef.value || !maskCanvasRef.value || !targetMaskCanvasRef.value) return;

    const containerWidth = containerRef.value.clientWidth || containerRef.value.offsetWidth || 800;
    const containerHeight = containerRef.value.clientHeight || containerRef.value.offsetHeight || 600;

    if (containerWidth === 0 || containerHeight === 0) {
        setTimeout(initCanvasSize, 100);
        return;
    }

    // 所有Canvas尺寸统一，和容器完全一致
    imageCanvasRef.value.width = containerWidth;
    imageCanvasRef.value.height = containerHeight;
    maskCanvasRef.value.width = containerWidth;
    maskCanvasRef.value.height = containerHeight;
    targetMaskCanvasRef.value.width = containerWidth;
    targetMaskCanvasRef.value.height = containerHeight;

    if (processedImageDataUrl.value) {
        drawImage();
    }
};

/**
 * 绘制图片到 Canvas
 */
const drawImage = () => {
    if (!imageCanvasRef.value || !processedImageDataUrl.value) return;

    const canvas = imageCanvasRef.value;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.crossOrigin = 'anonymous';
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;

        // 计算图片在Canvas上的实际绘制位置和尺寸，和蒙版完全同步
        let drawWidth, drawHeight, drawX, drawY;
        if (imgRatio > canvasRatio) {
            drawWidth = canvas.width * scale.value;
            drawHeight = (canvas.width / imgRatio) * scale.value;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height * scale.value;
            drawWidth = (canvas.height * imgRatio) * scale.value;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = (canvas.height - drawHeight) / 2;
        }

        // 保存绘制参数，给蒙版绘制复用
        imageDrawParams.value = { drawX, drawY, drawWidth, drawHeight };
        imageScale.value = drawWidth / img.width;
        imageOffset.value = { x: drawX, y: drawY };

        // 绘制图片
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        drawRegionMask();
        drawTargetMask(); // 图片绘制完成后，同步绘制蒙版
    };

    img.src = processedImageDataUrl.value;
};

/**
 * 绘制蓝色分析区域蒙版
 */
const drawRegionMask = () => {
    if (!maskCanvasRef.value) return;

    const canvas = maskCanvasRef.value;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 绘制蓝色分析区域
    if (regionMode.value === 'rect' && analysisRegion.value.width > 0) {
        const region = analysisRegion.value;
        const canvasX = region.x * imageScale.value + imageOffset.value.x;
        const canvasY = region.y * imageScale.value + imageOffset.value.y;
        const canvasW = region.width * imageScale.value;
        const canvasH = region.height * imageScale.value;

        ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
        ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);
    }

    // 2. 绘制临时选框
    if (isDragging.value && tempRegion.value.width > 0) {
        const region = tempRegion.value;
        const canvasX = region.x * imageScale.value + imageOffset.value.x;
        const canvasY = region.y * imageScale.value + imageOffset.value.y;
        const canvasW = region.width * imageScale.value;
        const canvasH = region.height * imageScale.value;

        ctx.fillStyle = 'rgba(0, 100, 255, 0.2)';
        ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
        ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);
        ctx.setLineDash([]);
    }
};

/**
 * 绘制红色目标蒙版，和岩石图片对齐
 */
const drawTargetMask = () => {
    // 安全校验
    if (!targetMaskCanvasRef.value || !targetMaskMat.value || targetMaskMat.value.empty()) {
        // 蒙版为空时，清空画布
        if (targetMaskCanvasRef.value) {
            const ctx = targetMaskCanvasRef.value.getContext('2d')!;
            ctx.clearRect(0, 0, targetMaskCanvasRef.value.width, targetMaskCanvasRef.value.height);
        }
        return;
    }

    const canvas = targetMaskCanvasRef.value;
    const ctx = canvas.getContext('2d')!;
    const { drawX, drawY, drawWidth, drawHeight } = imageDrawParams.value;

    // 1. 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 创建临时Canvas，绘制OpenCV的蒙版
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetMaskMat.value.cols;
    tempCanvas.height = targetMaskMat.value.rows;
    cv.imshow(tempCanvas, targetMaskMat.value);

    // 3.把蒙版绘制到和岩石图片完全一致的位置、尺寸
    ctx.drawImage(
        tempCanvas,
        drawX,    
        drawY,   
        drawWidth,
        drawHeight
    );
    drawCalibrateLine()
};

/**
 * 坐标转换
 */
const canvasToImageCoords = (canvasX: number, canvasY: number): { x: number; y: number } => {
    const x = (canvasX - imageOffset.value.x) / imageScale.value;
    const y = (canvasY - imageOffset.value.y) / imageScale.value;
    return { x, y };
};

// ==========================================
// 【追加】校准模式下的鼠标事件处理
// ==========================================
/**
 * 处理校准模式的点击事件
 */
const handleCalibrateClick=(canvasX:number,canvasY:number)=>{
    //非校准模式,直接返回
    if(!isCalibrating.value){
        return
    }
    //用现有的坐标准换函数
    const imageCoords = canvasToImageCoords(canvasX, canvasY);

    //没有起点,设置起点
    if(!calibrateStartPoint.value){
        imageStore.setCalibrateStart({x:imageCoords.x,y:imageCoords.y});
    }
    //有起点，设置终点,完成校准
    else if(!calibrateEndPoint.value){
        imageStore.setCalibrateEnd({x:imageCoords.x,y:imageCoords.y});
    }
}
/**
 * 处理校准模式的鼠标移动事件
 */
const handleCalibrateMouseMove=(canvasX:number,canvasY:number)=>{
    if(!isCalibrating.value){
        return
    }
    const imageCoords=canvasToImageCoords(canvasX,canvasY);
    currentCalibrateMousePos.value={x:imageCoords.x,y:imageCoords.y};
}
/**
 * 处理校准模式的鼠标离开事件
 */
const handleCalibrateMouseLeave=()=>{
    currentCalibrateMousePos.value=null
}
// ==========================================
// 【追加】 校准线绘制函数
// ==========================================
/**
 * 绘制校准线（在最上层的 targetMaskCanvas 上绘制，不会被遮挡）
 */
const drawCalibrateLine=()=>{
    if(!targetMaskCanvasRef.value||!isCalibrating.value){
        return
    }
    const canvas = targetMaskCanvasRef.value
    const ctx = canvas.getContext('2d')!
    const { drawX, drawY, drawWidth, drawHeight } = imageDrawParams.value

    // 先保存当前的绘图状态
    ctx.save()

    // 设置校准线的样式：蓝色虚线，醒目不遮挡图片
    ctx.strokeStyle = '#409eff'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 5])
    ctx.fillStyle = '#409eff'

    // 把图片坐标转换回Canvas坐标（适配缩放和偏移）
    const imageToCanvas = (imgX: number, imgY: number) => {
        return {
        x: imgX * imageScale.value + imageOffset.value.x,
        y: imgY * imageScale.value + imageOffset.value.y
        }
      }
        // 1. 绘制起点
      if (calibrateStartPoint.value) {
        const startCanvas = imageToCanvas(calibrateStartPoint.value.x, calibrateStartPoint.value.y)
        
        // 画起点的实心圆
        ctx.beginPath()
        ctx.arc(startCanvas.x, startCanvas.y, 6, 0, Math.PI * 2)
        ctx.fill()

        // 2. 绘制「起点到当前鼠标」的实时预览线
        if (currentCalibrateMousePos.value && !calibrateEndPoint.value) {
        const mouseCanvas = imageToCanvas(currentCalibrateMousePos.value.x, currentCalibrateMousePos.value.y)
        ctx.beginPath()
        ctx.moveTo(startCanvas.x, startCanvas.y)
        ctx.lineTo(mouseCanvas.x, mouseCanvas.y)
        ctx.stroke()
        }
    }

        // 3. 绘制完整的校准线和终点
       if (calibrateStartPoint.value && calibrateEndPoint.value) {
        const startCanvas = imageToCanvas(calibrateStartPoint.value.x, calibrateStartPoint.value.y)
        const endCanvas = imageToCanvas(calibrateEndPoint.value.x, calibrateEndPoint.value.y)

        // 画校准线
        ctx.beginPath()
        ctx.moveTo(startCanvas.x, startCanvas.y)
        ctx.lineTo(endCanvas.x, endCanvas.y)
        ctx.stroke()

        // 画终点的实心圆
        ctx.beginPath()
        ctx.arc(endCanvas.x, endCanvas.y, 6, 0, Math.PI * 2)
        ctx.fill()
    }

    // 恢复之前的绘图状态
    ctx.restore()
}
// ==========================================
// 5. 鼠标事件处理
// ==========================================
const handleMouseDown = (e: MouseEvent) => {
      // 校准模式下，优先处理校准点击，禁用局部选框
    if (isCalibrating.value) {
        const rect = imageCanvasRef.value!.getBoundingClientRect()
        const canvasX = e.clientX - rect.left
        const canvasY = e.clientY - rect.top
        handleCalibrateClick(canvasX, canvasY)
        return // 直接返回，不执行后续的局部选框逻辑
    }
    if (regionMode.value !== 'rect' || !isImageLoaded.value) return;
    isDragging.value = true;
    analysisStore.isSelectingRegion = true;

    const rect = imageCanvasRef.value!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    startPoint.value = { x: imageCoords.x, y: imageCoords.y };
    tempRegion.value = { x: imageCoords.x, y: imageCoords.y, width: 0, height: 0 };
};

const handleMouseMove = (e: MouseEvent) => {
      // 校准模式下，处理鼠标移动
    if (isCalibrating.value) {
        const rect = imageCanvasRef.value!.getBoundingClientRect()
        const canvasX = e.clientX - rect.left
        const canvasY = e.clientY - rect.top
        handleCalibrateMouseMove(canvasX, canvasY)
        drawCalibrateLine() // 实时重绘校准线
        return
    }
    if (!isDragging.value) return;

    const rect = imageCanvasRef.value!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    const x = Math.min(startPoint.value.x, imageCoords.x);
    const y = Math.min(startPoint.value.y, imageCoords.y);
    const width = Math.abs(imageCoords.x - startPoint.value.x);
    const height = Math.abs(imageCoords.y - startPoint.value.y);

    tempRegion.value = { x, y, width, height };
    drawRegionMask();
};

const handleMouseUp = () => {
     // 校准模式下，清空预览坐标
    if (isCalibrating.value) {
        handleCalibrateMouseLeave()
        drawCalibrateLine()
        return
    }
    if (!isDragging.value) return;
    isDragging.value = false;
    analysisStore.isSelectingRegion = false;

    if (tempRegion.value.width > 5 && tempRegion.value.height > 5) {
        analysisStore.setAnalysisRegion(tempRegion.value);
    }

    tempRegion.value = { x: 0, y: 0, width: 0, height: 0 };
    drawRegionMask();
};

const handleImageZoom = (e: WheelEvent) => {
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    const newScale = scale.value + delta;
    if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
        scale.value = newScale;
        drawImage();
    }
};

// ==========================================
// 6. 监听
// ==========================================
watch(() => processedImageDataUrl.value, () => {
    if (processedImageDataUrl.value) {
        initCanvasSize().then(() => {
            drawImage();
        });
    }
});

watch(() => analysisStore.analysisRegion, () => {
    drawRegionMask();
}, { deep: true });

watch(() => analysisStore.regionMode, () => {
    drawRegionMask();
});

// 监听目标蒙版变化，实时重绘
watch(targetMaskMat, () => {
    drawTargetMask();
});

// 监听缩放变化，同步重绘蒙版
watch(scale, () => {
    drawTargetMask();
});

//监听校准状态变化，重绘校准线
watch([isCalibrating, calibrateStartPoint, calibrateEndPoint], () => {
  drawTargetMask() // 重绘时会自动调用 drawCalibrateLine
})
// ==========================================
// 7. 生命周期
// ==========================================
onMounted(async () => {
    await imageStore.initOpenCV();
    setTimeout(initCanvasSize, 200);
    
    if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
            initCanvasSize();
        });
        resizeObserver.observe(containerRef.value);
    }
});

onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    // 组件卸载时释放蒙版内存
    if (targetMaskMat.value) {
        targetMaskMat.value.delete();
    }
    window.removeEventListener('resize', initCanvasSize);
});
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

.empty-state {
    text-align: center;
    color: #909399;
}

.empty-text {
    margin-top: 16px;
    font-size: 16px;
}

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

.canvas-wrapper {
    position: relative;
    width: 100%;
    height: 85%;
    background-color: #2b2b2b;
    border: 1px solid #dcdfe6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
}

.image-canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    cursor: crosshair;
}

.mask-canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
}

.region-mask {
    z-index: 2;
}

.target-mask {
    z-index: 3;
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