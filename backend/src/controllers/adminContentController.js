const contentModel = require('../models/contentModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function nullableInteger(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(`${field} harus berupa angka bulat antara ${min} dan ${max}`, 400)
  }

  return parsed
}

async function updateProfile(req, res) {
  const current = await contentModel.findVillageProfile()
  if (!current) throw new AppError('Profil kelurahan belum tersedia', 404)

  const uploaded = (name, currentValue) => req.files?.[name]?.[0] ? `/uploads/site/${req.files[name][0].filename}` : currentValue
  const profile = {
    id: current.id,
    name: cleanText(req.body.name, 150),
    district: cleanText(req.body.district, 120),
    regency: cleanText(req.body.regency, 120),
    province: cleanText(req.body.province, 120),
    postalCode: cleanText(req.body.postal_code, 10),
    areaSizeHa: req.body.area_size_ha === '' || req.body.area_size_ha == null
      ? null
      : Number(req.body.area_size_ha),
    hamletCount: current.hamlet_count,
    boundaryNorth: cleanText(req.body.boundary_north, 255),
    boundaryEast: cleanText(req.body.boundary_east, 255),
    boundarySouth: cleanText(req.body.boundary_south, 255),
    boundaryWest: cleanText(req.body.boundary_west, 255),
    profileMapImage: uploaded('profile_map_image', current.profile_map_image),
    history: cleanText(req.body.history, 20000),
    vision: cleanText(req.body.vision, 10000),
    mission: cleanText(req.body.mission, 20000),
    homeHeroTitle: cleanText(req.body.home_hero_title, 255),
    homeHeroDescription: cleanText(req.body.home_hero_description, 3000),
    homeHeroImage: uploaded('home_hero_image', current.home_hero_image),
    welcomeTitle: cleanText(req.body.welcome_title, 255),
    welcomeText: cleanText(req.body.welcome_text, 5000),
    lurahName: cleanText(req.body.lurah_name, 180),
    lurahPhoto: uploaded('lurah_photo', current.lurah_photo),
    loginBackgroundImage: uploaded('login_background_image', current.login_background_image),
    governmentHeroTitle: cleanText(req.body.government_hero_title, 255),
    governmentHeroDescription: cleanText(req.body.government_hero_description, 3000),
    governmentHeroImage: uploaded('government_hero_image', current.government_hero_image),
    potentialHeroTitle: cleanText(req.body.potential_hero_title, 255),
    potentialHeroDescription: cleanText(req.body.potential_hero_description, 3000),
    potentialHeroImage: uploaded('potential_hero_image', current.potential_hero_image),
  }

  if (!profile.name) throw new AppError('Nama kelurahan wajib diisi', 400)
  if (profile.areaSizeHa !== null && (!Number.isFinite(profile.areaSizeHa) || profile.areaSizeHa < 0)) {
    throw new AppError('Luas wilayah harus berupa angka positif', 400)
  }

  const data = await contentModel.updateVillageProfile(profile)
  return sendSuccess(res, { data, message: 'Profil kelurahan berhasil diperbarui' })
}

async function updateDemographics(req, res) {
  const current = await contentModel.findDemographics()
  if (!current.summary) throw new AppError('Ringkasan demografi belum tersedia', 404)

  const allowedStatuses = new Set(['belum_diverifikasi', 'terverifikasi'])
  const status = cleanText(req.body.status, 30) || 'belum_diverifikasi'
  if (!allowedStatuses.has(status)) throw new AppError('Status data demografi tidak valid', 400)

  const summary = {
    id: current.summary.id,
    malePopulation: nullableInteger(req.body.male_population, 'Jumlah laki-laki'),
    femalePopulation: nullableInteger(req.body.female_population, 'Jumlah perempuan'),
    householdCount: nullableInteger(req.body.household_count, 'Jumlah KK'),
    rwCount: nullableInteger(req.body.rw_count, 'Jumlah RW'),
    rtCount: nullableInteger(req.body.rt_count, 'Jumlah RT'),
    dataYear: nullableInteger(req.body.data_year, 'Tahun data', { min: 1900, max: 2200 }),
    source: cleanText(req.body.source, 2000),
    status,
  }

  const data = await contentModel.updateDemographicSummary(summary)
  return sendSuccess(res, { data, message: 'Data demografi berhasil diperbarui' })
}

function parseArea(body) {
  const rwNumber = cleanText(body.rw_number, 10)
  const rtNumber = cleanText(body.rt_number, 10)
  if (!rwNumber || !rtNumber) throw new AppError('Nomor RW dan RT wajib diisi', 400)
  const status = cleanText(body.status, 30) || 'belum_diverifikasi'
  if (!new Set(['belum_diverifikasi', 'terverifikasi']).has(status)) {
    throw new AppError('Status data RT/RW tidak valid', 400)
  }
  return {
    rwNumber,
    rtNumber,
    householdCount: nullableInteger(body.household_count, 'Jumlah KK'),
    malePopulation: nullableInteger(body.male_population, 'Jumlah laki-laki'),
    femalePopulation: nullableInteger(body.female_population, 'Jumlah perempuan'),
    dataYear: nullableInteger(body.data_year, 'Tahun data', { min: 1900, max: 2200 }),
    source: cleanText(body.source, 2000),
    status,
  }
}

async function createArea(req, res) {
  try {
    const data = await contentModel.createAdministrativeArea(parseArea(req.body))
    return sendSuccess(res, { data, status: 201, message: 'Data RT/RW berhasil ditambahkan' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Kombinasi RW dan RT tersebut sudah tersedia', 400)
    throw error
  }
}

async function updateArea(req, res) {
  try {
    const data = await contentModel.updateAdministrativeArea(req.params.id, parseArea(req.body))
    if (!data) throw new AppError('Data RT/RW tidak ditemukan', 404)
    return sendSuccess(res, { data, message: 'Data RT/RW berhasil diperbarui' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Kombinasi RW dan RT tersebut sudah tersedia', 400)
    throw error
  }
}

async function deleteArea(req, res) {
  if (!await contentModel.deleteAdministrativeArea(req.params.id)) {
    throw new AppError('Data RT/RW tidak ditemukan', 404)
  }
  return sendSuccess(res, { message: 'Data RT/RW berhasil dihapus' })
}

module.exports = { updateProfile, updateDemographics, createArea, updateArea, deleteArea }
