import ExcelJS from 'exceljs';
import {saveAs} from 'file-saver';
import type {HoleResults,CrackResults,SizeResults,CoreBasicInfo} from '@/stores/analysisStore';
/**
 * 分析参数
 */
interface AnalysisParams{
    fillingMaterial: any;
    validity: any;
    mode:'hole'|'crack'|'size'
    regionMode:'full'|'rect'
    scaleType:'macro'|'micro'
    threshold:any
}
/**
 * 生成Excel报告
 */
export const exportToExcel = async (
  basicInfo: CoreBasicInfo,
  params: AnalysisParams,
  results: HoleResults | CrackResults | SizeResults
) => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('岩心分析报告')

  // 1. 设置列宽：A/B 兼顾主内容（标签+值）和逐孔表（序号+直径），不宜过宽
  // C-F 仅用于逐孔详情，按内容长度分配
  worksheet.columns = [
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
  ]

  // 2. 准备通用变量
  let modeName = '' // 模式名，用于标题
  let modeText = '' // 完整模式名，用于正文
  const unit = params.scaleType === 'macro' ? 'mm' : 'μm'
  let currentRow = 1 // 行号计数器，精准控制位置

  // 模式名赋值,彻底避免重复
  if (params.mode === 'hole') {
    modeName = '孔洞'
    modeText = '孔洞分析'
  } else if (params.mode === 'crack') {
    modeName = '裂缝'
    modeText = '裂缝分析'
  } else {
    modeName = '粒度'
    modeText = '粒度分析'
  }

  // 3. 主标题（合并单元格 + 蓝色加粗居中）
  const titleCell = worksheet.getCell(`A${currentRow}`)
  titleCell.value = `岩心${modeName}分析报告`
  titleCell.font = { bold: true, size: 22, color: { argb: 'FF409EFF' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`)
  worksheet.getRow(currentRow).height = 35
  currentRow++

  // 4. 标题后空行
  currentRow++

  // ==========================================
  // 第一部分：岩心基础信息
  // ==========================================
  const infoTitleRow = currentRow
  const infoTitleCell = worksheet.getCell(`A${infoTitleRow}`)
  infoTitleCell.value = '岩心基础信息'
  infoTitleCell.font = { bold: true, size: 16 }
  infoTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
  worksheet.mergeCells(`A${infoTitleRow}:B${infoTitleRow}`)
  currentRow++

  // 基础信息数据行
  const infoRows = [
    ['井号', basicInfo.wellNo],
    ['井深', basicInfo.wellDepth],
    ['层位', basicInfo.horizon],
    ['岩性', basicInfo.lithology],
    ['取样日期', basicInfo.sampleDate]
  ]
  infoRows.forEach(rowData => {
    const row = worksheet.addRow(rowData)
    // 标签列样式统一
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
    row.getCell(1).font = { bold: true }
    // 所有单元格左对齐+垂直居中
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    currentRow++
  })

  // 基础信息后空行
  currentRow++

  // ==========================================
  // 第二部分：分析参数
  // ==========================================
  const paramTitleRow = currentRow
  const paramTitleCell = worksheet.getCell(`A${paramTitleRow}`)
  paramTitleCell.value = '分析参数'
  paramTitleCell.font = { bold: true, size: 16 }
  paramTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
  worksheet.mergeCells(`A${paramTitleRow}:B${paramTitleRow}`)
  currentRow++

  // 分析参数数据行
  const paramRows = [
    ['分析模式', modeText],
    ['分析范围', params.regionMode === 'full' ? '全图分析' : '局部分析'],
    ['标尺类型', params.scaleType === 'macro' ? '宏观(mm)' : '微观(μm)']
  ]
  // 如果需要，追加属性标注
  if (params.validity) {
    paramRows.push(['有效性评价', validityLabels[params.validity] || params.validity])
  }
  if (params.fillingMaterial) {
    paramRows.push(['充填物类型', fillingMaterialLabels[params.fillingMaterial] || params.fillingMaterial])
  }

  paramRows.forEach(rowData => {
    const row = worksheet.addRow(rowData)
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
    row.getCell(1).font = { bold: true }
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    currentRow++
  })

  // 分析参数后空行
  currentRow++

  // ==========================================
  // 第三部分：统计结果
  // ==========================================
  const resultTitleRow = currentRow
  const resultTitleCell = worksheet.getCell(`A${resultTitleRow}`)
  resultTitleCell.value = '统计结果'
  resultTitleCell.font = { bold: true, size: 16 }
  resultTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
  worksheet.mergeCells(`A${resultTitleRow}:B${resultTitleRow}`)
  currentRow++

  // 统计结果数据行
  let resultRows: any[][] = []
  if (params.mode === 'hole') {
    const res = results as HoleResults
    resultRows = [
      ['孔洞总数', res.totalCount],
      ['孔洞总面积', `${res.totalArea.toFixed(4)} ${unit}²`],
      ['平均孔径', `${res.avgDiameter.toFixed(4)} ${unit}`],
      ['最大孔径', `${res.maxDiameter.toFixed(4)} ${unit}`],
      ['最小孔径', `${res.minDiameter.toFixed(4)} ${unit}`],
      ['面孔率', `${res.faceRate.toFixed(2)} %`],
      ['大洞(>10mm)', `${res.largeCount} 个`],
      ['中洞(5~10mm)', `${res.mediumCount} 个`],
      ['小洞(1~5mm)', `${res.smallCount} 个`],
      ['针孔/溶孔(<1mm)', `${res.pinholeCount} 个`],
    ]
  } else if (params.mode === 'crack') {
    const res = results as CrackResults
    resultRows = [
      ['裂缝条数', res.totalCount],
      ['裂缝总长度', `${res.totalLength.toFixed(4)} ${unit}`],
      ['平均宽度', `${res.avgWidth.toFixed(4)} ${unit}`],
      ['面密度', `${res.areaDensity.toFixed(4)} 条/${unit}²`],
      ['线密度', `${res.lineDensity.toFixed(4)} 条/${unit}`],
      ['面孔率', `${res.faceRate.toFixed(2)} %`]
    ]
  } else {
    const res = results as SizeResults
    resultRows = [
      ['颗粒总数', res.totalParticleCount],
      ['平均粒径', `${res.avgParticleSize.toFixed(4)} ${unit}`],
      ['粗颗粒占比', `${res.coarseParticleRatio.toFixed(2)} %`],
      ['细颗粒占比', `${res.fineParticleRatio.toFixed(2)} %`],
      ['颗粒均匀度', `${res.particleUniformity.toFixed(4)}`],
      ['岩石颗粒占比', `${res.rockParticleRate.toFixed(2)} %`]
    ]
  }

  // 写入统计结果
  resultRows.forEach(rowData => {
    const row = worksheet.addRow(rowData)
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
    row.getCell(1).font = { bold: true }
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    currentRow++
  })

  // 逐孔详情表（仅孔洞模式）
  if (params.mode === 'hole' && (results as any).holeList?.length > 0) {
    currentRow++
    const hlCell = worksheet.getCell(`A${currentRow}`)
    hlCell.value = '孔洞详情'
    hlCell.font = { bold: true, size: 16 }
    hlCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    currentRow++

    const headerRow = worksheet.addRow(['序号', '直径(mm)', '面积(mm²)', '分类', '有效性', '充填物'])
    headerRow.eachCell((c) => {
      c.font = { bold: true }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    currentRow++

    const catL: Record<string,string> = { large:'大洞', medium:'中洞', small:'小洞', pinhole:'针孔/溶孔' }
    const valL: Record<string,string> = { effective:'有效', semiEffective:'较有效', ineffective:'无效' }
    ;(results as any).holeList.forEach((h: any) => {
      const dataRow = worksheet.addRow([h.index, h.diameter.toFixed(3), h.area.toFixed(4), catL[h.category]||'', valL[h.validity]||'', fillingMaterialLabels[h.fillingMaterial]||''])
      // 序号和直径居中，所有列垂直居中
      dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(4).alignment = { vertical: 'middle' }
      dataRow.getCell(5).alignment = { vertical: 'middle' }
      dataRow.getCell(6).alignment = { vertical: 'middle' }
      currentRow++
    })
  }

  // 逐条裂缝详情表（仅裂缝模式）
  if (params.mode === 'crack' && (results as any).crackList?.length > 0) {
    currentRow++
    const clCell = worksheet.getCell(`A${currentRow}`)
    clCell.value = '裂缝详情'
    clCell.font = { bold: true, size: 16 }
    clCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    currentRow++

    const headerRow = worksheet.addRow(['序号', '长度(mm)', '宽度(mm)', '面积(mm²)', '有效性', '充填物'])
    headerRow.eachCell((c) => {
      c.font = { bold: true }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    currentRow++

    const valL: Record<string,string> = { effective:'有效', semiEffective:'较有效', ineffective:'无效' }
    ;(results as any).crackList.forEach((c: any) => {
      const dataRow = worksheet.addRow([c.index, c.length.toFixed(3), c.width.toFixed(3), c.area.toFixed(4), valL[c.validity]||'', fillingMaterialLabels[c.fillingMaterial]||''])
      dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }
      dataRow.getCell(5).alignment = { vertical: 'middle' }
      dataRow.getCell(6).alignment = { vertical: 'middle' }
      currentRow++
    })
  }

  // ==========================================
  // 全局样式统一：所有单元格加边框
  // ==========================================
  const lastRow = worksheet.lastRow?.number || 1
  for (let i = 1; i <= lastRow; i++) {
    const row = worksheet.getRow(i)
    row.eachCell(cell => {
      // 统一边框
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      // 所有单元格垂直居中
      cell.alignment = { ...cell.alignment, vertical: 'middle' }
    })
  }

  // ==========================================
  // 导出文件
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `岩心${modeName}分析报告_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// 有效性评价 + 充填物类型的显示标签映射
const validityLabels: Record<string, string> = {
  effective: '有效（未充填）',
  semiEffective: '较有效（半充填）',
  ineffective: '无效（全充填）',
}

const fillingMaterialLabels: Record<string, string> = {
  mud: '泥质',
  calcite: '方解石',
  dolomite: '白云石',
  asphalt: '沥青',
  gypsum: '石膏',
  pyrite: '黄铁矿',
  kaolinite: '高岭石',
  quartz: '石英',
}

/** 生成逐孔详情 HTML 表格（PDF 和 Excel 预览共用） */
const generateHoleListHtml = (holeList: any[], unit: string) => {
  if (!holeList || holeList.length === 0) return ''
  const categoryLabels: Record<string,string> = { large:'大洞', medium:'中洞', small:'小洞', pinhole:'针孔/溶孔' }
  const validityLabels2: Record<string,string> = { effective:'有效', semiEffective:'较有效', ineffective:'无效' }
  const materialLabels: Record<string,string> = fillingMaterialLabels

  let rows = ''
  holeList.forEach(h => {
    rows += `<tr>
      <td>${h.index}</td>
      <td>${h.diameter.toFixed(3)} ${unit}</td>
      <td>${h.area.toFixed(4)} ${unit}²</td>
      <td>${categoryLabels[h.category] || ''}</td>
      <td>${validityLabels2[h.validity] || ''}</td>
      <td>${materialLabels[h.fillingMaterial] || ''}</td>
    </tr>`
  })
  return `<h2>孔洞详情</h2>
  <style>
    .hole-table { table-layout: fixed; }
    .hole-table th, .hole-table td {
      padding: 6px 8px; overflow: hidden; text-overflow: ellipsis;
    }
    .hole-table td:first-child { width: 36px; text-align: center; font-weight: normal; background: none; }
    .hole-table td:nth-child(2) { width: 96px; text-align: center; }
    .hole-table td:nth-child(3) { width: 110px; }
    .hole-table td:nth-child(4) { width: 80px; }
    .hole-table td:nth-child(5) { width: 110px; }
    .hole-table td:nth-child(6) { width: 100px; }
    .hole-table th:nth-child(1) { width: 36px; }
    .hole-table th:nth-child(2) { width: 96px; }
    .hole-table th:nth-child(3) { width: 110px; }
    .hole-table th:nth-child(4) { width: 80px; }
    .hole-table th:nth-child(5) { width: 110px; }
    .hole-table th:nth-child(6) { width: 100px; }
  </style>
  <table class="hole-table">
    <thead><tr>
      <th>#</th><th>直径</th><th>面积</th><th>分类</th><th>有效性</th><th>充填物</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

/** 生成逐条裂缝详情 HTML 表格 */
const generateCrackListHtml = (crackList: any[], unit: string) => {
  if (!crackList || crackList.length === 0) return ''
  const validityLabels2: Record<string,string> = { effective:'有效', semiEffective:'较有效', ineffective:'无效' }
  const materialLabels: Record<string,string> = fillingMaterialLabels

  let rows = ''
  crackList.forEach(c => {
    rows += `<tr>
      <td>${c.index}</td>
      <td>${c.length.toFixed(3)} ${unit}</td>
      <td>${c.width.toFixed(3)} ${unit}</td>
      <td>${c.area.toFixed(4)} ${unit}²</td>
      <td>${validityLabels2[c.validity] || ''}</td>
      <td>${materialLabels[c.fillingMaterial] || ''}</td>
    </tr>`
  })
  return `<h2>裂缝详情</h2>
  <style>
    .crack-table { table-layout: fixed; }
    .crack-table th, .crack-table td {
      padding: 6px 8px; overflow: hidden; text-overflow: ellipsis;
    }
    .crack-table td:first-child { width: 36px; text-align: center; font-weight: normal; background: none; }
    .crack-table td:nth-child(2) { width: 90px; text-align: center; }
    .crack-table td:nth-child(3) { width: 90px; text-align: center; }
    .crack-table td:nth-child(4) { width: 100px; }
    .crack-table td:nth-child(5) { width: 110px; }
    .crack-table td:nth-child(6) { width: 100px; }
  </style>
  <table class="crack-table">
    <thead><tr>
      <th>#</th><th>长度</th><th>宽度</th><th>面积</th><th>有效性</th><th>充填物</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

/**
 * 生成报告HTML内容（PDF和预览共用）
 */
export const generateReportHtml = (
  basicInfo: CoreBasicInfo,
  params: AnalysisParams,
  results: HoleResults | CrackResults | SizeResults
): string => {
  let modeName = ''
  let modeText = ''
  const unit = params.scaleType === 'macro' ? 'mm' : 'μm'
  let resultHtml = ''

  if (params.mode === 'hole') {
    modeName = '孔洞'
    modeText = '孔洞分析'
  } else if (params.mode === 'crack') {
    modeName = '裂缝'
    modeText = '裂缝分析'
  } else {
    modeName = '粒度'
    modeText = '粒度分析'
  }

  if (params.mode === 'hole') {
    const res = results as HoleResults
    resultHtml = `
      <tr><td>孔洞总数</td><td>${res.totalCount}</td></tr>
      <tr><td>孔洞总面积</td><td>${res.totalArea.toFixed(4)} ${unit}²</td></tr>
      <tr><td>平均孔径</td><td>${res.avgDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>最大孔径</td><td>${res.maxDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>最小孔径</td><td>${res.minDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>面孔率</td><td>${res.faceRate.toFixed(2)} %</td></tr>
      <tr style="border-top:2px solid #409EFF;"><td colspan="2" style="text-align:center;font-weight:bold;background:#F0F9FF;">孔洞分类统计</td></tr>
      <tr><td>大洞 (&gt;10mm)</td><td>${res.largeCount} 个</td></tr>
      <tr><td>中洞 (5~10mm)</td><td>${res.mediumCount} 个</td></tr>
      <tr><td>小洞 (1~5mm)</td><td>${res.smallCount} 个</td></tr>
      <tr><td>针孔/溶孔 (&lt;1mm)</td><td>${res.pinholeCount} 个</td></tr>
      `
  } else if (params.mode === 'crack') {
    const res = results as CrackResults
    resultHtml = `
      <tr><td>裂缝条数</td><td>${res.totalCount}</td></tr>
      <tr><td>裂缝总长度</td><td>${res.totalLength.toFixed(4)} ${unit}</td></tr>
      <tr><td>平均宽度</td><td>${res.avgWidth.toFixed(4)} ${unit}</td></tr>
      <tr><td>面密度</td><td>${res.areaDensity.toFixed(4)} 条/${unit}²</td></tr>
      <tr><td>线密度</td><td>${res.lineDensity.toFixed(4)} 条/${unit}</td></tr>
      <tr><td>面孔率</td><td>${res.faceRate.toFixed(2)} %</td></tr>
      `
  } else {
    const res = results as SizeResults
    resultHtml = `
      <tr><td>颗粒总数</td><td>${res.totalParticleCount}</td></tr>
      <tr><td>平均粒径</td><td>${res.avgParticleSize.toFixed(4)} ${unit}</td></tr>
      <tr><td>粗颗粒占比</td><td>${res.coarseParticleRatio.toFixed(2)} %</td></tr>
      <tr><td>细颗粒占比</td><td>${res.fineParticleRatio.toFixed(2)} %</td></tr>
      <tr><td>颗粒均匀度</td><td>${res.particleUniformity.toFixed(4)}</td></tr>
      <tr><td>岩石颗粒占比</td><td>${res.rockParticleRate.toFixed(2)} %</td></tr>
      `
  }

  let reportHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>岩心${modeName}分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
      padding: 40px; font-size: 14px; line-height: 1.6;
    }
    h1 {
      text-align: center; font-size: 24px; font-weight: bold;
      color: #409EFF; margin-bottom: 4px;
    }
    .report-time {
      text-align: center; font-size: 12px; color: #999;
      margin-bottom: 24px;
    }
    h2 {
      font-size: 16px; font-weight: bold; margin: 25px 0 12px 0;
      padding-left: 10px; border-left: 4px solid #409EFF;
      background-color: #F0F9FF; padding-top: 6px; padding-bottom: 6px;
    }
    table {
      width: 100%; border-collapse: collapse; margin-bottom: 10px;
    }
    td {
      border: 1px solid #DCDFE6; padding: 10px 12px; vertical-align: middle;
    }
    td:first-child {
      width: 30%; font-weight: 500; background-color: #F5F7FA;
    }
  </style>
</head>
<body>
  <h1>岩心${modeName}分析报告</h1>
  <p class="report-time">岩心分析报告 - 生成时间：${new Date().toLocaleString()}</p>
  <h2>岩心基础信息</h2>
  <table>
    <tr><td>井号</td><td>${basicInfo.wellNo}</td></tr>
    <tr><td>井深</td><td>${basicInfo.wellDepth}</td></tr>
    <tr><td>层位</td><td>${basicInfo.horizon}</td></tr>
    <tr><td>岩性</td><td>${basicInfo.lithology}</td></tr>
    <tr><td>取样日期</td><td>${basicInfo.sampleDate}</td></tr>
  </table>
  <h2>分析参数</h2>
  <table>
    <tr><td>分析模式</td><td>${modeText}</td></tr>
    <tr><td>分析范围</td><td>${params.regionMode === 'full' ? '全图分析' : '局部分析'}</td></tr>
    <tr><td>标尺类型</td><td>${params.scaleType === 'macro' ? '宏观(mm)' : '微观(μm)'}</td></tr>
  </table>
  <h2>统计结果</h2>
  <table>
    ${resultHtml}
  </table>
</body>
</html>`
  if (params.mode === 'hole' && (results as any).holeList?.length > 0) {
    const holeListHtml = generateHoleListHtml((results as any).holeList, unit)
    reportHtml = reportHtml.replace('</body>', `${holeListHtml}</body>`)
  }
  if (params.mode === 'crack' && (results as any).crackList?.length > 0) {
    const crackListHtml = generateCrackListHtml((results as any).crackList, unit)
    reportHtml = reportHtml.replace('</body>', `${crackListHtml}</body>`)
  }
  return reportHtml
}

/**
 * 生成Excel风格预览HTML（格子表格样式）
 */
export const generateExcelPreviewHtml = (
  basicInfo: CoreBasicInfo,
  params: AnalysisParams,
  results: HoleResults | CrackResults | SizeResults
): string => {
  let modeName = ''
  let modeText = ''
  const unit = params.scaleType === 'macro' ? 'mm' : 'μm'
  let resultRows = ''

  if (params.mode === 'hole') {
    modeName = '孔洞'; modeText = '孔洞分析'
    const res = results as HoleResults
    resultRows = `
      <tr><td>孔洞总数</td><td>${res.totalCount}</td></tr>
      <tr><td>孔洞总面积</td><td>${res.totalArea.toFixed(4)} ${unit}²</td></tr>
      <tr><td>平均孔径</td><td>${res.avgDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>最大孔径</td><td>${res.maxDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>最小孔径</td><td>${res.minDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>面孔率</td><td>${res.faceRate.toFixed(2)} %</td></tr>
      <tr style="border-top:2px solid #409EFF;"><td colspan="2" style="text-align:center;font-weight:bold;background:#F0F9FF;">孔洞分类统计</td></tr>
      <tr><td>大洞 (&gt;10mm)</td><td>${res.largeCount} 个</td></tr>
      <tr><td>中洞 (5~10mm)</td><td>${res.mediumCount} 个</td></tr>
      <tr><td>小洞 (1~5mm)</td><td>${res.smallCount} 个</td></tr>
      <tr><td>针孔/溶孔 (&lt;1mm)</td><td>${res.pinholeCount} 个</td></tr>
      `
  } else if (params.mode === 'crack') {
    modeName = '裂缝'; modeText = '裂缝分析'
    const res = results as CrackResults
    resultRows = `
      <tr><td>裂缝条数</td><td>${res.totalCount}</td></tr>
      <tr><td>裂缝总长度</td><td>${res.totalLength.toFixed(4)} ${unit}</td></tr>
      <tr><td>平均宽度</td><td>${res.avgWidth.toFixed(4)} ${unit}</td></tr>
      <tr><td>面密度</td><td>${res.areaDensity.toFixed(4)} 条/${unit}²</td></tr>
      <tr><td>线密度</td><td>${res.lineDensity.toFixed(4)} 条/${unit}</td></tr>
      <tr><td>面孔率</td><td>${res.faceRate.toFixed(2)} %</td></tr>`
  } else {
    modeName = '粒度'; modeText = '粒度分析'
    const res = results as SizeResults
    resultRows = `
      <tr><td>颗粒总数</td><td>${res.totalParticleCount}</td></tr>
      <tr><td>平均粒径</td><td>${res.avgParticleSize.toFixed(4)} ${unit}</td></tr>
      <tr><td>粗颗粒占比</td><td>${res.coarseParticleRatio.toFixed(2)} %</td></tr>
      <tr><td>细颗粒占比</td><td>${res.fineParticleRatio.toFixed(2)} %</td></tr>
      <tr><td>颗粒均匀度</td><td>${res.particleUniformity.toFixed(4)}</td></tr>
      <tr><td>岩石颗粒占比</td><td>${res.rockParticleRate.toFixed(2)} %</td></tr>`
  }

  // 属性标注行
  let attrHtml = ''
  if (params.validity) {
    attrHtml += `<tr><td>有效性评价</td><td>${validityLabels[params.validity] || params.validity}</td></tr>`
  }
  if (params.fillingMaterial) {
    attrHtml += `<tr><td>充填物类型</td><td>${fillingMaterialLabels[params.fillingMaterial] || params.fillingMaterial}</td></tr>`
  }

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>Excel预览</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
    padding: 24px; font-size: 13px; background: #f0f2f5;
  }
  .excel-sheet {
    max-width: 700px; margin: 0 auto; background: #fff;
    border: 1px solid #c0c4cc; border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;
  }
  .title-bar {
    background: #409EFF; color: #fff; text-align: center;
    font-size: 18px; font-weight: bold; padding: 14px 0;
  }
  .section-header {
    background: #e8f4fd; font-weight: bold; font-size: 14px;
    padding: 8px 16px; border-bottom: 1px solid #dcdfe6;
    border-top: 2px solid #409EFF;
  }
  table { width: 100%; border-collapse: collapse; }
  td {
    padding: 8px 16px; border-bottom: 1px solid #ebeef5;
    vertical-align: middle;
  }
  td:first-child {
    width: 35%; background: #fafafa; font-weight: 500;
    border-right: 1px solid #ebeef5; color: #606266;
  }
  td:last-child { color: #303133; }
  .footer-bar {
    text-align: center; font-size: 11px; color: #909399;
    padding: 12px 0; background: #fafafa; border-top: 1px solid #ebeef5;
  }
  /* 逐孔详情表的列宽覆盖 */
  .hole-table td:first-child { width: 36px; font-weight: normal; background: none; text-align: center; }
  .hole-table td:nth-child(2) { width: 96px; text-align: center; }
  .hole-table td:nth-child(3) { width: 110px; }
  .hole-table td:nth-child(4) { width: 80px; }
  .hole-table td:nth-child(5) { width: 110px; }
  .hole-table td:nth-child(6) { width: 100px; }
  .hole-table th:nth-child(1) { width: 36px; }
  .hole-table th:nth-child(2) { width: 96px; }
  .hole-table th:nth-child(3) { width: 110px; }
  .hole-table th:nth-child(4) { width: 80px; }
  .hole-table th:nth-child(5) { width: 110px; }
  .hole-table th:nth-child(6) { width: 100px; }
</style></head>
<body>
  <div class="excel-sheet">
    <div class="title-bar">岩心${modeName}分析报告</div>
    <div class="section-header">岩心基础信息</div>
    <table>
      <tr><td>井号</td><td>${basicInfo.wellNo}</td></tr>
      <tr><td>井深</td><td>${basicInfo.wellDepth}</td></tr>
      <tr><td>层位</td><td>${basicInfo.horizon}</td></tr>
      <tr><td>岩性</td><td>${basicInfo.lithology}</td></tr>
      <tr><td>取样日期</td><td>${basicInfo.sampleDate}</td></tr>
    </table>
    <div class="section-header">分析参数</div>
    <table>
      <tr><td>分析模式</td><td>${modeText}</td></tr>
      <tr><td>分析范围</td><td>${params.regionMode === 'full' ? '全图分析' : '局部分析'}</td></tr>
      <tr><td>标尺类型</td><td>${params.scaleType === 'macro' ? '宏观(mm)' : '微观(μm)'}</td></tr>
      ${attrHtml}
    </table>
    <div class="section-header">统计结果</div>
    <table>${resultRows}</table>
    <div class="footer-bar">Excel 报告预览 — ${new Date().toLocaleString()}</div>
  </div>
</body></html>`
  // 追加逐孔详情表（仅孔洞模式有数据）
  if (params.mode === 'hole' && (results as any).holeList?.length > 0) {
    const holeListHtml = generateHoleListHtml((results as any).holeList, unit)
    html = html.replace('</body>', `${holeListHtml}</body>`)
  }
  // 追加裂缝详情表（仅裂缝模式有数据）
  if (params.mode === 'crack' && (results as any).crackList?.length > 0) {
    const crackListHtml = generateCrackListHtml((results as any).crackList, unit)
    html = html.replace('</body>', `${crackListHtml}</body>`)
  }
  return html
}

export const exportToPDF = async (
  basicInfo: CoreBasicInfo,
  params: AnalysisParams,
  results: HoleResults | CrackResults | SizeResults
) => {
  try {
    let modeName = ''
    if (params.mode === 'hole') modeName = '孔洞'
    else if (params.mode === 'crack') modeName = '裂缝'
    else modeName = '粒度'

    const reportHtml = generateReportHtml(basicInfo, params, results)

    //4. 调用主进程,生成PDF事件
    const electron = window.require ? window.require('electron') : require('electron')
    const { ipcRenderer } = electron
    if (!ipcRenderer) {
      throw new Error('无法获取ipcRenderer,请检查Electron配置')
    }

    console.log('[PDF] 开始调用主进程 generate-pdf, HTML长度:', reportHtml.length)

    const base64Pdf = await ipcRenderer.invoke('generate-pdf', reportHtml)

    if (!base64Pdf) {
      console.error('[PDF] 主进程返回空结果')
      throw new Error('主进程生成PDF失败,返回空结果')
    }

    console.log('[PDF] 收到PDF数据, 长度:', base64Pdf.length)

    //5. 把Base64 转成 Blob 并下载
    const byteCharacters = atob(base64Pdf)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    
    // 校验saveAs是否存在
    if (typeof saveAs === 'undefined') {
      throw new Error('saveAs未导入,请检查file-saver的导入')
    }
    saveAs(blob, `岩心${modeName}分析报告_${new Date().toISOString().slice(0, 10)}.pdf`)

  } catch (error: any) {
    throw new Error(`生成PDF失败:${error.message || '未知错误'}`)
  }
}