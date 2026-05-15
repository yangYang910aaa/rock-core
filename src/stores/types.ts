// ----
// 岩心分析项目公用类型定义
// 从 analysisStore 拆分，供所有 store 和外部模块引用
// ----

// ----
// 分析模式 & 区域
// ----
// 分析模式：孔洞 / 裂缝 / 粒度
export type AnalysisMode = 'hole' | 'crack' | 'size'
// 分析区域：全图分析或矩形局部分析
export type RegionMode = 'full' | 'rect'

// ----
// 有效性 & 充填物
// ----
// 孔洞/裂缝/颗粒的有效性评价（逐条标注）
export type ValidityType = 'effective' | 'semiEffective' | 'ineffective' | ''
// 孔洞/裂缝/颗粒的充填物类型（逐条标注）
export type FillingMaterial = 'mud' | 'calcite' | 'dolomite' | 'asphalt' | 'gypsum' | 'pyrite' | 'kaolinite' | 'quartz' | ''

// ----
// 分析区域（图像像素坐标，用于局部分析模式的 ROI 裁剪）
// ----
export interface AnalysisRegion {
  x: number      // 左上角 X
  y: number      // 左上角 Y
  width: number  // 区域宽度（px）
  height: number // 区域高度（px）
}

// ----
// 阈值（孔洞 / 裂缝 / 粒度）
// ----
// 孔洞分割：灰度 inRange 范围
export interface HoleThreshold {
  minThreshold: number // 灰度下限 0-255
  maxThreshold: number // 灰度上限 0-255
}

// 裂缝分割：Canny 边缘检测 + 形态学后处理
export interface CrackThreshold {
  minWidth: number   // 最小裂缝宽度 mm
  maxWidth: number   // 最大裂缝宽度 mm
  minLength: number  // 最小裂缝长度 mm（短于此值的轮廓被丢弃）
  cannyLow: number   // Canny 低阈值
  cannyHigh: number  // Canny 高阈值
}

// 粒度分割：DoG 纹理分析 + 距离变换分离
export interface ParticleThreshold {
  rockBrightnessThreshold: number // 灰度二值化阈值，低于此值为空隙
  coarseSensitivity: number       // 粗颗粒灵敏度（大尺度高斯模糊核大小）
  fineSensitivity: number         // 细颗粒灵敏度（小尺度高斯模糊核大小）
}

// ----
// 单条详情 & 分析结果（孔洞 / 裂缝 / 粒度）
// ----
// 单个孔洞详情（store 中逐孔存储，可通过弹窗或画布编辑）
export interface HoleInfo {
  index: number                                    // 序号，从 1 开始
  diameter: number                                 // 等效直径 mm
  area: number                                     // 面积 mm²
  centerX: number                                  // 孔洞中心 X（图像像素坐标）
  centerY: number                                  // 孔洞中心 Y（图像像素坐标）
  category: 'large' | 'medium' | 'small' | 'pinhole' // 分类：>10mm 大洞 / 5-10 中洞 / 1-5 小洞 / <1 针孔
  validity: ValidityType                           // 逐孔有效性评价
  fillingMaterial: FillingMaterial                 // 逐孔充填物类型
}

// 孔洞分析聚合结果（统计面板 + 报告使用）
export interface HoleResults {
  totalCount: number   // 孔洞总数
  totalArea: number    // 孔洞总面积 mm²
  avgDiameter: number  // 平均孔径 mm
  maxDiameter: number  // 最大孔径 mm
  minDiameter: number  // 最小孔径 mm
  faceRate: number     // 面孔率 %
  largeCount: number   // 大洞个数 >10mm
  mediumCount: number  // 中洞个数 5-10mm
  smallCount: number   // 小洞个数 1-5mm
  pinholeCount: number // 针孔/溶孔个数 <1mm
  holeList: HoleInfo[] // 逐孔详情列表（弹窗表格和报告的数据源）
}

// 单个裂缝详情
export interface CrackInfo {
  index: number                  // 序号，从 1 开始
  length: number                 // 裂缝长度 mm
  width: number                  // 裂缝宽度 mm（最小外接矩形短边）
  area: number                   // 裂缝面积 mm²
  centerX: number                // 裂缝中心 X（图像像素坐标）
  centerY: number                // 裂缝中心 Y（图像像素坐标）
  validity: ValidityType         // 逐条有效性评价
  fillingMaterial: FillingMaterial // 逐条充填物类型
}

// 裂缝分析聚合结果
export interface CrackResults {
  totalCount: number     // 裂缝总条数
  totalLength: number    // 裂缝总长度 mm
  avgWidth: number       // 平均宽度 mm
  faceRate: number       // 裂缝面孔率 %
  lineDensity: number    // 线密度 条/m（宏观）或 条/mm（微观）
  areaDensity: number    // 面密度 mm/mm² 或 μm/μm²
  crackList: CrackInfo[] // 逐条裂缝详情列表
}

// 单个颗粒详情
export interface ParticleInfo {
  index: number                  // 序号，从 1 开始
  diameter: number               // 等效粒径 mm
  area: number                   // 面积 mm²
  centerX: number                // 颗粒中心 X（图像像素坐标）
  centerY: number                // 颗粒中心 Y（图像像素坐标）
  validity: ValidityType         // 逐粒有效性评价
  fillingMaterial: FillingMaterial // 逐粒充填物类型
}

// 粒度分析聚合结果
export interface ParticleResults {
  totalParticleCount: number   // 颗粒总数
  avgParticleSize: number      // 平均粒径 mm
  coarseParticleRatio: number  // 粗颗粒占比 %（>0.5mm）
  fineParticleRatio: number    // 细颗粒占比 %（<0.3mm）
  particleUniformity: number   // 颗粒均匀度（变异系数的倒数，越大越均匀）
  rockParticleRate: number     // 岩石颗粒占比 %（颗粒面积/岩石实体面积）
  particleList: ParticleInfo[] // 逐粒详情列表
}

// ----
// 岩心基础信息（报告表头数据源）
// ----
export interface CoreBasicInfo {
  wellNo: string     // 井号
  wellDepth: string  // 井深
  horizon: string    // 层位
  lithology: string  // 岩性
  sampleDate: string // 取样日期
}
