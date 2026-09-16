// server/services/nameService.js
// จัดการชื่อผู้ป่วยให้ถูกต้อง สม่ำเสมอ และไม่มีเครื่องหมายขีด (-) กั้น
const { hosxpDb } = require('../config/db');

/**
 * ตัด/ปกปิดนามสกุลเพื่อความเป็นส่วนตัว (PDPA) เช่น "คุณสนั่น วงศ์***"
 * รองรับพยางค์ภาษาไทย ไม่ให้สระหน้าหรือวรรณยุกต์ลอยค้าง
 */
function maskName(fullname) {
  if (!fullname) return '';
  const clean = fullname.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ');

  if (parts.length <= 1) {
    return clean;
  }

  const firstname = parts[0];
  const lastname = parts.slice(1).join(' ');

  let prefix = '';
  try {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    const words = [...segmenter.segment(lastname)].map(s => s.segment).filter(w => w.trim().length > 0);
    if (words.length > 0) {
      prefix = words[0];
    }
  } catch (e) {}

  if (!prefix) {
    prefix = lastname.substring(0, 3);
  }

  // ป้องกันสระหน้าค้าง (เ, แ, โ, ใ, ไ)
  prefix = prefix.replace(/[เแโใไ]$/, '');

  // ป้องกันวรรณยุกต์ลอยเดี่ยวๆ ไม่มีสระ เช่น "หล้" ให้เพิ่มสระตามเดิมถ้ามี
  if (/[่้๊๋]$/.test(prefix) && lastname.length > prefix.length) {
    const nextChar = lastname[prefix.length];
    if (/[ะาิีึืุู]$/.test(nextChar)) {
      prefix += nextChar;
    }
  }

  return `${firstname} ${prefix}***`;
}

/**
 * ดึงชื่อผู้ป่วยจาก HOSxP ทั้งแบบอ่านเสียง (TTS) และแบบแสดงบนจอ (Display)
 */
async function getNameData(queueId) {
  if (!queueId || queueId === 's99999') {
    return { ttsName: '', displayName: '', rawName: '' };
  }

  try {
    // 1. ค้นหาจาก ovst_queue_server ของวันนี้
    let row = await hosxpDb('ovst_queue_server as q')
      .leftJoin('patient as p', 'p.hn', 'q.hn')
      .where('q.date_visit', hosxpDb.raw('CURDATE()'))
      .where('q.depq', queueId)
      .select(
        'p.pname', 'p.fname', 'p.lname',
        'p.occupation', 'p.marrystatus',
        'q.fullname'
      )
      .first();

    // 2. ถ้าไม่พบ หาจาก ovst_queue_server_dep
    if (!row) {
      row = await hosxpDb('ovst_queue_server_dep as q')
        .leftJoin('patient as p', 'p.hn', 'q.hn')
        .where('q.date_visit', hosxpDb.raw('CURDATE()'))
        .where('q.depq', queueId)
        .select('p.pname', 'p.fname', 'p.lname', 'p.occupation', 'p.marrystatus', 'q.fullname')
        .first();
    }

    if (!row) {
      return { ttsName: '', displayName: '', rawName: '' };
    }

    let rawName = '';

    // ถ้ามี q.fullname ในตาราง ให้ยึดเป็นหลัก (เพราะ HOSxP ใส่ "คุณ" และจัดรูปแบบไว้แล้ว)
    if (row.fullname && row.fullname.trim()) {
      rawName = row.fullname.trim();
    } else {
      // ถ้าไม่มี fullname ให้ประกอบจาก pname + fname + lname
      const prefix = (row.pname || '').trim();
      const fname = (row.fname || '').trim();
      const lname = (row.lname || '').trim();
      rawName = `${prefix}${fname} ${lname}`.trim();
    }

    // ลบเครื่องหมายขีด (-) ออกให้หมด
    rawName = rawName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

    // ชื่อสำหรับอ่านเสียง (TTS): อ่านชื่อเต็ม ไม่ใส่ ***
    const ttsName = rawName;

    // ชื่อสำหรับแสดงบนจอ: ซ่อนนามสกุลด้วย *** ตามมาตรฐาน รพ.
    const displayName = maskName(rawName);

    return { ttsName, displayName, rawName };

  } catch (err) {
    console.error('[nameService] Error:', err.message);
    return { ttsName: '', displayName: '', rawName: '' };
  }
}

// เข้ากันได้กับ function getName เดิม
async function getName(queueId) {
  const data = await getNameData(queueId);
  return data.displayName || data.rawName;
}

module.exports = { getName, getNameData, maskName };
