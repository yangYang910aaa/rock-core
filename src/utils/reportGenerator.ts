import ExcelJS from 'exceljs';
import {saveAs} from 'file-saver';
import type {HoleResults,CrackResults,SizeResults} from '@/stores/analysisStore';
/**
 * 岩心基础信息（可后续扩展为用户输入）
 */
interface CoreBasicInfo{
    wellNo:string   //井号
    wellDepth:string  //井深
    horizon:string    //层位
    lithology:string  //岩性
    sampleDate:string //取样日期
}
/**
 * 分析参数
 */
interface AnalysisParams{
    mode:'hole'|'crack'|'size' //分析模式
    regionMode:'full'|'rect' //分析区域
    scaleType:'macro'|'micro' //标尺类型
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

  // 1. 设置列宽
  worksheet.columns = [
    { width: 22 },
    { width: 32 }
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
  paramRows.forEach(rowData => {
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
      ['面孔率', `${res.faceRate.toFixed(2)} %`]
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
    // 标签列样式统一
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
    row.getCell(1).font = { bold: true }
    // 所有单元格左对齐+垂直居中
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    currentRow++
  })

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

/**
 * 生成PDF报告
 */
export const exportToPDF = async (
  basicInfo: CoreBasicInfo,
  params: AnalysisParams,
  results: HoleResults | CrackResults | SizeResults
) => {
  try {
    console.log('=== 开始生成PDF ===')
    // 1.准备通用变量
    let modeName = ''
    let modeText = ''
    const unit = params.scaleType === 'macro' ? 'mm' : 'μm'
    let resultHtml = ''

    //模式名赋值
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

    //2. 根据分析模式生成结果HTML
    if (params.mode === 'hole') {
      const res = results as HoleResults
      resultHtml = `
      <tr><td>孔洞总数</td><td>${res.totalCount}</td></tr>
      <tr><td>孔洞总面积</td><td>${res.totalArea.toFixed(4)} ${unit}²</td></tr>
      <tr><td>平均孔径</td><td>${res.avgDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>最大孔径</td><td>${res.maxDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>最小孔径</td><td>${res.minDiameter.toFixed(4)} ${unit}</td></tr>
      <tr><td>面孔率</td><td>${res.faceRate.toFixed(2)} %</td></tr>
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

    //3. 生成完整的HTML内容
    const reportHtml = `
      <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>岩心${modeName}分析报告</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
          padding: 40px;
          font-size: 14px;
          line-height: 1.6;
        }
        h1 {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #409EFF;
          margin-bottom: 30px;
        }
        h2 {
          font-size: 16px;
          font-weight: bold;
          margin: 25px 0 12px 0;
          padding-left: 10px;
          border-left: 4px solid #409EFF;
          background-color: #F0F9FF;
          padding-top: 6px;
          padding-bottom: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        td {
          border: 1px solid #DCDFE6;
          padding: 10px 12px;
          vertical-align: middle;
        }
        td:first-child {
          width: 30%;
          font-weight: 500;
          background-color: #F5F7FA;
        }
        @page {
          size: A4;
          margin: 20mm;
        }
        @media print {
          footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 5px;
          }
        }
      </style>
    </head>
    <body>
      <h1>岩心${modeName}分析报告</h1>
      
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
      <footer>岩心分析报告 - 生成时间：${new Date().toLocaleString()}</footer>
    </body>
    </html>
    `

    //4. 调用主进程,生成PDF事件
    const electron = window.require ? window.require('electron') : require('electron')
    const { ipcRenderer } = electron
    if (!ipcRenderer) {
      throw new Error('无法获取ipcRenderer,请检查Electron配置')
    }

    const base64Pdf = await ipcRenderer.invoke('generate-pdf', reportHtml)

    if (!base64Pdf) {
      throw new Error('主进程生成PDF失败,返回空结果')
    }

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