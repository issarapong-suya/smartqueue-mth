// client/display/layouts/doctor.js
// Layout: ห้องตรวจแพทย์ (OPD Doctor) — station=sb
// 3 คอลัมน์: ซ้าย = รอพบแพทย์ | กลาง = ห้องตรวจ 1-6 กำลังให้บริการ | ขวา = ประวัติเรียกแล้ว (สไตล์เดียวกับจุดซักประวัติ)

export function mountLayout(container, stationConfig) {
  const group = (stationConfig.id || "sb").replace(/\d+$/, ""); // "sb"

  let roomBoxes = "";
  for (let i = 1; i <= 6; i++) {
    roomBoxes += `
      <div class="doc-room-box" id="rbox_${group}${i}">
        <div class="doc-room-hdr">
          <span><i class="fa-solid fa-user-md me-2"></i>ห้องตรวจ ${i}</span>
        </div>
        <div class="doc-room-body">
          <div class="doc-room-q" id="rq_${group}${i}">-</div>
          <div class="doc-room-name" id="rname_${group}${i}">รอเรียกตรวจ</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <style>
      .doc-wrap {
        display: flex;
        width: 100%; height: 100%;
        background: var(--bg);
        gap: 0.85rem;
        padding: 0.75rem 0.9rem;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* ── 3 คอลัมน์ตามสัดส่วน ── */
      .doc-col-wait  { flex: 3.6; min-width: 0; display: flex; flex-direction: column; }
      .doc-col-rooms { flex: 3.8; min-width: 0; display: flex; flex-direction: column; gap: 0.55rem; }
      .doc-col-hist  { flex: 2.6; min-width: 0; display: flex; flex-direction: column; }

      /* ── การ์ดหลัก (Clean, Modern, No Border, Soft Shadow) ── */
      .doc-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.09);
        overflow: hidden;
        border: none !important;
      }
      [data-theme="dark"] .doc-panel {
        background: #1e293b;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.35);
      }

      /* หัวการ์ดสีเขียวพร้อมแอนิเมชัน Gradient */
      .doc-panel-hdr {
        background: linear-gradient(135deg, #0b4f35, #117851, #0b4f35);
        color: #ffffff;
        padding: 0.75rem 1.3rem;
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(11, 79, 53, 0.25);
      }
      .doc-panel-hdr.hdr-wait {
        background: linear-gradient(135deg, #0b4f35, #009245, #10b981, #007d44, #0b4f35);
        background-size: 300% 300%;
        animation: docFlowGradientGreen 7s ease infinite;
        box-shadow: 0 4px 16px rgba(0, 146, 69, 0.35);
      }
      @keyframes docFlowGradientGreen {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .doc-count-badge {
        font-family: var(--font);
        background: rgba(255, 255, 255, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.45);
        color: #ffffff;
        font-size: 1.15rem;
        font-weight: 800;
        padding: 0.2rem 0.95rem;
        border-radius: 9999px;
      }

      /* หัวตาราง */
      .doc-table-head {
        display: flex;
        padding: 0.6rem 1.1rem;
        background: #f1f5f9;
        border-bottom: 2px solid #e2e8f0;
        font-family: var(--font);
        font-size: 1.3rem;
        font-weight: 800;
        color: #334155;
        flex-shrink: 0;
      }
      [data-theme="dark"] .doc-table-head {
        background: #0f172a;
        border-bottom-color: #334155;
        color: #94a3b8;
      }

      /* รายการเลื่อนไหลอัตโนมัติ */
      .doc-scroll-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .doc-scroll-body::-webkit-scrollbar {
        display: none;
      }

      /* แถวรายการ: ตัวอักษรใหญ่ ชัดเจน อ่านง่ายจากระยะไกล */
      .doc-row {
        display: flex;
        align-items: center;
        padding: 0.72rem 1.15rem;
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 700;
        color: #1e293b;
        background: #ffffff;
        transition: background 0.15s ease;
      }
      .doc-row.row-mint {
        background: #ccedde !important;
        color: #0b4528 !important;
      }
      [data-theme="dark"] .doc-row {
        background: #1e293b;
        color: #f1f5f9;
      }
      [data-theme="dark"] .doc-row.row-mint {
        background: #1b382b !important;
        color: #6ee7b7 !important;
      }

      /* ── ธีมสีน้ำเงินสำหรับ "เรียกแล้ว" ถอดแบบจากจุดซักประวัติ ── */
      .doc-panel-hdr.hdr-hist {
        background: linear-gradient(135deg, #1e40af, #3b82f6, #1e40af);
        box-shadow: 0 4px 14px rgba(30, 64, 175, 0.3);
      }
      .doc-row.row-blue {
        background: #e0f2fe !important;
        color: #075985 !important;
      }
      [data-theme="dark"] .doc-row.row-blue {
        background: #0c4a6e !important;
        color: #7dd3fc !important;
      }

      /* แท็กหมายเลขคิว: ตัวใหญ่ ชัดเจน */
      .doc-q-tag {
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.65rem;
        padding: 0.18rem 0.85rem;
        border-radius: 8px;
        background: #007d44;
        color: #ffffff;
        min-width: 90px;
        text-align: center;
        margin-right: 0.95rem;
        box-shadow: 0 2px 6px rgba(0, 125, 68, 0.25);
      }
      .doc-row.row-mint .doc-q-tag {
        background: #0b5733;
      }
      .doc-q-tag.tag-blue {
        background: #2563eb;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
      }
      .doc-row.row-blue .doc-q-tag.tag-blue {
        background: #1d4ed8;
      }

      /* ── แบนเนอร์หัวคอลัมน์กลาง: ห้องตรวจ 1-6 ── */
      .doc-rooms-header-banner {
        background: linear-gradient(135deg, #0b4f35, #117851, #10b981);
        color: #ffffff;
        padding: 0.65rem 1.15rem;
        border-radius: 14px;
        box-shadow: 0 4px 16px rgba(11, 79, 53, 0.3);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: var(--font);
        font-size: 1.45rem;
        font-weight: 800;
        flex-shrink: 0;
      }
      .doc-rooms-hdr-left {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .doc-rooms-badge-pill {
        font-size: 1.05rem;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.45);
        color: #ffffff;
        padding: 0.15rem 0.85rem;
        border-radius: 9999px;
      }

      /* กริดห้องตรวจ 2 คอลัมน์ x 3 แถว */
      .doc-rooms-grid {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr 1fr;
        gap: 0.65rem;
        min-height: 0;
      }

      .doc-room-box {
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.04);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      [data-theme="dark"] .doc-room-box {
        background: #1e293b;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
        border-color: #334155;
      }

      /* หัวการ์ดห้องตรวจ */
      .doc-room-hdr {
        background: linear-gradient(135deg, #0b4f35, #117851);
        color: #ffffff;
        padding: 0.5rem 1.1rem;
        font-family: var(--font);
        font-size: 1.4rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        letter-spacing: 0.5px;
      }
      [data-theme="dark"] .doc-room-hdr {
        background: linear-gradient(135deg, #064e3b, #047857);
      }

      /* เนื้อหาในห้องตรวจ: เลขคิวตัวใหญ่สุด + ชื่อคนไข้ */
      .doc-room-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 0.4rem 0.8rem;
        gap: 0.15rem;
      }
      .doc-room-q {
        font-family: var(--font);
        font-size: 4rem;
        font-weight: 900;
        color: #0b4f35;
        letter-spacing: 1px;
        line-height: 1.1;
        transition: all 0.2s ease;
      }
      [data-theme="dark"] .doc-room-q {
        color: #34d399;
      }
      .doc-room-name {
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 800;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        text-align: center;
      }
      [data-theme="dark"] .doc-room-name {
        color: #f1f5f9;
      }

      /* ── แอนิเมชันกระพริบเลขคิวเมื่อถูกเรียก (20 วินาที) ── */
      @keyframes docBlinkPulse {
        0%, 100% {
          background: #ffffff;
          color: #0b4f35;
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(17, 120, 81, 0.7);
        }
        50% {
          background: #117851;
          color: #ffffff;
          transform: scale(1.12);
          box-shadow: 0 0 20px 8px rgba(17, 120, 81, 0.95);
        }
      }
      .doc-room-q.is-blinking {
        animation: docBlinkPulse 0.75s ease-in-out infinite alternate !important;
        border-radius: 12px;
        padding: 0 0.8rem;
      }
    </style>

    <div class="doc-wrap">
      <!-- คอลัมน์ที่ 1: รายการรอพบแพทย์ -->
      <div class="doc-col-wait">
        <div class="doc-panel">
          <div class="doc-panel-hdr hdr-wait">
            <span><i class="fa-solid fa-users" style="margin-right:0.5rem;"></i>รอพบแพทย์</span>
            <span class="doc-count-badge" id="docWaitBadge">รอ 0 คน</span>
          </div>
          <div class="doc-table-head">
            <div style="width:3.2rem;text-align:center;">#</div>
            <div style="width:105px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.6rem;">ชื่อ-นามสกุล</div>
            <div style="width:100px;text-align:right;">เวลารอ</div>
          </div>
          <div class="doc-scroll-body" id="docWaitList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">กำลังโหลดรายการรอ...</div>
          </div>
        </div>
      </div>

      <!-- คอลัมน์ที่ 2: ห้องตรวจ 1-6 -->
      <div class="doc-col-rooms">
        <div class="doc-rooms-header-banner">
          <div class="doc-rooms-hdr-left">
            <i class="fa-solid fa-stethoscope"></i>
            <span>กำลังให้บริการ</span>
          </div>
          <span class="doc-rooms-badge-pill">ห้องตรวจ 1 - 6</span>
        </div>
        <div class="doc-rooms-grid">
          ${roomBoxes}
        </div>
      </div>

      <!-- คอลัมน์ที่ 3: ประวัติเรียกแล้ว (สไตล์เดียวกับจุดซักประวัติ) -->
      <div class="doc-col-hist">
        <div class="doc-panel">
          <div class="doc-panel-hdr hdr-hist">
            <span><i class="fa-solid fa-clock-rotate-left" style="margin-right:0.5rem;"></i>เรียกแล้ว</span>
            <span class="doc-count-badge" id="docHistBadge">0 คน</span>
          </div>
          <div class="doc-table-head">
            <div style="width:85px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.5rem;">ชื่อ-นามสกุล</div>
            <div style="width:130px;text-align:right;">ห้อง / เวลา</div>
          </div>
          <div class="doc-scroll-body" id="docHistList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.2rem;">ยังไม่มีประวัติ</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const history = [];

  // จัดรูปแบบหมายเลขห้องตรวจให้สวยงาม เช่น "ห้อง 1", "ห้อง 4"
  function formatRoomNumber(label, defaultNum) {
    if (!label && !defaultNum) return "ห้อง 1";
    const str = String(label || defaultNum || "1").trim();
    const match = str.match(/\d+/);
    const num = match ? match[0] : defaultNum || "1";
    return `ห้อง ${num}`;
  }

  // ฟังก์ชันเริ่มและคุมการเลื่อนไหลอัตโนมัติ (Auto-scroll)
  function initAutoScroll(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (el._autoScrollTimer) clearInterval(el._autoScrollTimer);

    let direction = 1; // 1: ลง, -1: ขึ้น
    let pauseUntil = Date.now() + 6000; // หยุดรอ 6 วินาทีแรกที่ด้านบน

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
          pauseUntil = Date.now() + 4500; // พักที่ด้านล่าง 4.5 วินาที
        }
      } else {
        el.scrollTop -= 2.2;
        if (el.scrollTop <= 2) {
          el.scrollTop = 0;
          direction = 1;
          pauseUntil = Date.now() + 6000; // พักที่ด้านบน 6 วินาที
        }
      }
    }, 35);
  }

  // อัปเดตเมื่อมีเหตุการณ์เรียกคิว
  window.addEventListener("sq_queue_called", (e) => {
    const d = e.detail;
    let roomNum = d.roomNumber || d.deskNumber;
    if (!roomNum && d.stationId) {
      const m = String(d.stationId).match(/\d+/);
      if (m) roomNum = parseInt(m[0]);
    }
    if (!roomNum && d.stationLabel) {
      const m = String(d.stationLabel).match(/\d+/);
      if (m) roomNum = parseInt(m[0]);
    }
    if (!roomNum) roomNum = 1;

    const qEl = document.getElementById(`rq_${group}${roomNum}`);
    const nameEl = document.getElementById(`rname_${group}${roomNum}`);

    const qCode = (d.queueId || "-").toUpperCase();
    if (qEl) {
      qEl.textContent = qCode;
      if (qEl._blinkTimer) clearTimeout(qEl._blinkTimer);
      qEl.classList.add("is-blinking");
      qEl._blinkTimer = setTimeout(() => {
        qEl.classList.remove("is-blinking");
      }, 20000);
    }
    if (nameEl) {
      nameEl.textContent = d.patientName || "เชิญรับบริการ";
    }

    // เพิ่มในประวัติเรียกแล้ว ฝั่งขวา
    const roomLabel = formatRoomNumber(d.stationLabel || d.stationId, roomNum);
    history.unshift({
      q: qCode,
      name: d.patientName || "",
      room: roomLabel,
      time: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    if (history.length > 30) history.pop();
    renderHistory();
    fetchWaiting();
  });

  window.addEventListener("sq_queue_refresh", () => {
    fetchWaiting();
    fetchCalled();
  });

  function renderHistory() {
    const el = document.getElementById("docHistList");
    const badge = document.getElementById("docHistBadge");
    if (!el) return;
    if (badge) badge.textContent = history.length + " คน";

    if (history.length === 0) {
      el.innerHTML =
        '<div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">ยังไม่มีประวัติ</div>';
      return;
    }

    el.innerHTML = history
      .map((h, idx) => {
        const isBlue = idx % 2 === 1 ? "row-blue" : "";
        const cleanRoom = formatRoomNumber(h.room, 1);
        return `
        <div class="doc-row ${isBlue}">
          <span class="doc-q-tag tag-blue">${h.q}</span>
          <span style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.name}</span>
          <span style="font-size:1.25rem;color:var(--text-muted);margin-left:auto;white-space:nowrap;display:inline-flex;align-items:center;">
            ${cleanRoom} <i class="fa-regular fa-clock" style="margin-left:0.45rem;margin-right:0.25rem;font-size:1.05rem;opacity:0.85;"></i>${h.time}
          </span>
        </div>
      `;
      })
      .join("");

    initAutoScroll("docHistList");
  }

  async function fetchCalled() {
    try {
      const res = await fetch(
        "/api/queue/called?stationId=" +
          encodeURIComponent(stationConfig.id || "sb")
      );
      const data = await res.json();
      const list = data.queues || [];

      // จัดกลุ่มคิวล่าสุดของแต่ละห้องตรวจ 1-6
      const roomMap = {};
      list.forEach((item) => {
        let rNo = item.stationno;
        if (!rNo && item.station_id) {
          const m = String(item.station_id).match(/\d+/);
          if (m) rNo = parseInt(m[0]);
        }
        if (rNo && !roomMap[rNo] && rNo >= 1 && rNo <= 6) {
          roomMap[rNo] = item;
        }
      });

      for (let i = 1; i <= 6; i++) {
        const item = roomMap[i];
        const qEl = document.getElementById(`rq_${group}${i}`);
        const nameEl = document.getElementById(`rname_${group}${i}`);
        if (item) {
          if (qEl && !qEl.classList.contains("is-blinking")) {
            qEl.textContent = (item.depq || "-").toUpperCase();
          }
          if (nameEl) {
            nameEl.textContent = item.fullname || "เชิญรับบริการ";
          }
        }
      }

      if (history.length === 0 && list.length > 0) {
        const dbHist = list.slice(0, 20).map((item) => {
          let rNo = item.stationno;
          if (!rNo && item.station_id) {
            const m = String(item.station_id).match(/\d+/);
            if (m) rNo = parseInt(m[0]);
          }
          return {
            q: (item.depq || "").toUpperCase(),
            name: item.fullname || "",
            room: formatRoomNumber(item.station || item.station_id, rNo),
            time: item.time_start ? item.time_start.slice(0, 5) : "",
          };
        });
        history.push(...dbHist);
        renderHistory();
      }
    } catch (e) {
      console.warn("doctor fetchCalled error:", e);
    }
  }

  async function fetchWaiting() {
    try {
      const res = await fetch(
        "/api/queue/waiting?stationId=" + encodeURIComponent(stationConfig.id || "sb")
      );
      const data = await res.json();
      const list = data.queues || [];

      const badge = document.getElementById("docWaitBadge");
      if (badge) badge.textContent = "รอ " + list.length + " คน";

      const el = document.getElementById("docWaitList");
      if (!el) return;
      if (list.length === 0) {
        el.innerHTML =
          '<div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">ไม่มีคิวรอในขณะนี้</div>';
        return;
      }

      el.innerHTML = list
        .map((q, i) => {
          const qCode = q.depq || q.fullname || "#" + (i + 1);
          const name =
            q.fullname ||
            (
              (q.pname || "") +
              (q.fname || "") +
              " " +
              (q.lname || "")
            ).trim() ||
            "-";
          const wait = q.wait_dep
            ? "~" + q.wait_dep + " น."
            : q.time_visit
              ? q.time_visit.slice(0, 5)
              : "";
          const isMint = i % 2 === 1 ? "row-mint" : "";

          return `
          <div class="doc-row ${isMint}">
            <div style="width:3.2rem;text-align:center;color:var(--text-muted);font-weight:800;font-size:1.35rem;">${i + 1}</div>
            <span class="doc-q-tag">${qCode}</span>
            <span style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>
            <span style="font-size:1.25rem;color:var(--text-muted);white-space:nowrap;">${wait}</span>
          </div>
        `;
        })
        .join("");

      initAutoScroll("docWaitList");
    } catch (e) {
      console.error("doctor fetchWaiting:", e);
    }
  }

  fetchWaiting();
  fetchCalled();
  setInterval(() => {
    fetchWaiting();
  }, 10000);
  setInterval(() => {
    fetchCalled();
  }, 8000);
}
