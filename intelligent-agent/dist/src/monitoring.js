"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMonitoring = setupMonitoring;
// مراقبة الأداء (Prometheus metrics)
const prom_client_1 = __importDefault(require("prom-client"));
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics();
function setupMonitoring(app) {
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', prom_client_1.default.register.contentType);
        res.end(await prom_client_1.default.register.metrics());
    });
}
