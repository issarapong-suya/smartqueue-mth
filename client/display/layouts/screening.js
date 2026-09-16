// client/display/layouts/screening.js
// Layout: จุดซักประวัติ — 3 คอลัมน์ (รอซักประวัติ | โต๊ะ 1-6 แถวเดียว | เรียกแล้ว)
// สไตล์ถอดแบบจากระบบเดิม: หัวการ์ดเขียวสลับแถวมิ้นต์, โต๊ะสีส้ม, กระพริบเลขคิวนาน 20 วิ, ออโต้สโครลเมื่อล้นจอ

export function mountLayout(container, stationConfig) {
  const group = (stationConfig.id || "sa").replace(/\d+$/, ""); // "sa"

  let deskCardsHtml = "";
  for (let i = 1; i <= 6; i++) {
    deskCardsHtml += `
      <div class="sa-desk-card" id="tbox_${group}${i}">
        <div class="sa-desk-card-hdr">
          <span class="sa-desk-title"><i class="fa-solid fa-user-nurse"></i> โต๊ะ ${i}</span>
          <span class="sa-desk-badge" id="tq_${group}${i}">-</span>
        </div>
        <div class="sa-desk-card-body" id="tname_${group}${i}">รอเรียกคิว</div>
      </div>
    `;
  }

  container.innerHTML = `
    <style>
      .sa-wrap {
        display: flex;
        width: 100%; height: 100%;
        background: var(--bg);
        gap: 0.85rem;
        padding: 0.75rem 0.9rem;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* ── 3 คอลัมน์ตามสัดส่วน ── */
      .sa-col-wait  { flex: 4.6; min-width: 0; display: flex; flex-direction: column; }
      .sa-col-desks { flex: 2.7; min-width: 0; display: flex; flex-direction: column; gap: 0.55rem; justify-content: space-between; }
      .sa-col-hist  { flex: 2.7; min-width: 0; display: flex; flex-direction: column; }

      /* ── การ์ดหลัก (Clean, Elegant, No Border, Soft Shadow) ── */
      .sa-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.09);
        overflow: hidden;
        border: none !important;
      }
      [data-theme="dark"] .sa-panel {
        background: #1e293b;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.35);
      }

      /* หัวการ์ดสีเขียวเหมือนระบบเดิม พร้อมแอนิเมชัน Gradient เคลื่อนไหวลื่นไหล */
      .sa-panel-hdr {
        background: linear-gradient(135deg, #007d44, #27ae60, #007d44);
        color: #ffffff;
        padding: 0.75rem 1.3rem;
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(0, 125, 68, 0.25);
      }
      .sa-panel-hdr.hdr-wait {
        background: linear-gradient(135deg, #006837, #009245, #22c55e, #10b981, #006837);
        background-size: 300% 300%;
        animation: flowGradientGreen 7s ease infinite;
        box-shadow: 0 4px 16px rgba(0, 146, 69, 0.35);
      }
      @keyframes flowGradientGreen {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .sa-count-badge {
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
      .sa-table-head {
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
      [data-theme="dark"] .sa-table-head {
        background: #0f172a;
        border-bottom-color: #334155;
        color: #94a3b8;
      }

      /* รายการเลื่อนไหลอัตโนมัติ */
      .sa-scroll-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .sa-scroll-body::-webkit-scrollbar {
        display: none;
      }

      /* แถวรายการ: ตัวอักษรใหญ่ ชัดเจน อ่านง่ายจากระยะไกล */
      .sa-row {
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
      .sa-row.row-mint {
        background: #ccedde !important;
        color: #0b4528 !important;
      }
      [data-theme="dark"] .sa-row {
        background: #1e293b;
        color: #f1f5f9;
      }
      [data-theme="dark"] .sa-row.row-mint {
        background: #1b382b !important;
        color: #6ee7b7 !important;
      }

      /* ── ธีมสีน้ำเงินสำหรับ "เรียกแล้ว" แตกต่างจากรอซักประวัติ ── */
      .sa-panel-hdr.hdr-hist {
        background: linear-gradient(135deg, #1e40af, #3b82f6, #1e40af);
        box-shadow: 0 4px 14px rgba(30, 64, 175, 0.3);
      }
      .sa-row.row-blue {
        background: #e0f2fe !important;
        color: #075985 !important;
      }
      [data-theme="dark"] .sa-row.row-blue {
        background: #0c4a6e !important;
        color: #7dd3fc !important;
      }
      .sa-q-tag.tag-blue {
        background: #2563eb;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
      }
      .sa-row.row-blue .sa-q-tag.tag-blue {
        background: #1d4ed8;
      }

      /* แท็กหมายเลขคิว: ตัวใหญ่ ชัดเจน */
      .sa-q-tag {
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
      .sa-row.row-mint .sa-q-tag {
        background: #0b5733;
      }

      /* ── แบนเนอร์หัวคอลัมน์กลาง: โต๊ะ 1-6 (สวย สง่างาม มีมิติ ไม่โล่ง) ── */
      .sa-desks-header-banner {
        background: linear-gradient(135deg, #d84315, #f76707, #ff922b);
        color: #ffffff;
        padding: 0.65rem 1.15rem;
        border-radius: 14px;
        box-shadow: 0 4px 16px rgba(247, 103, 7, 0.3);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: var(--font);
        font-size: 1.45rem;
        font-weight: 800;
        flex-shrink: 0;
      }
      .sa-desks-hdr-left {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .sa-desks-badge-pill {
        font-size: 1.05rem;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.45);
        color: #ffffff;
        padding: 0.15rem 0.85rem;
        border-radius: 9999px;
      }

      .sa-desk-card {
        flex: 1;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.09);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: none !important;
      }
      [data-theme="dark"] .sa-desk-card {
        background: #1e293b;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      }

      /* หัวการ์ดโต๊ะ: สีส้ม */
      .sa-desk-card-hdr {
        background: linear-gradient(135deg, #f76707, #ff922b, #f76707);
        color: #ffffff;
        padding: 0.45rem 1.1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font);
      }
      .sa-desk-title {
        font-size: 1.45rem;
        font-weight: 800;
        letter-spacing: 0.3px;
      }
      .sa-desk-badge {
        font-family: var(--font);
        font-size: 1.85rem;
        font-weight: 900;
        padding: 0.12rem 0.95rem;
        border-radius: 9999px;
        background: #ffffff;
        color: #f76707;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        min-width: 90px;
        text-align: center;
        transition: all 0.2s ease;
      }

      /* Body โต๊ะ: ชื่อผู้รับบริการ ตัวใหญ่ ชัดเจน */
      .sa-desk-card-body {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 0.45rem 1.1rem;
        font-family: var(--font);
        font-size: 1.6rem;
        font-weight: 800;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      [data-theme="dark"] .sa-desk-card-body {
        color: #f1f5f9;
      }

      /* ── แอนิเมชันกระพริบเลขคิวเมื่อถูกเรียก (ยาว 20 วินาที) ── */
      @keyframes deskBlinkPulse {
        0%, 100% {
          background: #ffffff;
          color: #d84315;
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(247, 103, 7, 0.7);
        }
        50% {
          background: #d84315;
          color: #ffffff;
          transform: scale(1.18);
          box-shadow: 0 0 16px 6px rgba(247, 103, 7, 0.95);
        }
      }
      .sa-desk-badge.is-blinking {
        animation: deskBlinkPulse 0.75s ease-in-out infinite alternate !important;
      }
    </style>

    <div class="sa-wrap">
      <!-- คอลัมน์ที่ 1: รายการรอซักประวัติ (พร้อม Animated Gradient) -->
      <div class="sa-col-wait">
        <div class="sa-panel">
          <div class="sa-panel-hdr hdr-wait">
            <span><i class="fa-solid fa-users" style="margin-right:0.5rem;"></i>รอซักประวัติ</span>
            <span class="sa-count-badge" id="saWaitBadge">รอ 0 คน</span>
          </div>
          <div class="sa-table-head">
            <div style="width:3.2rem;text-align:center;">#</div>
            <div style="width:105px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.6rem;">ชื่อ-นามสกุล</div>
            <div style="width:100px;text-align:right;">เวลารอ</div>
          </div>
          <div class="sa-scroll-body" id="saWaitList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">กำลังโหลดรายการรอ...</div>
          </div>
        </div>
      </div>

      <!-- คอลัมน์ที่ 2: โต๊ะซักประวัติ 1-6 (แบนเนอร์หัวแน่น สวยงาม มีมิติ) -->
      <div class="sa-col-desks">
        <div class="sa-desks-header-banner">
          <div class="sa-desks-hdr-left">
            <i class="fa-solid fa-stethoscope"></i>
            <span>กำลังให้บริการ</span>
          </div>
          <span class="sa-desks-badge-pill">จุดซักประวัติ</span>
        </div>
        ${deskCardsHtml}
      </div>

      <!-- คอลัมน์ที่ 3: ประวัติเรียกแล้ว (ธีมสีน้ำเงิน แตกต่างจากรอซักประวัติ) -->
      <div class="sa-col-hist">
        <div class="sa-panel">
          <div class="sa-panel-hdr hdr-hist">
            <span><i class="fa-solid fa-clock-rotate-left" style="margin-right:0.5rem;"></i>เรียกแล้ว</span>
            <span class="sa-count-badge" id="saHistBadge">0 คน</span>
          </div>
          <div class="sa-table-head">
            <div style="width:85px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.5rem;">ชื่อ-นามสกุล</div>
            <div style="width:130px;text-align:right;">โต๊ะ / เวลา</div>
          </div>
          <div class="sa-scroll-body" id="saHistList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.2rem;">ยังไม่มีประวัติ</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const history = [];

  // ป้องกันคำว่า "โต๊ะ" ซ้ำซ้อน (เช่น "โต๊ะโต๊ะ 6") และจัดรูปแบบหมายเลขโต๊ะให้ถูกต้องเสมอ
  function formatDeskNumber(label, defaultNum) {
    if (!label && !defaultNum) return "โต๊ะ 1";
    const str = String(label || defaultNum || "1").trim();
    const match = str.match(/\d+/);
    const num = match ? match[0] : defaultNum || "1";
    return `โต๊ะ ${num}`;
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

  // เรียกใช้เมื่อมีเหตุการณ์เรียกคิว
  window.addEventListener("sq_queue_called", (e) => {
    const d = e.detail;
    let deskNum = d.deskNumber;
    if (!deskNum && d.stationId) {
      const m = String(d.stationId).match(/\d+/);
      if (m) deskNum = parseInt(m[0]);
    }
    if (!deskNum && d.stationLabel) {
      const m = String(d.stationLabel).match(/\d+/);
      if (m) deskNum = parseInt(m[0]);
    }
    if (!deskNum) deskNum = 1;

    const qEl = document.getElementById(`tq_${group}${deskNum}`);
    const nameEl = document.getElementById(`tname_${group}${deskNum}`);

    const qCode = (d.queueId || "-").toUpperCase();
    if (qEl) {
      qEl.textContent = qCode;
      // กระพริบเลขคิวนาน 20 วินาที แม้ popup จะหายไปแล้ว
      if (qEl._blinkTimer) clearTimeout(qEl._blinkTimer);
      qEl.classList.add("is-blinking");
      qEl._blinkTimer = setTimeout(() => {
        qEl.classList.remove("is-blinking");
      }, 20000);
    }
    if (nameEl) {
      nameEl.textContent = d.patientName || "เชิญรับบริการ";
    }

    // เพิ่มในประวัติเรียกแล้ว (ตัดคำซ้ำซ้อน ไม่ให้มี "โต๊ะโต๊ะ")
    const deskLabel = formatDeskNumber(d.stationLabel, deskNum);
    history.unshift({
      q: qCode,
      name: d.patientName || "",
      desk: deskLabel,
      time: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    if (history.length > 25) history.pop();
    renderHistory();
    fetchWaiting();
  });

  window.addEventListener("sq_queue_refresh", () => {
    fetchWaiting();
    fetchCalled();
  });

  function renderHistory() {
    const el = document.getElementById("saHistList");
    const badge = document.getElementById("saHistBadge");
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
        const cleanDesk = formatDeskNumber(h.desk, 1);
        return `
        <div class="sa-row ${isBlue}">
          <span class="sa-q-tag tag-blue">${h.q}</span>
          <span style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.name}</span>
          <span style="font-size:1.25rem;color:var(--text-muted);margin-left:auto;white-space:nowrap;display:inline-flex;align-items:center;">
            ${cleanDesk} <i class="fa-regular fa-clock" style="margin-left:0.45rem;margin-right:0.25rem;font-size:1.05rem;opacity:0.85;"></i>${h.time}
          </span>
        </div>
      `;
      })
      .join("");

    initAutoScroll("saHistList");
  }

  async function fetchCalled() {
    try {
      const res = await fetch(
        "/api/queue/called?stationId=" +
          encodeURIComponent(stationConfig.id || "sa"),
      );
      const data = await res.json();
      const list = data.queues || [];

      const deskMap = {};
      list.forEach((item) => {
        const dNo = item.stationno;
        if (dNo && !deskMap[dNo]) {
          deskMap[dNo] = item;
        }
      });

      for (let i = 1; i <= 6; i++) {
        const item = deskMap[i];
        const qEl = document.getElementById(`tq_${group}${i}`);
        const nameEl = document.getElementById(`tname_${group}${i}`);
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
        const dbHist = list.slice(0, 15).map((item) => ({
          q: (item.depq || "").toUpperCase(),
          name: item.fullname || "",
          desk: formatDeskNumber(
            item.stationno || item.station_id,
            item.stationno,
          ),
          time: item.time_start ? item.time_start.slice(0, 5) : "",
        }));
        history.push(...dbHist);
        renderHistory();
      }
    } catch (e) {
      console.warn("screening fetchCalled error:", e);
    }
  }

  async function fetchWaiting() {
    try {
      const res = await fetch(
        "/api/queue/waiting?stationId=" + encodeURIComponent(stationConfig.id),
      );
      const data = await res.json();
      const list = data.queues || [];

      const badge = document.getElementById("saWaitBadge");
      if (badge) badge.textContent = "รอ " + list.length + " คน";

      const el = document.getElementById("saWaitList");
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
          <div class="sa-row ${isMint}">
            <div style="width:3.2rem;text-align:center;color:var(--text-muted);font-weight:800;font-size:1.35rem;">${i + 1}</div>
            <span class="sa-q-tag">${qCode}</span>
            <span style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>
            <span style="font-size:1.25rem;color:var(--text-muted);white-space:nowrap;">${wait}</span>
          </div>
        `;
        })
        .join("");

      initAutoScroll("saWaitList");
    } catch (e) {
      console.error("screening fetchWaiting:", e);
    }
  }

  fetchWaiting();
  fetchCalled();
  setInterval(() => {
    fetchWaiting();
    fetchCalled();
  }, 12000);
}
