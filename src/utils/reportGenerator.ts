import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
export const exportToPDF=(
    basicInfo:CoreBasicInfo,
    params:AnalysisParams,
    results:HoleResults|CrackResults|SizeResults
)=>{
    const doc=new jsPDF()
    // 1.标题
    doc.setFontSize(20)
    doc.text('岩心孔洞/裂缝/粒度分析报告',14,22)

    // 2.岩心基础信息
    doc.setFontSize(14)
    doc.text('岩心基础信息',14,35)
    doc.setFontSize(12)
    const basicInfoData=[
        ['井号',basicInfo.wellNo],
        ['井深',basicInfo.wellDepth],
        ['层位',basicInfo.horizon],
        ['岩性',basicInfo.lithology],
        ['取样日期',basicInfo.sampleDate],
    ];
    autoTable(doc,{
        startY:40,
        head:[],
        body:basicInfoData,
        theme:'plain',
        styles:{fontSize:11}
    })

    // 3.分析参数
    const yAfterBasic=(doc as any).lastAutoTable.finalY+10
    doc.setFontSize(14)
    doc.text('分析参数',14,yAfterBasic)
    doc.setFontSize(12)
    const paramsData=[
        ['分析模式',params.mode==='hole'?'孔洞分析':params.mode==='crack'?'裂缝分析':'粒度分析'],
        ['分析区域',params.regionMode==='full'?'全图分析':'局部分析'],
        ['标尺类型',params.scaleType==='macro'?'宏观(mm)':'微观(μm)'],
    ]
    autoTable(doc,{
        startY:yAfterBasic+5,
        head:[],
        body:paramsData,
        theme:'plain',
        styles:{fontSize:11}
    })

    // 4.统计结果
    const yAfterParams=(doc as any).lastAutoTable.finalY+10
    doc.setFontSize(14)
    doc.text('统计结果',14,yAfterParams)
    doc.setFontSize(12)
    let resultsData:any[][]=[]
    if(params.mode==='hole'){
        const holeResults = results as HoleResults
        resultsData = [
        ['孔洞总数', holeResults.totalCount],
        ['孔洞总面积', `${holeResults.totalArea.toFixed(4)} ${params.scaleType === 'macro' ? 'mm²' : 'μm²'}`],
        ['平均孔径', `${holeResults.avgDiameter.toFixed(4)} ${params.scaleType === 'macro' ? 'mm' : 'μm'}`],
        ['最大孔径', `${holeResults.maxDiameter.toFixed(4)} ${params.scaleType === 'macro' ? 'mm' : 'μm'}`],
        ['最小孔径', `${holeResults.minDiameter.toFixed(4)} ${params.scaleType === 'macro' ? 'mm' : 'μm'}`],
        ['面孔率', `${holeResults.faceRate.toFixed(2)} %`]
        ]
    }else if(params.mode==='crack'){
        const crackResults = results as CrackResults
        resultsData = [
        ['裂缝条数', crackResults.totalCount],
        ['裂缝总长度', `${crackResults.totalLength.toFixed(4)} ${params.scaleType === 'macro' ? 'mm' : 'μm'}`],
        ['平均宽度', `${crackResults.avgWidth.toFixed(4)} ${params.scaleType === 'macro' ? 'mm' : 'μm'}`],
        ['面密度', `${crackResults.areaDensity.toFixed(4)} ${params.scaleType === 'macro' ? '条/mm²' : '条/μm²'}`],
        ['线密度', `${crackResults.lineDensity.toFixed(4)} ${params.scaleType === 'macro' ? '条/mm' : '条/μm'}`]
        ]
    }else{
        const sizeResults = results as SizeResults
        resultsData = [
        ['颗粒总数', sizeResults.totalParticleCount],
        ['平均粒径', `${sizeResults.avgParticleSize.toFixed(4)} ${params.scaleType === 'macro' ? 'mm' : 'μm'}`],
        ['粗颗粒占比', `${sizeResults.coarseParticleRatio.toFixed(2)} %`],
        ['细颗粒占比', `${sizeResults.fineParticleRatio.toFixed(2)} %`],
        ['均匀度', `${sizeResults.particleUniformity.toFixed(4)}`],
        ['岩石颗粒占比', `${sizeResults.rockParticleRate.toFixed(2)} %`]
        ]
    }
    autoTable(doc,{
        startY:yAfterParams+5,
        head:[],
        body:resultsData,
        theme:'striped',
        styles:{fontSize:11}
    })

    // 5.保存文件
    const fileName=`岩心分析报告_${new Date().toISOString().slice(0,10)}.pdf`
    doc.save(fileName)
}
