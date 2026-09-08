const AppError = require('../utils/AppError')
const VERIFICATION = ['belum_diverifikasi', 'terverifikasi', 'ditolak']
const HANDLING = ['belum_ditangani', 'diusulkan', 'dalam_penanganan', 'selesai']
const CONDITION = ['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat']
const FIELDS = [
  'record_code',
  'owner_name',
  'nik',
  'address',
  'rw',
  'rt',
  'family_members',
  'elderly_count',
  'land_status',
  'latitude',
  'longitude',
  'roof_condition',
  'wall_condition',
  'floor_condition',
  'sanitation',
  'notes',
  'verification_status',
  'handling_status',
  'verification_note',
  'handling_note',
  'category',
  'applicant_phone',
]
function validate(input) {
  const result = {}
  const text = (name, max, required = false) => {
    if (input[name] != null && !['string', 'number'].includes(typeof input[name])) throw new AppError(`${name} tidak valid`, 400)
    const value = String(input[name] ?? '').trim()
    if ((required && !value) || value.length > max) throw new AppError(`${name} wajib diisi dan maksimal ${max} karakter`, 400)
    result[name] = value
  }
  text('record_code', 40, true)
  if (!/^[A-Za-z0-9_-]+$/.test(result.record_code)) throw new AppError('Kode rumah hanya boleh huruf, angka, tanda - dan _', 400)
  result.record_code = result.record_code.toUpperCase()
  text('owner_name', 180, true)
  text('nik', 16, false)
  if (result.nik && !/^\d{1,16}$/.test(result.nik)) throw new AppError('NIK hanya boleh berisi maksimal 16 digit angka', 400)
  text('address', 1000, true)
  for (const key of ['rw', 'rt']) {
    const value = String(input[key] ?? '').trim()
    if (!/^\d{1,3}$/.test(value) || Number(value) < 1) throw new AppError('RT dan RW harus angka 1–999', 400)
    result[key] = String(Number(value)).padStart(2, '0')
  }

  // Family members & elderly count
  const rawFamily = input.family_members != null ? String(input.family_members).replace(/\D/g, '') : ''
  result.family_members = rawFamily ? Math.max(1, Number(rawFamily)) : 1

  const rawElderly = input.elderly_count != null ? String(input.elderly_count).replace(/\D/g, '') : ''
  result.elderly_count = rawElderly ? Math.max(0, Number(rawElderly)) : 0

  text('land_status', 60, false)
  if (!result.land_status) result.land_status = 'milik'

  for (const [key, limit] of [['latitude', 90], ['longitude', 180]]) {
    const raw = input[key]
    if (raw == null || String(raw).trim() === '') {
      result[key] = null
      continue
    }
    if (!['string', 'number'].includes(typeof raw) || !Number.isFinite(Number(raw)) || Math.abs(Number(raw)) > limit) throw new AppError(`${key} tidak valid`, 400)
    result[key] = Number(raw)
  }
  if ((result.latitude == null) !== (result.longitude == null)) throw new AppError('Latitude dan longitude harus diisi bersamaan', 400)
  if (result.latitude != null && (result.latitude < -6.9536107 || result.latitude > -6.939777 || result.longitude < 107.5864355 || result.longitude > 107.6098573)) {
    throw new AppError('Titik koordinat berada di luar cakupan Kelurahan Kebon Lega', 400)
  }
  for (const [key, options] of [['roof_condition', CONDITION], ['wall_condition', CONDITION], ['floor_condition', CONDITION], ['sanitation', ['layak', 'tidak_layak']], ['verification_status', VERIFICATION], ['handling_status', HANDLING]]) {
    const val = input[key] || (key === 'sanitation' ? 'tidak_layak' : key === 'verification_status' ? 'belum_diverifikasi' : key === 'handling_status' ? 'belum_ditangani' : 'rusak_sedang')
    if (!options.includes(val)) throw new AppError(`${key} tidak valid`, 400)
    result[key] = val
  }
  const categoryOptions = ['darurat', 'sedang', 'ringan', 'sudah_ditangani']
  const conditions = [result.roof_condition, result.wall_condition, result.floor_condition]
  const derivedCategory = result.handling_status === 'selesai' ? 'sudah_ditangani' : conditions.includes('rusak_berat') ? 'darurat' : conditions.includes('rusak_sedang') ? 'sedang' : 'ringan'
  result.category = categoryOptions.includes(input.category) ? input.category : derivedCategory
  text('applicant_phone', 30)
  for (const key of ['notes', 'verification_note', 'handling_note']) text(key, 4000)
  if (result.verification_status !== 'belum_diverifikasi' && !result.verification_note) throw new AppError('Catatan verifikasi wajib diisi saat memverifikasi atau menolak', 400)
  if (result.handling_status !== 'belum_ditangani' && result.verification_status !== 'terverifikasi') throw new AppError('Rumah harus terverifikasi sebelum diproses penanganannya', 400)
  if (result.handling_status !== 'belum_ditangani' && !result.handling_note) throw new AppError('Catatan penanganan wajib diisi', 400)
  return result
}
function version(value) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new AppError('Versi data tidak valid', 400)
  return Number(value)
}
function summarize(rows) {
  const summary = { total: rows.length, pending: 0, verified: 0, rejected: 0, in_progress: 0, completed: 0, by_rt: [] }
  const areas = new Map()
  for (const row of rows) {
    if (row.verification_status === 'belum_diverifikasi') summary.pending++
    if (row.verification_status === 'terverifikasi') summary.verified++
    if (row.verification_status === 'ditolak') summary.rejected++
    if (row.handling_status === 'dalam_penanganan') summary.in_progress++
    if (row.handling_status === 'selesai') summary.completed++
    const key = `${row.rw}/${row.rt}`
    if (!areas.has(key)) areas.set(key, { rw: row.rw, rt: row.rt, total: 0, active: 0 })
    const area = areas.get(key); area.total++
    if (row.verification_status === 'terverifikasi' && row.handling_status !== 'selesai') area.active++
  }
  summary.by_rt = [...areas.values()].sort((a, b) => b.active - a.active || b.total - a.total || a.rw.localeCompare(b.rw) || a.rt.localeCompare(b.rt))
  return summary
}
module.exports = { validate, version, summarize, FIELDS }
