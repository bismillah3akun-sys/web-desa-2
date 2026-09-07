const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'profil_desa',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'profil_desa',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'mysql123',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
})

async function testConnection() {
  await pool.query('SELECT 1')
}

async function initializeDatabase() {
  const [tables] = await pool.query('SHOW TABLES')
  const existingTables = new Set(tables.map((row) => Object.values(row)[0]))
  const schemaPath = path.resolve(__dirname, '../../sql/init.sql')
  const statements = fs.readFileSync(schemaPath, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    // Seed only newly created tables so deleted or renamed content stays that way after restart.
    const seedTable = statement.match(/^INSERT\s+(?:IGNORE\s+)?INTO\s+([a-z_]+)/i)?.[1]
    if (seedTable && existingTables.has(seedTable)) continue
    await pool.query(statement)
  }
  const [columns] = await pool.query("SHOW COLUMNS FROM service_types LIKE 'deleted_at'")
  if (!columns.length) {
    await pool.query('ALTER TABLE service_types ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL')
  }
  const [requirementColumns] = await pool.query("SHOW COLUMNS FROM service_requirements LIKE 'is_active'")
  if (!requirementColumns.length) {
    await pool.query('ALTER TABLE service_requirements ADD COLUMN is_active BOOLEAN DEFAULT TRUE')
  }
  const [rwNumberColumn] = await pool.query("SHOW COLUMNS FROM admins LIKE 'rw_number'")
  if (!rwNumberColumn.length) await pool.query('ALTER TABLE admins ADD COLUMN rw_number VARCHAR(3) NULL AFTER role')
  const [whatsappColumn] = await pool.query("SHOW COLUMNS FROM admins LIKE 'whatsapp_number'")
  if (!whatsappColumn.length) await pool.query('ALTER TABLE admins ADD COLUMN whatsapp_number VARCHAR(20) NULL AFTER rw_number')
  await pool.query("UPDATE admins SET role='super_admin' WHERE role='admin'")
  const [requirementIndexes] = await pool.query("SHOW INDEX FROM service_requirements WHERE Key_name = 'uq_service_requirement_field'")
  if (requirementIndexes.length) {
    const [typeIndexes] = await pool.query("SHOW INDEX FROM service_requirements WHERE Key_name = 'idx_service_requirements_type'")
    if (!typeIndexes.length) {
      await pool.query('ALTER TABLE service_requirements ADD INDEX idx_service_requirements_type (service_type_id)')
    }
    await pool.query('ALTER TABLE service_requirements DROP INDEX uq_service_requirement_field')
  }

  const [rutilahuTables] = await pool.query("SHOW TABLES LIKE 'rutilahu_houses'")
  if (rutilahuTables.length) {
    const [nikCol] = await pool.query("SHOW COLUMNS FROM rutilahu_houses LIKE 'nik'")
    if (!nikCol.length) {
      await pool.query('ALTER TABLE rutilahu_houses ADD COLUMN nik VARCHAR(20) NULL AFTER owner_name')
    }
    const [famCol] = await pool.query("SHOW COLUMNS FROM rutilahu_houses LIKE 'family_members'")
    if (!famCol.length) {
      await pool.query('ALTER TABLE rutilahu_houses ADD COLUMN family_members INT UNSIGNED NOT NULL DEFAULT 1 AFTER rt')
    }
    const [eldCol] = await pool.query("SHOW COLUMNS FROM rutilahu_houses LIKE 'elderly_count'")
    if (!eldCol.length) {
      await pool.query('ALTER TABLE rutilahu_houses ADD COLUMN elderly_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER family_members')
    }
    const [landCol] = await pool.query("SHOW COLUMNS FROM rutilahu_houses LIKE 'land_status'")
    if (!landCol.length) {
      await pool.query("ALTER TABLE rutilahu_houses ADD COLUMN land_status VARCHAR(60) NOT NULL DEFAULT 'milik' AFTER elderly_count")
    }
    const [latitudeCol] = await pool.query("SHOW COLUMNS FROM rutilahu_houses LIKE 'latitude'")
    if (latitudeCol[0]?.Null === 'NO') {
      await pool.query('ALTER TABLE rutilahu_houses MODIFY latitude DECIMAL(10,7) NULL, MODIFY longitude DECIMAL(10,7) NULL')
    }

    const additions = [
      ['category', "VARCHAR(20) NOT NULL DEFAULT 'sedang'"], ['applicant_phone', 'VARCHAR(30) NULL'],
      ['submitted_by', 'INT UNSIGNED NULL'], ['identity_document', 'LONGBLOB NULL'],
      ['identity_document_mime', 'VARCHAR(80) NULL'], ['identity_document_name', 'VARCHAR(255) NULL'],
      ['referral_document', 'LONGBLOB NULL'], ['referral_document_mime', 'VARCHAR(80) NULL'],
      ['referral_document_name', 'VARCHAR(255) NULL'], ['ownership_document', 'LONGBLOB NULL'],
      ['ownership_document_mime', 'VARCHAR(80) NULL'], ['ownership_document_name', 'VARCHAR(255) NULL'],
    ]
    for (const [name, definition] of additions) {
      const [column] = await pool.query(`SHOW COLUMNS FROM rutilahu_houses LIKE '${name}'`)
      if (!column.length) await pool.query(`ALTER TABLE rutilahu_houses ADD COLUMN ${name} ${definition}`)
    }
    await pool.query(`UPDATE rutilahu_houses SET category = CASE
      WHEN handling_status='selesai' THEN 'sudah_ditangani'
      WHEN roof_condition='rusak_berat' OR wall_condition='rusak_berat' OR floor_condition='rusak_berat' THEN 'darurat'
      WHEN roof_condition='rusak_sedang' OR wall_condition='rusak_sedang' OR floor_condition='rusak_sedang' THEN 'sedang'
      ELSE 'ringan' END`)
  }
}

module.exports = { pool, testConnection, initializeDatabase }
