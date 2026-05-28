const demoController = {
    publicEndpoint(req, res) {
        res.json({
            success: true,
            message: 'Standard rate limit applied',
            ip: req.ip,
            time: new Date().toISOString(),
        })
    },
    loginEndpoint(req, res) {
        res.json({
            success: true,
            message: 'Strict rate limit — brute-force protected',
        })
    },
    premiumEndpoint(req, res) {
        res.json({ success: true, message: 'Premium tier — generous limit', tier: 'premium' })
    },
    heavyEndpoint(req, res) {
        res.json({ success: true, message: 'Heavy endpoint — costs 3 tokens per call' })
    },
}
module.exports = demoController