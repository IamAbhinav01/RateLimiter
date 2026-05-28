const express = require('express')
const router = express.Router()
const demo = require('../controllers/demo.controller')

const { strictLimiter, standardLimiter, premiumLimiter, createRateLimiter } = require('../middlewares/ratelimitter.middleware')


router.get('/ping', standardLimiter, demo.publicEndpoint)
router.post('/login', strictLimiter, demo.loginEndpoint)
router.get('/premium', premiumLimiter, demo.premiumEndpoint)
router.get('/heavy', createRateLimiter({ label: 'heavy', cost: 3 }), demo.heavyEndpoint)

module.exports = router