const RedisConnection = require('../config/redisConfig');

const {
    REDIS_TIMEOUT,
    BUCKET_CAPACITY,
    BUCKET_REFILL,
    BUCKET_TIMEOUT
} = require('../config/server.config');

const { TOKEN_BUCKET_SCRIPT } = require('../utils');

class RedisTokenBucketService {
    constructor() {
        this.redisClient = RedisConnection;

        this.defaultCapacity = BUCKET_CAPACITY;
        this.defaultRefill = BUCKET_REFILL;
        this.defaultTimeout = BUCKET_TIMEOUT;
        this.redisTimeout = REDIS_TIMEOUT;
    }

    getClientKey(identifier) {
        return `rl:tb:${identifier}`;
    }

    async getBucketStatus(identifier) {
        const key = this.getClientKey(identifier);

        try {
            const data = await this.redisClient.hmget(
                key,
                'tokens',
                'lastRefillTime'
            );

            const ttl = await this.redisClient.pttl(key);

            const tokens =
                data[0] !== null ? parseFloat(data[0]) : null;

            const lastFill =
                data[1] !== null ? parseInt(data[1], 10) : null;

            if (tokens == null) {
                return { exists: false, identifier };
            }

            const refillRateMs =
                this.defaultRefill / this.defaultTimeout;

            const elapsed = Date.now() - lastFill;

            const projectedTokens = Math.min(
                this.defaultCapacity,
                tokens + elapsed * refillRateMs
            );

            return {
                exists: true,
                identifier,
                storedTokens: Math.floor(tokens),
                projectedTokens: Math.floor(projectedTokens),
                capacity: this.defaultCapacity,
                lastRefillTime: lastFill,
                ttlMs: ttl,
                redisKey: key
            };
        } catch (error) {
            return {
                exists: false,
                identifier,
                error: error.message
            };
        }
    }

    async isRequestAllowed(identifier, options = {}) {
        const capacity =
            options.capacity ?? this.defaultCapacity;

        const refill =
            options.refill ?? this.defaultRefill;

        const timeout =
            options.timeout ?? this.defaultTimeout;

        const cost = options.cost ?? 1;

        const refillRateMs = refill / timeout;

        const key = this.getClientKey(identifier);

        try {
            const result = await this.redisClient.eval(
                TOKEN_BUCKET_SCRIPT,
                1,
                key,
                capacity,
                refillRateMs,
                Date.now(),
                cost
            );

            return {
                allowed: result[0] === 1,
                remaining: Math.floor(parseFloat(result[1])),
                capacity,
                retryAfterMs: parseInt(result[2], 10),
                identifier
            };
        } catch (error) {
            console.log(
                '[TokenBucket] Redis error:',
                error.message
            );

            return {
                allowed: true,
                remaining: null,
                capacity,
                retryAfterMs: 0,
                identifier
            };
        }
    }

    async resetBucket(identifier) {
        const key = this.getClientKey(identifier);

        try {
            await this.redisClient.del(key);

            return {
                success: true,
                identifier,
                message: `Bucket '${identifier}' reset to full capacity`
            };
        } catch (error) {
            return {
                success: false,
                identifier,
                error: error.message
            };
        }
    }

    async listAllBuckets() {
        const keys = [];
        let cursor = '0';

        try {
            do {
                const [next, found] =
                    await this.redisClient.scan(
                        cursor,
                        'MATCH',
                        'rl:tb:*',
                        'COUNT',
                        100
                    );

                cursor = next;

                keys.push(...found);

            } while (cursor !== '0');

            return {
                count: keys.length,
                buckets: keys.map(k =>
                    k.replace('rl:tb:', '')
                )
            };

        } catch (error) {
            return {
                count: 0,
                buckets: [],
                error: error.message
            };
        }
    }
}

module.exports = RedisTokenBucketService;