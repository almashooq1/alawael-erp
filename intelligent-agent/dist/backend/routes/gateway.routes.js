"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gatewayProxy_service_1 = require("../services/gatewayProxy.service");
const router = express_1.default.Router();
const SERVICE_MAP = {
    accounting: process.env.ACCOUNTING_API_BASE_URL || 'http://localhost:5001/api/accounting',
    ml: process.env.ML_API_BASE_URL || 'http://localhost:3001/api/ml',
    ai: process.env.AI_API_BASE_URL || 'http://localhost:3001/api/ai',
};
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        services: Object.keys(SERVICE_MAP),
        timestamp: new Date().toISOString(),
    });
});
router.all(/^\/([^/]+)\/?(.*)/, async (req, res) => {
    const service = req.params[0];
    const baseUrl = SERVICE_MAP[service];
    if (!baseUrl) {
        return res.status(404).json({
            success: false,
            message: `Unknown service: ${service}`,
        });
    }
    try {
        const result = await (0, gatewayProxy_service_1.proxyRequest)({ serviceName: service, baseUrl }, req);
        res.status(result.status).set('content-type', result.contentType).send(result.buffer);
    }
    catch (error) {
        res.status(502).json({
            success: false,
            message: error.message || 'Gateway proxy error',
            service,
        });
    }
});
exports.default = router;
