// server/services/queueService.js
// Business logic: เรียกคิว, ดึงรายการรอ, บันทึก log
const { sqDb, hosxpDb } = require('../config/db');

/**
 * บันทึก log การเรียกคิว
 */
async function saveCallLog({ stationId, queueId, patientName, calledBy, callType = 'normal' }) {
  try {
    await sqDb('sq_call_log').insert({
      station_id:   stationId,
      queue_id:     queueId,
      patient_name: patientName || '',
      called_by:    calledBy || 'system',
      call_type:    callType,
    });
  } catch (err) {
    console.error('[queueService] saveCallLog error:', err.message);
  }
}

/**
 * ดึงรายการคิวรอของ station
 * @param {string} stationId - เช่น 'sa1', 'rx1'
 * @returns {Array} รายการคิวรอ
 */
async function getWaitingList(stationId, customDepcodes) {
  let depcodes = [];
  let station = null;
  if (customDepcodes) {
    depcodes = Array.isArray(customDepcodes) ? customDepcodes : String(customDepcodes).split(',').map(d => d.trim());
  } else {
    // ดึง depcode ของ station จาก sqDb
    station = await sqDb('sq_stations').where('id', stationId).first();
    if (!station || !station.depcodes) return [];
    depcodes = station.depcodes.split(',').map(d => d.trim());
  }

  try {
    let query = hosxpDb('ovst_queue_server as q')
      .join('ovst as o', 'o.vn', 'q.vn')
      .leftJoin('patient as p', 'p.hn', 'q.hn')
      .where('q.date_visit', hosxpDb.raw('CURDATE()'))
      .where('q.status', '1')
      .whereNull('q.stationno');

    // แสดงเฉพาะผู้ป่วยที่ถูกส่งตัวมายังแผนกห้องตรวจแล้วเท่านั้น (o.cur_dep ตรงกับ depcodes)
    query = query.whereIn('o.cur_dep', depcodes);

    const rows = await query
      .leftJoin('er_regist as e', 'e.vn', 'q.vn')
      .leftJoin('er_emergency_type as et', 'et.er_emergency_type', 'e.er_emergency_type')
      .select(
        'q.vn',
        'q.hn',
        'q.depq',
        'q.fullname',
        'q.time_visit',
        'q.wait_dep',
        'o.cur_dep as dep',
        'o.main_dep',
        'et.export_code',
        'et.name as er_type',
        'p.pname', 'p.fname', 'p.lname'
      )
      .orderBy('q.time_visit', 'asc')
      .limit(60);

    const { maskName } = require('./nameService');
    return rows.map(r => {
      const full = (r.fullname || `${r.pname || ''}${r.fname || ''} ${r.lname || ''}`).replace(/-/g, ' ').trim();
      return {
        ...r,
        fullname: maskName(full),
        raw_fullname: full
      };
    });
  } catch (err) {
    console.error('[queueService] getWaitingList error:', err.message);
    return [];
  }
}

/**
 * ดึงจำนวนคิวรอของแผนก (สำหรับ Dashboard)
 * @param {string[]} depcodes - รหัสแผนก
 */
async function getDeptCount(depcodes) {
  if (!depcodes || depcodes.length === 0) return 0;
  try {
    const row = await hosxpDb('ovst as o')
      .join('ovst_queue_server as q', 'q.vn', 'o.vn')
      .whereIn('o.cur_dep', depcodes)
      .where('q.date_visit', hosxpDb.raw('CURDATE()'))
      .where('q.status', '1')
      .count('q.vn as cnt')
      .first();
    return parseInt(row?.cnt || 0);
  } catch (err) {
    console.error('[queueService] getDeptCount error:', err.message);
    return 0;
  }
}

/**
 * ดึง log การเรียกคิว
 */
async function getCallLog({ stationId, date, limit = 100 }) {
  let query = sqDb('sq_call_log')
    .orderBy('called_at', 'desc')
    .limit(limit);

  if (stationId) query = query.where('station_id', stationId);
  if (date)      query = query.whereRaw('DATE(called_at) = ?', [date]);

  return query;
}

module.exports = { saveCallLog, getWaitingList, getDeptCount, getCallLog };
