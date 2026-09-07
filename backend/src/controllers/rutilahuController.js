const rutilahuModel = require('../models/rutilahuModel')
const { validate, version, summarize } = require('../services/rutilahuValidation')
const { createRutilahuWorkbook, createRutilahuTemplateWorkbook, parseRutilahuWorkbook } = require('../services/excelExportService')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const crypto = require('crypto')

async function getAdminList(req, res) {
  const houses = await rutilahuModel.list(req.admin)
  const summary = summarize(houses)
  return sendSuccess(res, {
    data: { houses, summary },
    message: 'Data RUTILAHU berhasil diambil',
  })
}

async function getPublicList(_req, res) {
  const houses = await rutilahuModel.list()
  const publicHouses = houses.map((item) => ({
    id: item.id,
    record_code: item.record_code,
    rw: item.rw,
    rt: item.rt,
    latitude: item.latitude == null ? null : Number(item.latitude),
    longitude: item.longitude == null ? null : Number(item.longitude),
    roof_condition: item.roof_condition,
    wall_condition: item.wall_condition,
    floor_condition: item.floor_condition,
    sanitation: item.sanitation,
    category: item.category,
    verification_status: item.verification_status,
    handling_status: item.handling_status,
    has_photo: Boolean(item.has_photo),
    updated_at: item.updated_at,
  }))
  const summary = summarize(houses)
  return sendSuccess(res, {
    data: { houses: publicHouses, summary },
    message: 'Data WebGIS RUTILAHU berhasil dimuat',
  })
}

async function getGeoJson(_req, res) {
  const houses = await rutilahuModel.list()
  const geojson = {
    type: 'FeatureCollection',
    features: houses.filter((item) => item.latitude != null && item.longitude != null).map((item) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(item.longitude), Number(item.latitude)],
      },
      properties: {
        id: item.id,
        record_code: item.record_code,
        rw: item.rw,
        rt: item.rt,
        roof_condition: item.roof_condition,
        wall_condition: item.wall_condition,
        floor_condition: item.floor_condition,
        sanitation: item.sanitation,
        verification_status: item.verification_status,
        handling_status: item.handling_status,
        has_photo: Boolean(item.has_photo),
      },
    })),
  }
  return res.json(geojson)
}

async function getDetail(req, res) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const data = await rutilahuModel.detail(id)
  if (req.admin.role === 'rw' && data.submitted_by !== req.admin.id) throw new AppError('Pengajuan tidak ditemukan', 404)
  return sendSuccess(res, { data })
}

async function create(req, res) {
  const body = req.admin.role === 'rw' ? { ...req.body, record_code: req.body.record_code || `KBL-${req.admin.rwNumber}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`, rw: req.admin.rwNumber, verification_status: 'belum_diverifikasi', handling_status: 'belum_ditangani', verification_note: '', handling_note: '' } : req.body
  const data = validate(body)
  let saved
  if (req.admin.role === 'rw') {
    const required = ['photo', 'identity', 'referral', 'ownership']
    const missing = required.filter((key) => !req.files?.[key]?.[0])
    if (missing.length) throw new AppError('Foto rumah, identitas, surat pengantar RT/RW, dan bukti kepemilikan wajib diunggah', 400)
    if (!data.applicant_phone) throw new AppError('Nomor kontak pengaju wajib diisi', 400)
    saved = await rutilahuModel.submitByRw(data, req.admin, req.files)
  } else {
    saved = await rutilahuModel.save(null, data, req.admin.id, null, req.files?.photo?.[0], false)
  }
  return sendSuccess(res, {
    data: saved,
    message: 'Data rumah RUTILAHU berhasil ditambahkan',
  }, 201)
}

async function update(req, res) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const expectedVersion = version(req.body.version)
  const progressNote = String(req.body.progress_note || '').trim()
  if (!progressNote) throw new AppError('Catatan progres wajib diisi pada setiap perubahan', 400)
  const data = validate(req.body)
  const removePhoto = req.body.remove_photo === 'true' || req.body.remove_photo === true
  if (req.admin.role !== 'super_admin') throw new AppError('Status hanya dapat diubah Kelurahan', 403)
  const saved = await rutilahuModel.save(id, data, req.admin.id, expectedVersion, req.files?.photo?.[0], removePhoto, progressNote)
  return sendSuccess(res, {
    data: saved,
    message: 'Data RUTILAHU berhasil diperbarui',
  })
}

async function remove(req, res) {
  if (req.admin.role !== 'super_admin') throw new AppError('Data hanya dapat dihapus Super Admin', 403)
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const expectedVersion = version(req.body.version || req.query.version)
  await rutilahuModel.remove(id, expectedVersion)
  return sendSuccess(res, { message: 'Data RUTILAHU berhasil dihapus' })
}

async function getDocument(req, res) {
  const data = await rutilahuModel.document(req.params.id, req.params.kind, req.admin)
  res.setHeader('Content-Type', data.mime || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${String(data.name || 'dokumen').replace(/["\r\n]/g, '')}"`)
  return res.send(data.buffer)
}

async function track(req, res) {
  const code = String(req.body.record_code || '').trim().toUpperCase()
  const phone = String(req.body.applicant_phone || '').replace(/\D/g, '')
  const houses = await rutilahuModel.list()
  const item = houses.find((house) => house.record_code === code && String(house.applicant_phone || '').replace(/\D/g, '') === phone)
  if (!item) throw new AppError('Pengajuan tidak ditemukan. Periksa kode dan nomor kontak.', 404)
  const detail = await rutilahuModel.detail(item.id)
  return sendSuccess(res, { data: { record_code: detail.record_code, category: detail.category, verification_status: detail.verification_status, handling_status: detail.handling_status, history: detail.history, updated_at: detail.updated_at } })
}

async function getPhoto(req, res) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const photoData = await rutilahuModel.photo(id)
  res.setHeader('Content-Type', photoData.photo_mime || 'image/jpeg')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  return res.send(photoData.photo)
}

async function exportExcel(_req, res) {
  if (_req.admin.role !== 'super_admin') throw new AppError('Ekspor hanya dapat dilakukan Super Admin', 403)
  const houses = await rutilahuModel.list()
  const buffer = await createRutilahuWorkbook(houses)
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="data-rutilahu-kebon-lega-${date}.xlsx"`)
  return res.send(buffer)
}

async function downloadTemplate(_req, res) {
  if (_req.admin.role !== 'super_admin') throw new AppError('Template hanya dapat diakses Super Admin', 403)
  const buffer = await createRutilahuTemplateWorkbook()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="template-survei-rutilahu-kebon-lega.xlsx"')
  return res.send(buffer)
}

async function importExcel(req, res) {
  if (req.admin.role !== 'super_admin') throw new AppError('Impor Excel hanya dapat dilakukan Super Admin', 403)
  if (!req.file?.buffer) throw new AppError('File Excel wajib diunggah', 400)
  const rawRows = await parseRutilahuWorkbook(req.file.buffer)
  if (!rawRows.length) throw new AppError('File Excel tidak memuat data yang valid atau kosong', 400)

  const validatedRows = []
  const errors = []

  rawRows.forEach((row, index) => {
    try {
      const validated = validate(row)
      validatedRows.push(validated)
    } catch (err) {
      errors.push(`Baris ${index + 2} (${row.record_code || row.owner_name || 'Tanpa Nama'}): ${err.message}`)
    }
  })

  if (errors.length > 0) {
    throw new AppError(`Terdapat kesalahan pada data Excel:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...dan ${errors.length - 5} kesalahan lainnya` : ''}`, 400)
  }

  const count = await rutilahuModel.importRows(validatedRows, req.admin.id)
  return sendSuccess(res, {
    message: `Berhasil mengimpor ${count} data rumah RUTILAHU`,
    data: { importedCount: count },
  })
}

module.exports = {
  getAdminList,
  getPublicList,
  getGeoJson,
  getDetail,
  create,
  update,
  remove,
  getPhoto,
  exportExcel,
  downloadTemplate,
  importExcel,
  getDocument,
  track,
}
