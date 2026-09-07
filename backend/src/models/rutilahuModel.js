const { pool } = require('../config/database')
const AppError = require('../utils/AppError')
const { FIELDS } = require('../services/rutilahuValidation')
const columns = `id, ${FIELDS.join(', ')}, photo IS NOT NULL AS has_photo, version, created_at, updated_at`
async function list() {
  const [rows] = await pool.query(`SELECT ${columns} FROM rutilahu_houses ORDER BY updated_at DESC, id DESC`)
  return rows
}
async function detail(id) {
  const [rows] = await pool.execute(`SELECT ${columns} FROM rutilahu_houses WHERE id=?`, [id])
  if (!rows.length) throw new AppError('Rumah tidak ditemukan', 404)
  const [history] = await pool.execute(`SELECT h.id,h.action,h.verification_status,h.handling_status,h.note,h.created_at,a.display_name AS officer FROM rutilahu_history h LEFT JOIN admins a ON a.id=h.changed_by WHERE h.house_id=? ORDER BY h.id DESC`, [id])
  return { ...rows[0], history }
}
async function transaction(work) {
  const db = await pool.getConnection()
  try { await db.beginTransaction(); const result = await work(db); await db.commit(); return result }
  catch (error) { await db.rollback(); if (error.code === 'ER_DUP_ENTRY') throw new AppError('Kode rumah sudah digunakan. Gunakan kode unik untuk setiap rumah.', 409); throw error }
  finally { db.release() }
}
async function history(db, id, data, admin, action) {
  await db.execute('INSERT INTO rutilahu_history(house_id,action,verification_status,handling_status,note,changed_by) VALUES(?,?,?,?,?,?)', [id, action, data.verification_status, data.handling_status, [data.verification_note, data.handling_note, data.notes].filter(Boolean).join('\n'), admin])
}
async function insert(db, data, admin, photo, action = 'dibuat') {
  const [result] = await db.execute(`INSERT INTO rutilahu_houses(${FIELDS.join(',')},photo,photo_mime) VALUES(${[...FIELDS, 'photo', 'photo_mime'].map(() => '?').join(',')})`, [...FIELDS.map(key => data[key]), photo?.buffer || null, photo?.mimetype || null])
  await history(db, result.insertId, data, admin, action)
  return result.insertId
}
async function save(id, data, admin, expectedVersion, photo, removePhoto) {
  const savedId = await transaction(async db => {
    if (!id) return insert(db, data, admin, photo)
    const [rows] = await db.execute('SELECT version FROM rutilahu_houses WHERE id=? FOR UPDATE', [id])
    if (!rows.length) throw new AppError('Rumah tidak ditemukan', 404)
    if (rows[0].version !== expectedVersion) throw new AppError('Data telah diubah petugas lain. Muat ulang sebelum menyimpan.', 409)
    let sql = `UPDATE rutilahu_houses SET ${FIELDS.map(key => `${key}=?`).join(',')},version=version+1`
    const values = FIELDS.map(key => data[key])
    if (photo || removePhoto) { sql += ',photo=?,photo_mime=?'; values.push(photo?.buffer || null, photo?.mimetype || null) }
    await db.execute(sql + ' WHERE id=?', [...values, id])
    await history(db, id, data, admin, 'diperbarui')
    return id
  })
  return detail(savedId)
}
async function importRows(rows, admin) {
  return transaction(async db => {
    for (const row of rows) await insert(db, row, admin, null, 'impor_excel')
    return rows.length
  })
}
async function remove(id, expectedVersion) {
  const [result] = await pool.execute('DELETE FROM rutilahu_houses WHERE id=? AND version=?', [id, expectedVersion])
  if (!result.affectedRows) throw new AppError('Data sudah berubah atau telah dihapus. Muat ulang data.', 409)
}
async function photo(id) {
  const [rows] = await pool.execute('SELECT photo,photo_mime FROM rutilahu_houses WHERE id=?', [id])
  if (!rows[0]?.photo) throw new AppError('Foto tidak ditemukan', 404)
  return rows[0]
}
module.exports = { list, detail, save, importRows, remove, photo }
