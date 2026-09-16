// client/display/layouts/dental.js
// Layout: แผนกทันตกรรม (station=d, depcode 008, 053)
// ซ้าย ~66%: ซักประวัติทันตกรรม (คิวรอ)
// ขวา ~34%: บน "กำลังรับบริการ" (Active Queue) + ล่าง "เรียกแล้ว" (ประวัติคิวที่เรียกแล้ว)

export function mountLayout(container, stationConfig) {
  container.innerHTML = `
    <style>
      .d-wrap {
        display: flex;
        width: 100%;
        height: 100%;
        background: var(--bg, #f8fafc);
        gap: 1rem;
        padding: 0.75rem 1rem 0.5rem 1rem;
        font-family: var(--font, "Noto Sans Thai", "Sarabun", sans-serif);
        box-sizing: border-box;
      }

      /* ── คอลัมน์ซ้าย (รอซักประวัติทันตกรรม ~66%) ── */
      .d-col-wait {
        flex: 1.9;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      /* ── คอลัมน์ขวา (~34%) ── */
      .d-col-right {
        flex: 1.1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .d-panel {
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border, #cbd5e1);
        border-radius: 1rem;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      [data-theme="dark"] .d-panel {
        background: #1e293b;
        border-color: #334155;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
      }

      .d-col-wait .d-panel {
        flex: 1;
      }

      .d-panel-active {
        flex-shrink: 0;
      }

      .d-panel-called {
        flex: 1;
        min-height: 0;
      }

      /* ── Headers ── */
      .d-hdr-green {
        background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
        color: #ffffff;
        padding: 0.85rem 1.4rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
      }

      .d-hdr-blue {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        padding: 0.75rem 1.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
      }

      .d-hdr-title {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        font-size: 1.85rem;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      .d-hdr-title-center {
        width: 100%;
        text-align: center;
        font-size: 1.85rem;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      .d-count-badge {
        font-size: 1.15rem;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.22);
        padding: 0.25rem 0.85rem;
        border-radius: 9999px;
        backdrop-filter: blur(4px);
        white-space: nowrap;
      }

      /* ── Table Header ── */
      .d-table-head {
        display: flex;
        align-items: center;
        padding: 0.6rem 1rem;
        background: #f1f5f9;
        border-bottom: 2px solid var(--border, #cbd5e1);
        font-size: 1.3rem;
        font-weight: 700;
        color: #334155;
      }
      [data-theme="dark"] .d-table-head {
        background: #1e293b;
        color: #94a3b8;
      }

      /* ── Scroll Body ── */
      .d-scroll-body {
        flex: 1;
        overflow-y: auto;
        scroll-behavior: smooth;
      }

      /* ── Rows: Wait List ── */
      .d-row-wait {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border, #e2e8f0);
        font-size: 1.6rem;
        color: var(--text, #1e293b);
        transition: background-color 0.15s ease;
      }
      .d-row-wait:nth-child(even) {
        background: #d1fae5;
      }
      .d-row-wait:nth-child(odd) {
        background: var(--bg-card, #ffffff);
      }
      [data-theme="dark"] .d-row-wait {
        background: #1e293b;
        color: #f1f5f9;
        border-bottom-color: #334155;
      }
      [data-theme="dark"] .d-row-wait:nth-child(even) {
        background: #162032;
      }
      [data-theme="dark"] .d-row-wait:nth-child(odd) {
        background: #1e293b;
      }

      .d-wait-idx {
        width: 70px;
        text-align: center;
        font-weight: 800;
        font-size: 1.6rem;
        color: #475569;
      }
      [data-theme="dark"] .d-wait-idx {
        color: #94a3b8;
      }

      .d-wait-q {
        width: 170px;
        text-align: center;
      }

      .d-q-badge {
        display: inline-block;
        background: #00a65a;
        color: #ffffff;
        font-size: 1.7rem;
        font-weight: 800;
        padding: 0.25rem 1.15rem;
        border-radius: 9999px;
        letter-spacing: 1px;
        box-shadow: 0 2px 6px rgba(0, 166, 90, 0.35);
      }

      .d-wait-name {
        flex: 1;
        padding-left: 1.5rem;
        font-weight: 700;
        font-size: 1.6rem;
        color: var(--text, #1e293b);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      [data-theme="dark"] .d-wait-name {
        color: #f1f5f9;
      }

      /* ── Box 1: กำลังรับบริการ (Active Queue) ── */
      .d-active-content {
        padding: 0.9rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
      }

      .d-active-q-box {
        background: #0284c7;
        color: #ffffff;
        height: 76px;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3.2rem;
        font-weight: 900;
        letter-spacing: 2px;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
        transition: all 0.2s ease;
      }

      .d-active-name-box {
        background: #f8fafc;
        border: 1px solid var(--border, #cbd5e1);
        color: var(--text, #0f172a);
        height: 56px;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.65rem;
        font-weight: 700;
        padding: 0 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      [data-theme="dark"] .d-active-name-box {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      /* ── Rows: Called List ── */
      .d-row-called {
        display: flex;
        align-items: center;
        padding: 0.65rem 0.9rem;
        border-bottom: 1px solid var(--border, #e2e8f0);
        font-size: 1.45rem;
        color: var(--text, #1e293b);
        transition: background-color 0.15s ease;
      }
      .d-row-called:nth-child(even) {
        background: var(--stripe, #f8fafc);
      }
      [data-theme="dark"] .d-row-called {
        background: #1e293b;
        color: #f1f5f9;
        border-bottom-color: #334155;
      }
      [data-theme="dark"] .d-row-called:nth-child(even) {
        background: #162032;
      }

      .d-called-q {
        width: 140px;
        text-align: center;
      }

      .d-called-q-badge {
        display: inline-block;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1.5px solid #bfdbfe;
        font-size: 1.45rem;
        font-weight: 800;
        padding: 0.2rem 0.85rem;
        border-radius: 0.5rem;
        letter-spacing: 0.5px;
      }
      [data-theme="dark"] .d-called-q-badge {
        background: #1e3a8a;
        color: #93c5fd;
        border-color: #2563eb;
      }

      .d-called-name {
        flex: 1;
        padding-left: 1rem;
        font-weight: 700;
        font-size: 1.45rem;
        color: var(--text, #1e293b);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      [data-theme="dark"] .d-called-name {
        color: #f1f5f9;
      }

      /* ── Blinking Animation ── */
      @keyframes activeBlink {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
          background: #0284c7;
        }
        50% {
          opacity: 0.35;
          transform: scale(0.98);
          background: #f59e0b;
        }
      }
      .is-blinking {
        animation: activeBlink 0.65s ease-in-out 14;
      }
    </style>

    <div class="d-wrap">
      <!-- คอลัมน์ซ้าย (รอซักประวัติทันตกรรม ~66%) -->
      <div class="d-col-wait">
        <div class="d-panel">
          <div class="d-hdr-green">
            <div class="d-hdr-title">
              <i class="fa-solid fa-notes-medical"></i>
              <span>ซักประวัติทันตกรรม</span>
            </div>
            <span class="d-count-badge" id="dWaitBadge">รอ 0 คน</span>
          </div>
          <div class="d-table-head">
            <div style="width:70px;text-align:center;">#</div>
            <div style="width:170px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:1.5rem;">ชื่อ-นามสกุล</div>
          </div>
          <div class="d-scroll-body" id="dentalWaitList">
            <div style="padding:4rem 2rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">กำลังโหลดข้อมูล...</div>
          </div>
        </div>
      </div>

      <!-- คอลัมน์ขวา (~34%) -->
      <div class="d-col-right">
        <!-- กล่องบน: กำลังรับบริการ -->
        <div class="d-panel d-panel-active">
          <div class="d-hdr-blue">
            <div class="d-hdr-title-center">กำลังรับบริการ</div>
          </div>
          <div class="d-active-content">
            <div id="dActiveQ" class="d-active-q-box">-</div>
            <div id="dActiveName" class="d-active-name-box">-</div>
          </div>
        </div>

        <!-- กล่องล่าง: เรียกแล้ว -->
        <div class="d-panel d-panel-called">
          <div class="d-hdr-blue">
            <div class="d-hdr-title">
              <i class="fa-solid fa-volume-high"></i>
              <span>เรียกแล้ว</span>
            </div>
            <span class="d-count-badge" id="dCalledBadge">0 คน</span>
          </div>
          <div class="d-table-head">
            <div style="width:140px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:1rem;">ชื่อ-นามสกุล</div>
          </div>
          <div class="d-scroll-body" id="dentalCalledList">
            <div style="padding:2.5rem 1rem;text-align:center;color:var(--text-muted);font-size:1.25rem;">ไม่มีคิวที่เรียกแล้ว</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // อัปเดตข้อความ Marquee ประชาสัมพันธ์ล่างสุด
  const dMarqueeText = "ห้องตรวจทันตกรรม โรงพยาบาลแม่ทะ จ.ลำปาง";
  const marqueeEl = document.querySelector(".sq-footer marquee, .sq-footer span");
  if (marqueeEl) {
    marqueeEl.textContent = dMarqueeText;
  }

  let waitList = [];
  let calledList = [];
  let activeBlinkTimer = null;

  // ── Auto Scroll Helpers ──
  function setupAutoScroll(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (typeof window.initAutoScroll === "function") {
      window.initAutoScroll(el);
    }
  }

  // ── Fetch & Render คิวรอ ──
  async function fetchDentalWaiting() {
    try {
      const res = await fetch("/api/queue/waiting?stationId=d");
      const data = await res.json();
      waitList = data.queues || [];
      renderWaitList();
    } catch (e) {
      console.warn("fetchDentalWaiting error:", e);
    }
  }

  function renderWaitList() {
    const el = document.getElementById("dentalWaitList");
    const badge = document.getElementById("dWaitBadge");
    if (!el) return;

    if (badge) badge.textContent = `รอ ${waitList.length} คน`;

    if (waitList.length === 0) {
      el.innerHTML =
        '<div style="padding:4rem 2rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ไม่มีคิวรอรับบริการ</div>';
      return;
    }

    el.innerHTML = waitList
      .map((item, idx) => {
        const qNum = (item.depq || "").toUpperCase();
        const pName = item.fullname || "-";
        return `
        <div class="d-row-wait">
          <div class="d-wait-idx">${idx + 1}</div>
          <div class="d-wait-q"><span class="d-q-badge">${qNum}</span></div>
          <div class="d-wait-name">${pName}</div>
        </div>
      `;
      })
      .join("");

    setupAutoScroll("dentalWaitList");
  }

  // ── Fetch & Render คิวที่เรียกแล้ว ──
  async function fetchDentalCalled() {
    try {
      const res = await fetch("/api/queue/called?stationId=d");
      const data = await res.json();
      calledList = data.queues || [];
      renderCalledList();
    } catch (e) {
      console.warn("fetchDentalCalled error:", e);
    }
  }

  function renderCalledList() {
    const el = document.getElementById("dentalCalledList");
    const badge = document.getElementById("dCalledBadge");
    if (!el) return;

    if (badge) badge.textContent = `${calledList.length} คน`;

    if (calledList.length === 0) {
      el.innerHTML =
        '<div style="padding:2.5rem 1rem;text-align:center;color:var(--text-muted);font-size:1.25rem;">ไม่มีคิวที่เรียกแล้ว</div>';
      return;
    }

    el.innerHTML = calledList
      .map((item) => {
        const qNum = (item.depq || item.queueId || "").toUpperCase();
        const pName = item.fullname || item.patientName || "-";
        const roomTag = (item.stationno && item.stationno > 0 && String(item.station_name || item.stationLabel || item.station || '').includes('ห้อง'))
          ? `<span class="badge bg-secondary ms-2" style="font-size:0.95rem;vertical-align:middle;">ห้อง ${item.stationno}</span>`
          : '';
        return `
        <div class="d-row-called">
          <div class="d-called-q"><span class="d-called-q-badge">${qNum}</span></div>
          <div class="d-called-name">${pName}${roomTag}</div>
        </div>
      `;
      })
      .join("");

    setupAutoScroll("dentalCalledList");
  }

  // ── Update Active Queue (กำลังรับบริการ) ──
  function updateActiveQueue(queueId, patientName) {
    const qEl = document.getElementById("dActiveQ");
    const nameEl = document.getElementById("dActiveName");
    if (!qEl || !nameEl) return;

    if (!queueId || queueId === "s99999") {
      qEl.textContent = "-";
      nameEl.textContent = "-";
      qEl.classList.remove("is-blinking");
      return;
    }

    qEl.textContent = (queueId || "").toUpperCase();
    nameEl.textContent = patientName || "-";

    // Trigger blinking
    qEl.classList.remove("is-blinking");
    void qEl.offsetWidth; // reflow
    qEl.classList.add("is-blinking");

    if (activeBlinkTimer) clearTimeout(activeBlinkTimer);
    activeBlinkTimer = setTimeout(() => {
      if (qEl) qEl.classList.remove("is-blinking");
    }, 10000);
  }

  // ── Socket Event Listeners ──
  function onQueueCalled(e) {
    const d = e.detail;
    if (!d) return;

    const isDental =
      d.department === "d" ||
      d.stationId === "d" ||
      String(d.stationId || "").toLowerCase().startsWith("d") ||
      d.department === "dent" ||
      d.stationLabel?.includes("ทันต");

    if (isDental) {
      updateActiveQueue(d.queueId, d.patientName);

      // เพิ่มเข้า calledList ลำดับแรกสุดหากยังไม่มี
      const qCode = (d.queueId || "").toUpperCase();
      const existingIdx = calledList.findIndex(
        (x) => (x.depq || x.queueId || "").toUpperCase() === qCode
      );
      if (existingIdx >= 0) {
        calledList.splice(existingIdx, 1);
      }
      calledList.unshift({
        depq: qCode,
        queueId: qCode,
        fullname: d.patientName,
        patientName: d.patientName,
        stationLabel: d.stationLabel,
        stationno: d.deskNumber,
      });

      renderCalledList();
      fetchDentalWaiting();
    }
  }

  function onQueueRefresh() {
    fetchDentalWaiting();
    fetchDentalCalled();
  }

  window.addEventListener("sq_queue_called", onQueueCalled);
  window.addEventListener("sq_queue_refresh", onQueueRefresh);

  // ── Initial Load & Intervals ──
  fetchDentalWaiting();
  fetchDentalCalled();

  const waitTimer = setInterval(fetchDentalWaiting, 15000);
  const calledTimer = setInterval(fetchDentalCalled, 20000);

  return () => {
    clearInterval(waitTimer);
    clearInterval(calledTimer);
    if (activeBlinkTimer) clearTimeout(activeBlinkTimer);
    window.removeEventListener("sq_queue_called", onQueueCalled);
    window.removeEventListener("sq_queue_refresh", onQueueRefresh);
  };
}
