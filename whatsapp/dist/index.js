"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const webhook_1 = require("./webhook");
const health_1 = __importDefault(require("./health"));
const queue_1 = require("./queue");
const metrics_1 = require("./metrics");
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3000);
// Middleware
app.use(express_1.default.json({ verify: (req, res, buf) => {
        req.rawBody = buf;
    } }));
// Health check endpoints
app.use('/', health_1.default);
// Webhook and API routes
app.use('/webhook', webhook_1.app);
app.listen(port, () => {
    console.log(`Server listening on ${port}`);
});
// Start SQS consumer if configured
(0, queue_1.startQueueConsumer)();
// Start metrics reporter (logs metrics every 60 seconds)
(0, metrics_1.startMetricsReporter)(60000);
