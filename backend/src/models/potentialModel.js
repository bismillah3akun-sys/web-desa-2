const { pool: db } = require('../config/database')

const columns = `id, name, category, address, description, image_url,
  ST_Longitude(location) AS longitude, ST_Latitude(location) AS latitude`

async function findAll() {
  const [rows] = await db.query(`SELECT ${columns} FROM potentials ORDER BY id DESC`)
  return rows
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT ${columns} FROM potentials WHERE id = ?`, [id])
  return rows[0] || null
}

async function create(item) {
  const [result] = await db.execute(
    `INSERT INTO potentials(name, category, address, description, image_url, location)
     VALUES (?, ?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326))`,
    [item.name, item.category, item.address, item.description, item.imageUrl, item.longitude, item.latitude],
  )
  return findById(result.insertId)
}

async function update(id, item) {
  const [result] = await db.execute(
    `UPDATE potentials SET name = ?, category = ?, address = ?, description = ?,
       image_url = ?, location = ST_SRID(POINT(?, ?), 4326) WHERE id = ?`,
    [item.name, item.category, item.address, item.description, item.imageUrl,
      item.longitude, item.latitude, id],
  )
  return result.affectedRows ? findById(id) : null
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM potentials WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = { findAll, findById, create, update, remove }
