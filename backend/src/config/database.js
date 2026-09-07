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

    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM rutilahu_houses')
    if (count === 0) {
      await pool.query(`
        INSERT IGNORE INTO rutilahu_houses (record_code, owner_name, nik, address, rw, rt, family_members, elderly_count, land_status, latitude, longitude, roof_condition, wall_condition, floor_condition, sanitation, notes, verification_status, handling_status, verification_note, handling_note) VALUES
        ('KBL-RTLH-001', 'ADAM RAHADIAN', '3273172609820001', 'JLN.LEWISARI V NO.18 RT 009/001 KELURAHAN KEBONLEGA', '01', '09', 4, 0, 'milik', -6.9442000, 107.5965000, 'rusak_berat', 'rusak_ringan', 'rusak_ringan', 'tidak_layak', '1 KK', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan penanganan atap genteng & struktur rangka'),
        ('KBL-RTLH-002', 'SULASTRI', '3273174101660005', 'KEBONLEGA I RT 006/002 KELURAHAN KEBONLEGA', '02', '06', 1, 0, 'milik', -6.9458000, 107.5978000, 'rusak_sedang', 'rusak_sedang', 'rusak_sedang', 'tidak_layak', '1 KK', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan perbaikan atap bocor, plester dinding & lantai'),
        ('KBL-RTLH-003', 'TETI SRIE MUNGGAHATI', '3273175501640000', 'JL.INHOFTANK RT 003/003 KELURAHAN KEBONLEGA', '03', '03', 2, 1, 'milik', -6.9482000, 107.5995000, 'rusak_berat', 'rusak_berat', 'rusak_berat', 'tidak_layak', '1 KK (Terdapat Lansia)', 'terverifikasi', 'dalam_penanganan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul - Prioritas Tinggi Lansia', 'Dalam proses perbaikan total atap, dinding bata, lantai semen'),
        ('KBL-RTLH-004', 'IWAN SUDARMANTO', '3273173105690000', 'JL.INHOFTANK RANJENG RT 004/003 KELURAHAN KEBONLEGA', '03', '04', 4, 0, 'milik', -6.9485000, 107.5992000, 'rusak_sedang', 'rusak_sedang', 'rusak_sedang', 'tidak_layak', '1 KK', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan bantuan material renovasi'),
        ('KBL-RTLH-005', 'ODANG', '3273171111620000', 'JL.INHOFTANK RANJENG RT 004/003 KELURAHAN KEBONLEGA', '03', '04', 5, 1, 'milik', -6.9487000, 107.5998000, 'rusak_ringan', 'rusak_ringan', 'rusak_ringan', 'tidak_layak', '1 KK (Terdapat Lansia)', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan bantuan renovasi berkala'),
        ('KBL-RTLH-006', 'IWAN HERMAWAN', '3273172905640001', 'JL.INHOFTANK NO.43/201A RT 002/003', '03', '02', 3, 0, 'milik', -6.9480000, 107.5990000, 'rusak_berat', 'rusak_ringan', 'rusak_ringan', 'tidak_layak', '1 KK', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan perbaikan atap kayu rapuh'),
        ('KBL-RTLH-007', 'IWAN RAHMAT SELAMAT', '3273170106670003', 'JL.INHOFTANK RANJENG RT 004/003 KELURAHAN KEBONLEGA', '03', '04', 3, 0, 'milik', -6.9489000, 107.5994000, 'rusak_berat', 'rusak_ringan', 'rusak_ringan', 'tidak_layak', '1 KK', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan perbaikan atap bocor parah'),
        ('KBL-RTLH-008', 'TEJA NURJAMAN', '3273172607950001', 'JL.INHOFTANK RANJENG RT 004/003 KELURAHAN KEBONLEGA', '03', '04', 4, 0, 'milik', -6.9491000, 107.5996000, 'rusak_ringan', 'rusak_ringan', 'rusak_ringan', 'tidak_layak', '1 KK', 'terverifikasi', 'selesai', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Bantuan perbaikan selesai dilaksanakan'),
        ('KBL-RTLH-009', 'BUDI SUPARMO', '3273172303720000', 'JL.INHOFTANK RANJENG RT 004/003 KELURAHAN KEBONLEGA', '03', '04', 5, 0, 'milik', -6.9493000, 107.5993000, 'rusak_berat', 'rusak_berat', 'rusak_ringan', 'tidak_layak', '1 KK', 'terverifikasi', 'dalam_penanganan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Tahap pembongkaran dan pembangunan kembali dinding dan atap'),
        ('KBL-RTLH-010', 'SALIMUN', '3273170806670001', 'JL.INHOFTANK GG BP.MANTA NO.48 RT 003/003', '03', '03', 4, 0, 'milik', -6.9483000, 107.5988000, 'rusak_berat', 'rusak_berat', 'rusak_berat', 'tidak_layak', '1 KK', 'terverifikasi', 'diusulkan', 'Diverifikasi data lapangan Kecamatan Bojongloa Kidul', 'Diusulkan bedah rumah menyeluruh')
      `)
    }
  }
}

module.exports = { pool, testConnection, initializeDatabase }
