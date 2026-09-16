// client/display/layouts/default.js
// Layout ทั่วไป: ซ้าย: รายการรอ | ขวา: หมายเลขที่กำลังรับบริการขนาดใหญ่

export function mountLayout(container, stationConfig) {
  container.innerHTML = `
    <style>
      .def-wrap {
        display: flex;
        width: 100%;
        height: 100%;
        background: var(--bg);
        gap: 0.5rem;
        padding: 0.5rem;
      }
      .def-col-wait { flex: 6; display: flex; flex-direction: column; }
      .def-col-wait .sq-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
      .def-list-body { flex: 1; overflow-y: auto; }
      .def-col-current {
        flex: 4;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      }
      .def-current-box {
        background: var(--bg-card);
        border: 3px solid var(--accent);
        border-radius: 1.25rem;
        padding: 2.5rem 2rem;
        text-align: center;
        width: 90%;
        box-shadow: var(--shadow);
      }
      .def-current-label {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 0.5rem;
      }
      .def-current-qnum {
        font-size: 5.5rem;
        font-weight: 900;
        color: var(--accent2);
        letter-spacing: 4px;
        line-height: 1;
      }
      .def-current-name {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text);
        margin-top: 0.75rem;
        min-height: 2.5rem;
      }
    </style>

    <div class="def-wrap">
      <!-- รายการรอ -->
      <div class="def-col-wait">
        <div class="sq-panel">
          <div class="sq-panel-header">
            <span><i class="fa-solid fa-list-ol" style="margin-right:0.5rem;"></i>รายการคิวรอเรียก</span>
            <span class="sq-badge" id="defWaitBadge">รอ 0 คน</span>
          </div>
          <div style="display:flex;padding:0.4rem 1rem;background:var(--bg-subhdr);border-bottom:1px solid var(--border);font-size:0.9rem;font-weight:700;color:var(--text-muted);">
            <div style="width:2rem;">#</div>
            <div style="width:72px;">หมายเลข</div>
            <div style="flex:1;">ชื่อ-นามสกุล</div>
            <div style="width:72px;text-align:right;">เวลารอ</div>
          </div>
          <div class="def-list-body" id="defWaitList">
            <div class="sq-empty-text">กำลังโหลด...</div>
          </div>
        </div>
      </div>

      <!-- กำลังรับบริการ -->
      <div class="def-col-current">
        <div class="def-current-box">
          <div class="def-current-label">กำลังรับบริการ</div>
          <div class="def-current-qnum" id="defQNum">-</div>
          <div class="def-current-name" id="defQName">รอเรียกคิว</div>
        </div>
      </div>
    </div>
  `;

  window.addEventListener('sq_queue_called', (e) => {
    const d = e.detail;
    const qEl   = document.getElementById('defQNum');
    const nameEl = document.getElementById('defQName');
    if (qEl)   qEl.textContent   = (d.queueId || '-').toUpperCase();
    if (nameEl) nameEl.textContent = d.patientName || 'เชิญรับบริการ';
    fetchWaiting();
  });
  window.addEventListener('sq_queue_refresh', () => fetchWaiting());

  async function fetchWaiting() {
    try {
      const res  = await fetch(`/api/queue/waiting?stationId=${encodeURIComponent(stationConfig.id)}`);
      const data = await res.json();
      const list = data.queues || [];

      const badge = document.getElementById('defWaitBadge');
      if (badge) badge.textContent = `รอ ${list.length} คน`;

      const el = document.getElementById('defWaitList');
      if (!el) return;
      if (list.length === 0) {
        el.innerHTML = '<div class="sq-empty-text">ไม่มีคิวรอในขณะนี้</div>';
        return;
      }
      el.innerHTML = list.map((q, i) => {
        const qCode = q.depq || q.fullname || `#${i+1}`;
        const name  = q.fullname || `${q.pname||''}${q.fname||''} ${q.lname||''}`.trim() || '-';
        const wait  = q.wait_dep ? `~${q.wait_dep} น.` : '';
        return `
          <div class="sq-q-row">
            <div style="width:2rem;color:var(--text-muted);font-weight:700;">${i+1}</div>
            <span class="sq-q-tag">${qCode}</span>
            <span style="flex:1;font-weight:500;color:var(--text);font-size:1.05rem;">${name}</span>
            <span class="sq-wait-muted">${wait}</span>
          </div>
        `;
      }).join('');
    } catch(e) { console.error('default fetchWaiting:', e); }
  }

  fetchWaiting();
  setInterval(fetchWaiting, 15000);
}
