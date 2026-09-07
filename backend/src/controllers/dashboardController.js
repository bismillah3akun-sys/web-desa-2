const dashboardModel = require('../models/dashboardModel')
const { sendSuccess } = require('../utils/apiResponse')

async function getDashboard(req, res) {
  const data = await dashboardModel.getSummary(req.admin)
  return sendSuccess(res, {
    data,
    message: 'Ringkasan dashboard berhasil diambil',
  })
}

module.exports = { getDashboard }
