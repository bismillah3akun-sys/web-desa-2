const model = require('../models/governmentOfficialModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function payload(body, imageUrl = null) {
  const position = cleanText(body.position, 180)
  if (!position) throw new AppError('Jabatan wajib diisi', 400)
  const sortOrder = Number(body.sort_order ?? 0)
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new AppError('Urutan tampil harus berupa angka nol atau lebih', 400)
  }
  const parentId = body.parent_id === '' || body.parent_id == null ? null : Number(body.parent_id)
  if (parentId !== null && (!Number.isInteger(parentId) || parentId < 1)) throw new AppError('Atasan tidak valid', 400)
  const chartX = body.chart_x === '' || body.chart_x == null ? null : Number(body.chart_x)
  const chartY = body.chart_y === '' || body.chart_y == null ? null : Number(body.chart_y)
  if ((chartX !== null && !Number.isFinite(chartX)) || (chartY !== null && !Number.isFinite(chartY))) throw new AppError('Posisi bagan tidak valid', 400)
  return {
    position,
    name: cleanText(body.name, 180),
    nip: cleanText(body.nip, 80),
    description: cleanText(body.description, 3000),
    imageUrl,
    parentId,
    chartX,
    chartY,
    sortOrder,
    isActive: body.is_active !== false && body.is_active !== 'false',
  }
}

async function getPublic(_req, res) {
  return sendSuccess(res, { data: await model.findAll({ publicOnly: true }) })
}

async function getAll(_req, res) {
  return sendSuccess(res, { data: await model.findAll() })
}

async function create(req, res) {
  const imageUrl = req.file ? `/uploads/site/${req.file.filename}` : null
  return sendSuccess(res, {
    data: await model.create(payload(req.body, imageUrl)),
    status: 201,
    message: 'Perangkat desa berhasil ditambahkan',
  })
}

async function update(req, res) {
  const current = await model.findById(req.params.id)
  if (!current) throw new AppError('Data perangkat desa tidak ditemukan', 404)
  const imageUrl = req.file ? `/uploads/site/${req.file.filename}` : current.image_url
  const item = payload(req.body, imageUrl)
  if (item.parentId === Number(req.params.id)) throw new AppError('Data tidak dapat menjadi atasannya sendiri', 400)
  const data = await model.update(req.params.id, item)
  if (!data) throw new AppError('Data perangkat desa tidak ditemukan', 404)
  return sendSuccess(res, { data, message: 'Perangkat desa berhasil diperbarui' })
}

async function updatePosition(req, res) {
  const x = Number(req.body.x)
  const y = Number(req.body.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new AppError('Posisi bagan tidak valid', 400)
  const data = await model.updatePosition(req.params.id, x, y)
  if (!data) throw new AppError('Data perangkat desa tidak ditemukan', 404)
  return sendSuccess(res, { data, message: 'Posisi struktur berhasil disimpan' })
}

async function remove(req, res) {
  if (!await model.remove(req.params.id)) {
    throw new AppError('Data perangkat desa tidak ditemukan', 404)
  }
  return sendSuccess(res, { message: 'Perangkat desa berhasil dihapus' })
}

module.exports = { getPublic, getAll, create, update, updatePosition, remove }
