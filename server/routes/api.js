// server/routes/api.js
// REST API สำหรับ Caller App และ Display Screen
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sqDb, hosxpDb } = require('../config/db');
const nameService = require('../services/nameService');
const queueService = require('../services/queueService');
const ttsService = require('../services/ttsService');

// io จะถูก inject จาก index.js
let _io = null;
function setIo(io) { _io = io; }

// ── GET /api/stations ────────────────────────────────────────────────────
// รายการ station ทั้งหมด (ใช้ในหน้า Setup ของ Caller + Display)
router.get('/stations', async (req, res) => {
  try {
    const stations = await sqDb('sq_stations')
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
      .select('id','name','depcodes','layout','slots','time_per_queue','dep_station','work_start');
    res.json({ stations });
  } catch (err) {
    console.error('[/stations]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stations/:id ─────────────────────────────────────────────────
router.get('/stations/:id', async (req, res) => {
  try {
    const station = await sqDb('sq_stations').where('id', req.params.id).first();
    if (!station) return res.status(404).json({ error: 'ไม่พบ station' });
    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/queue/waiting ─────────────────────────────────────────────────
// รายการคิวรอของ station
router.get('/queue/waiting', async (req, res) => {
  const { stationId, depcode, depcodes } = req.query;
  if (!stationId && !depcode && !depcodes) return res.status(400).json({ error: 'ต้องระบุ stationId หรือ depcode' });

  const queues = await queueService.getWaitingList(stationId, depcodes || depcode);
  res.json({ queues });
});

// ── GET /api/queue/patient-name ──────────────────────────────────────────
// ดึงชื่อผู้ป่วย ทั้งแบบแสดงบนจอ, แบบอ่านเสียง และแบบชื่อ-สกุลเต็ม
router.get('/queue/patient-name', async (req, res) => {
  const { q } = req.query;
  const data = await nameService.getNameData(q);
  res.json({
    name: data.displayName || '',
    rawName: data.rawName || '',
    ttsName: data.ttsName || ''
  });
});

// ── GET /api/queue/dept-count ─────────────────────────────────────────────
// นับจำนวนคิวรอของแผนก
router.get('/queue/dept-count', async (req, res) => {
  const { depcodes } = req.query;
  const codes = depcodes ? depcodes.split(',') : [];
  const count = await queueService.getDeptCount(codes);
  res.json({ count });
});

// ── POST /api/queue/call ────────────────────────────────────────────────
// เรียกคิว — ต้องมี JWT token
router.post('/queue/call', authenticateToken, async (req, res) => {
  const { stationId, queueId, type = 'normal' } = req.body;

  if (!stationId || !queueId) {
    return res.status(400).json({ error: 'ต้องระบุ stationId และ queueId' });
  }

  try {
    // ดึงชื่อผู้ป่วย
    const patientName = await nameService.getName(queueId);

    // ดึงข้อมูล station
    const station = await sqDb('sq_stations').where('id', stationId).first();
    if (!station) return res.status(404).json({ error: 'ไม่พบ station' });

    // Broadcast ผ่าน Socket.IO
    if (_io) {
      const { getDepartmentScreenId } = require('../socket/queueSocket');
      const deptId = getDepartmentScreenId(stationId);
      const callPayload = {
        stationId,
        stationLabel: station.name,
        queueId,
        patientName,
        department: deptId,
        ttsSentence: ttsService.buildCallSentence({
          queueId,
          patientName,
          stationLabel: station.name
        }),
        type,
        timestamp: Date.now(),
      };

      // ⚡ Pre-warm TTS cache ในพื้นหลังทันที
      if (callPayload.ttsSentence) {
        ttsService.getAudioBuffer(callPayload.ttsSentence).catch(() => {});
      }

      _io.to(`display:${deptId}`).emit('queue_called', callPayload);
      if (deptId !== stationId) {
        _io.to(`display:${stationId}`).emit('queue_called', callPayload);
      }
      _io.to(`display:${deptId}`).emit('queue_refresh', { dept: deptId });
    }

    // บันทึก log
    await queueService.saveCallLog({
      stationId,
      queueId,
      patientName,
      calledBy: req.user.username,
      callType: type,
    });

    res.json({ success: true, queueId, patientName, stationLabel: station.name });
  } catch (err) {
    console.error('[/queue/call]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/queue/log ──────────────────────────────────────────────────
// ดูประวัติการเรียกคิว
router.get('/queue/log', authenticateToken, async (req, res) => {
  const { stationId, date, limit } = req.query;
  const logs = await queueService.getCallLog({
    stationId,
    date,
    limit: parseInt(limit || '100'),
  });
  res.json({ logs });
});

// ── GET /api/announcements ───────────────────────────────────────────────
// ดึงข้อความ Marquee
router.get('/announcements', async (req, res) => {
  try {
    const items = await sqDb('sq_announcements')
      .where('is_active', true)
      .orderBy('priority', 'desc')
      .select('id', 'content', 'priority');
    res.json({ announcements: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/marquee ──────────────────────────────────────────────────────
// ดึงข้อความ Marquee จาก HOSxP kskdepartment_plk.dep_inform ตาม depcodes
// และรวมกับ sq_announcements
router.get('/marquee', async (req, res) => {
  const { stationId } = req.query;
  const texts = [];

  try {
    // 1. ดึงจาก sq_announcements (ระบบใหม่)
    const sqTexts = await sqDb('sq_announcements')
      .where('is_active', true)
      .orderBy('priority', 'desc')
      .pluck('content');
    texts.push(...sqTexts);

    // 2. ถ้าระบุ stationId → ดึง depcodes แล้ว query dep_inform จาก HOSxP
    if (stationId) {
      const station = await sqDb('sq_stations').where('id', stationId).first();
      if (station && station.depcodes) {
        const codes = station.depcodes.split(',').map(d => d.trim()).filter(Boolean);
        if (codes.length > 0) {
          const hosxpRows = await hosxpDb('kskdepartment_plk')
            .whereIn('depcode', codes)
            .whereNotNull('dep_inform')
            .where('dep_inform', '!=', '')
            .pluck('dep_inform');
          texts.push(...hosxpRows);
        }
      }
    }

    const combined = texts.length > 0
      ? texts.join('   ★   ')
      : 'ยินดีต้อนรับสู่ โรงพยาบาลแม่ทะ จังหวัดลำปาง';

    res.json({ marquee: combined });
  } catch (err) {
    console.error('[/marquee]', err.message);
    res.json({ marquee: 'ยินดีต้อนรับสู่ โรงพยาบาลแม่ทะ จังหวัดลำปาง' });
  }
});

// ── GET /api/settings ────────────────────────────────────────────────────
// ดึงค่า sq_settings
router.get('/settings', async (req, res) => {
  try {
    const rows = await sqDb('sq_settings').select('key_name', 'value');
    const settings = {};
    rows.forEach(r => { settings[r.key_name] = r.value; });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/queue/called ───────────────────────────────────────────────
// ดึงรายการคิวที่ถูกเรียกแล้ว (กำลังรับบริการ / เรียกไปแล้ว)
router.get('/queue/called', async (req, res) => {
  const { stationId } = req.query;
  if (!stationId) return res.status(400).json({ error: 'Missing stationId' });

  try {
    const station = await sqDb('sq_stations').where('id', stationId).first();
    if (!station || !station.depcodes) return res.json({ queues: [] });

    const depcodes = station.depcodes.split(',').map(d => d.trim());

    let query = hosxpDb('ovst_queue_server as q')
      .join('ovst_queue_server_time as tt', 'tt.vn', 'q.vn')
      .join('ovst as o', 'o.vn', 'q.vn')
      .leftJoin('patient as p', 'p.hn', 'q.hn')
      .where('tt.status', '1')
      .whereNotNull('tt.stationno')
      .where('tt.date_visit', hosxpDb.raw('CURDATE()'));

    if (station.layout === 'doctor' || stationId === 'sb') {
      // สำหรับห้องตรวจแพทย์: รับเฉพาะคิวที่ถูกเรียกเข้าห้องตรวจแพทย์ 1-6 (D01-D06, ห้องตรวจ, sb, nb)
      query = query
        .where(b => {
          b.where('tt.station_id', 'like', 'D%')
           .orWhere('tt.station', 'like', '%ห้องตรวจ%')
           .orWhere('tt.station_id', 'like', 'sb%')
           .orWhere('tt.station_id', 'like', 'nb%');
        })
        .whereNot('tt.station_id', 'like', 'A%')
        .whereNot('tt.station_id', 'like', 'R%')
        .whereNot('tt.station_id', 'like', 'M%')
        .whereNot('tt.station_id', 'like', 'T%')
        .whereNot('tt.station_id', 'like', 'ER%');
    } else {
      query = query.whereIn('tt.dep', depcodes);
    }

    if (station.layout === 'er' || stationId === 'er') {
      query = query
        .leftJoin('er_regist as e', 'e.vn', 'q.vn')
        .leftJoin('er_emergency_type as et', 'et.er_emergency_type', 'e.er_emergency_type')
        .leftJoin('er_dch_type as d', 'd.er_dch_type', 'e.er_dch_type')
        .select(
          'q.vn',
          'q.hn',
          'q.depq',
          'q.fullname',
          'tt.stationno',
          'tt.station_id',
          'tt.station',
          'tt.time_start',
          'tt.dep',
          'e.er_dch_type',
          'd.name as dch_name',
          'et.export_code',
          'p.pname', 'p.fname', 'p.lname'
        );
    } else {
      query = query.select(
        'q.vn',
        'q.hn',
        'q.depq',
        'q.fullname',
        'tt.stationno',
        'tt.station_id',
        'tt.station',
        'tt.time_start',
        'tt.dep',
        'p.pname', 'p.fname', 'p.lname'
      );
    }

    const rows = await query
      .groupBy('q.vn')
      .orderBy('tt.time_start', 'desc')
      .limit(100);

    const { maskName } = require('../services/nameService');
    let queues = rows.map(r => {
      const full = (r.fullname || `${r.pname || ''}${r.fname || ''} ${r.lname || ''}`).replace(/-/g, ' ').trim();
      return {
        ...r,
        fullname: maskName(full),
        raw_fullname: full
      };
    });

    if (station.layout === 'doctor' || stationId === 'sb') {
      try {
        const sqCalls = await sqDb('sq_call_log')
          .whereRaw('DATE(called_at) = CURDATE()')
          .where(b => {
            b.where('station_id', 'like', 'sb%')
             .orWhere('station_id', 'like', 'nb%')
             .orWhere('station_id', 'sb');
          })
          .orderBy('called_at', 'desc')
          .limit(30);

        const existingQ = new Set(queues.map(q => (q.depq || '').toUpperCase()));
        for (const sc of sqCalls) {
          const qCode = (sc.queue_id || '').toUpperCase();
          if (!existingQ.has(qCode)) {
            const m = String(sc.station_id || '').match(/\d+/);
            const rNo = m ? parseInt(m[0]) : 1;
            const timeStr = sc.called_at ? new Date(sc.called_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
            queues.unshift({
              vn: sc.queue_id,
              depq: sc.queue_id,
              fullname: sc.patient_name,
              raw_fullname: sc.patient_name,
              stationno: rNo,
              station_id: sc.station_id,
              station: `ห้องตรวจ ${rNo}`,
              time_start: timeStr,
              dep: '014'
            });
            existingQ.add(qCode);
          }
        }
      } catch (e) {
        console.warn('sq_call_log merge error:', e.message);
      }
    }

    if (station.layout === 'er' || stationId === 'er') {
      try {
        const sqCalls = await sqDb('sq_call_log')
          .whereRaw('DATE(called_at) = CURDATE()')
          .where(b => {
            b.where('station_id', 'like', 'er%')
             .orWhere('station_id', 'e')
             .orWhere('station_id', 'r')
             .orWhere('station_id', 'z');
          })
          .orderBy('called_at', 'desc')
          .limit(30);

        const existingQ = new Set(queues.map(q => (q.depq || '').toUpperCase()));
        for (const sc of sqCalls) {
          const qCode = (sc.queue_id || '').toUpperCase();
          if (!existingQ.has(qCode)) {
            const timeStr = sc.called_at ? new Date(sc.called_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
            queues.unshift({
              vn: sc.queue_id,
              depq: sc.queue_id,
              fullname: sc.patient_name,
              raw_fullname: sc.patient_name,
              stationno: 1,
              station_id: sc.station_id,
              station: 'ห้องฉุกเฉิน',
              time_start: timeStr,
              dep: '003',
              er_dch_type: null,
              export_code: '3'
            });
            existingQ.add(qCode);
          }
        }
      } catch (e) {
        console.warn('sq_call_log ER merge error:', e.message);
      }
    }

    if (station.layout === 'dental' || stationId === 'd') {
      try {
        const sqCalls = await sqDb('sq_call_log')
          .whereRaw('DATE(called_at) = CURDATE()')
          .where(b => {
            b.where('station_id', 'like', 'd%')
             .orWhere('station_id', 'dent');
          })
          .orderBy('called_at', 'desc')
          .limit(30);

        const existingQ = new Set(queues.map(q => (q.depq || '').toUpperCase()));
        for (const sc of sqCalls) {
          const qCode = (sc.queue_id || '').toUpperCase();
          if (!existingQ.has(qCode)) {
            const timeStr = sc.called_at ? new Date(sc.called_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
            queues.unshift({
              vn: sc.queue_id,
              depq: sc.queue_id,
              fullname: sc.patient_name,
              raw_fullname: sc.patient_name,
              stationno: 1,
              station_id: sc.station_id,
              station: 'ทันตกรรม',
              time_start: timeStr,
              dep: '008'
            });
            existingQ.add(qCode);
          }
        }
      } catch (e) {
        console.warn('sq_call_log Dental merge error:', e.message);
      }
    }

    if (station.layout === 'pharmacy' || stationId === 'rx' || stationId === 'f' || stationId.startsWith('rx')) {
      try {
        const sqCalls = await sqDb('sq_call_log')
          .whereRaw('DATE(called_at) = CURDATE()')
          .where(b => {
            if (stationId === 'f') {
              b.where('station_id', 'f');
            } else {
              b.where('station_id', 'like', 'rx%').orWhere('station_id', 'rx');
            }
          })
          .orderBy('called_at', 'desc')
          .limit(30);

        const existingQ = new Set(queues.map(q => (q.depq || '').toUpperCase()));
        for (const sc of sqCalls) {
          const qCode = (sc.queue_id || '').toUpperCase();
          if (!existingQ.has(qCode)) {
            const m = String(sc.station_id || '').match(/\d+/);
            const rNo = m ? parseInt(m[0]) : 1;
            const timeStr = sc.called_at ? new Date(sc.called_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
            queues.unshift({
              vn: sc.queue_id,
              depq: sc.queue_id,
              fullname: sc.patient_name,
              raw_fullname: sc.patient_name,
              stationno: rNo,
              station_id: sc.station_id,
              station: stationId === 'f' ? 'ช่องชำระเงิน' : `ช่องจ่ายยา ${rNo}`,
              time_start: timeStr,
              dep: stationId === 'f' ? '027' : '059'
            });
            existingQ.add(qCode);
          }
        }
      } catch (e) {
        console.warn('sq_call_log Pharmacy merge error:', e.message);
      }
    }

    res.json({ queues });
  } catch (err) {
    console.error('[/queue/called error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tts/voices ──────────────────────────────────────────────────
// ดึงรายการเสียงสังเคราะห์ภาษาไทยที่รองรับ
router.get('/tts/voices', (req, res) => {
  res.json({ voices: ttsService.getVoices() });
});

// ── GET /api/tts ─────────────────────────────────────────────────────────
// สตรีมเสียงสังเคราะห์ภาษาไทยคุณภาพสูง (Microsoft Edge Neural + Google Fallback)
router.get('/tts', async (req, res) => {
  const text = (req.query.text || '').trim();
  const voice = (req.query.voice || ttsService.getDefaultVoice()).trim();
  const rate = (req.query.rate || '-20%').trim();
  if (!text) return res.status(400).send('Missing text parameter');

  try {
    const audioBuffer = await ttsService.getAudioBuffer(text, voice, rate);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.send(audioBuffer);
  } catch (err) {
    console.error('[TTS Proxy Exception]:', err.message);
    res.status(500).send(err.message);
  }
});

module.exports = router;
module.exports.setIo = setIo;

