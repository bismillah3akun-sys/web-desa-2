const ExcelJS = require('exceljs')

const titles = {
  applications: 'Pengajuan Layanan',
  guestbook: 'Buku Tamu',
  contacts: 'Pesan Kontak',
  news: 'Kabar Informasi',
  services: 'Daftar Layanan',
  demographics: 'Demografi',
  areas: 'Data RT RW',
  rutilahu: 'Data RUTILAHU',
}

function label(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function addSheet(workbook, name, rows) {
  const worksheet = workbook.addWorksheet(titles[name] || name)
  const keys = rows.length ? Object.keys(rows[0]) : ['data']
  worksheet.columns = keys.map((key) => ({ header: label(key), key, width: 22 }))
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173D32' } }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = { from: 'A1', to: `${worksheet.getColumn(keys.length).letter}1` }

  for (const row of rows) worksheet.addRow(row)
  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true }
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7F2' } }
    }
  })
}

async function createWorkbook(data) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Website Kelurahan Kebon Lega'
  workbook.created = new Date()
  for (const [name, rows] of Object.entries(data)) addSheet(workbook, name, rows)
  return workbook.xlsx.writeBuffer()
}

function extractRtRwFromAddress(address) {
  let rt = '01'
  let rw = '01'
  const str = String(address || '').toUpperCase()

  // Match patterns like "RT 009/001" or "RT 009/ 001" or "RT 009 / 001" or "RT.009/001" or "RT 009 RW 001"
  const rtRwMatch = str.match(/RT\.?\s*(\d{1,3})\s*(?:\/|\s+RW\.?|\s+RW\s+|\s*\/\s*RW\.?|\s*\/\s*)?\s*(\d{1,3})?/i)
  if (rtRwMatch) {
    if (rtRwMatch[1]) rt = String(Number(rtRwMatch[1])).padStart(2, '0')
    if (rtRwMatch[2]) rw = String(Number(rtRwMatch[2])).padStart(2, '0')
  }

  // Also check if RW is mentioned explicitly like "RW 03" or "RW.03"
  const rwExplicit = str.match(/RW\.?\s*(\d{1,3})/i)
  if (rwExplicit && rwExplicit[1]) {
    rw = String(Number(rwExplicit[1])).padStart(2, '0')
  }

  return { rt, rw }
}

async function createRutilahuWorkbook(rows) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DATA VERIFIKASI RUTILAHU KECAMATAN BOJONGLOA KIDUL - KEBON LEGA'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Data Verifikasi RUTILAHU')

  // Title Banner
  worksheet.mergeCells('A2:M2')
  const titleCell = worksheet.getCell('A2')
  titleCell.value = 'DATA VERIFIKASI RUTILAHU KELURAHAN KEBON LEGA KECAMATAN BOJONGLOA KIDUL'
  titleCell.font = { bold: true, size: 13, color: { argb: 'FF173D32' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Header Row 4 & 5
  worksheet.mergeCells('A4:A5')
  worksheet.getCell('A4').value = 'No'

  worksheet.mergeCells('B4:B5')
  worksheet.getCell('B4').value = 'Nama'

  worksheet.mergeCells('C4:C5')
  worksheet.getCell('C4').value = 'NIK'

  worksheet.mergeCells('D4:D5')
  worksheet.getCell('D4').value = 'Alamat'

  worksheet.mergeCells('E4:E5')
  worksheet.getCell('E4').value = 'RW'

  worksheet.mergeCells('F4:F5')
  worksheet.getCell('F4').value = 'RT'

  worksheet.mergeCells('G4:G5')
  worksheet.getCell('G4').value = 'Anggota Keluarga'

  worksheet.mergeCells('H4:H5')
  worksheet.getCell('H4').value = 'Terdapat Lansia'

  worksheet.mergeCells('I4:I5')
  worksheet.getCell('I4').value = 'Status Tanah'

  worksheet.mergeCells('J4:L4')
  worksheet.getCell('J4').value = 'Kondisi Bangunan'
  worksheet.getCell('J5').value = 'Atap'
  worksheet.getCell('K5').value = 'Lantai'
  worksheet.getCell('L5').value = 'Dinding'

  worksheet.mergeCells('M4:M5')
  worksheet.getCell('M4').value = 'Keterangan'

  worksheet.columns = [
    { key: 'no', width: 6 },
    { key: 'owner_name', width: 26 },
    { key: 'nik', width: 22 },
    { key: 'address', width: 44 },
    { key: 'rw', width: 8 },
    { key: 'rt', width: 8 },
    { key: 'family_members', width: 16 },
    { key: 'elderly_count', width: 16 },
    { key: 'land_status', width: 14 },
    { key: 'roof_condition', width: 16 },
    { key: 'floor_condition', width: 16 },
    { key: 'wall_condition', width: 16 },
    { key: 'notes', width: 20 },
  ]

  // Style Header Rows
  for (const r of [4, 5]) {
    const row = worksheet.getRow(r)
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173D32' } }
    row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  }

  worksheet.views = [{ state: 'frozen', ySplit: 5 }]

  rows.forEach((item, index) => {
    worksheet.addRow({
      no: index + 1,
      owner_name: item.owner_name,
      nik: item.nik || '',
      address: item.address,
      rw: item.rw,
      rt: item.rt,
      family_members: `${item.family_members || 1} JIWA`,
      elderly_count: item.elderly_count ? `${item.elderly_count} JIWA` : '0',
      land_status: (item.land_status || 'MILIK').toUpperCase(),
      roof_condition: (item.roof_condition || 'RUSAK SEDANG').replace('_', ' ').toUpperCase(),
      floor_condition: (item.floor_condition || 'RUSAK SEDANG').replace('_', ' ').toUpperCase(),
      wall_condition: (item.wall_condition || 'RUSAK SEDANG').replace('_', ' ').toUpperCase(),
      notes: item.notes || '1 KK',
    })
  })

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 5) {
      row.alignment = { vertical: 'middle', wrapText: true }
      if (rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6FAF7' } }
      }
    }
  })

  return workbook.xlsx.writeBuffer()
}

async function createRutilahuTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DATA VERIFIKASI RUTILAHU KECAMATAN BOJONGLOA KIDUL'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Sheet1')

  worksheet.mergeCells('A2:K2')
  const title = worksheet.getCell('A2')
  title.value = '1. DATA VERIFIKASI RUTILAHU KECAMATAN BOJONGLOA KIDUL'
  title.font = { bold: true, size: 12 }
  title.alignment = { horizontal: 'center', vertical: 'middle' }

  // Header matching user's image exactly
  worksheet.mergeCells('A4:A5'); worksheet.getCell('A4').value = 'No'
  worksheet.mergeCells('B4:B5'); worksheet.getCell('B4').value = 'Nama'
  worksheet.mergeCells('C4:C5'); worksheet.getCell('C4').value = 'NIK'
  worksheet.mergeCells('D4:D5'); worksheet.getCell('D4').value = 'Alamat'
  worksheet.mergeCells('E4:E5'); worksheet.getCell('E4').value = 'Anggota Keluarga'
  worksheet.mergeCells('F4:F5'); worksheet.getCell('F4').value = 'Terdapat Lansia'
  worksheet.mergeCells('G4:G5'); worksheet.getCell('G4').value = 'Status Tanah'
  worksheet.mergeCells('H4:J4'); worksheet.getCell('H4').value = 'Kondisi Bangunan'
  worksheet.getCell('H5').value = 'Atap'
  worksheet.getCell('I5').value = 'Lantai'
  worksheet.getCell('J5').value = 'Dinding'
  worksheet.mergeCells('K4:K5'); worksheet.getCell('K4').value = 'Keterangan'

  // Numbering subheader (Row 6)
  for (let i = 1; i <= 11; i++) {
    const colLetter = String.fromCharCode(64 + i)
    worksheet.getCell(`${colLetter}6`).value = i
  }

  for (const r of [4, 5, 6]) {
    const row = worksheet.getRow(r)
    row.font = { bold: true }
    row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  }

  worksheet.columns = [
    { key: 'no', width: 6 },
    { key: 'name', width: 24 },
    { key: 'nik', width: 22 },
    { key: 'address', width: 44 },
    { key: 'family', width: 16 },
    { key: 'elderly', width: 16 },
    { key: 'land', width: 14 },
    { key: 'roof', width: 16 },
    { key: 'floor', width: 16 },
    { key: 'wall', width: 16 },
    { key: 'notes', width: 16 },
  ]

  return workbook.xlsx.writeBuffer()
}

async function parseRutilahuWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error('Sheet data tidak ditemukan dalam file Excel')

  const rows = []
  let headerRowIndex = -1
  const headerMap = {}

  // Scan for header row
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIndex !== -1) return
    let isHeader = false
    row.eachCell((cell) => {
      const txt = String(cell.value || '').toLowerCase().trim()
      if (txt === 'nama' || txt.includes('nama pemilik') || txt.includes('nik') || txt.includes('alamat')) {
        isHeader = true
      }
    })
    if (isHeader) {
      headerRowIndex = rowNumber
      // Map main headers
      row.eachCell((cell, colNumber) => {
        const txt = String(cell.value || '').toLowerCase().trim()
        if (txt === 'no' || txt === 'no.') headerMap.no = colNumber
        else if (txt === 'nama' || txt.includes('nama pemilik') || txt.includes('pemilik')) headerMap.owner_name = colNumber
        else if (txt.includes('nik')) headerMap.nik = colNumber
        else if (txt.includes('alamat')) headerMap.address = colNumber
        else if (txt.startsWith('rw') && !txt.includes('/')) headerMap.rw = colNumber
        else if (txt.startsWith('rt') && !txt.includes('/')) headerMap.rt = colNumber
        else if (txt.includes('anggota') || txt.includes('jiwa')) headerMap.family_members = colNumber
        else if (txt.includes('lansia')) headerMap.elderly_count = colNumber
        else if (txt.includes('tanah')) headerMap.land_status = colNumber
        else if (txt === 'atap' || txt.includes('atap')) headerMap.roof_condition = colNumber
        else if (txt === 'lantai' || txt.includes('lantai')) headerMap.floor_condition = colNumber
        else if (txt === 'dinding' || txt.includes('dinding')) headerMap.wall_condition = colNumber
        else if (txt.includes('keterangan') || txt.includes('catatan')) headerMap.notes = colNumber
        else if (txt.includes('lat')) headerMap.latitude = colNumber
        else if (txt.includes('long')) headerMap.longitude = colNumber
        else if (txt.includes('kode')) headerMap.record_code = colNumber
      })

      // Also check next row for sub-headers (like Atap, Lantai, Dinding under Kondisi Bangunan)
      const nextRow = worksheet.getRow(rowNumber + 1)
      if (nextRow) {
        nextRow.eachCell((cell, colNumber) => {
          const subTxt = String(cell.value || '').toLowerCase().trim()
          if (subTxt === 'atap' || subTxt.includes('atap')) headerMap.roof_condition = colNumber
          else if (subTxt === 'lantai' || subTxt.includes('lantai')) headerMap.floor_condition = colNumber
          else if (subTxt === 'dinding' || subTxt.includes('dinding')) headerMap.wall_condition = colNumber
        })
      }
    }
  })

  // Fallback default column mapping if header text wasn't found (e.g. standard user table columns B=Nama, C=NIK, D=Alamat, E=Anggota, F=Lansia, G=Tanah, H=Atap, I=Lantai, J=Dinding, K=Keterangan)
  if (!headerMap.owner_name) headerMap.owner_name = 2
  if (!headerMap.nik) headerMap.nik = 3
  if (!headerMap.address) headerMap.address = 4
  if (!headerMap.family_members) headerMap.family_members = 5
  if (!headerMap.elderly_count) headerMap.elderly_count = 6
  if (!headerMap.land_status) headerMap.land_status = 7
  if (!headerMap.roof_condition) headerMap.roof_condition = 8
  if (!headerMap.floor_condition) headerMap.floor_condition = 9
  if (!headerMap.wall_condition) headerMap.wall_condition = 10
  if (!headerMap.notes) headerMap.notes = 11

  let dataIndex = 0

  worksheet.eachRow((row, rowNumber) => {
    // Skip headers and numbering subheader
    if (headerRowIndex !== -1 && rowNumber <= headerRowIndex + 2) {
      // Check if row only contains numbers 1, 2, 3...
      const cell1 = String(row.getCell(1).value || '').trim()
      const cell2 = String(row.getCell(2).value || '').trim()
      if (cell2 === '2' || cell1 === '1' && cell2 === '2') return
    }

    const getVal = (colNumber) => {
      if (!colNumber) return ''
      const cell = row.getCell(colNumber)
      let val = cell.value
      if (val && typeof val === 'object') {
        if (val.result !== undefined) val = val.result
        else if (val.text !== undefined) val = val.text
      }
      return val != null ? String(val).trim() : ''
    }

    const name = getVal(headerMap.owner_name)
    const nik = getVal(headerMap.nik).replace(/\D/g, '')
    const address = getVal(headerMap.address)

    // Skip if no name or if name looks like a header
    if (!name || ['NAMA', 'NAMA PEMILIK'].includes(name.toUpperCase()) || name.toUpperCase().includes('DATA VERIFIKASI')) return

    dataIndex++

    // RT/RW extraction
    let rw = getVal(headerMap.rw)
    let rt = getVal(headerMap.rt)
    if (!rw || !rt) {
      const extracted = extractRtRwFromAddress(address)
      if (!rt) rt = extracted.rt
      if (!rw) rw = extracted.rw
    }

    // File lama tidak memiliki koordinat. Biarkan kosong sampai petugas
    // memilih titik rumah yang benar pada peta; jangan membuat titik rekaan.
    let latitude = getVal(headerMap.latitude)
    let longitude = getVal(headerMap.longitude)
    if (!latitude || !longitude || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      latitude = null
      longitude = null
    }

    // Parse Condition Enums
    const parseCondition = (raw) => {
      const txt = String(raw || '').toLowerCase().trim()
      if (txt.includes('berat')) return 'rusak_berat'
      if (txt.includes('ringan')) return 'rusak_ringan'
      if (txt.includes('sedang')) return 'rusak_sedang'
      if (txt.includes('baik')) return 'baik'
      return 'rusak_sedang' // default fallback
    }

    const roof_condition = parseCondition(getVal(headerMap.roof_condition))
    const floor_condition = parseCondition(getVal(headerMap.floor_condition))
    const wall_condition = parseCondition(getVal(headerMap.wall_condition))

    // Family members & Elderly
    const family_members = getVal(headerMap.family_members).replace(/\D/g, '') || '1'
    const elderly_count = getVal(headerMap.elderly_count).replace(/\D/g, '') || '0'
    const land_status = getVal(headerMap.land_status).toLowerCase() || 'milik'
    const notes = getVal(headerMap.notes) || '1 KK'

    // Unique record code
    let record_code = getVal(headerMap.record_code)
    if (!record_code) {
      const cleanName = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()
      record_code = `KBL-RTLH-${String(dataIndex).padStart(3, '0')}${cleanName ? `-${cleanName}` : ''}`
    }

    rows.push({
      record_code,
      owner_name: name,
      nik: nik || null,
      address,
      rw,
      rt,
      family_members: Math.max(1, Number(family_members)),
      elderly_count: Math.max(0, Number(elderly_count)),
      land_status,
      latitude: latitude == null ? null : Number(latitude),
      longitude: longitude == null ? null : Number(longitude),
      roof_condition,
      wall_condition,
      floor_condition,
      sanitation: 'tidak_layak',
      notes,
      verification_status: 'terverifikasi',
      verification_note: 'Diverifikasi melalui data survei RUTILAHU Kecamatan Bojongloa Kidul',
      handling_status: 'dalam_pengusulan',
      handling_note: 'Diusulkan dalam program penanganan RUTILAHU Kelurahan Kebon Lega',
    })
  })

  return rows
}

module.exports = {
  createWorkbook,
  createRutilahuWorkbook,
  createRutilahuTemplateWorkbook,
  parseRutilahuWorkbook,
}
