const bcrypt = require('bcryptjs')
const adminModel = require('../models/adminModel')
const AppError = require('../utils/AppError')
const { cleanText } = require('../utils/validation')
const { sendSuccess } = require('../utils/apiResponse')

function input(body, requirePassword = true) {
  const username = cleanText(body.username, 80)?.toLowerCase()
  const displayName = cleanText(body.display_name, 150)
  const rwRaw = String(body.rw_number || '').trim()
  const whatsappNumber = String(body.whatsapp_number || '').replace(/[^\d+]/g, '')
  const password = String(body.password || '')
  if (!username || !/^[a-z0-9._-]+$/.test(username)) throw new AppError('Username wajib diisi dengan huruf kecil, angka, titik, - atau _', 400)
  if (!displayName) throw new AppError('Nama akun wajib diisi', 400)
  if (!/^\d{1,3}$/.test(rwRaw)) throw new AppError('Nomor RW harus angka 1–999', 400)
  if (!/^(?:\+62|62|0)8\d{7,12}$/.test(whatsappNumber)) throw new AppError('Nomor WhatsApp aktif tidak valid', 400)
  if ((requirePassword || password) && password.length < 8) throw new AppError('Kata sandi minimal 8 karakter', 400)
  return { username, displayName, rwNumber: String(Number(rwRaw)).padStart(2, '0'), whatsappNumber, password, isActive: body.is_active !== false && body.is_active !== 'false' }
}
async function list(_req, res) { return sendSuccess(res, { data: await adminModel.findAllRw() }) }
async function create(req, res) {
  const data = input(req.body)
  data.passwordHash = await bcrypt.hash(data.password, 12)
  try { return sendSuccess(res, { data: await adminModel.createRw(data), message: 'Akun RW berhasil dibuat' }, 201) }
  catch (error) { if (error.code === 'ER_DUP_ENTRY') throw new AppError('Username sudah digunakan', 409); throw error }
}
async function update(req, res) {
  const data = input(req.body, false)
  data.passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null
  try {
    const result = await adminModel.updateRw(req.params.id, data)
    if (!result) throw new AppError('Akun RW tidak ditemukan', 404)
    return sendSuccess(res, { data: result, message: 'Akun RW berhasil diperbarui' })
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') throw new AppError('Username sudah digunakan', 409); throw error }
}
module.exports = { list, create, update }
