import express from 'express';
import axios from 'axios';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { eventBus } from './eventBus.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Configure Python API base
const PY_BASE = process.env.PY_BASE || 'http://localhost:8080';

app.get('/health', async (req, res) => {
  try {
    const r = await axios.get(`${PY_BASE}/health`, { timeout: 2000 });
    return res.status(200).json({ status: 'ok', python: r.data });
  } catch (e) {
    return res.status(503).json({ status: 'degraded', error: 'python_api_unreachable' });
  }
});

app.post('/api/secretary/suggestions', async (req, res) => {
  try {
    const r = await axios.post(`${PY_BASE}/api/secretary/suggestions`, req.body, { timeout: 5000 });
    return res.status(200).json(r.data);
  } catch (e) {
    const code = e.response?.status || 500;
    return res.status(code).json({ error: e.message });
  }
});

app.post('/api/secretary/invite', async (req, res) => {
  try {
    const r = await axios.post(`${PY_BASE}/api/secretary/invite`, req.body, { timeout: 5000 });
    return res.status(200).json(r.data);
  } catch (e) {
    const code = e.response?.status || 500;
    return res.status(code).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  console.log('WS client connected:', socket.id);
  socket.join('secretary');
  socket.on('disconnect', () => console.log('WS client disconnected:', socket.id));
});

// Broadcast EventBus secretary notifications to WS clients
eventBus.subscribe('secretary.notifications.push', evt => {
  io.to('secretary').emit('secretary.notifications.push', evt.data);
});

server.listen(PORT, () => {
  console.log(`Node API listening on http://localhost:${PORT} (proxying to ${PY_BASE})`);
});
