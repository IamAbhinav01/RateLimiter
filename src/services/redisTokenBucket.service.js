const RedisConnection = require("../config/redis.config")
const { REDIS_TIMEOUT, BUCKET_CAPACITY, BUCKET_REFIL, BUCKET_TIMEOUT } = require('../config/server.config')

// Lua script: atomically refill tokens based on elapsed time, then consume one.
// Returns 1 → request allowed | 0 → request denied
const TOKEN_BUCKET_SCRIPT = `
local key            = KEYS[1]
local capacity       = tonumber(ARGV[1])
local refillRate     = tonumber(ARGV[2])
local refillInterval = tonumber(ARGV[3])
local now            = tonumber(ARGV[4])

local bucket         = redis.call('HMGET', key, 'tokens', 'lastRefillTime')
local tokens         = tonumber(bucket[1])
local lastRefillTime = tonumber(bucket[2])

-- Initialise bucket on first request
if tokens == nil or lastRefillTime == nil then
    tokens         = capacity
    lastRefillTime = now
end

-- Passive refill: add tokens proportional to elapsed intervals
local elapsed     = math.max(0, now - lastRefillTime)
local intervals   = math.floor(elapsed / refillInterval)
local tokensToAdd = intervals * refillRate

if tokensToAdd > 0 then
    tokens         = math.min(capacity, tokens + tokensToAdd)
    lastRefillTime = lastRefillTime + (intervals * refillInterval)
end

-- Persist state; auto-expire after 2 refill intervals of inactivity
redis.call('HSET', key, 'tokens', tokens, 'lastRefillTime', lastRefillTime)
redis.call('PEXPIRE', key, refillInterval * 2)

-- Consume one token
if tokens >= 1 then
    redis.call('HSET', key, 'tokens', tokens - 1)
    return 1
else
    return 0
end
`

class RedisTokenBucketService {
    constructor() {
        this.redisClient    = RedisConnection
        this.bucketCapacity = parseInt(BUCKET_CAPACITY, 10)
        this.bucketRefill   = parseInt(BUCKET_REFIL, 10)
        this.bucketTimeout  = parseInt(BUCKET_TIMEOUT, 10)
        this.redisTimeout   = parseInt(REDIS_TIMEOUT, 10)
    }

    async getClientKey(userId) {
        return `user:${userId}:token_bucket`
    }

    /**
     * Core rate-limit check.
     * Atomically refills tokens based on elapsed time, then consumes one.
     *
     * @param {string|number} userId
     * @returns {Promise<{ allowed: boolean, remaining: number|null }>}
     */
    async isRequestAllowed(userId) {
        const key = await this.getClientKey(userId)

        try {
            const result = await this.redisClient.eval(
                TOKEN_BUCKET_SCRIPT,
                1,                    // number of KEYS
                key,                  // KEYS[1]
                this.bucketCapacity,  // ARGV[1]
                this.bucketRefill,    // ARGV[2]
                this.bucketTimeout,   // ARGV[3]
                Date.now()            // ARGV[4]
            )

            const remaining = await this.redisClient.hget(key, 'tokens')

            return {
                allowed:   result === 1,
                remaining: remaining !== null ? parseInt(remaining, 10) : null,
            }
        } catch (err) {
            console.error('[TokenBucket] Redis error:', err.message)
            // Fail-open: allow request if Redis is unavailable
            return { allowed: true, remaining: null }
        }
    }

    /**
     * Express middleware factory.
     * Attaches rate-limit headers to every response and rejects with 429 when bucket is empty.
     *
     * @param {Function} [keyFn] - Derives userId from req. Defaults to req.ip.
     * @returns {Function} Express middleware
     *
     * Usage:
     *   app.use(tokenBucketService.rateLimiter())
     *   app.use(tokenBucketService.rateLimiter(req => req.user?.id))
     */
    rateLimiter(keyFn = (req) => req.ip) {
        return async (req, res, next) => {
            const userId = keyFn(req)
            const { allowed, remaining } = await this.isRequestAllowed(userId)

            res.setHeader('X-RateLimit-Limit',     this.bucketCapacity)
            res.setHeader('X-RateLimit-Remaining', remaining ?? 'N/A')
            res.setHeader('X-RateLimit-Policy',    `token-bucket; refill=${this.bucketRefill}; interval=${this.bucketTimeout}ms`)

            if (!allowed) {
                return res.status(429).json({
                    success:    false,
                    message:    'Too Many Requests — rate limit exceeded.',
                    retryAfter: `${Math.ceil(this.bucketTimeout / 1000)}s`,
                })
            }

            next()
        }
    }
}

module.exports = new RedisTokenBucketService()
