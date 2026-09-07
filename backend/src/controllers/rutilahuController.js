const rutilahuModel = require('../models/rutilahuModel')
const { validate, version, summarize } = require('../services/rutilahuValidation')
const { createRutilahuWorkbook, createRutilahuTemplateWorkbook, parseRutilahuWorkbook } = require('../services/excelExportService')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')

async function getAdminList(_req, res) {
  const houses = await rutilahuModel.list()
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
    owner_name: item.owner_name,
    address: item.address,
    rw: item.rw,
    rt: item.rt,
    latitude: item.latitude == null ? null : Number(item.latitude),
    longitude: item.longitude == null ? null : Number(item.longitude),
    roof_condition: item.roof_condition,
    wall_condition: item.wall_condition,
    floor_condition: item.floor_condition,
    sanitation: item.sanitation,
    notes: item.notes,
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
        owner_name: item.owner_name,
        address: item.address,
        rw: item.rw,
        rt: item.rt,
        roof_condition: item.roof_condition,
        wall_condition: item.wall_condition,
        floor_condition: item.floor_condition,
        sanitation: item.sanitation,
        verification_status: item.verification_status,
        handling_status: item.handling_status,
        has_photo: Boolean(item.has_photo),
        notes: item.notes,
      },
    })),
  }
  return res.json(geojson)
}

async function getDetail(req, res) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const data = await rutilahuModel.detail(id)
  return sendSuccess(res, { data })
}

async function create(req, res) {
  const data = validate(req.body)
  const saved = await rutilahuModel.save(null, data, req.admin.id, null, req.file, false)
  return sendSuccess(res, {
    data: saved,
    message: 'Data rumah RUTILAHU berhasil ditambahkan',
  }, 201)
}

async function update(req, res) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const expectedVersion = version(req.body.version)
  const data = validate(req.body)
  const removePhoto = req.body.remove_photo === 'true' || req.body.remove_photo === true
  const saved = await rutilahuModel.save(id, data, req.admin.id, expectedVersion, req.file, removePhoto)
  return sendSuccess(res, {
    data: saved,
    message: 'Data RUTILAHU berhasil diperbarui',
  })
}

async function remove(req, res) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('ID rumah tidak valid', 400)
  const expectedVersion = version(req.body.version || req.query.version)
  await rutilahuModel.remove(id, expectedVersion)
  return sendSuccess(res, { message: 'Data RUTILAHU berhasil dihapus' })
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
  const houses = await rutilahuModel.list()
  const buffer = await createRutilahuWorkbook(houses)
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="data-rutilahu-kebon-lega-${date}.xlsx"`)
  return res.send(buffer)
}

async function downloadTemplate(_req, res) {
  const buffer = await createRutilahuTemplateWorkbook()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="template-survei-rutilahu-kebon-lega.xlsx"')
  return res.send(buffer)
}

async function importExcel(req, res) {
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
}
