const fs = require('fs')
const path = require('path')
const model = require('../models/potentialModel')
const { siteDirectory } = require('../config/storage')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function uploadedUrl(file) {
  return file ? `/uploads/site/${file.filename}` : null
}

function removeImage(imageUrl) {
  if (!imageUrl?.startsWith('/uploads/site/')) return
  fs.rmSync(path.join(siteDirectory, path.basename(imageUrl)), { force: true })
}

function payload(body, imageUrl) {
  const name = cleanText(body.name, 180)
  if (!name) throw new AppError('Nama potensi wajib diisi', 400)
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new AppError('Latitude harus berupa angka antara -90 dan 90', 400)
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError('Longitude harus berupa angka antara -180 dan 180', 400)
  }
  return {
    name,
    category: cleanText(body.category, 80),
    address: cleanText(body.address, 5000),
    description: cleanText(body.description, 10000),
    imageUrl,
    latitude,
    longitude,
  }
}

async function getAll(_req, res) {
  return sendSuccess(res, { data: await model.findAll() })
}

async function create(req, res) {
  const imageUrl = uploadedUrl(req.file)
  try {
    return sendSuccess(res, {
      data: await model.create(payload(req.body, imageUrl)),
      status: 201,
      message: 'Potensi kelurahan berhasil ditambahkan',
    })
  } catch (error) {
    removeImage(imageUrl)
    throw error
  }
}

async function update(req, res) {
  const current = await model.findById(req.params.id)
  if (!current) throw new AppError('Potensi kelurahan tidak ditemukan', 404)
  const newImage = uploadedUrl(req.file)
  try {
    const data = await model.update(req.params.id, payload(req.body, newImage || current.image_url))
    if (newImage && newImage !== current.image_url) removeImage(current.image_url)
    return sendSuccess(res, { data, message: 'Potensi kelurahan berhasil diperbarui' })
  } catch (error) {
    removeImage(newImage)
    throw error
  }
}

async function remove(req, res) {
  const current = await model.findById(req.params.id)
  if (!current || !await model.remove(req.params.id)) throw new AppError('Potensi kelurahan tidak ditemukan', 404)
  removeImage(current.image_url)
  return sendSuccess(res, { message: 'Potensi kelurahan berhasil dihapus' })
}

module.exports = { getAll, create, update, remove }
