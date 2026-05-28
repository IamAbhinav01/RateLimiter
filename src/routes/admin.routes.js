const express = require('express')
const router = express.Router()
const admin = require('../controllers/admin.controller')



router.get('/health', admin.healthCheck)
router.get('/bucket/:identifier', admin.getBucketStatus)
router.delete('/bucket/:identifier', admin.resetBucket)
router.get('/buckets', admin.listAllBuckets)
module.exports = router