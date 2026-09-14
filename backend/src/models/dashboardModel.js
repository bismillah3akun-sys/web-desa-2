const { pool: db } = require('../config/database')

async function getSummary(admin) {
  if (admin?.role === 'rw') {
    const [rows] = await db.execute(`SELECT COUNT(*) AS rutilahu_count, COALESCE(SUM(verification_status='belum_diverifikasi'),0) AS unverified_rutilahu_count, COALESCE(SUM(verification_status='terverifikasi' AND handling_status!='selesai_ditangani'),0) AS active_rutilahu_count FROM rutilahu_houses WHERE submitted_by=?`, [admin.id])
    return { counts: { ...rows[0], news_count: 0, facility_count: 0, potential_count: 0, new_contact_count: 0, new_guestbook_count: 0, active_application_count: 0 }, recentGuestbook: [], recentContacts: [] }
  }
  const [[counts], [guestbook], [contacts]] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM news) AS news_count,
        (SELECT COUNT(*) FROM facilities) AS facility_count,
        (SELECT COUNT(*) FROM potentials) AS potential_count,
        (SELECT COUNT(*) FROM contacts WHERE status = 'baru') AS new_contact_count,
        (SELECT COUNT(*) FROM guestbook WHERE status = 'baru') AS new_guestbook_count,
        (SELECT COUNT(*) FROM service_applications WHERE status IN ('diajukan', 'diperiksa', 'revisi')) AS active_application_count,
        (SELECT COUNT(*) FROM rutilahu_houses) AS rutilahu_count,
        (SELECT COUNT(*) FROM rutilahu_houses WHERE verification_status = 'belum_diverifikasi') AS unverified_rutilahu_count,
        (SELECT COUNT(*) FROM rutilahu_houses WHERE verification_status = 'terverifikasi' AND handling_status != 'selesai_ditangani') AS active_rutilahu_count
    `),
    db.query(`
      SELECT id, name, institution, visit_purpose, visit_date, status, created_at
      FROM guestbook
      ORDER BY created_at DESC
      LIMIT 5
    `),
    db.query(`
      SELECT id, name, email, subject, status, created_at
      FROM contacts
      ORDER BY created_at DESC
      LIMIT 5
    `),
  ])

  return {
    counts: counts[0],
    recentGuestbook: guestbook,
    recentContacts: contacts,
  }
}

module.exports = { getSummary }
