const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { privateDirectory, newsDirectory, siteDirectory } = require('../config/storage')

fs.mkdirSync(privateDirectory, { recursive: true })
fs.mkdirSync(newsDirectory, { recursive: true })
fs.mkdirSync(siteDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
  },
})

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])

const applicationUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error('Hanya PDF, JPG, dan PNG yang diizinkan'))
    return callback(null, true)
  },
})

const newsImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, newsDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowedImages.has(file.mimetype)) {
      const error = new Error('Gambar harus berformat JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

const siteImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, siteDirectory),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, callback) => {
    if (!new Set(['image/jpeg', 'image/png', 'image/webp']).has(file.mimetype)) {
      const error = new Error('Gambar harus berformat JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

const memoryStorage = multer.memoryStorage()

const rutilahuPhotoUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowed.has(file.mimetype)) {
      const error = new Error('Foto rumah harus berformat JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

const rutilahuSubmissionUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    if (!allowed.has(file.mimetype)) {
      const error = new Error('Lampiran harus berupa PDF, JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

const excelUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ])
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== '.xlsx' || !allowed.has(file.mimetype)) {
      const error = new Error('File harus berupa dokumen Excel .xlsx')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

module.exports = { applicationUpload, newsImageUpload, siteImageUpload, rutilahuPhotoUpload, rutilahuSubmissionUpload, excelUpload }
