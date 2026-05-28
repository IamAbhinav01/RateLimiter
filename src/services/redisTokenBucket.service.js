const RedisConnection = require("../config/redis.config")
const { REDIS_TIMEOUT, BUCKET_CAPACITY, BUCKET_REFIL, BUCKET_TIMEOUT } = require('../config/server.config')


class RedisTokenBucketService {
    constructor() {
        this.redisClient = RedisConnection
        this.bucketCapacity = parseInt(BUCKET_CAPACITY, 10)
        this.bucketRefill = parseInt(BUCKET_REFIL, 10)
        this.bucketTimeout = parseInt(BUCKET_TIMEOUT, 10)
        this.redisTimeout = parseInt(REDIS_TIMEOUT, 10)
    }

    async getClientKey(userId) {
        return `user:${userId}:token_bucket`
    }

    async isRequestAllowed(userId) {
        const key = await this.getClientKey(userId)

        try {
        } catch (error) {
            return { allowed: true, remaining: null, capacity, retryAfterMs: 0, identifier }
        }

    }


}

module.exports = new RedisTokenBucketService()
