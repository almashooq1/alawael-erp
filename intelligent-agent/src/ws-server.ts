// WebSocket server for real-time communication
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { AgentCore } from './core/agent-core';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const agent = new AgentCore();

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
