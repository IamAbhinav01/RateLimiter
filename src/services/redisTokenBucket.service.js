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

if tokens == nill or lastFill == nill then
    local initial = math.max(0,capacity - cost)
    local ttl = math.ceil(capacity/refillRate) * 2
    redis.call('HSET',key,'tokens',tostring(initial),'lastRefillTime',tostring(now))
    redis.call('PEXPIRE',key,ttl)
    return {1,tostring(initial),'0'}
end
local elapsed = math.max(0,now-lastFilll)
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
        this.defaultCapacity = BUCKET_CAPACITY
        this.defaultRefil = BUCKET_REFIL
        this.defaultTimeout = BUCKET_TIMEOUT
        this.redisTimeout = REDIS_TIMEOUT
    }

    getClientKey(identifier) {
        return `rl:tb:${identifier}`
    }

    async getBucketStatus(identifier) {
        const key = await this.getClientKey(identifier)

        try {
            const data = await this.redisClient.hmget(key, 'tokens', 'lastRefillTime')
            const ttl = await this.redisClient.pttl(key)
            const tokens = data[0] !== null ? parseFloat(data[0]) : null
            const lastFill = data[1] !== null ? parseInt(data[1], 10) : null

            if (tokens == null) return { exists: false, identifier }
            const refillRateMs = this.defaultRefil / this.defaultTimeout
            const elapsed = Date.now() - lastFill
            const projectedTokens = Math.min(this.defaultCapacity, tokens + elapsed * refillRateMs)
            return { exists: true, identifier, storedTokens: Math.floor(tokens), projectedTokens: Math.floor(projectedTokens), capacity: this.defaultCapacity, lastRefillTime: lastFill, ttlMs: ttl, redisKey: key }
        } catch (error) {
            return { exists: false, identifier, error: err.message }
        }


    }
}

module.exports = RedisTokenBucketService
