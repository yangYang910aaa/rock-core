<template>
    <div class="image-canvas-wrapper">
        <!-- 空状态提示 -->
        <div class="empty-state" v-if="!isImageLoaded">
            <el-icon size="64" color="#909399"><PictureFilled/></el-icon>
            <p class="empty-text">请点击顶部[文件]菜单打开岩心图片</p>
        </div>

        <!-- 图片显示区域 -->
        <div class="image-container" v-else>
            <!-- 双层 Canvas 容器（用于选框和蒙版） -->
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
                <!-- 上层 Canvas：显示蒙版 -->
                <canvas
                    ref="maskCanvasRef"
                    class="mask-canvas"
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

// ==========================================
// 3. Canvas 和选框相关状态
// ==========================================
const containerRef = ref<HTMLDivElement | null>(null);
const imageCanvasRef = ref<HTMLCanvasElement | null>(null);
const maskCanvasRef = ref<HTMLCanvasElement | null>(null);

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
    await nextTick(); // 确保 DOM 更新
    await nextTick(); // 双重 nextTick，确保布局完全渲染
    
    if (!containerRef.value || !imageCanvasRef.value || !maskCanvasRef.value) return;

    // 获取容器尺寸，增加安全检查
    const containerWidth = containerRef.value.clientWidth || containerRef.value.offsetWidth || 800;
    const containerHeight = containerRef.value.clientHeight || containerRef.value.offsetHeight || 600;

    // 如果尺寸还是 0，延迟重试
    if (containerWidth === 0 || containerHeight === 0) {
        setTimeout(initCanvasSize, 100);
        return;
    }

    // 设置 Canvas 尺寸
    imageCanvasRef.value.width = containerWidth;
    imageCanvasRef.value.height = containerHeight;
    maskCanvasRef.value.width = containerWidth;
    maskCanvasRef.value.height = containerHeight;


    // 重新绘制图片
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
        // 清空 Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 计算图片缩放比例和偏移量（保持图片比例）
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

        // 绘制图片
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // 绘制蒙版
        drawMask();
    };

    img.src = processedImageDataUrl.value;
};

/**
 * 绘制蒙版
 */
const drawMask = () => {
    if (!maskCanvasRef.value) return;

    const canvas = maskCanvasRef.value;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 绘制蓝色分析区域
    if (analysisStore.regionMode === 'rect' && analysisStore.analysisRegion.width > 0) {
        const region = analysisStore.analysisRegion;
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
// 鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
    if (analysisStore.regionMode !== 'rect' || !isImageLoaded.value) return;
    isDragging.value = true;
    analysisStore.isSelectingRegion = true;

    const rect = imageCanvasRef.value!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    startPoint.value = { x: imageCoords.x, y: imageCoords.y };
    tempRegion.value = { x: imageCoords.x, y: imageCoords.y, width: 0, height: 0 };
};

// 鼠标移动事件
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
    drawMask();
};

// 鼠标松开事件
const handleMouseUp = () => {
    if (!isDragging.value) return;
    isDragging.value = false;
    analysisStore.isSelectingRegion = false;

    if (tempRegion.value.width > 5 && tempRegion.value.height > 5) {
        analysisStore.setAnalysisRegion(tempRegion.value);
    }

    tempRegion.value = { x: 0, y: 0, width: 0, height: 0 };
    drawMask();
};

// 鼠标滚轮事件
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

// 监听图片变化，强制重绘
watch(() => processedImageDataUrl.value, () => {
    if (processedImageDataUrl.value) {
        initCanvasSize().then(() => {
            drawImage();
        });
    }
});

watch(() => analysisStore.analysisRegion, () => {
    drawMask();
}, { deep: true });

watch(() => analysisStore.regionMode, () => {
    drawMask();
});

// ==========================================
// 7. 生命周期
// ==========================================
onMounted(async () => {
    // 初始化 OpenCV
    await imageStore.initOpenCV();
    
    // 延迟初始化 Canvas，确保布局完全渲染
    setTimeout(initCanvasSize, 200);
    
    // 用 ResizeObserver 替代 window.resize，精准监听容器尺寸
    if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
            console.log('📐 容器尺寸变化，重新初始化 Canvas');
            initCanvasSize();
        });
        resizeObserver.observe(containerRef.value);
    }
});

onUnmounted(() => {
    // 清理 ResizeObserver
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

/* 新增：Canvas 容器样式 */
.canvas-wrapper {
    position: relative;
    width: 100%;
    height: 85%; /* 留出空间给信息栏 */
    background-color: #2b2b2b; /* 深色背景，方便看图片 */
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
    cursor: crosshair; /* 十字光标，方便选框 */
}

.mask-canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    pointer-events: none; /* 蒙版不拦截鼠标事件 */
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