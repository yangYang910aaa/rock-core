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
    processedImageDataUrl
} = storeToRefs(imageStore);

// 【关键修改】从Store里解构目标蒙版状态
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

    // 所有Canvas尺寸统一
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

        imageScale.value = drawWidth / img.width;
        imageOffset.value = { x: drawX, y: drawY };

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        drawRegionMask();
        drawTargetMask();
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
 * 绘制红色目标蒙版
 */
const drawTargetMask = () => {
    if (!targetMaskCanvasRef.value || !targetMaskMat.value || targetMaskMat.value.empty()) return;

    const canvas = targetMaskCanvasRef.value;
    const ctx = canvas.getContext('2d')!;

    // 清空原有蒙版
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 把OpenCV的蒙版绘制到Canvas上
    cv.imshow(canvas, targetMaskMat.value);

    // 应用图片缩放和偏移，和原图保持一致
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(
        canvas,
        imageOffset.value.x,
        imageOffset.value.y,
        canvas.width * imageScale.value * scale.value,
        canvas.height * imageScale.value * scale.value
    );
    ctx.globalCompositeOperation = 'source-over';
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
// 5. 鼠标事件处理
// ==========================================
const handleMouseDown = (e: MouseEvent) => {
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

// ==========================================
// 7. 生命周期
// ==========================================
onMounted(async () => {
    await imageStore.initOpenCV();
    setTimeout(initCanvasSize, 200);
    
    if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
            console.log('📐 容器尺寸变化，重新初始化 Canvas');
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