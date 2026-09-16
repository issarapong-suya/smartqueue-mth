// server/services/hosxpWriteService.js
// บริการเขียนข้อมูลสถานะการเรียกคิวกลับไปยัง HOSxP DB
// ตารางที่เกี่ยวข้อง: ovst_queue_server, ovst_queue_server_time, ovst_queue_server_station
const { hosxpDb, sqDb } = require('../config/db');
const nameService = require('./nameService');

// Cache master station mapping จากตาราง ovst_queue_server_station
let stationCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 300000; // 5 นาที

/**
 * ดึงข้อมูล master station จาก HOSxP
 */
async function getMasterStations() {
  const now = Date.now();
  if (stationCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return stationCache;
  }
  try {
    const rows = await hosxpDb('ovst_queue_server_station').select('*');
    stationCache = rows;
    lastCacheTime = now;
    return stationCache;
  } catch (err) {
    console.warn('[hosxpWriteService] Could not fetch ovst_queue_server_station:', err.message);
    return stationCache || [];
  }
}

/**
 * แปลงข้อมูล station/desk ให้เป็นค่าที่ต้องเขียนลง HOSxP
 * @param {string} stationId - รหัสแผนก/จุด เช่น 'sa', 'sb', 'er', 't', 'd', 'rx'
 * @param {number|string} deskNumber - หมายเลขโต๊ะ/ห้อง เช่น 1, 2, 'D01'
 */
async function resolveStationTarget(stationId, deskNumber = 1, roomMode = false) {
  const master = await getMasterStations();
  const dept = (stationId || '').toLowerCase().replace(/[0-9]/g, '');
  let deskNum = parseInt(deskNumber) || 1;

  let station_id = null;
  let station_name = '';
  let stationno = deskNum;
  let depcode = '002';
  let ttsTarget = '';
  let displayLabel = '';

  if (dept === 'sa') {
    // จุดซักประวัติ (โต๊ะ 1-6) -> A01-A06
    deskNum = Math.min(Math.max(deskNum, 1), 8);
    station_id = `A0${deskNum}`;
    stationno = deskNum;
    depcode = '002';
    displayLabel = `ซักประวัติ ${deskNum}`;
    ttsTarget = `ที่โต๊ะซักประวัติ ${deskNum}`;
  } else if (dept === 'sb') {
    // ห้องตรวจโรค OPD 1-5 -> D01-D05
    if (typeof deskNumber === 'string' && deskNumber.toUpperCase().startsWith('D')) {
      deskNum = parseInt(deskNumber.replace(/\D/g, '')) || 1;
    }
    deskNum = Math.min(Math.max(deskNum, 1), 8);
    station_id = `D0${deskNum}`;
    stationno = deskNum;
    depcode = '014';
    displayLabel = `ห้องตรวจ ${deskNum}`;
    ttsTarget = `ที่ห้องตรวจ ${deskNum}`;
  } else if (dept === 'er') {
    // ห้องฉุกเฉิน -> ER1-ER8
    deskNum = Math.min(Math.max(deskNum, 1), 8);
    station_id = `ER${deskNum}`;
    stationno = deskNum;
    depcode = '003';
    displayLabel = `ห้องฉุกเฉิน`;
    // ข้อกำหนด: เสียงเรียกไม่มีเลขโต๊ะต่อท้าย
    ttsTarget = `ที่ห้องฉุกเฉิน`;
  } else if (dept === 't') {
    // ห้องฉีดยา ทำแผล -> TR1
    station_id = 'TR1';
    stationno = 1;
    depcode = '061';
    displayLabel = `ห้องฉีดยา ทำแผล`;
    ttsTarget = `ที่ห้องฉีดยา ทำแผล`;
  } else if (dept === 'd') {
    // ทันตกรรม (ค่าเริ่มต้น: ที่ห้องตรวจทันตกรรม | เลือกห้อง 1-5: ที่ห้องตรวจทันตกรรม 1-5)
    deskNum = Math.min(Math.max(deskNum, 1), 5);
    depcode = '008';

    if (roomMode) {
      station_id = `T0${deskNum}`;
      stationno = deskNum;
      displayLabel = `ห้องตรวจทันตกรรม ${deskNum}`;
      ttsTarget = `ที่ห้องตรวจทันตกรรม ${deskNum}`;
    } else {
      station_id = 'T01';
      stationno = 1;
      displayLabel = `ห้องตรวจทันตกรรม`;
      ttsTarget = `ที่ห้องตรวจทันตกรรม`;
    }
  } else if (dept === 'rx') {
    // ห้องยา ช่อง 1-5 -> R01-R05
    deskNum = Math.min(Math.max(deskNum, 1), 8);
    station_id = `R0${deskNum}`;
    stationno = deskNum;
    depcode = '059';
    displayLabel = `ช่องจ่ายยา ${deskNum}`;
    ttsTarget = `ที่ช่องจ่ายยา ${deskNum}`;
  } else {
    // Default fallback
    station_id = `${dept.toUpperCase()}01`;
    stationno = 1;
    displayLabel = stationId;
    ttsTarget = `ที่จุดบริการ`;
  }

  // ค้นหา station_name จาก master table
  const matchedMaster = master.find(m => m.station_id === station_id);
  if (matchedMaster) {
    if (dept === 'd') {
      station_name = displayLabel;
    } else {
      station_name = matchedMaster.station_name;
    }
    if (matchedMaster.depcode && dept !== 'd') depcode = matchedMaster.depcode;
  } else {
    station_name = displayLabel;
  }

  return {
    station_id,
    station_name,
    stationno,
    depcode,
    ttsTarget,
    displayLabel,
    dept
  };
}

/**
 * เรียกคิวและเขียนข้อมูลลง HOSxP
 * @param {Object} params
 * @param {string} params.vn - VN ของผู้ป่วย (ถ้าไม่มีจะค้นจาก queueId)
 * @param {string} params.queueId - หมายเลขคิว เช่น 'A001'
 * @param {string} params.stationId - รหัสสถานี เช่น 'sa', 'sb', 'er', 't', 'd'
 * @param {number|string} params.deskNumber - หมายเลขโต๊ะ/ห้อง เช่น 1, 2, 'D02'
 * @param {string} params.calledBy - ผู้เรียกคิว (username หรือ station)
 * @param {boolean} params.roomMode - เลือกว่าเป็นโหมดระบุห้องตรวจหรือไม่ (สำหรับทันตกรรม)
 * @returns {Object} ผลลัพธ์ข้อมูลการเรียก
 */
async function callQueue({ vn, queueId, stationId, deskNumber = 1, calledBy = 'system', roomMode = false }) {
  const target = await resolveStationTarget(stationId, deskNumber, roomMode);

  // 1. ค้นหาข้อมูลคิวปัจจุบันใน HOSxP
  let queueRow = null;
  if (vn) {
    queueRow = await hosxpDb('ovst_queue_server as q')
      .leftJoin('ovst as o', 'o.vn', 'q.vn')
      .where('q.vn', vn)
      .select('q.*', 'o.cur_dep')
      .first();
  }

  if (!queueRow && queueId) {
    queueRow = await hosxpDb('ovst_queue_server as q')
      .leftJoin('ovst as o', 'o.vn', 'q.vn')
      .where('q.depq', queueId)
      .where('q.date_visit', hosxpDb.raw('CURDATE()'))
      .select('q.*', 'o.cur_dep')
      .orderBy('q.time_visit', 'desc')
      .first();
  }

  const patientVn = queueRow?.vn || vn;
  const patientHn = queueRow?.hn || '';
  const actualDepq = queueRow?.depq || queueId;

  // สำหรับ sa: ถ้าผู้ป่วยเดิมเป็น 022 (NCD) ให้คง 022 ไว้
  let finalDepcode = target.depcode;
  if (target.dept === 'sa' && queueRow?.cur_dep === '022') {
    finalDepcode = '022';
  } else if (target.dept === 'd' && queueRow?.cur_dep === '053') {
    finalDepcode = '053';
  }

  // 2. ดึงชื่อผู้ป่วยสำหรับ Display และ TTS
  let nameData = { displayName: 'เชิญรับบริการ', rawName: '', ttsName: '' };
  if (actualDepq) {
    try {
      nameData = await nameService.getNameData(actualDepq);
    } catch (e) {}
  }

  // 3. UPDATE ovst_queue_server ใน HOSxP
  if (patientVn) {
    try {
      await hosxpDb('ovst_queue_server')
        .where('vn', patientVn)
        .update({
          stationno:  target.stationno,
          station_id: target.station_id,
          status:     2, // 2 = กำลังรับบริการ / เรียกแล้ว
          wait_dep:   0,
        });
      console.log(`[hosxpWriteService] ✅ Updated ovst_queue_server vn=${patientVn}, stationno=${target.stationno}, station_id=${target.station_id}`);
    } catch (err) {
      console.error(`[hosxpWriteService] ❌ Failed to update ovst_queue_server vn=${patientVn}:`, err.message);
    }

    // 4. INSERT หรือ UPDATE ovst_queue_server_time ใน HOSxP (PRIMARY KEY คือ vn, station_id)
    try {
      const existingTime = await hosxpDb('ovst_queue_server_time')
        .where('vn', patientVn)
        .where('station_id', target.station_id)
        .first();

      if (existingTime) {
        await hosxpDb('ovst_queue_server_time')
          .where('vn', patientVn)
          .where('station_id', target.station_id)
          .update({
            stationno:   target.stationno,
            station:     target.station_name,
            depq:        actualDepq,
            status:      1, // 1 = กำลังรับบริการ
            time_start:  hosxpDb.raw('CURTIME()'),
            dep:         finalDepcode
          });
        console.log(`[hosxpWriteService] ✅ Updated ovst_queue_server_time vn=${patientVn}, station_id=${target.station_id}`);
      } else {
        await hosxpDb('ovst_queue_server_time').insert({
          vn:          patientVn,
          station_id:  target.station_id,
          station:     target.station_name,
          depq:        actualDepq,
          hn:          patientHn,
          date_visit:  hosxpDb.raw('CURDATE()'),
          time_start:  hosxpDb.raw('CURTIME()'),
          time_finish: null,
          stationno:   target.stationno,
          status:      1, // 1 = กำลังรับบริการ
          dep:         finalDepcode,
        });
        console.log(`[hosxpWriteService] ✅ Inserted ovst_queue_server_time vn=${patientVn}, station_id=${target.station_id}, dep=${finalDepcode}`);
      }
    } catch (err) {
      console.error(`[hosxpWriteService] ❌ Failed to save ovst_queue_server_time vn=${patientVn}:`, err.message);
    }
  }

  // 5. บันทึก log ลง smartqueue DB (sq_call_log)
  try {
    await sqDb('sq_call_log').insert({
      station_id:   stationId,
      queue_id:     actualDepq,
      patient_name: nameData.displayName || '',
      called_by:    calledBy || 'caller_web',
      call_type:    'normal',
    });
  } catch (err) {
    console.warn(`[hosxpWriteService] sq_call_log insert error:`, err.message);
  }

  return {
    success: true,
    vn: patientVn,
    hn: patientHn,
    queueId: actualDepq,
    patientName: nameData.displayName,
    rawName: nameData.rawName,
    ttsName: nameData.ttsName,
    stationId: stationId,
    stationLabel: target.displayLabel,
    ttsTarget: target.ttsTarget,
    department: target.dept,
    deskNumber: target.stationno,
    station_id: target.station_id
  };
}

module.exports = {
  getMasterStations,
  resolveStationTarget,
  callQueue
};
