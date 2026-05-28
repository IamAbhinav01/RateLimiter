const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
    REDIS_TIMEOUT: parseInt(process.env.REDIS_TIMEOUT, 10) || 2000,
    PORT: parseInt(process.env.PORT, 10) || 3000,
    BUCKET_REFILL: parseInt(process.env.BUCKET_REFIL || process.env.BUCKET_REFILL, 10) || 10,
    BUCKET_TIMEOUT: parseInt(process.env.BUCKET_TIMEOUT, 10) || 60000,
    BUCKET_CAPACITY: parseInt(process.env.BUCKET_CAPACITY, 10) || 100,
    BUCKET_SERVER_URL: process.env.BUCKET_SERVER_URL,
    WHITELIST_IPS: (process.env.WHITELIST_IPS || '').split(',').filter(Boolean),
};