const { pool: db } = require('../config/database')

async function findByUsername(username) {
  const [rows] = await db.execute(
    `SELECT id, username, display_name, password_hash, role, rw_number, is_active
     FROM admins
     WHERE LOWER(username) = ?
     LIMIT 1`,
    [username],
  )
  return rows[0] || null
}

async function updateLastLogin(id) {
  await db.execute('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [id])
}

async function ensureAdmin({ username, displayName, passwordHash, role = 'super_admin' }) {
  await db.execute(
    `INSERT INTO admins (username, display_name, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       password_hash = IF(password_hash = '', VALUES(password_hash), password_hash),
       updated_at = NOW()`,
    [username, displayName, passwordHash, role],
  )
}

async function findAllRw() {
  const [rows] = await db.query(`SELECT id,username,display_name,rw_number,whatsapp_number,is_active,last_login_at,created_at FROM admins WHERE role='rw' ORDER BY LPAD(rw_number,3,'0'),display_name`)
  return rows
}
async function createRw(account) {
  const [result] = await db.execute(`INSERT INTO admins(username,display_name,password_hash,role,rw_number,whatsapp_number) VALUES(?,?,?,'rw',?,?)`, [account.username, account.displayName, account.passwordHash, account.rwNumber, account.whatsappNumber])
  const [rows] = await db.execute('SELECT id,username,display_name,rw_number,whatsapp_number,is_active,created_at FROM admins WHERE id=?', [result.insertId])
  return rows[0]
}
async function updateRw(id, account) {
  const values = [account.username, account.displayName, account.rwNumber, account.whatsappNumber, account.isActive]
  let sql = `UPDATE admins SET username=?,display_name=?,rw_number=?,whatsapp_number=?,is_active=?`
  if (account.passwordHash) { sql += ',password_hash=?'; values.push(account.passwordHash) }
  values.push(id)
  const [result] = await db.execute(sql + ` WHERE id=? AND role='rw'`, values)
  if (!result.affectedRows) return null
  const [rows] = await db.execute('SELECT id,username,display_name,rw_number,whatsapp_number,is_active,created_at FROM admins WHERE id=?', [id])
  return rows[0]
}

module.exports = { findByUsername, updateLastLogin, ensureAdmin, findAllRw, createRw, updateRw }
