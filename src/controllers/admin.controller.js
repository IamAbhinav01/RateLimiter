const { RedisTokenBucketService } = require('../services')
const redisTokenBucketService = new RedisTokenBucketService()

const adminController = {
    async getBucketStatus(req, res) {
        const { identifier } = req.params
        const status = await redisTokenBucketService.getBucketStatus(identifier)
        res.json({ success: true, data: status })
    },
    async listAllBuckets(req, res) {
        const data = await redisTokenBucketService.listAllBuckets()
        res.json({ success: true, data: data })
    },
    async resetBucket(req, res) {
        const { identifier } = req.params
        const data = await redisTokenBucketService.resetBucket(identifier)
        res.json({ success: data.success, data: data })
    },
    healthCheck(_req, res) {
        res.json({
            success: true,
            service: 'Token Bucket Rate Limiter',
            status: 'operational',
            time: new Date().toISOString(),
        })
    },
}

module.exports = adminController