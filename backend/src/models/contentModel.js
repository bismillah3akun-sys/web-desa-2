const { pool: db } = require('../config/database')

const SPATIAL_COLUMNS = `
  id,
  name,
  category,
  address,
  description,
  image_url,
  ST_Longitude(location) AS longitude,
  ST_Latitude(location) AS latitude
`

async function findVillageProfile() {
  const [rows] = await db.query('SELECT * FROM village_profile ORDER BY id LIMIT 1')
  return rows[0] || null
}

async function updateVillageProfile(profile) {
  await db.execute(
    `UPDATE village_profile
     SET name = ?, district = ?, regency = ?, province = ?, postal_code = ?,
         area_size_ha = ?, hamlet_count = ?, boundary_north = ?, boundary_east = ?,
         boundary_south = ?, boundary_west = ?, profile_map_image = ?, history = ?, vision = ?, mission = ?,
         home_hero_title = ?, home_hero_description = ?, home_hero_image = ?,
         welcome_title = ?, welcome_text = ?, lurah_name = ?, lurah_photo = ?,
         login_background_image = ?, government_hero_title = ?, government_hero_description = ?, government_hero_image = ?,
         potential_hero_title = ?, potential_hero_description = ?, potential_hero_image = ?
     WHERE id = ?`,
    [
      profile.name,
      profile.district,
      profile.regency,
      profile.province,
      profile.postalCode,
      profile.areaSizeHa,
      profile.hamletCount,
      profile.boundaryNorth,
      profile.boundaryEast,
      profile.boundarySouth,
      profile.boundaryWest,
      profile.profileMapImage,
      profile.history,
      profile.vision,
      profile.mission,
      profile.homeHeroTitle, profile.homeHeroDescription, profile.homeHeroImage,
      profile.welcomeTitle, profile.welcomeText, profile.lurahName, profile.lurahPhoto,
      profile.loginBackgroundImage, profile.governmentHeroTitle, profile.governmentHeroDescription, profile.governmentHeroImage,
      profile.potentialHeroTitle, profile.potentialHeroDescription, profile.potentialHeroImage,
      profile.id,
    ],
  )

  return findVillageProfile()
}

async function findAllNews() {
  const [rows] = await db.query('SELECT * FROM news WHERE is_published = TRUE ORDER BY published_at DESC')
  return rows
}

async function findNewsById(id) {
  const [rows] = await db.execute('SELECT * FROM news WHERE id = ? AND is_published = TRUE', [id])
  return rows[0] || null
}

async function findSpatialRecords(table) {
  const allowedTables = new Set(['facilities', 'potentials'])
  if (!allowedTables.has(table)) throw new Error('Nama tabel spasial tidak diizinkan')

  const [rows] = await db.query(`SELECT ${SPATIAL_COLUMNS} FROM ${table} ORDER BY id`)
  return rows
}

async function findDemographics() {
  const [summaryRows] = await db.query(`
    SELECT
      id,
      male_population,
      female_population,
      CASE
        WHEN male_population IS NULL AND female_population IS NULL THEN NULL
        ELSE COALESCE(male_population, 0) + COALESCE(female_population, 0)
      END AS total_population,
      household_count,
      rw_count,
      rt_count,
      data_year,
      source,
      status,
      updated_at
    FROM demographic_summary
    ORDER BY id DESC
    LIMIT 1
  `)

  const [areas] = await db.query(`
    SELECT
      id,
      rw_number,
      rt_number,
      household_count,
      male_population,
      female_population,
      CASE
        WHEN male_population IS NULL AND female_population IS NULL THEN NULL
        ELSE COALESCE(male_population, 0) + COALESCE(female_population, 0)
      END AS total_population,
      data_year,
      source,
      status,
      updated_at
    FROM administrative_areas
    ORDER BY LPAD(rw_number, 10, '0'), LPAD(rt_number, 10, '0')
  `)

  return { summary: summaryRows[0] || null, areas }
}

async function updateDemographicSummary(summary) {
  await db.execute(
    `UPDATE demographic_summary
     SET male_population = ?, female_population = ?, household_count = ?,
         rw_count = ?, rt_count = ?, data_year = ?, source = ?, status = ?
     WHERE id = ?`,
    [
      summary.malePopulation,
      summary.femalePopulation,
      summary.householdCount,
      summary.rwCount,
      summary.rtCount,
      summary.dataYear,
      summary.source,
      summary.status,
      summary.id,
    ],
  )

  return findDemographics()
}

async function syncDemographicSummaryFromAreas(connection = db) {
  const [rows] = await connection.query(`
    SELECT
      COUNT(DISTINCT rw_number) AS rw_count,
      COUNT(*) AS rt_count,
      SUM(household_count) AS household_count,
      SUM(male_population) AS male_population,
      SUM(female_population) AS female_population,
      MAX(data_year) AS data_year
    FROM administrative_areas
  `)
  const totals = rows[0]

  await connection.execute(
    `UPDATE demographic_summary
     SET rw_count = ?, rt_count = ?, household_count = ?, male_population = ?,
         female_population = ?, data_year = COALESCE(?, data_year)
     WHERE id = (SELECT id FROM (SELECT id FROM demographic_summary ORDER BY id DESC LIMIT 1) current_summary)`,
    [totals.rw_count, totals.rt_count, totals.household_count,
      totals.male_population, totals.female_population, totals.data_year],
  )
}

async function createAdministrativeArea(area) {
  const [result] = await db.execute(
    `INSERT INTO administrative_areas
      (rw_number, rt_number, household_count, male_population, female_population,
       data_year, source, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [area.rwNumber, area.rtNumber, area.householdCount, area.malePopulation,
      area.femalePopulation, area.dataYear, area.source, area.status],
  )
  await syncDemographicSummaryFromAreas()
  const [rows] = await db.execute('SELECT * FROM administrative_areas WHERE id = ?', [result.insertId])
  return rows[0]
}

async function updateAdministrativeArea(id, area) {
  const [result] = await db.execute(
    `UPDATE administrative_areas
     SET rw_number = ?, rt_number = ?, household_count = ?, male_population = ?,
         female_population = ?, data_year = ?, source = ?, status = ?
     WHERE id = ?`,
    [area.rwNumber, area.rtNumber, area.householdCount, area.malePopulation,
      area.femalePopulation, area.dataYear, area.source, area.status, id],
  )
  if (!result.affectedRows) return null
  await syncDemographicSummaryFromAreas()
  const [rows] = await db.execute('SELECT * FROM administrative_areas WHERE id = ?', [id])
  return rows[0]
}

async function deleteAdministrativeArea(id) {
  const [result] = await db.execute('DELETE FROM administrative_areas WHERE id = ?', [id])
  if (result.affectedRows) await syncDemographicSummaryFromAreas()
  return result.affectedRows > 0
}

module.exports = {
  findVillageProfile,
  updateVillageProfile,
  findAllNews,
  findNewsById,
  findSpatialRecords,
  findDemographics,
  updateDemographicSummary,
  createAdministrativeArea,
  updateAdministrativeArea,
  deleteAdministrativeArea,
}
