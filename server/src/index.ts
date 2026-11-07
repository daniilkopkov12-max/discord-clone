import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

import { config } from './config.js';
import authRoutes from './routes/auth.js';
import serverRoutes from './routes/servers.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import dmRoutes from './routes/dm.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import searchRoutes from './routes/search.js';
import livekitRoutes from './routes/livekit.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';

const app = express();
const httpServer = http.createServer(app);

// Socket.io initialization with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Setup sockets
setupSocketHandlers(io);

// Security & Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads directory
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/livekit', livekitRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Production client static files serving
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Discord Clone Server is running on http://0.0.0.0:${config.port}`);
  console.log(`🔌 WebSockets & WebRTC Signaling active`);
  console.log(`📁 Static files serving from ${uploadsDir}`);
});
