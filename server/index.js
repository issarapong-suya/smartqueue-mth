// server/index.js
// Main entry point ของระบบ SmartQueue v2
require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { testConnections } = require('./config/db');
const { initQueueSocket } = require('./socket/queueSocket');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// CORS config
const allowedOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(',').map(s => s.trim())
  : ['*'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Inject IO เข้า API routes เพื่อ broadcast เมื่อมี HTTP call
apiRoutes.setIo(io);

// Setup Socket.IO dynamic handlers
initQueueSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

const { initLegacyBridge, EVENT_MAP } = require('./services/legacyBridge');
const nameService = require('./services/nameService');

// Start Legacy Signal Bridge (รับสัญญาณจาก http://192.168.100.51:19009)
initLegacyBridge(io);

// รองรับคำสั่งเรียกคิว HTTP GET แบบระบบเดิม เช่น /sa1/A077 หรือ /rx1/001
app.get('/:station/:q', async (req, res, next) => {
  const { station, q } = req.params;
  const meta = EVENT_MAP[station.toLowerCase()];
  if (!meta) return next();

  if (!q || q.length < 3) {
    return res.send(station);
  }

  try {
    const patientName = await nameService.getName(q);
    const payload = {
      stationId: station,
      stationLabel: meta.label,
      department: meta.dept,
      queueId: q,
      patientName: patientName || '',
      type: 'normal',
      source: 'legacy_http',
      timestamp: Date.now()
    };

    io.to(`display:${meta.dept}`).emit('queue_called', payload);
    if (meta.dept !== station) io.to(`display:${station}`).emit('queue_called', payload);
    io.to(`caller:${station}`).emit('queue_called_ack', payload);

    res.send(`${station} ${q}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ── Pretty URLs ──────────────────────────────────────────────────────────
// 1. TV Kiosk Routes (เต็มจอ, Kiosk Mode เหมาะสำหรับ Android Box / ทีวี)
// เช่น /tv/t, /tv/d, /tv/er, /tv/sb, /tv/sa, /tv/rx
app.get('/tv', (req, res) => {
  res.redirect('/tv/');
});
app.get('/tv/:station', (req, res) => {
  const station = req.params.station;
  res.redirect(`/display/screen.html?station=${encodeURIComponent(station)}&kiosk=1`);
});

// 2. Display / Screen Routes (จอทั่วไป มีแถบควบคุมด้านบน)
// เช่น /screen/t หรือ /display/t
app.get('/screen/:station', (req, res) => {
  const station = req.params.station;
  res.redirect(`/display/screen.html?station=${encodeURIComponent(station)}`);
});
app.get('/display/:station', (req, res) => {
  const station = req.params.station;
  res.redirect(`/display/screen.html?station=${encodeURIComponent(station)}`);
});

// 3. Caller / Call Routes (หน้าเรียกคิวระบุจุดบริการหรือโต๊ะ)
// เช่น /call/t, /call/d, /call/sa, /call/sa1, /call/sb, /call/sb2, /call/rx1
app.get('/call', (req, res) => {
  res.redirect('/caller/');
});
app.get('/call/:station', (req, res) => {
  const station = req.params.station;
  res.redirect(`/caller/?station=${encodeURIComponent(station)}`);
});
app.get('/caller/:station', (req, res) => {
  const station = req.params.station;
  res.redirect(`/caller/?station=${encodeURIComponent(station)}`);
});

// Root redirects
app.get('/', (req, res) => {
  res.redirect('/caller/');
});

// Port & Listen
const PORT = process.env.PORT || 19010;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log(`====================================================`);
  console.log(`🚀 SmartQueue v2 Server running on: http://localhost:${PORT}`);
  console.log(`📱 Caller URL:   http://localhost:${PORT}/caller/`);
  console.log(`📺 Display URL:  http://localhost:${PORT}/display/screen.html?station=sa1`);
  console.log(`⚙️  Admin URL:    http://localhost:${PORT}/admin/`);
  console.log(`====================================================`);

  await testConnections();
});
