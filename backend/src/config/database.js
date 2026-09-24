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
  const profileColumns = [
    ['home_hero_title','VARCHAR(255) NULL'], ['home_hero_description','TEXT NULL'], ['home_hero_image','TEXT NULL'],
    ['welcome_title','VARCHAR(255) NULL'], ['welcome_text','TEXT NULL'], ['lurah_name','VARCHAR(180) NULL'], ['lurah_photo','TEXT NULL'],
    ['login_background_image','TEXT NULL'], ['government_hero_title','VARCHAR(255) NULL'], ['government_hero_description','TEXT NULL'],
    ['government_hero_image','TEXT NULL'], ['potential_hero_title','VARCHAR(255) NULL'], ['potential_hero_description','TEXT NULL'], ['potential_hero_image','TEXT NULL'],
    ['profile_map_image','TEXT NULL'],
  ]
  for (const [name, definition] of profileColumns) {
    const [column] = await pool.query(`SHOW COLUMNS FROM village_profile LIKE '${name}'`)
    if (!column.length) await pool.query(`ALTER TABLE village_profile ADD COLUMN ${name} ${definition}`)
  }
  const [whatsappColumn] = await pool.query("SHOW COLUMNS FROM admins LIKE 'whatsapp_number'")
  if (!whatsappColumn.length) await pool.query('ALTER TABLE admins ADD COLUMN whatsapp_number VARCHAR(20) NULL AFTER rw_number')
  const [officialImageColumn] = await pool.query("SHOW COLUMNS FROM government_officials LIKE 'image_url'")
  if (!officialImageColumn.length) await pool.query('ALTER TABLE government_officials ADD COLUMN image_url TEXT NULL AFTER description')
  const [officialNipColumn] = await pool.query("SHOW COLUMNS FROM government_officials LIKE 'nip'")
  if (!officialNipColumn.length) await pool.query('ALTER TABLE government_officials ADD COLUMN nip VARCHAR(80) NULL AFTER name')
  const [officialTypeColumn] = await pool.query("SHOW COLUMNS FROM government_officials LIKE 'personnel_type'")
  if (!officialTypeColumn.length) await pool.query("ALTER TABLE government_officials ADD COLUMN personnel_type VARCHAR(30) NOT NULL DEFAULT 'official' AFTER description")
  await pool.query("UPDATE village_profile SET name = 'Kelurahan KebonLega' WHERE name IN ('Kelurahan Kebon Lega', 'Kelurahan KebonLega', 'Desa Tanjungjaya')")
  await pool.query("UPDATE government_officials SET position = 'Lurah' WHERE position = 'Kepala Desa'")
  await pool.query("UPDATE government_officials SET position = 'Sekretaris Lurah' WHERE position = 'Sekretaris Desa'")
  const officialChartColumns = [
    ['parent_id', 'INT UNSIGNED NULL AFTER image_url'],
    ['chart_x', 'DECIMAL(10,2) NULL AFTER parent_id'],
    ['chart_y', 'DECIMAL(10,2) NULL AFTER chart_x'],
  ]
  for (const [name, definition] of officialChartColumns) {
    const [column] = await pool.query(`SHOW COLUMNS FROM government_officials LIKE '${name}'`)
    if (!column.length) await pool.query(`ALTER TABLE government_officials ADD COLUMN ${name} ${definition}`)
  }
  const [[officialChartState]] = await pool.query(`SELECT COUNT(*) AS total,
    SUM(parent_id IS NOT NULL) AS linked, SUM(chart_x IS NOT NULL OR chart_y IS NOT NULL) AS positioned
    FROM government_officials`)
  if (Number(officialChartState.total) > 1 && !Number(officialChartState.linked) && !Number(officialChartState.positioned)) {
    const [[rootOfficial]] = await pool.query('SELECT id FROM government_officials ORDER BY sort_order, id LIMIT 1')
    await pool.execute('UPDATE government_officials SET parent_id = ? WHERE id <> ?', [rootOfficial.id, rootOfficial.id])
  }
  await pool.query("UPDATE admins SET role='super_admin' WHERE role='admin'")
  const [requirementIndexes] = await pool.query("SHOW INDEX FROM service_requirements WHERE Key_name = 'uq_service_requirement_field'")
  if (requirementIndexes.length) {
    const [typeIndexes] = await pool.query("SHOW INDEX FROM service_requirements WHERE Key_name = 'idx_service_requirements_type'")
    if (!typeIndexes.length) {
      await pool.query('ALTER TABLE service_requirements ADD INDEX idx_service_requirements_type (service_type_id)')
    }
    await pool.query('ALTER TABLE service_requirements DROP INDEX uq_service_requirement_field')
  }

  // Status revisi has been removed from the service workflow. Convert legacy
  // rows before narrowing the ENUM so existing Railway databases migrate safely.
  await pool.query("UPDATE service_applications SET status='diperiksa', admin_note=NULL WHERE status='revisi'")
  await pool.query("UPDATE application_status_history SET status='diperiksa', note=NULL WHERE status='revisi'")
  await pool.query("ALTER TABLE service_applications MODIFY status ENUM('diajukan','diperiksa','disetujui','selesai','ditolak') NOT NULL DEFAULT 'diajukan'")
  await pool.query("ALTER TABLE application_status_history MODIFY status ENUM('diajukan','diperiksa','disetujui','selesai','ditolak') NOT NULL")

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
    // Legacy installations used VARCHAR(30). The longest current status is
    // "dalam_penanganan_program_bantuan", so widen both columns before
    // translating old values. Otherwise MySQL aborts startup with ER_DATA_TOO_LONG.
    await pool.query("ALTER TABLE rutilahu_houses MODIFY handling_status VARCHAR(60) NOT NULL DEFAULT 'belum_ditangani'")
    await pool.query('ALTER TABLE rutilahu_history MODIFY handling_status VARCHAR(60) NOT NULL')
    await pool.query("UPDATE rutilahu_houses SET handling_status='dalam_pengusulan' WHERE handling_status='diusulkan'")
    await pool.query("UPDATE rutilahu_houses SET handling_status='dalam_penanganan_program_bantuan' WHERE handling_status='dalam_penanganan'")
    await pool.query("UPDATE rutilahu_houses SET handling_status='selesai_ditangani' WHERE handling_status='selesai'")
    await pool.query("UPDATE rutilahu_history SET handling_status='dalam_pengusulan' WHERE handling_status='diusulkan'")
    await pool.query("UPDATE rutilahu_history SET handling_status='dalam_penanganan_program_bantuan' WHERE handling_status='dalam_penanganan'")
    await pool.query("UPDATE rutilahu_history SET handling_status='selesai_ditangani' WHERE handling_status='selesai'")
    await pool.query(`UPDATE rutilahu_houses SET category = CASE
      WHEN handling_status='selesai_ditangani' THEN 'sudah_ditangani'
      WHEN roof_condition='rusak_berat' OR wall_condition='rusak_berat' OR floor_condition='rusak_berat' THEN 'darurat'
      WHEN roof_condition='rusak_sedang' OR wall_condition='rusak_sedang' OR floor_condition='rusak_sedang' THEN 'sedang'
      ELSE 'ringan' END`)
  }

  await pool.query(`INSERT INTO service_types(name,slug,description,estimated_days,is_active)
    SELECT 'Layanan UMKM','layanan-umkm','Pendataan dan fasilitasi usaha mikro, kecil, dan menengah di Kelurahan KebonLega.',5,TRUE
    WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE slug='layanan-umkm')`)
  const [umkmRows] = await pool.query("SELECT id FROM service_types WHERE slug='layanan-umkm' LIMIT 1")
  if (umkmRows.length) {
    const umkmId = umkmRows[0].id
    const requirements = [
      ['Foto usaha atau produk', 'foto_usaha_produk', 'file', 'Unggah foto usaha atau produk yang dijual.', true, 'jpg,jpeg,png', 5, 1],
      ['Foto lokasi usaha', 'foto_lokasi_usaha', 'file', 'Unggah foto lokasi tempat usaha.', true, 'jpg,jpeg,png', 5, 2],
      ['KTP pemilik usaha', 'ktp_pemilik_usaha', 'file', 'Unggah KTP pemilik atau penanggung jawab usaha.', true, 'jpg,jpeg,png,pdf', 5, 3],
      ['NIB (jika ada)', 'nib', 'file', 'Unggah Nomor Induk Berusaha jika sudah memiliki.', false, 'jpg,jpeg,png,pdf', 5, 4],
      ['Sertifikat halal (opsional)', 'sertifikat_halal', 'file', 'Unggah sertifikat halal jika sudah memiliki.', false, 'jpg,jpeg,png,pdf', 5, 5],
    ]
    for (const requirement of requirements) {
      await pool.execute(`INSERT INTO service_requirements(service_type_id,label,field_name,field_type,instructions,is_required,accepted_formats,max_file_size_mb,sort_order,is_active)
        SELECT ?,?,?,?,?,?,?,?,?,TRUE WHERE NOT EXISTS (SELECT 1 FROM service_requirements WHERE service_type_id=? AND field_name=?)`,
      [umkmId, ...requirement, umkmId, requirement[1]])
    }
  }
}

module.exports = { pool, testConnection, initializeDatabase }
