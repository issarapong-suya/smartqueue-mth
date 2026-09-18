// server/services/ttsService.js
// บริการสังเคราะห์เสียงภาษาไทยคุณภาพสูง (Microsoft Edge Neural TTS + Google Fallback)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const WebSocket = require('ws');

const CACHE_DIR = path.join(__dirname, '../../cache/tts');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const DEFAULT_VOICE_ID = process.env.DEFAULT_TTS_VOICE || 'google';

// รายการเสียงที่รองรับ
const VOICES = [
  { id: 'google',    name: 'เสียง Google ภาษาไทย (มาตรฐาน เร็ว เสถียร)', edgeVoice: null,                   isDefault: DEFAULT_VOICE_ID === 'google' },
  { id: 'premwadee', name: 'เสียงเปรมวดี (ผู้หญิง - นุ่มนวล Edge Neural)',   edgeVoice: 'th-TH-PremwadeeNeural', isDefault: DEFAULT_VOICE_ID === 'premwadee' },
  { id: 'niwat',     name: 'เสียงนิวัฒน์ (ผู้ชาย - สุภาพ ชัดเจน)',       edgeVoice: 'th-TH-NiwatNeural',     isDefault: DEFAULT_VOICE_ID === 'niwat' }
];

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;

/**
 * คำนวณ Sec-MS-GEC Token สำหรับเชื่อมต่อ Microsoft Edge TTS Service
 */
function generateSecMsGecToken() {
  const ticks = BigInt(Math.floor((Date.now() / 1000) + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n;
  const roundedTicks = ticks - (ticks % 3000000000n);
  const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;
  const hash = crypto.createHash('sha256');
  hash.update(strToHash, 'ascii');
  return hash.digest('hex').toUpperCase();
}

/**
 * ดึงรายการเสียงทั้งหมด
 */
function getVoices() {
  return VOICES.map(v => ({ id: v.id, name: v.name, isDefault: v.isDefault }));
}

function getDefaultVoice() {
  return DEFAULT_VOICE_ID;
}

// สถานะ Circuit Breaker สำหรับ Edge TTS พร้อม Exponential Backoff
let edgeConsecutiveFailures = 0;
let edgeDisabledUntil = 0;
let cooldownMultiplier = 1;
const inFlightRequests = new Map();

/**
 * สังเคราะห์เสียงผ่าน Microsoft Edge Neural TTS
 */
function synthesizeEdgeTTS(text, voiceName = 'th-TH-PremwadeeNeural', rate = '-20%') {
  return new Promise((resolve, reject) => {
    let ws = null;
    let timeout = null;

    try {
      const token = generateSecMsGecToken();
      const connId = crypto.randomBytes(16).toString('hex');
      const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=1-143.0.3650.75&ConnectionId=${connId}`;

      ws = new WebSocket(url, {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold'
        }
      });
    } catch (err) {
      return reject(err);
    }

    const audioBuffers = [];

    // ลด timeout เหลือ 1.5 วินาที เพื่อไม่ให้ผู้ใช้งานต้องรอนานหากเซิร์ฟเวอร์ Microsoft มีปัญหาหรือถูกบล็อก
    timeout = setTimeout(() => {
      try { if (ws && ws.readyState === WebSocket.OPEN) ws.close(); } catch(e) {}
      reject(new Error('Edge TTS connection timed out (1.5s)'));
    }, 1500);

    // ดักจับเมื่อ Microsoft ปฏิเสธการเชื่อมต่อ เช่น HTTP 403 Forbidden
    ws.on('unexpected-response', (req, res) => {
      clearTimeout(timeout);
      try { ws.close(); } catch(e) {}
      reject(new Error(`Edge TTS handshake rejected (HTTP ${res.statusCode} ${res.statusMessage || ''})`));
    });

    ws.on('open', () => {
      const configMsg = 'Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' + JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
            }
          }
        }
      });
      ws.send(configMsg);

      const reqId = crypto.randomBytes(16).toString('hex');
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="th-TH"><voice name="${voiceName}"><prosody rate="${rate}" pitch="0%">${text}</prosody></voice></speak>`;
      const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const headerLen = data.readUInt16BE(0);
        const audioData = data.subarray(2 + headerLen);
        audioBuffers.push(audioData);
      } else {
        const textMsg = data.toString();
        if (textMsg.includes('Path:turn.end')) {
          clearTimeout(timeout);
          try { ws.close(); } catch(e) {}
          resolve(Buffer.concat(audioBuffers));
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      try { ws.close(); } catch(e) {}
      reject(err);
    });
  });
}

/**
 * สังเคราะห์เสียงผ่าน Google Translate TTS (Fallback รวดเร็ว ~300-450ms)
 */
function synthesizeGoogleTTS(text) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(text)}`;
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 4000
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Google TTS status code: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Google TTS request timeout (4s)'));
    });
    req.on('error', reject);
  });
}

/**
 * สังเคราะห์เสียงพร้อมระบบ Cache + Deduplication + Circuit Breaker
 * @param {string} text - ข้อความที่ต้องการให้อ่าน
 * @param {string} voiceKey - 'google' | 'premwadee' | 'niwat'
 * @param {string} rate - ความเร็ว เช่น '-20%', '-15%'
 * @returns {Promise<Buffer>} ข้อมูลไฟล์เสียง MP3
 */
async function getAudioBuffer(text, voiceKey = null, rate = '-20%') {
  let cleanText = (text || '').trim();
  if (!cleanText) throw new Error('Empty text');

  // ป้องกันแท็ก XML หรือ break tag ที่อาจหลุดมา
  cleanText = cleanText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const targetVoiceKey = voiceKey || getDefaultVoice();
  const selectedVoice = VOICES.find(v => v.id === targetVoiceKey) || VOICES.find(v => v.isDefault) || VOICES[0];

  // ปรับคำลงท้ายให้ตรงเพศ: ชาย (นิวัฒน์) ลงท้ายด้วย "ครับ", หญิง ลงท้ายด้วย "ค่ะ"
  if (selectedVoice.id === 'niwat') {
    cleanText = cleanText.replace(/(ค่ะ|คะ|นะคะ|ครับ)\s*$/g, '').trim();
    cleanText += ' ครับ';
  } else {
    cleanText = cleanText.replace(/(ค่ะ|คะ|นะคะ|ครับ)\s*$/g, '').trim();
    cleanText += ' ค่ะ';
  }

  const cacheKey = crypto.createHash('md5').update(`${selectedVoice.id}_${rate}_${cleanText}`).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.mp3`);

  // 1. ตรวจสอบ Disk Cache (0ms)
  if (fs.existsSync(cacheFile)) {
    try {
      return await fs.promises.readFile(cacheFile);
    } catch (e) {}
  }

  // 2. ถ้าคำขอเดียวกันกำลังถูกประมวลผลอยู่ (In-Flight Deduplication) ให้รอ Promise ตัวเดียวกัน
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const taskPromise = (async () => {
    let audioBuffer = null;

    // 3. ถ้าเลือก Edge Neural voice และไม่ได้อยู่ในช่วง Cooldown
    const isEdgeBlocked = Date.now() < edgeDisabledUntil;
    if (selectedVoice.edgeVoice && !isEdgeBlocked) {
      try {
        audioBuffer = await synthesizeEdgeTTS(cleanText, selectedVoice.edgeVoice, rate);
        edgeConsecutiveFailures = 0; // รีเซ็ตตัวนับความล้มเหลว
        cooldownMultiplier = 1;
        edgeDisabledUntil = 0;
      } catch (edgeErr) {
        edgeConsecutiveFailures++;
        console.warn(`[ttsService] Edge TTS failed (${edgeErr.message}), falling back to Google...`);
        if (edgeConsecutiveFailures >= 2) {
          const cooldownMs = Math.min(5 * 60 * 1000 * cooldownMultiplier, 24 * 60 * 60 * 1000);
          edgeDisabledUntil = Date.now() + cooldownMs;
          cooldownMultiplier *= 4; // เพิ่มระยะเวลาเป็นขั้นบันได 5m -> 20m -> 80m -> 5.3h -> 24h
          console.warn(`[ttsService] ⚡ Edge TTS cooldown active (${Math.round(cooldownMs / 60000)} mins). Fast Google TTS will be used.`);
        }
      }
    }

    // 4. Fallback to Google TTS (รวดเร็ว ~300ms)
    if (!audioBuffer || audioBuffer.length === 0) {
      audioBuffer = await synthesizeGoogleTTS(cleanText);
    }

    // 5. บันทึกลง Disk Cache
    if (audioBuffer && audioBuffer.length > 0) {
      fs.promises.writeFile(cacheFile, audioBuffer).catch(() => {});
    }

    return audioBuffer;
  })().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, taskPromise);
  return taskPromise;
}

// ── ตารางแปลงตัวอักษรและตัวเลขเป็นคำอ่านภาษาไทย ──────────────────────
const THAI_LETTER_MAP = {
  'A': 'เอ', 'B': 'บี', 'C': 'ซี', 'D': 'ดี', 'E': 'อี',
  'F': 'เอฟ', 'G': 'จี', 'H': 'เอช', 'I': 'ไอ', 'J': 'เจ',
  'K': 'เค', 'L': 'แอล', 'M': 'เอ็ม', 'N': 'เอ็น', 'O': 'โอ',
  'P': 'พี', 'Q': 'คิว', 'R': 'อาร์', 'S': 'เอส', 'T': 'ที',
  'U': 'ยู', 'V': 'วี', 'W': 'ดับเบิ้ลยู', 'X': 'เอ็กซ์', 'Y': 'วาย', 'Z': 'แซด'
};

const THAI_DIGIT_MAP = {
  '0': 'ศูนย์', '1': 'หนึ่ง', '2': 'สอง', '3': 'สาม', '4': 'สี่',
  '5': 'ห้า', '6': 'หก', '7': 'เจ็ด', '8': 'แปด', '9': 'เก้า'
};

/**
 * แปลงรหัสคิว เช่น A123 -> เอ หนึ่ง สอง สาม, D025 -> ดี ศูนย์ สอง ห้า
 */
function formatSpokenQueue(queueId) {
  if (!queueId) return '';
  const str = queueId.toString().trim().toUpperCase();
  const tokens = [];
  for (const ch of str) {
    if (THAI_LETTER_MAP[ch]) {
      tokens.push(THAI_LETTER_MAP[ch]);
    } else if (THAI_DIGIT_MAP[ch]) {
      tokens.push(THAI_DIGIT_MAP[ch]);
    } else if (/[A-Z0-9ก-๙]/i.test(ch)) {
      tokens.push(ch);
    }
  }
  return tokens.join(' ');
}

/**
 * แปลงและจัดจังหวะชื่อผู้ป่วย เช่น คุณ สมชาย , ใจดี หรือ นางสาว สุภาพร , รักเรียน
 */
function formatSpokenPatient(ttsName, patientName) {
  let name = (ttsName || patientName || '').toString().trim();
  if (!name || name === '-' || name === 'เชิญรับบริการ') return '';
  name = name.replace(/\*+/g, '').trim();
  if (!name) return '';

  const titleRegex = /^(นางสาว|น\.ส\.|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|พระครู|พระมหา|สามเณร|นาย|นาง|คุณ|พระ)\s*/i;
  const match = name.match(titleRegex);
  let title = 'คุณ';
  let rest = name;
  if (match) {
    title = match[1];
    rest = name.slice(match[0].length).trim();
    if (title === 'ด.ช.') title = 'เด็กชาย';
    else if (title === 'ด.ญ.') title = 'เด็กหญิง';
    else if (title === 'น.ส.') title = 'นางสาว';
  }

  const nameParts = rest.split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    const fname = nameParts[0];
    const lname = nameParts.slice(1).join(' ');
    return `${title} ${fname} , ${lname}`;
  } else if (nameParts.length === 1) {
    return `${title} ${nameParts[0]}`;
  }
  return '';
}

/**
 * แปลงจุดบริการ เช่น ที่ห้องตรวจ 1, ที่ห้องตรวจทันตกรรม
 */
function formatSpokenPlace(ttsTarget, stationLabel) {
  let place = (ttsTarget || stationLabel || '').toString().trim();
  if (!place) return 'ที่จุดบริการ';
  place = place.replace(/^เข้า\s*/, '');
  if (!place.startsWith('ที่')) {
    place = 'ที่ ' + place;
  }
  return place.trim();
}

/**
 * สร้างประโยคเรียกคิวพร้อมจังหวะการเว้นวรรค (commas) อย่างเหมาะสม
 * ตัวอย่างผลลัพธ์: ขอเชิญหมายเลข , เอ หนึ่ง สอง สาม , คุณ สมชาย , ใจดี , ที่ห้องตรวจ 1 ค่ะ
 */
function buildCallSentence(data = {}) {
  const spokenQ = formatSpokenQueue(data.queueId);
  const spokenPatient = formatSpokenPatient(data.ttsName, data.patientName);
  const spokenPlace = formatSpokenPlace(data.ttsTarget, data.stationLabel);

  const parts = ['ขอเชิญหมายเลข'];
  if (spokenQ) parts.push(spokenQ);
  if (spokenPatient) parts.push(spokenPatient);
  if (spokenPlace) parts.push(spokenPlace);

  return parts.join(' , ') + ' ค่ะ';
}

module.exports = {
  getVoices,
  getDefaultVoice,
  getAudioBuffer,
  formatSpokenQueue,
  formatSpokenPatient,
  formatSpokenPlace,
  buildCallSentence
};
