// client/display/layouts/treatment.js
// Layout: ห้องฉีดยา ทำแผล (station=t, depcode 061)
// ซ้าย 50%: รอฉีดยา ทำแผล (สีฟ้าสดใส) | ขวา 50%: เรียกแล้ว (สีเขียวมิ้นต์) ตามแบบระบบเดิม
// เลื่อนไหลลงอัตโนมัติ (Auto-scroll) ทั้งสองฝั่งเมื่อข้อมูลล้นจอ

export function mountLayout(container, stationConfig) {
  container.innerHTML = `
    <style>
      .t-wrap {
        display: flex;
        width: 100%; height: 100%;
        background: var(--bg);
        gap: 0.95rem;
        padding: 0.75rem 1rem;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* ── 2 คอลัมน์ แบ่งสัดส่วน 50% / 50% ── */
      .t-col-wait   { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .t-col-called { flex: 1; min-width: 0; display: flex; flex-direction: column; }

      /* ── การ์ดพาเนลหลัก (Clean, Elegant, Rounded 16px, Soft Shadow) ── */
      .t-panel {
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
      [data-theme="dark"] .t-panel {
        background: #1e293b;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.35);
      }

      /* ── หัวการ์ดฝั่งซ้าย: รอฉีดยา ทำแผล (สีฟ้าสดใส Gradient) ── */
      .t-hdr-blue {
        background: linear-gradient(135deg, #0284c7, #0ea5e9, #38bdf8);
        color: #ffffff;
        padding: 0.75rem 1.5rem;
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.85rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
        letter-spacing: 0.5px;
      }

      /* ── หัวการ์ดฝั่งขวา: เรียกแล้ว (สีเขียวมิ้นต์สดใส Gradient) ── */
      .t-hdr-green {
        background: linear-gradient(135deg, #059669, #10b981, #34d399);
        color: #ffffff;
        padding: 0.75rem 1.5rem;
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.85rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
        letter-spacing: 0.5px;
      }

      .t-hdr-title {
        display: inline-flex;
        align-items: center;
        gap: 0.85rem;
      }
      .t-hdr-title i {
        font-size: 1.2em;
        opacity: 0.95;
      }

      .t-count-badge {
        font-family: var(--font);
        background: rgba(255, 255, 255, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.45);
        color: #ffffff;
        font-size: 1.2rem;
        font-weight: 800;
        padding: 0.2rem 1.05rem;
        border-radius: 9999px;
      }

      /* ── หัวตาราง ── */
      .t-table-head {
        display: flex;
        align-items: center;
        padding: 0.6rem 1.2rem;
        background: #f1f5f9;
        border-bottom: 2px solid #e2e8f0;
        font-family: var(--font);
        font-size: 1.35rem;
        font-weight: 800;
        color: #334155;
        flex-shrink: 0;
      }
      [data-theme="dark"] .t-table-head {
        background: #0f172a;
        border-bottom-color: #334155;
        color: #94a3b8;
      }

      /* ── ส่วนรายการที่เลื่อนได้ (Auto-scroll) ── */
      .t-scroll-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        padding: 0.4rem 0.5rem;
      }
      .t-scroll-body::-webkit-scrollbar {
        display: none;
      }

      /* ── แถวรายการฝั่งซ้าย (รอฉีดยา ทำแผล) ── */
      .t-row-wait {
        display: flex;
        align-items: center;
        padding: 0.72rem 1.1rem;
        font-family: var(--font);
        font-size: 1.55rem;
        font-weight: 700;
        color: #1e293b;
        background: #ffffff;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.15s ease;
      }
      .t-row-wait:nth-child(even) {
        background: #f8fafc;
      }
      [data-theme="dark"] .t-row-wait {
        background: #1e293b;
        color: #f1f5f9;
        border-bottom-color: #334155;
      }
      [data-theme="dark"] .t-row-wait:nth-child(even) {
        background: #0f172a;
      }

      /* ป้ายคิวฝั่งซ้าย: สีฟ้าสดใส */
      .t-q-badge-wait {
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.7rem;
        padding: 0.2rem 1rem;
        border-radius: 10px;
        background: #0284c7;
        color: #ffffff;
        min-width: 105px;
        text-align: center;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
        display: inline-block;
      }

      /* ── แถวรายการฝั่งขวา (เรียกแล้ว: การ์ดโค้งมนเหมือนระบบเดิม) ── */
      .t-row-called {
        display: flex;
        align-items: center;
        background: #f1f5f9;
        border-radius: 12px;
        margin: 0.4rem 0.5rem;
        padding: 0.45rem 1rem;
        font-family: var(--font);
        color: var(--text);
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .t-row-called:nth-child(even) {
        background: #eef2f6;
      }
      [data-theme="dark"] .t-row-called {
        background: #1e293b;
        border: 1px solid #334155;
        color: #f1f5f9;
      }
      [data-theme="dark"] .t-row-called:nth-child(even) {
        background: #162032;
      }

      .t-called-name {
        flex: 1;
        padding-left: 1rem;
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      [data-theme="dark"] .t-called-name {
        color: #f1f5f9;
      }

      /* ป้ายคิวฝั่งขวา: สีเขียวมรกตโค้งมนตามระบบเดิม */
      .t-q-badge-called {
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.75rem;
        padding: 0.22rem 1.3rem;
        border-radius: 10px;
        background: #007d44;
        color: #ffffff;
        min-width: 110px;
        text-align: center;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 6px rgba(0, 125, 68, 0.25);
        display: inline-block;
      }

      /* ── กระพริบเลขคิวเมื่อถูกเรียก ── */
      @keyframes tBlinkPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        50% {
          transform: scale(1.15);
          box-shadow: 0 0 20px 8px rgba(16, 185, 129, 0.95);
        }
      }
      .t-q-badge-called.is-blinking {
        animation: tBlinkPulse 0.75s ease-in-out infinite alternate !important;
      }
    </style>

    <div class="t-wrap">
      <!-- คอลัมน์ซ้าย (50%): รอฉีดยา ทำแผล -->
      <div class="t-col-wait">
        <div class="t-panel">
          <div class="t-hdr-blue">
            <div class="t-hdr-title">
              <i class="fa-solid fa-syringe"></i>
              <span>รอฉีดยา ทำแผล</span>
            </div>
            <span class="t-count-badge" id="tWaitBadge">รอ 0 คน</span>
          </div>
          <div class="t-table-head">
            <div style="width:3.2rem;text-align:center;">#</div>
            <div style="width:115px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.8rem;">ชื่อ-นามสกุล</div>
            <div style="width:115px;text-align:center;">ประมาณ</div>
          </div>
          <div class="t-scroll-body" id="tWaitList">
            <div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">กำลังโหลดรายการรอ...</div>
          </div>
        </div>
      </div>

      <!-- คอลัมน์ขวา (50%): เรียกแล้ว -->
      <div class="t-col-called">
        <div class="t-panel">
          <div class="t-hdr-green">
            <div class="t-hdr-title">
              <i class="fa-solid fa-circle-check"></i>
              <span>เรียกแล้ว</span>
            </div>
            <span class="t-count-badge" id="tCalledBadge">0 คน</span>
          </div>
          <div class="t-table-head">
            <div style="width:140px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:1rem;">ชื่อ-นามสกุล</div>
          </div>
          <div class="t-scroll-body" id="tCalledList">
            <div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ยังไม่มีประวัติการเรียกคิว</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // อัปเดตข้อความ Marquee ประชาสัมพันธ์ล่างสุด
  const tMarqueeText =
    "จุดฉีดยา ทำแผล โรงพยาบาลแม่ทะ หากผู้ป่วยมีอาการหน้ามืด เป็นลม เหงื่อแตก แน่นหน้าอก หายใจไม่สะดวก กรุณาแจ้งห้องบัตรได้ตลอดเวลา เพื่อประสานเจ้าหน้าที่ห้องฉุกเฉิน | แจ้งเหตุ อุบัติเหตุ-ฉุกเฉิน กรุณาโทร 1669.";
  const marqueeEl = document.querySelector(".sq-footer marquee, .sq-footer span");
  if (marqueeEl) {
    marqueeEl.textContent = tMarqueeText;
  }

  // ปิดบังนามสกุลตามหลัก PDPA อย่างถูกต้อง ไม่ตัดสระ/วรรณยุกต์เพี้ยน
  function maskPatientName(item) {
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

  // ฟังก์ชันเริ่มและคุมการเลื่อนไหลอัตโนมัติ (Auto-scroll)
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

  let calledHistory = [];
  let liveBlinkMap = {};

  // ดึงรายการรอฉีดยา ทำแผล
  async function fetchWaiting() {
    try {
      const res = await fetch(
        "/api/queue/waiting?stationId=" + encodeURIComponent(stationConfig.id || "t")
      );
      const data = await res.json();
      const list = data.queues || [];

      const badge = document.getElementById("tWaitBadge");
      if (badge) badge.textContent = `รอ ${list.length} คน`;

      const el = document.getElementById("tWaitList");
      if (!el) return;

      if (list.length === 0) {
        el.innerHTML =
          '<div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ไม่มีคิวรอในขณะนี้</div>';
        return;
      }

      el.innerHTML = list
        .map((q, i) => {
          const qCode = (q.depq || "").toUpperCase();
          const name = maskPatientName(q);
          const wait = q.wait_dep
            ? `${q.wait_dep} นาที`
            : q.time_visit
              ? q.time_visit.slice(0, 5)
              : "-";

          return `
            <div class="t-row-wait">
              <div style="width:3.2rem;text-align:center;color:var(--text-muted);font-weight:800;font-size:1.35rem;">${i + 1}</div>
              <div style="width:115px;text-align:center;">
                <span class="t-q-badge-wait">${qCode}</span>
              </div>
              <div style="flex:1;padding-left:0.8rem;font-size:1.55rem;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${name}
              </div>
              <div style="width:115px;text-align:center;font-size:1.4rem;font-weight:800;color:var(--text-muted);">
                ${wait}
              </div>
            </div>
          `;
        })
        .join("");

      initAutoScroll("tWaitList");
    } catch (err) {
      console.error("[treatment fetchWaiting] error:", err);
    }
  }

  // ดึงรายการเรียกแล้ว
  async function fetchCalled() {
    try {
      const res = await fetch(
        "/api/queue/called?stationId=" + encodeURIComponent(stationConfig.id || "t")
      );
      const data = await res.json();
      const list = data.queues || [];

      // จัดเรียงตามหมายเลขคิว depq ASC (หรือตามลำดับระบบเดิม T001, T002...)
      const sortedList = [...list].sort((a, b) => {
        const qa = (a.depq || "").toUpperCase();
        const qb = (b.depq || "").toUpperCase();
        return qa.localeCompare(qb, undefined, { numeric: true });
      });

      calledHistory = sortedList;
      renderCalled();
    } catch (err) {
      console.error("[treatment fetchCalled] error:", err);
    }
  }

  function renderCalled() {
    const el = document.getElementById("tCalledList");
    const badge = document.getElementById("tCalledBadge");
    if (badge) badge.textContent = `${calledHistory.length} คน`;
    if (!el) return;

    if (calledHistory.length === 0) {
      el.innerHTML =
        '<div class="sq-empty-text" style="padding:2.5rem;text-align:center;color:var(--text-muted);font-size:1.4rem;">ยังไม่มีประวัติการเรียกคิว</div>';
      return;
    }

    el.innerHTML = calledHistory
      .map((c) => {
        const qCode = (c.depq || "").toUpperCase();
        const isBlinking = liveBlinkMap[qCode] ? "is-blinking" : "";
        const name = maskPatientName(c);

        return `
          <div class="t-row-called">
            <div style="width:140px;text-align:center;">
              <span class="t-q-badge-called ${isBlinking}">${qCode}</span>
            </div>
            <div class="t-called-name">
              ${name}
            </div>
          </div>
        `;
      })
      .join("");

    initAutoScroll("tCalledList");
  }

  // เมื่อมีสัญญาณเรียกคิวผ่าน Socket
  window.addEventListener("sq_queue_called", (e) => {
    const d = e.detail;
    if (!d || !d.queueId) return;

    const qCode = (d.queueId || "").toUpperCase();
    liveBlinkMap[qCode] = true;
    setTimeout(() => {
      delete liveBlinkMap[qCode];
      renderCalled();
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
