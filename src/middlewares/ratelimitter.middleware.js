const { RedisTokenBucketService } = require('../services')
const { serverConfig } = require('../config')

const redisTokenBucketService = new RedisTokenBucketService();

const createRateLimiter = (options = {}) => {
    const {
        keyFn = (req) => req.ip,
        capacity,
        refill,
        timeout,
        cost = 1,
        whitelist = [],
        onDenied = null,
        label = 'default',
    } = options

    const combinedWhitelist = new Set([...serverConfig.WHITELIST_IPS, ...whitelist])

    return async function rateLimiterMiddleware(req, res, next) {
        const identifier = keyFn(req)

        if (combinedWhitelist.has(identifier)) {
            res.setHeader('X-RateLimit-Allowed', 'true')

            return next()
        }
        const result = await redisTokenBucketService.isRequestAllowed(identifier, {
            capacity, refill, timeout, cost
        })
        res.setHeader('X-RateLimit-Limit', result.capacity)
        res.setHeader('X-RateLimit-Remaining', result.remaining ?? 'N/A')
        res.setHeader('X-RateLimit-Policy', `token-bucket; profile=${label}; cost=${cost}`)

        if (!result.allowed) {
            const retrySec = Math.ceil(result.retryAfterMs / 1000)
            res.setHeader('Retry-After', retrySec)
            res.setHeader('X-RateLimit-Reset', Date.now() + result.retryAfterMs)
            console.warn(`[RateLimiter:${label}] DENIED  → ${identifier}`)
            if (onDenied) return onDenied(req, res, next, result)
            return res.status(429).json({
                success: false,
                error: 'Too Many Requests',
                message: 'Your request bucket is empty. Please slow down.',
                retryAfter: `${retrySec}s`,
                limit: result.capacity,
                remaining: result.remaining,
            })
        }

        console.log(`[RateLimiter:${label}] ALLOWED → ${identifier} (Remaining: ${result.remaining})`)
        next()
    }
}
const strictLimiter = createRateLimiter({
    label: 'strict', capacity: 5, refill: 5, timeout: 100000,
})

const standardLimiter = createRateLimiter({ label: 'standard' })

const premiumLimiter = createRateLimiter({
    label: 'premium', capacity: 50, refill: 50, timeout: 10_000,
})
module.exports = {
    createRateLimiter, strictLimiter, standardLimiter, premiumLimiter
}