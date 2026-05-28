const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local data = redis.call('HMGET',key,'tokens','lastRefillTime')
local tokens = tonumber(data[1])
local lastFill = tonumber(data[2]) 

if tokens == nil or lastFill == nil then
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
module.exports = TOKEN_BUCKET_SCRIPT