const express = require('express')
const apiRoutes = require('./routes');
const { serverConfig } = require('./config');

const app = express();
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.set('trust proxy', 1)

app.use('/api', apiRoutes)

app.listen(serverConfig.PORT, () => {
    console.log(`\n🚀  Server:  http://localhost:${serverConfig.PORT}`)
    console.log(`📊  Admin:   http://localhost:${serverConfig.PORT}/admin/health`)
    console.log(`🔒  Algo:    Token Bucket — Redis-backed | Continuous refill\n`)
})