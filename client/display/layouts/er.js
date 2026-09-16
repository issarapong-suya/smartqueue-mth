// client/display/layouts/er.js
// Layout: ห้องฉุกเฉิน (Emergency Room) — station=er
// ซ้าย: รอเรียกเข้าห้องฉุกเฉิน (อุบัติเหตุ-ฉุกเฉิน | ส่งต่อจากจุดอื่น)
// ขวา: กำลังรับบริการ (บน) | รับไว้สังเกตอาการ (ล่าง)

export function mountLayout(container, stationConfig) {
  container.innerHTML = `
    <style>
      .er-wrap {
        display: flex;
        width: 100%; height: 100%;
        background: var(--bg);
        gap: 0.95rem;
        padding: 0.75rem 1rem;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* ── 2 ส่วนหลัก: ฝั่งซ้าย (รอเรียก 2 กล่อง) | ฝั่งขวา (กำลังรับบริการ + สังเกตอาการ) ── */
      .er-col-left  { flex: 6.2; min-width: 0; display: flex; flex-direction: column; gap: 0.75rem; }
      .er-col-right { flex: 3.8; min-width: 0; display: flex; flex-direction: column; gap: 0.75rem; }

      /* ── แบนเนอร์หัวใหญ่ฝั่งซ้าย: รอเรียกเข้าห้องฉุกเฉิน ── */
      .er-main-hdr {
        background: linear-gradient(135deg, #b71c1c, #d32f2f, #ef5350);
        color: #ffffff;
        padding: 0.75rem 1.6rem;
        border-radius: 18px;
        font-family: var(--font);
        font-size: 2.1rem;
        font-weight: 900;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 18px rgba(183, 28, 28, 0.35);
        flex-shrink: 0;
        letter-spacing: 0.5px;
      }
      .er-hdr-title {
        display: inline-flex;
        align-items: center;
        gap: 0.85rem;
      }
      .er-hdr-title i {
        font-size: 1.2em;
        opacity: 0.95;
      }
      .er-main-badge {
        font-size: 1.25rem;
        font-weight: 800;
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.45);
        color: #ffffff;
        padding: 0.2rem 1.1rem;
        border-radius: 9999px;
      }

      /* ── กล่อง 2 คอลัมน์ฝั่งซ้าย ── */
      .er-wait-boxes {
        flex: 1;
        display: flex;
        gap: 0.9rem;
        min-height: 0;
      }

      /* ── การ์ดพาเนล ── */
      .er-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.09);
        overflow: hidden;
        border: none !important;
        min-height: 0;
      }
      [data-theme="dark"] .er-panel {
        background: #1e293b;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.35);
      }

      /* หัวพาเนลแต่ละกล่อง */
      .er-box-hdr {
        color: #ffffff;
        padding: 0.65rem 1.3rem;
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
      }
      .er-box-hdr.hdr-emergency {
        background: linear-gradient(135deg, #b71c1c, #d32f2f, #ef5350);
      }
      .er-box-hdr.hdr-refer {
        background: linear-gradient(135deg, #007d44, #10b981, #007d44);
      }
      .er-box-hdr.hdr-serving {
        background: linear-gradient(135deg, #007d44, #27ae60, #007d44);
        font-size: 1.7rem;
      }
      .er-box-hdr.hdr-observation {
        background: linear-gradient(135deg, #e65100, #f57c00, #ff9800);
        font-size: 1.7rem;
      }

      .er-count-badge {
        font-family: var(--font);
        background: rgba(255, 255, 255, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.45);
        color: #ffffff;
        font-size: 1.15rem;
        font-weight: 800;
        padding: 0.18rem 0.85rem;
        border-radius: 9999px;
      }

      /* หัวตาราง */
      .er-table-head {
        display: flex;
        align-items: center;
        padding: 0.55rem 1.1rem;
        background: #f1f5f9;
        border-bottom: 2px solid #e2e8f0;
        font-family: var(--font);
        font-size: 1.3rem;
        font-weight: 800;
        color: #334155;
        flex-shrink: 0;
      }
      .er-table-head.head-red {
        background: #fee2e2;
        border-bottom-color: #fca5a5;
        color: #991b1b;
      }
      .er-table-head.head-green {
        background: #dcfce7;
        border-bottom-color: #86efac;
        color: #166534;
      }
      .er-table-head.head-orange {
        background: #ffedd5;
        border-bottom-color: #fdba74;
        color: #9a3412;
      }
      [data-theme="dark"] .er-table-head {
        background: #0f172a !important;
        border-bottom-color: #334155 !important;
        color: #94a3b8 !important;
      }

      /* ส่วนแสดงรายการที่เลื่อนได้ */
      .er-scroll-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .er-scroll-body::-webkit-scrollbar {
        display: none;
      }

      /* แถวรายการ */
      .er-row {
        display: flex;
        align-items: center;
        padding: 0.7rem 1.1rem;
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 700;
        color: #1e293b;
        background: #ffffff;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.15s ease;
      }
      .er-row:nth-child(even) {
        background: #f8fafc;
      }
      [data-theme="dark"] .er-row {
        background: #1e293b;
        color: #f1f5f9;
        border-bottom-color: #334155;
      }
      [data-theme="dark"] .er-row:nth-child(even) {
        background: #0f172a;
      }

      /* ── แท็กหมายเลขคิว (สีตามระดับความฉุกเฉิน Triage หรือสีเหลืองตามระบบเดิม) ── */
      .er-q-tag {
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.8rem;
        padding: 0.22rem 1.2rem;
        border-radius: 12px;
        min-width: 115px;
        text-align: center;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        display: inline-block;
      }

      /* สไตล์สีตามระดับความฉุกเฉิน */
      .er-tag-yellow { background: #ffeb3b !important; color: #111827 !important; border: 1px solid #fde047; }
      .er-tag-red    { background: #ef4444 !important; color: #ffffff !important; border: 1px solid #dc2626; }
      .er-tag-pink   { background: #ec4899 !important; color: #ffffff !important; border: 1px solid #db2777; }
      .er-tag-green  { background: #10b981 !important; color: #ffffff !important; border: 1px solid #059669; }
      .er-tag-white  { background: #f8fafc !important; color: #1e293b !important; border: 1px solid #cbd5e1; }

      .er-est-time {
        font-size: 1.55rem;
        font-weight: 800;
        color: #1e293b;
        text-align: center;
        flex: 1.2;
      }
      [data-theme="dark"] .er-est-time {
        color: #f1f5f9;
      }

      /* ── กระพริบเมื่อมีสัญญาณเรียก ── */
      @keyframes erBlinkPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }
        50% {
          transform: scale(1.14);
          box-shadow: 0 0 20px 8px rgba(239, 68, 68, 0.95);
        }
      }
      .er-q-tag.is-blinking {
        animation: erBlinkPulse 0.75s ease-in-out infinite alternate !important;
      }
    </style>

    <div class="er-wrap">
      <!-- ฝั่งซ้าย: รอเรียกเข้าห้องฉุกเฉิน (2 กล่อง: อุบัติเหตุ-ฉุกเฉิน | ส่งต่อจากจุดอื่น) -->
      <div class="er-col-left">
        <div class="er-main-hdr">
          <div class="er-hdr-title">
            <i class="fa-regular fa-clock"></i>
            <span>รอเรียกเข้าห้องฉุกเฉิน</span>
          </div>
          <span class="er-main-badge" id="erWaitTotalBadge">รอ 0 คน</span>
        </div>

        <div class="er-wait-boxes">
          <!-- กล่อง 1: อุบัติเหตุ-ฉุกเฉิน -->
          <div class="er-panel">
            <div class="er-box-hdr hdr-emergency">
              <div class="er-hdr-title">
                <i class="fa-solid fa-ambulance"></i>
                <span>อุบัติเหตุ-ฉุกเฉิน</span>
              </div>
              <span class="er-count-badge" id="erWaitEmerBadge">0 คน</span>
            </div>
            <div class="er-table-head head-red">
              <div style="flex:1.2;text-align:center;">หมายเลข</div>
              <div style="flex:1.2;text-align:center;">ประมาณ</div>
            </div>
            <div class="er-scroll-body" id="erWaitEmergencyList">
              <div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ไม่มีคิวรอในขณะนี้</div>
            </div>
          </div>

          <!-- กล่อง 2: ส่งต่อจากจุดอื่น -->
          <div class="er-panel">
            <div class="er-box-hdr hdr-refer">
              <div class="er-hdr-title">
                <i class="fa-solid fa-route"></i>
                <span>ส่งต่อจากจุดอื่น</span>
              </div>
              <span class="er-count-badge" id="erWaitReferBadge">0 คน</span>
            </div>
            <div class="er-table-head head-green">
              <div style="flex:1.2;text-align:center;">หมายเลข</div>
              <div style="flex:1.2;text-align:center;">ประมาณ</div>
            </div>
            <div class="er-scroll-body" id="erWaitReferList">
              <div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ไม่มีคิวรอในขณะนี้</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ฝั่งขวา: กำลังรับบริการ + รับไว้สังเกตอาการ -->
      <div class="er-col-right">
        <!-- กล่อง 3 (บน): กำลังรับบริการ -->
        <div class="er-panel" style="flex: 5.8;">
          <div class="er-box-hdr hdr-serving">
            <div class="er-hdr-title">
              <i class="fa-solid fa-stethoscope"></i>
              <span>กำลังรับบริการ</span>
            </div>
            <span class="er-count-badge" id="erServingBadge">0 คน</span>
          </div>
          <div class="er-table-head head-green">
            <div style="width:135px;text-align:center;flex-shrink:0;margin-right:1rem;">หมายเลข</div>
            <div style="flex:1;text-align:left;">ชื่อ-นามสกุล</div>
            <div style="width:105px;text-align:right;flex-shrink:0;">เวลา</div>
          </div>
          <div class="er-scroll-body" id="erServingList">
            <div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">ไม่มีผู้ป่วยกำลังรับบริการ</div>
          </div>
        </div>

        <!-- กล่อง 4 (ล่าง): รับไว้สังเกตอาการ -->
        <div class="er-panel" style="flex: 4.2;">
          <div class="er-box-hdr hdr-observation">
            <div class="er-hdr-title">
              <i class="fa-solid fa-bed"></i>
              <span>รับไว้สังเกตอาการ</span>
            </div>
            <span class="er-count-badge" id="erObservationBadge">0 คน</span>
          </div>
          <div class="er-table-head head-orange">
            <div style="width:135px;text-align:center;flex-shrink:0;margin-right:1rem;">หมายเลข</div>
            <div style="flex:1;text-align:left;">ชื่อ-นามสกุล</div>
            <div style="width:105px;text-align:right;flex-shrink:0;">สถานะ</div>
          </div>
          <div class="er-scroll-body" id="erObservationList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.3rem;">ไม่มีผู้ป่วยสังเกตอาการในขณะนี้</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // อัปเดตข้อความ Marquee ประชาสัมพันธ์ฉุกเฉินที่แถบล่างสุด
  const erMarqueeText =
    "ขณะที่ห้องอุบัติเหตุฉุกเฉินกำลังให้บริการผู้ป่วยวิกฤตฉุกเฉิน  หากผู้ป่วยรอตรวจมีอาการหน้ามืด เป็นลม เหงื่อแตก แน่นหน้าอก หายใจไม่สะดวก กรุณาแจ้งห้องบัตรได้ตลอดเวลา เพื่อประสานเจ้าหน้าที่ห้องฉุกเฉิน | แจ้งเหตุ อุบัติเหตุ-ฉุกเฉิน กรุณาโทร 1669.";
  const marqueeEl = document.querySelector(".sq-footer marquee, .sq-footer span");
  if (marqueeEl) {
    marqueeEl.textContent = erMarqueeText;
  }

  // แปลงสีแท็กตามระดับความฉุกเฉิน Triage
  function getTriageClass(code) {
    switch (String(code)) {
      case "1": return "er-tag-red";    // Resuscitate
      case "2": return "er-tag-pink";   // Emergency
      case "3": return "er-tag-yellow"; // Urgent
      case "4": return "er-tag-green";  // Semi-urgent
      case "5": return "er-tag-white";  // Non-urgent
      default:  return "er-tag-yellow"; // ค่าเริ่มต้น สีเหลืองเหมือนระบบเดิม
    }
  }

  // คำนวณและแสดงผลเวลารอโดยประมาณ
  function formatWaitTime(mins, index) {
    const val = parseInt(mins) || (index + 1) * 15;
    if (val < 60) return `${val} นาที`;
    const h = Math.floor(val / 60);
    const m = val % 60;
    return m > 0 ? `${h} ชม.+` : `${h} ชม.`;
  }

  // จัดรูปแบบชื่อผู้ป่วยตามหลัก PDPA โดยไม่ทำให้สระ/วรรณยุกต์เพี้ยน
  function cleanPatientName(item) {
    if (item.fullname && item.fullname.includes("***")) {
      return item.fullname;
    }
    const raw = (item.raw_fullname || item.fullname || "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!raw) return "ไม่ระบุชื่อ";
    const parts = raw.split(" ");
    if (parts.length <= 1) return raw;

    const firstname = parts[0];
    const lastname = parts.slice(1).join(" ");

    let prefix = "";
    try {
      if (window.Intl && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter("th", { granularity: "word" });
        const words = [...segmenter.segment(lastname)]
          .map((s) => s.segment)
          .filter((w) => w.trim().length > 0);
        if (words.length > 0) prefix = words[0];
      }
    } catch (e) {}

    if (!prefix) prefix = lastname.substring(0, 3);
    prefix = prefix.replace(/[เแโใไ]$/, "");
    if (/[่้๊๋]$/.test(prefix) && lastname.length > prefix.length) {
      const nextChar = lastname[prefix.length];
      if (/[ะาิีึืุู]$/.test(nextChar)) prefix += nextChar;
    }

    return `${firstname} ${prefix}***`;
  }

  // Auto-scroll
  function initAutoScroll(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (el._autoScrollTimer) clearInterval(el._autoScrollTimer);

    let direction = 1;
    let pauseUntil = Date.now() + 6000;

    el._autoScrollTimer = setInterval(() => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 8) {
        el.scrollTop = 0;
        return;
      }
      if (Date.now() < pauseUntil) return;

      if (direction === 1) {
        el.scrollTop += 1.2;
        if (el.scrollTop >= maxScroll - 2) {
          el.scrollTop = maxScroll;
          direction = -1;
          pauseUntil = Date.now() + 4500;
        }
      } else {
        el.scrollTop -= 2.2;
        if (el.scrollTop <= 2) {
          el.scrollTop = 0;
          direction = 1;
          pauseUntil = Date.now() + 6000;
        }
      }
    }, 35);
  }

  let liveServingMap = {};

  // ดึงรายการรอ
  async function fetchWaiting() {
    try {
      const res = await fetch(
        "/api/queue/waiting?stationId=" + encodeURIComponent(stationConfig.id || "er")
      );
      const data = await res.json();
      const list = data.queues || [];

      // แยก 2 กลุ่ม:
      // 1. ส่งต่อจากจุดอื่น (main_dep ไม่ใช่ 003 และไม่ใช่ 061)
      // 2. อุบัติเหตุ-ฉุกเฉิน (ตรงเข้า ER โดยตรง หรือไม่มี main_dep)
      const referList = list.filter(
        (q) => q.main_dep && q.main_dep !== "003" && q.main_dep !== "061"
      );
      const emerList = list.filter(
        (q) => !q.main_dep || q.main_dep === "003" || q.main_dep === "061"
      );

      // อัปเดตตัวเลขรวม
      const totalBadge = document.getElementById("erWaitTotalBadge");
      if (totalBadge) totalBadge.textContent = "รอ " + list.length + " คน";

      const emerBadge = document.getElementById("erWaitEmerBadge");
      if (emerBadge) emerBadge.textContent = emerList.length + " คน";

      const referBadge = document.getElementById("erWaitReferBadge");
      if (referBadge) referBadge.textContent = referList.length + " คน";

      // แสดงรายการอุบัติเหตุ-ฉุกเฉิน
      const emerEl = document.getElementById("erWaitEmergencyList");
      if (emerEl) {
        if (emerList.length === 0) {
          emerEl.innerHTML =
            '<div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ไม่มีคิวรอในขณะนี้</div>';
        } else {
          emerEl.innerHTML = emerList
            .map((q, idx) => {
              const qCode = (q.depq || "-").toUpperCase();
              const tagClass = getTriageClass(q.export_code);
              const est = formatWaitTime(q.wait_dep, idx);
              return `
                <div class="er-row">
                  <div style="flex:1.2;text-align:center;">
                    <span class="er-q-tag ${tagClass}">${qCode}</span>
                  </div>
                  <div class="er-est-time">${est}</div>
                </div>
              `;
            })
            .join("");
          initAutoScroll("erWaitEmergencyList");
        }
      }

      // แสดงรายการส่งต่อจากจุดอื่น
      const referEl = document.getElementById("erWaitReferList");
      if (referEl) {
        if (referList.length === 0) {
          referEl.innerHTML =
            '<div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ไม่มีคิวรอในขณะนี้</div>';
        } else {
          referEl.innerHTML = referList
            .map((q, idx) => {
              const qCode = (q.depq || "-").toUpperCase();
              const tagClass = getTriageClass(q.export_code);
              const est = formatWaitTime(q.wait_dep, idx);
              return `
                <div class="er-row">
                  <div style="flex:1.2;text-align:center;">
                    <span class="er-q-tag ${tagClass}">${qCode}</span>
                  </div>
                  <div class="er-est-time">${est}</div>
                </div>
              `;
            })
            .join("");
          initAutoScroll("erWaitReferList");
        }
      }
    } catch (e) {
      console.warn("er fetchWaiting error:", e);
    }
  }

  // ดึงรายการที่ถูกเรียก / รับบริการ / สังเกตอาการ
  async function fetchCalled() {
    try {
      const res = await fetch(
        "/api/queue/called?stationId=" + encodeURIComponent(stationConfig.id || "er")
      );
      const data = await res.json();
      const list = data.queues || [];

      // แยกเป็นกำลังรับบริการ (er_dch_type != 5) และ รับไว้สังเกตอาการ (er_dch_type == 5)
      const servingList = list.filter((item) => String(item.er_dch_type) !== "5");
      const observationList = list.filter((item) => String(item.er_dch_type) === "5");

      // กำลังรับบริการ
      const sBadge = document.getElementById("erServingBadge");
      if (sBadge) sBadge.textContent = servingList.length + " คน";

      const sEl = document.getElementById("erServingList");
      if (sEl) {
        if (servingList.length === 0) {
          sEl.innerHTML =
            '<div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">ไม่มีผู้ป่วยกำลังรับบริการ</div>';
        } else {
          sEl.innerHTML = servingList
            .slice(0, 20)
            .map((item) => {
              const qCode = (item.depq || "-").toUpperCase();
              const tagClass = getTriageClass(item.export_code);
              const isBlinking = liveServingMap[qCode] ? "is-blinking" : "";
              const timeStr = item.time_start ? item.time_start.slice(0, 5) : "";
              const patientName = cleanPatientName(item);

              return `
                <div class="er-row">
                  <div style="width:135px;text-align:center;flex-shrink:0;margin-right:1rem;">
                    <span class="er-q-tag ${tagClass} ${isBlinking}">${qCode}</span>
                  </div>
                  <div style="flex:1;font-weight:800;font-size:1.6rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${patientName}
                  </div>
                  <div style="width:105px;text-align:right;font-size:1.35rem;font-weight:700;color:var(--text-muted);white-space:nowrap;flex-shrink:0;">
                    ${timeStr ? timeStr + ' น.' : '-'}
                  </div>
                </div>
              `;
            })
            .join("");
          initAutoScroll("erServingList");
        }
      }

      // รับไว้สังเกตอาการ
      const oBadge = document.getElementById("erObservationBadge");
      if (oBadge) oBadge.textContent = observationList.length + " คน";

      const oEl = document.getElementById("erObservationList");
      if (oEl) {
        if (observationList.length === 0) {
          oEl.innerHTML =
            '<div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.3rem;">ไม่มีผู้ป่วยสังเกตอาการในขณะนี้</div>';
        } else {
          oEl.innerHTML = observationList
            .map((item) => {
              const qCode = (item.depq || "-").toUpperCase();
              const tagClass = getTriageClass(item.export_code);
              const patientName = cleanPatientName(item);

              return `
                <div class="er-row">
                  <div style="width:135px;text-align:center;flex-shrink:0;margin-right:1rem;">
                    <span class="er-q-tag ${tagClass}">${qCode}</span>
                  </div>
                  <div style="flex:1;font-weight:800;font-size:1.6rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${patientName}
                  </div>
                  <div style="width:105px;text-align:right;font-size:1.35rem;color:#ea580c;font-weight:800;white-space:nowrap;flex-shrink:0;">
                    สังเกตอาการ
                  </div>
                </div>
              `;
            })
            .join("");
          initAutoScroll("erObservationList");
        }
      }
    } catch (e) {
      console.warn("er fetchCalled error:", e);
    }
  }

  // ฟัง event เรียกคิวผ่าน Socket
  window.addEventListener("sq_queue_called", (e) => {
    const d = e.detail;
    const qCode = (d.queueId || "-").toUpperCase();
    liveServingMap[qCode] = true;
    setTimeout(() => {
      delete liveServingMap[qCode];
      fetchCalled();
    }, 20000);

    fetchCalled();
    fetchWaiting();
  });

  window.addEventListener("sq_queue_refresh", () => {
    fetchWaiting();
    fetchCalled();
  });

  fetchWaiting();
  fetchCalled();
  setInterval(fetchWaiting, 10000);
  setInterval(fetchCalled, 8000);
}
