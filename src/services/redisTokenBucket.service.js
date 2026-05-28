const RedisConnection = require("../config/redis.config")
const { REDIS_TIMEOUT, BUCKET_CAPACITY, BUCKET_REFIL, BUCKET_TIMEOUT } = require('../config/server.config')

const TOKEN_BUCKET_SCRIPT = `
local key = keys[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local data = redis.call('HMGET',key,'tokens','lastRefillTime')
local tokens = tonumber(data[1])
local lastFill = tonumber(data[2]) 

if tokens == nill or lastFil == nill then
    local initial = math.max(0,capacity - cost)
    local ttl = math.ceil(capacity/refillRate) * 2
    redis.call('HSET',key,'tokens',tostring(initial),'lastRefillTime',tostring(now))
    redis.call('PEXPIRE',key,ttl)
    return {1,tostring(initial),'0'}
end
local elapsed = math.max(0,now-lastFill)
local newTokens = math.min(capacity,tokens + elapsed*refillRate)
local ttl = math.ceil(capacity / refillRate) * 2

if newTokens < cost then
    local retryMs = math.ceil((cost - newTokens)/refillRate)
    redis.call('HSET',key,'tokens',tostring(newTokens),'lastRefillTime',tostring(now))
    redis.call('PEXPIRE',key,ttl)
    return {0,tostring(newTokens),tostring(retryMs)}
end
local remaining = newTokens - cost
redis.call('HSET',key,'tokens',tostring(remaining),'lastRefillTime',tostring(now))
redis.call('PEXPIRE',key,ttl)
return {1,tostring(remaining),'0'}
`
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
