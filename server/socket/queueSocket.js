// server/socket/queueSocket.js
// Socket.IO handler แบบ Dynamic จัดการห้องและการเรียกคิวแบบ Realtime
const jwt = require('jsonwebtoken');
const { sqDb } = require('../config/db');
const hosxpWriteService = require('../services/hosxpWriteService');
const ttsService = require('../services/ttsService');

function getDepartmentScreenId(stationId) {
  if (!stationId) return '';
  const s = String(stationId).toLowerCase().trim();
  if (/^sa\d*$/.test(s)) return 'sa';
  if (/^(sb|na|nb)\d*$/.test(s) || s === 'b') return 'sb';
  if (/^rx\d*$/.test(s) || s === 'f') return 'rx';
  if (s === 't') return 't';
  if (/^(er\d*|[erz])$/.test(s)) return 'er';
  if (/^d\d*$/.test(s)) return 'd';
  if (/^l\d*$/.test(s)) return 'l';
  if (/^x\d*$/.test(s)) return 'x';
  return s;
}

function initQueueSocket(io) {
  io.on('connection', (socket) => {
    // console.log(`[Socket] Client connected: ${socket.id}`);

    // จอแสดงผล (Display Screen) สมัครเข้าร่วมห้องของจุดบริการ
    socket.on('join_display', ({ stationId }) => {
      if (!stationId) return;
      const deptId = getDepartmentScreenId(stationId);
      socket.join(`display:${deptId}`);
      if (deptId !== stationId) {
        socket.join(`display:${stationId}`);
      }
      socket.emit('joined_room', { room: `display:${deptId}`, stationId, success: true });
    });

    // Caller เข้าห้องของตนเองเพื่อรับ status update
    socket.on('join_caller', ({ stationId }) => {
      if (!stationId) return;
      const deptId = getDepartmentScreenId(stationId);
      socket.join(`caller:${stationId}`);
      if (deptId !== stationId) {
        socket.join(`caller:${deptId}`);
      }
      socket.emit('joined_room', { room: `caller:${stationId}`, stationId, success: true });
    });

    // รับคำสั่งเรียกคิวผ่าน WebSocket จาก Caller App
    socket.on('call_queue', async ({ stationId, deskNumber, queueId, vn, type = 'normal', token, roomMode = false }) => {
      if (!stationId || !queueId) {
        return socket.emit('call_error', { message: 'ระบุ stationId และ queueId ไม่ครบถ้วน' });
      }

      let username = 'system';
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          username = decoded.username || 'caller';
        } catch (err) {
          return socket.emit('call_error', { message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        }
      }

      try {
        // เรียก service บันทึก HOSxP DB + ดึงชื่อผู้ป่วย + สร้าง payload
        const callResult = await hosxpWriteService.callQueue({
          vn,
          queueId,
          stationId,
          deskNumber: deskNumber || 1,
          calledBy: username,
          roomMode: Boolean(roomMode)
        });

        const deptId = callResult.department || getDepartmentScreenId(stationId);

        const payload = {
          stationId,
          stationLabel: callResult.stationLabel,
          department: deptId,
          queueId: callResult.queueId,
          vn: callResult.vn,
          hn: callResult.hn,
          patientName: callResult.patientName,
          rawName: callResult.rawName,
          ttsName: callResult.ttsName,
          ttsTarget: callResult.ttsTarget,
          deskNumber: callResult.deskNumber,
          type,
          source: 'caller_web',
          timestamp: Date.now(),
        };

        payload.ttsSentence = ttsService.buildCallSentence({
          queueId: payload.queueId,
          patientName: payload.patientName,
          ttsName: payload.ttsName,
          ttsTarget: payload.ttsTarget,
          stationLabel: payload.stationLabel
        });

        // 1. ส่งให้จอแสดงผลรวมของแผนก (เช่น display:sa สำหรับ sa1-sa6)
        io.to(`display:${deptId}`).emit('queue_called', payload);

        // 2. ส่งให้จอเฉพาะโต๊ะ (หากมีเปิดแยกไว้)
        if (deptId !== stationId) {
          io.to(`display:${stationId}`).emit('queue_called', payload);
        }

        // 3. ส่งให้ caller ใน station ทราบผล
        io.to(`caller:${stationId}`).emit('queue_called_ack', payload);
        if (deptId !== stationId) {
          io.to(`caller:${deptId}`).emit('queue_called_ack', payload);
        }

        // 4. สั่งให้รีเฟรชรายการรออัตโนมัติ
        io.to(`display:${deptId}`).emit('queue_refresh', { dept: deptId });
        io.to(`caller:${stationId}`).emit('queue_refresh', { stationId });

      } catch (err) {
        console.error('[Socket call_queue] Error:', err.message);
        socket.emit('call_error', { message: 'เกิดข้อผิดพลาดในการเรียกคิว: ' + err.message });
      }
    });

    // บังคับรีโหลดรายการคิว (เทียบเท่า s99999 เดิม)
    socket.on('refresh_queue', ({ stationId }) => {
      if (stationId) {
        const deptId = getDepartmentScreenId(stationId);
        io.to(`display:${deptId}`).emit('queue_refresh', { stationId, dept: deptId });
        if (deptId !== stationId) {
          io.to(`display:${stationId}`).emit('queue_refresh', { stationId });
        }
        io.to(`caller:${stationId}`).emit('queue_refresh', { stationId });
      }
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initQueueSocket, getDepartmentScreenId };
