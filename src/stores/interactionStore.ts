// ----
// 画布交互 Store：悬停 / 定位 / 点击选中 × 孔洞 / 裂缝 / 颗粒
// 纯 ref 状态，不依赖其他 store。computed 逻辑在 useCanvasInteraction 中
// ----
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useInteractionStore = defineStore('interaction', () => {
  // ----
  // 孔洞 — 悬停（鼠标在画布上移动时触发，mouseleave 后清除）
  // ----
  const hoveredHoleIndex = ref<number | null>(null)
  const hoveredHoleInfo = ref<{
    index: number
    diameter: number
    area: number
    centerX: number
    centerY: number
  } | null>(null)
  /** 设置悬停孔洞信息（由 useCanvasInteraction.detectHoveredItemAt 调用） */
  const setHoveredHoleInfo = (info: typeof hoveredHoleInfo.value) => {
    hoveredHoleInfo.value = info
    hoveredHoleIndex.value = info ? info.index : null
  }
  /** 清除悬停孔洞状态（鼠标离开或移到空白处时调用） */
  const clearHoveredHole = () => {
    hoveredHoleInfo.value = null
    hoveredHoleIndex.value = null
  }

  // ----
  // 孔洞 — 定位（详情弹窗中点击"定位"按钮触发，持久保持直到手动取消）
  // ----
  const locatedHoleIndex = ref<number | null>(null)
  const locatedHoleInfo = ref<{
    index: number
    diameter: number
    area: number
    centerX: number
    centerY: number
  } | null>(null)
  /** 设置定位孔洞（由 HoleDetailDialog.locateHole 调用） */
  const setLocatedHole = (info: NonNullable<typeof locatedHoleInfo.value>) => {
    locatedHoleInfo.value = info
    locatedHoleIndex.value = info.index
  }
  /** 清除定位孔洞（Tooltip 上的"取消定位"按钮或画布其他操作触发） */
  const clearLocatedHole = () => {
    locatedHoleInfo.value = null
    locatedHoleIndex.value = null
  }

  // ----
  // 孔洞 — 点击选中（画布上点击孔洞蒙版时触发，弹出属性编辑卡片）
  // ----
  const selectedHoleIndex = ref<number | null>(null)
  /** 选中指定序号的孔洞（由 useCanvasInteraction.trySelectItemAt 调用） */
  const selectHole = (index: number) => {
    selectedHoleIndex.value = index
  }
  /** 清除孔洞选中（卡片关闭按钮或点击空白处时调用） */
  const clearHoleSelection = () => {
    selectedHoleIndex.value = null
  }

  // ----
  // 裂缝 — 悬停
  // ----
  const hoveredCrackIndex = ref<number | null>(null)
  const hoveredCrackInfo = ref<{
    index: number
    length: number
    width: number
    centerX: number
    centerY: number
  } | null>(null)
  /** 设置悬停裂缝信息 */
  const setHoveredCrackInfo = (info: typeof hoveredCrackInfo.value) => {
    hoveredCrackInfo.value = info
    hoveredCrackIndex.value = info ? info.index : null
  }
  /** 清除悬停裂缝状态 */
  const clearHoveredCrack = () => {
    hoveredCrackInfo.value = null
    hoveredCrackIndex.value = null
  }

  // ----
  // 裂缝 — 定位（详情弹窗中点击"定位"按钮触发）
  // ----
  const locatedCrackIndex = ref<number | null>(null)
  const locatedCrackInfo = ref<{
    index: number
    length: number
    width: number
    centerX: number
    centerY: number
  } | null>(null)
  /** 设置定位裂缝（由 CrackDetailDialog.locateCrack 调用） */
  const setLocatedCrack = (info: NonNullable<typeof locatedCrackInfo.value>) => {
    locatedCrackInfo.value = info
    locatedCrackIndex.value = info.index
  }
  /** 清除定位裂缝 */
  const clearLocatedCrack = () => {
    locatedCrackInfo.value = null
    locatedCrackIndex.value = null
  }

  // ----
  // 裂缝 — 点击选中
  // ----
  const selectedCrackIndex = ref<number | null>(null)
  /** 选中指定序号的裂缝 */
  const selectCrack = (index: number) => {
    selectedCrackIndex.value = index
  }
  /** 清除裂缝选中 */
  const clearCrackSelection = () => {
    selectedCrackIndex.value = null
  }

  // ----
  // 颗粒 — 悬停
  // ----
  const hoveredParticleIndex = ref<number | null>(null)
  const hoveredParticleInfo = ref<{
    index: number
    diameter: number
    area: number
    centerX: number
    centerY: number
  } | null>(null)
  /** 设置悬停颗粒信息 */
  const setHoveredParticleInfo = (info: typeof hoveredParticleInfo.value) => {
    hoveredParticleInfo.value = info
    hoveredParticleIndex.value = info ? info.index : null
  }
  /** 清除悬停颗粒状态 */
  const clearHoveredParticle = () => {
    hoveredParticleInfo.value = null
    hoveredParticleIndex.value = null
  }

  // ----
  // 颗粒 — 定位（详情弹窗中点击"定位"按钮触发）
  // ----
  const locatedParticleIndex = ref<number | null>(null)
  const locatedParticleInfo = ref<{
    index: number
    diameter: number
    area: number
    centerX: number
    centerY: number
  } | null>(null)
  /** 设置定位颗粒（由 ParticleDetailDialog.locateParticle 调用） */
  const setLocatedParticle = (info: NonNullable<typeof locatedParticleInfo.value>) => {
    locatedParticleInfo.value = info
    locatedParticleIndex.value = info.index
  }
  /** 清除定位颗粒 */
  const clearLocatedParticle = () => {
    locatedParticleInfo.value = null
    locatedParticleIndex.value = null
  }

  // ----
  // 颗粒 — 点击选中
  // ----
  const selectedParticleIndex = ref<number | null>(null)
  /** 选中指定序号的颗粒 */
  const selectParticle = (index: number) => {
    selectedParticleIndex.value = index
  }
  /** 清除颗粒选中 */
  const clearParticleSelection = () => {
    selectedParticleIndex.value = null
  }

  // ----
  // 全部清除（analysisStore.resetAll 调用，用于重置分析时清空所有交互状态）
  // ----
  const resetAll = () => {
    clearHoveredHole()
    clearHoveredCrack()
    clearHoveredParticle()
    clearLocatedHole()
    clearLocatedCrack()
    clearLocatedParticle()
    clearHoleSelection()
    clearCrackSelection()
    clearParticleSelection()
  }

  return {
    hoveredHoleIndex, hoveredHoleInfo, setHoveredHoleInfo, clearHoveredHole,
    locatedHoleIndex, locatedHoleInfo, setLocatedHole, clearLocatedHole,
    selectedHoleIndex, selectHole, clearHoleSelection,
    hoveredCrackIndex, hoveredCrackInfo, setHoveredCrackInfo, clearHoveredCrack,
    locatedCrackIndex, locatedCrackInfo, setLocatedCrack, clearLocatedCrack,
    selectedCrackIndex, selectCrack, clearCrackSelection,
    hoveredParticleIndex, hoveredParticleInfo, setHoveredParticleInfo, clearHoveredParticle,
    locatedParticleIndex, locatedParticleInfo, setLocatedParticle, clearLocatedParticle,
    selectedParticleIndex, selectParticle, clearParticleSelection,
    resetAll,
  }
})
