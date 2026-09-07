const AppError = require('../utils/AppError')
const { verifyToken } = require('../services/authService')

function requireAuth(req, _res, next) {
  const token = req.cookies?.admin_token

  if (!token) {
    return next(new AppError('Silakan masuk sebagai admin', 401))
  }

  try {
    req.admin = verifyToken(token)
    if (req.admin.role === 'admin') req.admin.role = 'super_admin'
    return next()
  } catch (_error) {
    return next(new AppError('Sesi admin tidak valid atau telah berakhir', 401))
  }
}

function requireSuperAdmin(req, _res, next) {
  // Token sesi lama dapat masih membawa role "admin" sampai masa berlakunya
  // habis. Akun tersebut adalah akun utama yang dimigrasikan ke super_admin.
  if (!['super_admin', 'admin'].includes(req.admin?.role)) {
    return next(new AppError('Fitur ini hanya dapat diakses Super Admin Kelurahan', 403))
  }
  return next()
}

module.exports = { requireAuth, requireSuperAdmin }
