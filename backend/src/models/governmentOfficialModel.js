const { pool: db } = require('../config/database')

async function findAll({ publicOnly = false } = {}) {
  const where = publicOnly ? 'WHERE is_active = TRUE' : ''
  const [rows] = await db.query(
    `SELECT * FROM government_officials ${where} ORDER BY sort_order, id`,
  )
  return rows
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM government_officials WHERE id = ?', [id])
  return rows[0] || null
}

async function create(item) {
  const [result] = await db.execute(
    `INSERT INTO government_officials (position, name, nip, description, personnel_type, image_url, parent_id, chart_x, chart_y, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.position, item.name, item.nip, item.description, item.personnelType, item.imageUrl, item.parentId, item.chartX, item.chartY, item.sortOrder, item.isActive],
  )
  return findById(result.insertId)
}

async function update(id, item) {
  const [result] = await db.execute(
    `UPDATE government_officials
     SET position = ?, name = ?, nip = ?, description = ?, personnel_type = ?, image_url = ?, parent_id = ?, chart_x = ?, chart_y = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [item.position, item.name, item.nip, item.description, item.personnelType, item.imageUrl, item.parentId, item.chartX, item.chartY, item.sortOrder, item.isActive, id],
  )
  return result.affectedRows ? findById(id) : null
}

async function remove(id) {
  await db.execute('UPDATE government_officials SET parent_id = NULL WHERE parent_id = ?', [id])
  const [result] = await db.execute('DELETE FROM government_officials WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function updatePosition(id, x, y) {
  const [result] = await db.execute('UPDATE government_officials SET chart_x = ?, chart_y = ? WHERE id = ?', [x, y, id])
  return result.affectedRows ? findById(id) : null
}

module.exports = { findAll, findById, create, update, remove, updatePosition }
