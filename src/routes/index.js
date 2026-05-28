const express = require('express')
const router = express.Router();
const demoRoutes = require('./demo.routes')
const adminRoutes = require('./admin.routes')
router.use('/demo', demoRoutes)
router.use('/admin', adminRoutes)

module.exports = router