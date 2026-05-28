const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_TIMEOUT: process.env.REDIS_TIMEOUT,
    PORT: process.env.PORT,
    BUCKET_REFIL: process.env.BUCKET_REFIL,
    BUCKET_TIMEOUT: process.env.BUCKET_TIMEOUT,
    BUCKET_CAPACITY: process.env.BUCKET_CAPACITY,
    BUCKET_SERVER_URL: process.env.BUCKET_SERVER_URL,
    WHITELIST_IPS: (process.env.WHITELIST_IPS || '').split(',').filter(Boolean),
};