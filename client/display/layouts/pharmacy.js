// client/display/layouts/pharmacy.js
// Layout: ห้องยาและการเงิน (rx / f)
// ถอดแบบจากระบบเดิม: ซ้าย (รอชำระเงิน) | กลาง (5 ช่องบริการ) | ขวา (รอรับยา)

export function mountLayout(container, stationConfig) {
  container.innerHTML = `
    <style>
      .rx-wrap {
        display: flex;
        width: 100%; height: 100%;
        background: var(--bg);
        gap: 0.85rem;
        padding: 0.75rem 0.9rem;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* ── 3 คอลัมน์ตามสัดส่วน ── */
      .rx-col-pay   { flex: 3.6; min-width: 0; display: flex; flex-direction: column; }
      .rx-col-desks { flex: 2.8; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 0.55rem; }
      .rx-col-drug  { flex: 3.6; min-width: 0; display: flex; flex-direction: column; }

      /* ── การ์ดหลัก (Clean, Elegant, No Border, Soft Shadow) ── */
      .rx-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.09);
        overflow: hidden;
        border: none !important;
      }
      [data-theme="dark"] .rx-panel {
        background: #1e293b;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.35);
      }

      /* ── หัวการ์ดฝั่งรอชำระเงิน (สีเขียว) ── */
      .rx-panel-hdr-pay {
        background: linear-gradient(135deg, #00b074, #20c997, #00b074);
        color: #ffffff;
        padding: 0.75rem 1.3rem;
        font-family: var(--font);
        font-size: 1.6rem;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(0, 176, 116, 0.25);
      }

      /* ── หัวการ์ดฝั่งรอรับยา (สีม่วงลาเวนเดอร์) ── */
      .rx-panel-hdr-drug {
        background: linear-gradient(135deg, #7c3aed, #9333ea, #a855f7);
        color: #ffffff;
        padding: 0.75rem 1.3rem;
        font-family: var(--font);
        font-size: 1.6rem;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
      }

      .rx-count-badge {
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
      .rx-table-head {
        display: flex;
        padding: 0.6rem 1.1rem;
        background: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
        font-family: var(--font);
        font-size: 1.3rem;
        font-weight: 800;
        color: #334155;
        flex-shrink: 0;
      }
      [data-theme="dark"] .rx-table-head {
        background: #0f172a;
        border-bottom-color: #334155;
        color: #94a3b8;
      }

      /* รายการเลื่อนไหลอัตโนมัติ */
      .rx-scroll-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .rx-scroll-body::-webkit-scrollbar {
        display: none;
      }

      /* แถวรายการ: ตัวอักษรใหญ่ ชัดเจน */
      .rx-row {
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
      /* สลับสีเขียวมิ้นต์ (#ccedde) สำหรับรอชำระเงิน */
      .rx-row.row-mint {
        background: #ccedde !important;
        color: #0b4528 !important;
      }
      /* สลับสีฟ้าอ่อน (#e0f2fe) สำหรับรอรับยา */
      .rx-row.row-blue {
        background: #e0f2fe !important;
        color: #075985 !important;
      }
      [data-theme="dark"] .rx-row {
        background: #1e293b;
        color: #f1f5f9;
      }
      [data-theme="dark"] .rx-row.row-mint {
        background: #1b382b !important;
        color: #6ee7b7 !important;
      }
      [data-theme="dark"] .rx-row.row-blue {
        background: #0c4a6e !important;
        color: #7dd3fc !important;
      }

      /* แท็กหมายเลขคิว: เขียว (ชำระเงิน) */
      .rx-q-tag-green {
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.65rem;
        padding: 0.18rem 0.85rem;
        border-radius: 8px;
        background: #00875a;
        color: #ffffff;
        min-width: 90px;
        text-align: center;
        margin-right: 0.95rem;
        box-shadow: 0 2px 6px rgba(0, 135, 90, 0.25);
      }
      /* แท็กหมายเลขคิว: น้ำเงิน (รับยา) */
      .rx-q-tag-blue {
        font-family: var(--font);
        font-weight: 900;
        font-size: 1.65rem;
        padding: 0.18rem 0.85rem;
        border-radius: 8px;
        background: #0284c7;
        color: #ffffff;
        min-width: 90px;
        text-align: center;
        margin-right: 0.95rem;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
      }

      /* ── การ์ดช่องบริการ 5 ช่อง (Middle Column) ── */
      .rx-desk-card {
        flex: 1;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.09);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: none !important;
      }
      [data-theme="dark"] .rx-desk-card {
        background: #1e293b;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      }

      /* หัวการ์ดช่องชำระเงิน: สีเขียวเข้ม */
      .rx-desk-hdr-pay {
        background: linear-gradient(135deg, #007d44, #00a65a, #007d44);
        color: #ffffff;
        padding: 0.45rem 1.1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font);
      }

      /* หัวการ์ดรับยาช่อง 1 - 4: สีม่วง/คราม */
      .rx-desk-hdr-drug {
        background: linear-gradient(135deg, #4f46e5, #6366f1, #4f46e5);
        color: #ffffff;
        padding: 0.45rem 1.1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font);
      }

      .rx-desk-title {
        font-size: 1.45rem;
        font-weight: 800;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .rx-desk-badge {
        font-family: var(--font);
        font-size: 1.85rem;
        font-weight: 900;
        padding: 0.12rem 0.95rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.22);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.35);
        min-width: 90px;
        text-align: center;
        transition: all 0.2s ease;
      }

      /* Body โต๊ะ: ชื่อผู้รับบริการ จัดกึ่งกลาง ตัวใหญ่ หนา */
      .rx-desk-card-body {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.45rem 1.1rem;
        font-family: var(--font);
        font-size: 1.6rem;
        font-weight: 800;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      [data-theme="dark"] .rx-desk-card-body {
        color: #f1f5f9;
      }

      /* แอนิเมชันกระพริบเมื่อเรียกคิว */
      @keyframes rxBlinkPulse {
        0%, 100% {
          background: #ffffff;
          color: #1e1b4b;
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7);
        }
        50% {
          background: #f59e0b;
          color: #ffffff;
          transform: scale(1.18);
          box-shadow: 0 0 16px 6px rgba(245, 158, 11, 0.95);
        }
      }
      .rx-desk-badge.is-blinking {
        animation: rxBlinkPulse 0.75s ease-in-out infinite alternate !important;
      }
    </style>

    <div class="rx-wrap">
      <!-- คอลัมน์ที่ 1: รอชำระเงิน -->
      <div class="rx-col-pay">
        <div class="rx-panel">
          <div class="rx-panel-hdr-pay">
            <span><i class="fa-solid fa-money-bill-wave" style="margin-right:0.6rem;"></i>รอชำระเงิน</span>
            <span class="rx-count-badge" id="rxPayBadge">รอ 0 คน</span>
          </div>
          <div class="rx-table-head">
            <div style="width:3.2rem;text-align:center;">#</div>
            <div style="width:105px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.6rem;">ชื่อ-นามสกุล</div>
          </div>
          <div class="rx-scroll-body" id="rxPayList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">กำลังโหลด...</div>
          </div>
        </div>
      </div>

      <!-- คอลัมน์ที่ 2: ช่องบริการ 5 ช่อง (ชำระเงิน + รับยาช่อง 1-4) -->
      <div class="rx-col-desks">
        <!-- 1. ช่องชำระเงิน -->
        <div class="rx-desk-card" id="card_f">
          <div class="rx-desk-hdr-pay">
            <span class="rx-desk-title"><i class="fa-solid fa-coins"></i> ช่องชำระเงิน</span>
            <span class="rx-desk-badge" id="tq_f">-</span>
          </div>
          <div class="rx-desk-card-body" id="tname_f">-</div>
        </div>

        <!-- 2. รับยาช่อง 1 -->
        <div class="rx-desk-card" id="card_rx1">
          <div class="rx-desk-hdr-drug">
            <span class="rx-desk-title"><i class="fa-solid fa-pills"></i> รับยาช่อง 1</span>
            <span class="rx-desk-badge" id="tq_rx1">-</span>
          </div>
          <div class="rx-desk-card-body" id="tname_rx1">-</div>
        </div>

        <!-- 3. รับยาช่อง 2 -->
        <div class="rx-desk-card" id="card_rx2">
          <div class="rx-desk-hdr-drug">
            <span class="rx-desk-title"><i class="fa-solid fa-pills"></i> รับยาช่อง 2</span>
            <span class="rx-desk-badge" id="tq_rx2">-</span>
          </div>
          <div class="rx-desk-card-body" id="tname_rx2">-</div>
        </div>

        <!-- 4. รับยาช่อง 3 -->
        <div class="rx-desk-card" id="card_rx3">
          <div class="rx-desk-hdr-drug">
            <span class="rx-desk-title"><i class="fa-solid fa-pills"></i> รับยาช่อง 3</span>
            <span class="rx-desk-badge" id="tq_rx3">-</span>
          </div>
          <div class="rx-desk-card-body" id="tname_rx3">-</div>
        </div>

        <!-- 5. รับยาช่อง 4 -->
        <div class="rx-desk-card" id="card_rx4">
          <div class="rx-desk-hdr-drug">
            <span class="rx-desk-title"><i class="fa-solid fa-pills"></i> รับยาช่อง 4</span>
            <span class="rx-desk-badge" id="tq_rx4">-</span>
          </div>
          <div class="rx-desk-card-body" id="tname_rx4">-</div>
        </div>
      </div>

      <!-- คอลัมน์ที่ 3: รอรับยา -->
      <div class="rx-col-drug">
        <div class="rx-panel">
          <div class="rx-panel-hdr-drug">
            <span><i class="fa-solid fa-capsules" style="margin-right:0.6rem;"></i>รอรับยา</span>
            <span class="rx-count-badge" id="rxDrugBadge">รอ 0 คน</span>
          </div>
          <div class="rx-table-head">
            <div style="width:3.2rem;text-align:center;">#</div>
            <div style="width:105px;text-align:center;">หมายเลข</div>
            <div style="flex:1;padding-left:0.6rem;">ชื่อ-นามสกุล</div>
          </div>
          <div class="rx-scroll-body" id="rxDrugList">
            <div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">กำลังโหลด...</div>
          </div>
        </div>
      </div>
    </div>
  `;

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

  // เรียกใช้เมื่อมีเหตุการณ์เรียกคิว
  window.addEventListener('sq_queue_called', (e) => {
    const d = e.detail;
    let targetCard = null;

    const sId = String(d.stationId || '').toLowerCase();
    const sLabel = String(d.stationLabel || '');

    if (sId === 'f' || sLabel.includes('ชำระเงิน') || sLabel.includes('การเงิน')) {
      targetCard = 'f';
    } else {
      // ตรวจหาหมายเลขช่องรับยา 1-4
      let deskNo = d.deskNumber;
      if (!deskNo) {
        const m = (sId + ' ' + sLabel).match(/\d+/);
        if (m) deskNo = parseInt(m[0]);
      }
      if (!deskNo || deskNo < 1 || deskNo > 4) deskNo = 1;
      targetCard = `rx${deskNo}`;
    }

    const qEl = document.getElementById(`tq_${targetCard}`);
    const nameEl = document.getElementById(`tname_${targetCard}`);

    const qCode = (d.queueId || '-').toUpperCase();
    if (qEl) {
      qEl.textContent = qCode;
      if (qEl._blinkTimer) clearTimeout(qEl._blinkTimer);
      qEl.classList.add('is-blinking');
      qEl._blinkTimer = setTimeout(() => {
        qEl.classList.remove('is-blinking');
      }, 20000);
    }
    if (nameEl) {
      nameEl.textContent = d.patientName || '-';
    }

    fetchRxData();
  });

  window.addEventListener('sq_queue_refresh', () => {
    fetchRxData();
  });

  async function fetchRxData() {
    try {
      const [resPay, resDrug] = await Promise.all([
        fetch('/api/queue/waiting?stationId=f&depcode=027'),
        fetch('/api/queue/waiting?stationId=rx1&depcode=059')
      ]);
      const [dataPay, dataDrug] = await Promise.all([resPay.json(), resDrug.json()]);

      renderList('rxPayList', 'rxPayBadge', dataPay.queues || [], 'row-mint', 'rx-q-tag-green');
      renderList('rxDrugList', 'rxDrugBadge', dataDrug.queues || [], 'row-blue', 'rx-q-tag-blue');

      // ดึงคิวล่าสุดที่ถูกเรียกมาแสดงบนการ์ดช่องบริการ
      fetchCalledQueues();
    } catch(e) {
      console.error('pharmacy fetchRxData error:', e);
    }
  }

  function renderList(listId, badgeId, list, rowClass, tagClass) {
    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = `รอ ${list.length} คน`;

    const el = document.getElementById(listId);
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div class="sq-empty-text" style="padding:2rem;text-align:center;color:var(--text-muted);font-size:1.35rem;">ไม่มีคิวรอในขณะนี้</div>';
      return;
    }

    el.innerHTML = list.map((q, i) => {
      const qCode = q.depq || q.fullname || `#${i+1}`;
      const name  = q.fullname || `${q.pname||''}${q.fname||''} ${q.lname||''}`.trim() || '-';
      const isStripe = (i % 2 === 1) ? rowClass : '';

      return `
        <div class="rx-row ${isStripe}">
          <div style="width:3.2rem;text-align:center;color:var(--text-muted);font-weight:800;font-size:1.35rem;">${i+1}</div>
          <span class="${tagClass}">${qCode}</span>
          <span style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>
        </div>
      `;
    }).join('');

    initAutoScroll(listId);
  }

  async function fetchCalledQueues() {
    try {
      const [resF, resRx] = await Promise.all([
        fetch('/api/queue/called?stationId=f'),
        fetch('/api/queue/called?stationId=rx')
      ]);
      const [dataF, dataRx] = await Promise.all([resF.json(), resRx.json()]);

      // อัปเดตช่องชำระเงิน (f)
      const listF = dataF.queues || [];
      if (listF.length > 0) {
        const itemF = listF[0];
        const qEl = document.getElementById('tq_f');
        const nameEl = document.getElementById('tname_f');
        if (qEl && !qEl.classList.contains('is-blinking')) {
          qEl.textContent = (itemF.depq || '-').toUpperCase();
        }
        if (nameEl) {
          nameEl.textContent = itemF.fullname || '-';
        }
      }

      // อัปเดตช่องรับยา 1 - 4 (rx1 - rx4)
      const listRx = dataRx.queues || [];
      const deskMap = {};
      listRx.forEach(item => {
        const dNo = item.stationno;
        if (dNo && !deskMap[dNo]) {
          deskMap[dNo] = item;
        }
      });

      for (let i = 1; i <= 4; i++) {
        const item = deskMap[i];
        const qEl = document.getElementById(`tq_rx${i}`);
        const nameEl = document.getElementById(`tname_rx${i}`);
        if (item) {
          if (qEl && !qEl.classList.contains('is-blinking')) {
            qEl.textContent = (item.depq || '-').toUpperCase();
          }
          if (nameEl) {
            nameEl.textContent = item.fullname || '-';
          }
        }
      }
    } catch(e) {
      console.warn('pharmacy fetchCalledQueues error:', e);
    }
  }

  fetchRxData();
  setInterval(fetchRxData, 12000);
}
