"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// WebSocket server for real-time communication
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express_1 = __importDefault(require("express"));
const agent_core_1 = require("./core/agent-core");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
const agent = new agent_core_1.AgentCore();
io.on('connection', (socket) => {
    socket.emit('welcome', { msg: 'Connected to Intelligent Agent WebSocket' });
    socket.on('nlp', (data) => {
        const result = agent.nlp.analyzeText(data.text);
        socket.emit('nlp-result', result);
    });
});
httpServer.listen(4000, () => {
    console.log('WebSocket server running on port 4000');
});
