<template>
  <div v-if="holeList.length > 0" class="distribution-chart" :style="{ height: height + 'px' }">
    <Bar :data="chartData as any" :options="chartOptions as any" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarController, LineController,
  BarElement, LineElement, PointElement,
  Title, Tooltip, Legend,
} from 'chart.js'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useImageStore } from '@/stores/imageStore'

const props = withDefaults(defineProps<{ height?: number }>(), { height: 260 })

ChartJS.register(CategoryScale, LinearScale, BarController, LineController, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

const analysisStore = useAnalysisStore()
const imageStore = useImageStore()

const holeList = computed(() => analysisStore.holeResults.holeList)
const unitScale = computed(() => imageStore.scaleType === 'macro' ? 1 : 1000)
const unit = computed(() => imageStore.scaleType === 'macro' ? 'mm' : 'μm')

// erf 近似函数（正态分布 CDF 核心计算）
const erf = (x: number): number => {
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return sign * y
}

// 动态分桶：10~15 个区间，范围 0 到最大直径
const bins = computed(() => {
  const diameters = holeList.value.map(h => h.diameter * unitScale.value)
  if (diameters.length === 0) return { labels: [], counts: [], highs: [] }
  const maxD = Math.ceil(Math.max(...diameters) * 10) / 10
  const binCount = Math.min(15, Math.max(8, Math.ceil(diameters.length / 15)))
  const binWidth = Math.ceil((maxD / binCount) * 10) / 10
  const labels: string[] = []
  const counts: number[] = []
  const highs: number[] = []
  for (let i = 0; i < binCount; i++) {
    const low = +(i * binWidth).toFixed(1)
    const high = +((i + 1) * binWidth).toFixed(1)
    labels.push(`${low}-${high}`)
    counts.push(diameters.filter(d => d >= low && d < (i === binCount - 1 ? Infinity : high)).length)
    highs.push(high)
  }
  return { labels, counts, highs }
})

const chartData = computed(() => {
  const { labels, counts, highs } = bins.value
  const diameters = holeList.value.map(h => h.diameter * unitScale.value)
  const total = counts.reduce((a, b) => a + b, 0)
  let cumSum = 0
  const cumulative = counts.map(c => {
    cumSum += c
    return +((cumSum / total) * 100).toFixed(1)
  })

  // 正态分布拟合：CDF 在区间上界求值，与经验累计对比一致
  const mean = diameters.reduce((a, b) => a + b, 0) / diameters.length
  const variance = diameters.reduce((s, d) => s + (d - mean) ** 2, 0) / diameters.length
  const std = Math.sqrt(variance)
  const normalCdf = std > 0
    ? highs.map(h => +((0.5 * (1 + erf((h - mean) / (std * Math.sqrt(2))))) * 100).toFixed(1))
    : highs.map(h => h >= mean ? 100 : 0)

  return {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: `孔洞数量（个）`,
        data: counts,
        backgroundColor: 'rgba(64, 158, 255, 0.5)',
        borderColor: '#409EFF',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: '实际累计（%）',
        data: cumulative,
        borderColor: '#F56C6C',
        backgroundColor: 'rgba(245, 108, 108, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        type: 'line' as const,
        label: '正态累计（%）',
        data: normalCdf,
        borderColor: '#67C23A',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        label: (ctx: any) => ctx.datasetIndex === 0
          ? `数量: ${ctx.raw} 个`
          : `累计: ${ctx.raw}%`,
      },
    },
  },
  scales: {
    x: { title: { display: true, text: `直径区间（${unit.value}）`, font: { size: 11 } } },
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      title: { display: true, text: '孔洞数量（个）', font: { size: 11 } },
      beginAtZero: true,
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      title: { display: true, text: '累计百分比（%）', font: { size: 11 } },
      min: 0, max: 100,
      grid: { drawOnChartArea: false },
    },
  },
}))
</script>

<style scoped>
.distribution-chart {
  padding: 12px 8px 8px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}
</style>
