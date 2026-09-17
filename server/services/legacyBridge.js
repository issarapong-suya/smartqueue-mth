// server/services/legacyBridge.js
// สะพานเชื่อมสัญญาณจาก Legacy Signal Server (Port 19009) เข้าสู่ SmartQueue v2 (Port 19010)
// ทำให้เมื่อเจ้าหน้าที่กดเรียกคิวผ่าน Windows App เดิม จอแสดงผลระบบใหม่จะได้รับสัญญาณและอ่านเสียงทันที

const nameService = require('./nameService');
const queueService = require('./queueService');
const ttsService = require('./ttsService');

const EVENT_MAP = {
  // sa: จุดซักประวัติ (ส่งเข้าจอรวม sa)
  sa1: { dept: 'sa', label: 'โต๊ะซักประวัติ 1' },
  sa2: { dept: 'sa', label: 'โต๊ะซักประวัติ 2' },
  sa3: { dept: 'sa', label: 'โต๊ะซักประวัติ 3' },
  sa4: { dept: 'sa', label: 'โต๊ะซักประวัติ 4' },
  sa5: { dept: 'sa', label: 'โต๊ะซักประวัติ 5' },
  sa6: { dept: 'sa', label: 'โต๊ะซักประวัติ 6' },

  // sb: ห้องตรวจโรค (ส่งเข้าจอรวม sb)
  sb1: { dept: 'sb', label: 'ห้องตรวจ 1' },
  sb2: { dept: 'sb', label: 'ห้องตรวจ 2' },
  sb3: { dept: 'sb', label: 'ห้องตรวจ 3' },
  sb4: { dept: 'sb', label: 'ห้องตรวจ 4' },
  sb5: { dept: 'sb', label: 'ห้องตรวจ 5' },
  sb6: { dept: 'sb', label: 'ห้องตรวจ 6' },
  b:   { dept: 'sb', label: 'พบแพทย์' },

  // na / nb: คลินิก / ห้องตรวจเพิ่มเติม
  na1: { dept: 'sb', label: 'ห้องตรวจ 1' },
  na2: { dept: 'sb', label: 'ห้องตรวจ 2' },
  na3: { dept: 'sb', label: 'ห้องตรวจ 3' },
  na4: { dept: 'sb', label: 'ห้องตรวจ 4' },
  na5: { dept: 'sb', label: 'ห้องตรวจ 5' },
  na6: { dept: 'sb', label: 'ห้องตรวจ 6' },
  nb1: { dept: 'sb', label: 'ห้องตรวจ 1' },
  nb2: { dept: 'sb', label: 'ห้องตรวจ 2' },
  nb3: { dept: 'sb', label: 'ห้องตรวจ 3' },
  nb4: { dept: 'sb', label: 'ห้องตรวจ 4' },
  nb5: { dept: 'sb', label: 'ห้องตรวจ 5' },
  nb6: { dept: 'sb', label: 'ห้องตรวจ 6' },
  c:   { dept: 'sb', label: 'พบแพทย์' },

  // rx: ห้องยาและการเงิน (ส่งเข้าจอรวม rx)
  rx1: { dept: 'rx', label: 'รับยา ช่อง 1', ttsTarget: 'ที่ช่องจ่ายยา 1' },
  rx2: { dept: 'rx', label: 'รับยา ช่อง 2', ttsTarget: 'ที่ช่องจ่ายยา 2' },
  rx3: { dept: 'rx', label: 'รับยา ช่อง 3', ttsTarget: 'ที่ช่องจ่ายยา 3' },
  rx4: { dept: 'rx', label: 'รับยา ช่อง 4', ttsTarget: 'ที่ช่องจ่ายยา 4' },
  rx5: { dept: 'rx', label: 'รับยา ช่อง 5', ttsTarget: 'ที่ช่องจ่ายยา 5' },
  f:   { dept: 'rx', label: 'ช่องชำระเงิน', ttsTarget: 'ที่ช่องชำระเงิน' },

  // t: ห้องฉีดยา ทำแผล
  t:   { dept: 't', label: 'ห้องฉีดยา ทำแผล' },

  // er: ห้องฉุกเฉิน
  e:   { dept: 'er', label: 'ห้องฉุกเฉิน' },
  r:   { dept: 'er', label: 'ห้องฉุกเฉิน' },
  z:   { dept: 'er', label: 'ห้องฉุกเฉิน' },
  er:  { dept: 'er', label: 'ห้องฉุกเฉิน' },
  er1: { dept: 'er', label: 'ห้องฉุกเฉิน 1' },
  er2: { dept: 'er', label: 'ห้องฉุกเฉิน 2' },
  er3: { dept: 'er', label: 'ห้องฉุกเฉิน 3' },
  er4: { dept: 'er', label: 'ห้องฉุกเฉิน 4' },
  er5: { dept: 'er', label: 'ห้องฉุกเฉิน 5' },
  er6: { dept: 'er', label: 'ห้องฉุกเฉิน 6' },

  // แผนกอื่นๆ
  d:   { dept: 'd', label: 'ห้องตรวจทันตกรรม', ttsTarget: 'ที่ห้องตรวจทันตกรรม' },
  l:   { dept: 'l', label: 'ห้องปฏิบัติการ' },
  x:   { dept: 'x', label: 'ห้องเอ็กซเรย์' },
};

function initLegacyBridge(io) {
  const legacyUrl = process.env.LEGACY_SIGNAL_URL || 'http://192.168.100.51:19009';

  let ioClient = null;
  try {
    ioClient = require('socket.io-client');
  } catch (err) {
    try {
      const path = require('path');
      ioClient = require(path.resolve(__dirname, '../../../smart queue plk/qsignal/node_modules/socket.io-client'));
    } catch (e2) {
      console.warn('[LegacyBridge] socket.io-client v2 not found, running without legacy bridge:', e2.message);
      return;
    }
  }

  console.log(`[LegacyBridge] Initializing bridge to legacy signal server: ${legacyUrl}...`);
  const legacySocket = ioClient(legacyUrl, {
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 15000,
    reconnectionAttempts: Infinity,
    timeout: 5000,
  });

  let hasWarnedError = false;

  legacySocket.on('connect', () => {
    hasWarnedError = false;
    console.log(`[LegacyBridge] ✅ Connected to legacy signal server: ${legacyUrl}`);
  });

  legacySocket.on('disconnect', () => {
    console.warn('[LegacyBridge] ⚠️ Disconnected from legacy signal server. Will reconnect in background...');
  });

  legacySocket.on('connect_error', (err) => {
    if (!hasWarnedError) {
      console.warn(`[LegacyBridge] ℹ️ Legacy signal server (${legacyUrl}) not reachable: ${err.message} (SmartQueue v2 operates standalone)`);
      hasWarnedError = true;
    }
  });

  // ผูก Listener กับทุก Event ของระบบเดิม
  Object.keys(EVENT_MAP).forEach((ev) => {
    const meta = EVENT_MAP[ev];
    legacySocket.on(ev, async (q) => {
      console.log(`[LegacyBridge] 🔔 Received legacy call: ${ev} -> Queue: ${q}`);

      if (!q || q === 's99999') {
        // คำสั่งเคลียร์หรือรีเฟรชคิว
        io.to(`display:${meta.dept}`).emit('queue_refresh', { stationId: ev, dept: meta.dept });
        io.to(`display:${ev}`).emit('queue_refresh', { stationId: ev });
        return;
      }

      try {
        // ดึงชื่อผู้ป่วยจากฐานข้อมูล HOSxP (แยก display และ tts)
        const nameData = await nameService.getNameData(q);

        const patientName = nameData.displayName || '';
        const rawName = nameData.rawName || '';
        const ttsName = nameData.ttsName || '';

        const deskMatch = ev.match(/\d+/);
        const deskNumber = deskMatch ? parseInt(deskMatch[0]) : 1;

        const payload = {
          stationId: ev,            // e.g. "sa1" (ระบุว่าโต๊ะไหนเป็นคนเรียก)
          deskNumber,
          stationLabel: meta.label, // e.g. "โต๊ะซักประวัติ 1"
          department: meta.dept,    // e.g. "sa"
          queueId: q,
          patientName,
          rawName,
          ttsName,
          ttsTarget: meta.ttsTarget || (meta.dept === 'd' ? 'ที่ห้องตรวจทันตกรรม' : undefined),
          type: 'normal',
          source: 'legacy_bridge',
          timestamp: Date.now()
        };

        payload.ttsSentence = ttsService.buildCallSentence({
          queueId: payload.queueId,
          patientName: payload.patientName,
          ttsName: payload.ttsName,
          ttsTarget: payload.ttsTarget,
          stationLabel: payload.stationLabel
        });

        // ⚡ Pre-warm TTS cache ในพื้นหลังทันทีเมื่อรับสัญญาณจากระบบเดิม
        if (payload.ttsSentence) {
          ttsService.getAudioBuffer(payload.ttsSentence).catch(() => {});
        }

        // 1. ส่งไปยังจอแสดงผลรวมของแผนก (เช่น display:sa)
        io.to(`display:${meta.dept}`).emit('queue_called', payload);

        // 2. ส่งไปยังห้องเฉพาะโต๊ะ (เผื่อมีคนเปิด display:sa1)
        if (meta.dept !== ev) {
          io.to(`display:${ev}`).emit('queue_called', payload);
        }

        // 3. ส่ง ACK กลับไปยัง Caller ที่เปิดอยู่
        io.to(`caller:${ev}`).emit('queue_called_ack', payload);

        // บันทึก Log การเรียกคิว
        await queueService.saveCallLog({
          stationId: ev,
          queueId: q,
          patientName,
          calledBy: 'windows_app_caller',
          callType: 'normal'
        });

      } catch (err) {
        console.error(`[LegacyBridge] Error handling event ${ev}:`, err.message);
      }
    });
  });
}

module.exports = { initLegacyBridge, EVENT_MAP };
