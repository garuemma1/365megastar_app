/**
 * 8. 약국 업무일지 & 교대 인수인계 모듈 컨트롤러 (Daily Duty Handover & Work Log)
 * 근무조 필터링, 상단 카드 타임라인, 하단 월간 달력(날짜 클릭 시 팝업 렌더링) 및 1초 확인 체크
 */
window.WorklogModule = (function () {

  let activeShiftFilter = 'ALL';  // 'ALL', 'A조', 'B조', 'FULL'
  let currentYear = 2026;
  let currentMonth = 8;
  let selectedDetailDate = null; // 팝업으로 상세히 보고 있는 날짜 (e.g. "2026-08-13")
  let showCalendar = true; // 달력 접기/펼치기 토글 상태

  function toggleCalendar() {
    showCalendar = !showCalendar;
    render('module-content');
  }

  function getDayOfWeek(dateStr) {
    if (!dateStr) return '';
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return days[d.getDay()];
  }

  function getFormattedDateWithDay(dateStr) {
    if (!dateStr) return '';
    const dow = getDayOfWeek(dateStr);
    return `${dateStr} (${dow}요일)`;
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    render('module-content');
  }

  function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    render('module-content');
  }

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const currentUser = window.SheetsSync.getCurrentUser();
    const logs = window.SheetsSync.getWorklogs() || [];

    // 근무조 필터링 적용
    const filteredLogs = logs.filter(log => {
      if (activeShiftFilter === 'ALL') return true;
      return log.shift && log.shift.includes(activeShiftFilter);
    });

    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    // Compute shift counts and percentages for the selected month
    const monthLogs = logs.filter(l => (l.date || '').startsWith(monthPrefix));
    const aCount = monthLogs.filter(l => l.shift && l.shift.includes('A조')).length;
    const bCount = monthLogs.filter(l => l.shift && l.shift.includes('B조')).length;
    const fullCount = monthLogs.filter(l => l.shift && l.shift.includes('FULL')).length;
    const totalShift = aCount + bCount + fullCount;
    const aPct = totalShift ? ((aCount / totalShift) * 100).toFixed(1) : 0;
    const bPct = totalShift ? ((bCount / totalShift) * 100).toFixed(1) : 0;
    const fullPct = totalShift ? ((fullCount / totalShift) * 100).toFixed(1) : 0;

    const html = `
      <div class="module-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style="font-size:24px; font-weight:bold; color:var(--primary-color); margin-bottom:4px;">
            📝 365메가스타약국 업무일지 & 인수인계
          </h2>
          <p class="subtitle" style="color:var(--text-muted); font-size:14px; margin:0;">
            A/B/FULL 교대 근무자 간 특이 처방, 품절 의약품, 매장/전산 특이사항 및 상단 월간 달력 날짜별 원클릭 팝업
          </p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn ${showCalendar ? 'btn-outline-primary' : 'btn-primary'} font-bold shadow-sm" onclick="WorklogModule.toggleCalendar()" style="border-radius:12px; padding:10px 16px; font-size:14px;">
            <i class="fas ${showCalendar ? 'fa-chevron-up' : 'fa-calendar-alt'}"></i> ${showCalendar ? '📅 달력 접기' : '📅 월간 달력 펼치기'}
          </button>
          <button class="btn btn-primary font-bold shadow-sm" onclick="WorklogModule.showCreateModal()" style="border-radius:12px; padding:10px 20px; font-size:15px;">
            <i class="fas fa-edit"></i> 📝 새 업무일지 작성하기
          </button>
        </div>
      </div>

      <!-- 📊 Lean-OPS KPI 4카드 -->
      <div class="mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:10px;">
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #cbd5e1; background:#ffffff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#475569;">전체 일지</span>
            <div style="width:24px; height:24px; border-radius:6px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:12px;"><i class="fas fa-book"></i></div>
          </div>
          <div style="font-size:20px; font-weight:800; color:#0f172a; font-family:'Outfit',sans-serif;">${logs.length}<span style="font-size:12px; font-weight:700;"> 건</span></div>
          <div style="font-size:10.5px; color:#64748b;">A/B/FULL 전체 누적</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bfdbfe; background:#eff6ff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#1e40af;">금월 작성</span>
            <div style="width:24px; height:24px; border-radius:6px; background:#dbeafe; color:#1d4ed8; display:flex; align-items:center; justify-content:center; font-size:12px;"><i class="fas fa-calendar"></i></div>
          </div>
          <div style="font-size:20px; font-weight:800; color:#1d4ed8; font-family:'Outfit',sans-serif;">${logs.filter(l => (l.date||'').startsWith(monthPrefix)).length}<span style="font-size:12px;"> 건</span></div>
          <div style="font-size:10.5px; color:#2563eb;">${currentYear}년 ${currentMonth}월</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bbf7d0; background:#f0fdf4; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#15803d;">A조 일지</span>
            <div style="width:24px; height:24px; border-radius:6px; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:12px;"><i class="fas fa-sun"></i></div>
          </div>
          <div style="font-size:20px; font-weight:800; color:#15803d; font-family:'Outfit',sans-serif;">${aCount}<span style="font-size:12px;"> 건 (${aPct}%)</span></div>
          <div style="font-size:10.5px; color:#059669;">오프닝조</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #fde68a; background:#fffbeb; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#92400e;">B조 일지</span>
            <div style="width:24px; height:24px; border-radius:6px; background:#fef3c7; color:#d97706; display:flex; align-items:center; justify-content:center; font-size:12px;"><i class="fas fa-moon"></i></div>
          </div>
          <div style="font-size:20px; font-weight:800; color:#d97706; font-family:'Outfit',sans-serif;">${bCount}<span style="font-size:12px;"> 건 (${bPct}%)</span></div>
          <div style="font-size:10.5px; color:#b45309;">마감조</div>
        </div>
   </div>

      <!-- 📊 Charts Row (도넛 차트 삭제 및 바 차트 전체화면으로 확장) -->
      <div class="row">
        <div class="col-md-12">
          <div class="card mb-4 shadow-sm" style="border-radius:16px; border:1.5px solid #cbd5e1; overflow:hidden;">
            <div class="card-header d-flex justify-content-between align-items-center" style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; padding:12px 18px;">
              <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-chart-bar text-primary me-2"></i>📊 월별 업무일지 작성 추세 (Bar)</h4>
            </div>
            <div style="position:relative; height:200px; width:100%; padding:12px;">
              <canvas id="worklogTrendCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>
      <!-- 1. 상단배치 월별 업무일지 인수인계 달력 섹션 (날짜 누르면 팝업 출력 & 달력 접기/펼치기) -->
      <div class="card shadow-sm mb-4" style="border-radius:20px; border:1px solid #cbd5e1; background:#ffffff; overflow:hidden;">
        <div class="card-header d-flex justify-content-between align-items-center" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff; padding:16px 24px;">
          <div class="d-flex align-items-center gap-3">
            <i class="fas fa-calendar-alt text-warning" style="font-size:22px;"></i>
            <div>
              <h3 style="font-size:18px; font-weight:bold; margin:0; color:#ffffff;">
                📅 ${currentYear}년 ${currentMonth}월 업무일지 & 인수인계 달력
              </h3>
              <p style="font-size:12px; margin:0; color:#94a3b8;">날짜 칸을 누르시면 해당 날짜의 약국 인수인계 내용이 팝업으로 시원하게 나타납니다.</p>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-light" onclick="WorklogModule.prevMonth()"><i class="fas fa-chevron-left"></i> 이전달</button>
            <span class="badge bg-primary" style="font-size:13px; padding:7px 14px; border-radius:20px;">${currentYear}-${String(currentMonth).padStart(2, '0')}</span>
            <button type="button" class="btn btn-sm btn-outline-light" onclick="WorklogModule.nextMonth()">다음달 <i class="fas fa-chevron-right"></i></button>
            <button type="button" class="btn btn-sm btn-warning font-bold text-dark ml-2" onclick="WorklogModule.toggleCalendar()" style="border-radius:20px; padding:5px 12px; font-size:12px;">
              <i class="fas ${showCalendar ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> ${showCalendar ? '달력 접기' : '달력 펼치기'}
            </button>
          </div>
        </div>

        ${showCalendar ? `
          <div class="card-body" style="padding:20px;">
            ${renderMonthlyCalendar(logs, currentYear, currentMonth)}
          </div>
        ` : ''}
      </div>

      <!-- 2. 스마트 근무조 필터 카드 -->
      <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1px solid #cbd5e1; background:#ffffff;">
        <div class="card-body" style="padding:16px 24px;">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
              <span style="font-size:13px; font-weight:bold; color:#475569;"><i class="fas fa-clock text-primary"></i> 근무조별 조회:</span>
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm ${activeShiftFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="WorklogModule.setShiftFilter('ALL')" style="border-radius:20px 0 0 20px; font-size:13px; padding:5px 14px; font-weight:600;">
                  📋 전체 조 (${logs.length})
                </button>
                <button type="button" class="btn btn-sm ${activeShiftFilter === 'A조' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="WorklogModule.setShiftFilter('A조')" style="font-size:13px; padding:5px 14px; font-weight:600;">
                  🟢 A조 (오프닝)
                </button>
      <button type="button" class="btn btn-sm ${activeShiftFilter === 'B조' ? 'btn-warning text-dark font-bold' : 'btn-outline-secondary'}" onclick="WorklogModule.setShiftFilter('B조')" style="border-radius:0 20px 20px 0; font-size:13px; padding:5px 14px;">
                  🟡 B조 (마감)
                </button>
              </div>
            </div>
            <div class="text-muted" style="font-size:13px;">
              💡 <strong>[안내]</strong> 상단 <strong>[📅 ${currentYear}년 ${currentMonth}월 업무일지 달력]</strong>의 날짜를 누르시면 당일 인수인계가 팝업으로 나타납니다.
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 최근 업무일지 타임라인 카드리스트 구역 -->
      <div class="worklog-timeline-wrapper mb-5">
        ${filteredLogs.length === 0 ? `
          <div class="card p-5 text-center text-muted mb-4" style="border-radius:16px; border:2px dashed var(--border-color); background:#ffffff;">
            <i class="fas fa-clipboard-list fa-3x mb-3 text-primary" style="opacity:0.4;"></i>
            <h4 style="font-size:16px; font-weight:bold; color:var(--text-main);">등록된 업무일지가 없습니다.</h4>
            <p class="mb-0" style="font-size:13px;">상단 [새 업무일지 작성하기] 버튼을 누르거나 달력을 확인해 보세요.</p>
          </div>
        ` : filteredLogs.slice(0, 5).map(log => {
          const isShiftA = log.shift && log.shift.includes('A조');
          const isShiftB = log.shift && log.shift.includes('B조');
          const badgeClass = isShiftA ? 'bg-primary' : isShiftB ? 'bg-warning text-dark' : 'bg-success';
          const dateWithDay = getFormattedDateWithDay(log.date);

          return `
            <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1px solid #cbd5e1; overflow:hidden; background:#ffffff;">
              <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#f8fafc; padding:16px 24px; border-bottom:1px solid #e2e8f0;">
                <div class="d-flex align-items-center gap-3">
                  <span class="badge ${badgeClass}" style="font-size:14px; padding:8px 14px; border-radius:20px; font-weight:bold;">
                    ${log.shift || '교대일지'}
                  </span>
                  <h3 style="font-size:18px; font-weight:bold; margin:0; color:#0f172a;">
                    📅 ${dateWithDay} 약국 업무일지
                  </h3>
                </div>
                <div class="d-flex align-items-center gap-3" style="font-size:13px; color:#64748b;">
                  <span>👤 작성자: <strong style="color:#0f172a;">${log.authorName}</strong> (${log.authorRole || '약국직원'})</span>
                  <button type="button" class="btn btn-sm btn-outline-primary" onclick="WorklogModule.openDayDetailModal('${log.date}')" style="border-radius:20px; font-size:12px; padding:4px 12px;">
                    <i class="fas fa-expand-alt"></i> 당일 상세 팝업
                  </button>
                </div>
              </div>

              <div class="card-body" style="padding:24px;">
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="p-3 h-100" style="background:#eff6ff; border-radius:12px; border-left:5px solid #2563eb; border:1px solid #bfdbfe; border-left-width:5px;">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:26px; height:26px; border-radius:50%; background:#2563eb; color:#fff; display:flex; justify-content:center; align-items:center; font-size:12px;">
                          <i class="fas fa-pills"></i>
                        </div>
                        <h4 style="font-size:14px; font-weight:bold; color:#1e40af; margin:0;">1. 💊 특이 처방 & 품절 의약품</h4>
                      </div>
                      <div style="font-size:13.5px; color:#1e293b; line-height:1.6; white-space:pre-wrap; background:#ffffff; padding:10px; border-radius:8px; border:1px solid #dbeafe;">
                        ${log.contentRx ? log.contentRx : '<span class="text-muted">특이사항 없음</span>'}
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="p-3 h-100" style="background:#f0fdf4; border-radius:12px; border-left:5px solid #16a34a; border:1px solid #bbf7d0; border-left-width:5px;">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:26px; height:26px; border-radius:50%; background:#16a34a; color:#fff; display:flex; justify-content:center; align-items:center; font-size:12px;">
                          <i class="fas fa-desktop"></i>
                        </div>
                        <h4 style="font-size:14px; font-weight:bold; color:#166534; margin:0;">2. 🛒 매장 POS & 조제장비 특이사항</h4>
                      </div>
                      <div style="font-size:13.5px; color:#1e293b; line-height:1.6; white-space:pre-wrap; background:#ffffff; padding:10px; border-radius:8px; border:1px solid #dcfce7;">
                        ${log.contentPos ? log.contentPos : '<span class="text-muted">특이사항 없음</span>'}
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="p-3 h-100" style="background:#fffbeb; border-radius:12px; border-left:5px solid #d97706; border:1px solid #fde68a; border-left-width:5px;">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:26px; height:26px; border-radius:50%; background:#d97706; color:#fff; display:flex; justify-content:center; align-items:center; font-size:12px;">
                          <i class="fas fa-truck"></i>
                        </div>
                        <h4 style="font-size:14px; font-weight:bold; color:#92400e; margin:0;">3. 📦 도매상 입고 검수 완료건</h4>
                      </div>
                      <div style="font-size:13.5px; color:#1e293b; line-height:1.6; white-space:pre-wrap; background:#ffffff; padding:10px; border-radius:8px; border:1px solid #fef3c7;">
                        ${log.contentDelivery ? log.contentDelivery : '<span class="text-muted">특이사항 없음</span>'}
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="p-3 h-100" style="background:#faf5ff; border-radius:12px; border-left:5px solid #9333ea; border:1px solid #e9d5ff; border-left-width:5px;">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:26px; height:26px; border-radius:50%; background:#9333ea; color:#fff; display:flex; justify-content:center; align-items:center; font-size:12px;">
                          <i class="fas fa-bullhorn"></i>
                        </div>
                        <h4 style="font-size:14px; font-weight:bold; color:#6b21a8; margin:0;">4. 💡 다음 교대조 전달사항</h4>
                      </div>
                      <div style="font-size:13.5px; color:#1e293b; line-height:1.6; white-space:pre-wrap; background:#ffffff; padding:10px; border-radius:8px; border:1px solid #f3e8ff; font-weight:600;">
                        ${log.note ? log.note : '<span class="text-muted">전달사항 없음</span>'}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#f8fafc; padding:10px 16px; border-radius:10px; border:1px solid #e2e8f0;">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span style="font-size:12.5px; font-weight:bold; color:#475569;">
                      <i class="fas fa-user-check text-success"></i> 확인(확답) 완료한 직원:
                    </span>
                    ${(log.checkedBy && log.checkedBy.length > 0) ? log.checkedBy.map(name => `
                      <span class="badge bg-success" style="font-size:11.5px; padding:5px 10px; border-radius:20px; font-weight:normal;">
                        ✓ ${name}
                      </span>
                    `).join('') : '<span class="text-muted" style="font-size:12px;">아직 인수 확인한 직원이 없습니다.</span>'}
                  </div>
                  <button type="button" class="btn btn-sm btn-success font-bold" onclick="WorklogModule.checkAck('${log.id}')" style="border-radius:20px; padding:6px 14px; font-size:12.5px;">
                    <i class="fas fa-check-circle"></i> [ ✅ 본인 확인완료 체크 ]
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 3. 당일 업무일지 상세 팝업 모달 -->
      <div class="modal-overlay" id="worklog-day-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card" style="background:#fff; border-radius:20px; max-width:760px; width:94%; max-height:90vh; overflow-y:auto; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
          <button type="button" class="close-btn" onclick="WorklogModule.closeDayDetailModal()" style="position:absolute; top:20px; right:24px; font-size:24px; background:none; border:none; color:#64748b; cursor:pointer;">&times;</button>
          
          <div id="worklog-day-modal-content">
            <!-- 동적 렌더링 -->
          </div>
        </div>
      </div>

      <!-- 4. 신규 인수인계 작성 모달 -->
      <div class="modal-overlay" id="worklog-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card" style="background:#fff; border-radius:18px; max-width:680px; width:92%; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
          <button type="button" class="close-btn" onclick="WorklogModule.closeModal()" style="position:absolute; top:20px; right:24px; font-size:24px; background:none; border:none; color:#64748b; cursor:pointer;">&times;</button>
          
          <div class="d-flex align-items-center gap-2 mb-3">
            <div style="width:36px; height:36px; border-radius:50%; background:#dbeafe; color:#2563eb; display:flex; justify-content:center; align-items:center; font-size:18px;">
              <i class="fas fa-pen-fancy"></i>
            </div>
            <div>
              <h3 style="font-size:20px; font-weight:bold; margin:0; color:#0f172a;">신규 업무일지 & 인수인계 작성</h3>
              <p class="text-muted mb-0" style="font-size:13px;">다음 교대 근무자가 명확하게 확인할 수 있도록 정확히 기재해 주세요.</p>
            </div>
          </div>

          <form onsubmit="WorklogModule.submitWorklog(event)">
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label" style="font-size:13px; font-weight:bold; color:#334155;">작성일자</label>
                <input type="date" id="wl-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
      <div class="col-md-6">
                <label class="form-label" style="font-size:13px; font-weight:bold; color:#334155;">근무 교대조</label>
                <select id="wl-shift" class="form-select" required>
                  <option value="A조 오프닝 (09:00~17:30)">🟢 A조 오프닝 (09:00~17:30)</option>
                  <option value="B조 마감 (13:30~22:00)">🟡 B조 마감 (13:30~22:00)</option>
                </select>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label" style="font-size:13px; font-weight:bold; color:#1e40af;">💊 1. 특이 처방 & 품절 의약품 현황</label>
              <textarea id="wl-rx" class="form-control" rows="2" placeholder="품절 약품, 긴급 발주 내역, 주의 처방전 전달사항..."></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label" style="font-size:13px; font-weight:bold; color:#166534;">🛒 2. 매장 & POS 전산 / 조제장비 특이사항</label>
              <textarea id="wl-pos" class="form-control" rows="2" placeholder="POS 정산 차액, 자동조제기(ATC) 상태, 키오스크 점검..."></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label" style="font-size:13px; font-weight:bold; color:#92400e;">📦 3. 도매상 입고 검수 완료건</label>
              <textarea id="wl-delivery" class="form-control" rows="2" placeholder="지오영, 백제 등 입고 수량 및 반품/유통기한 특이사항..."></textarea>
            </div>

            <div class="mb-4">
              <label class="form-label" style="font-size:13px; font-weight:bold; color:#6b21a8;">💡 4. 다음 교대조 전달사항</label>
              <textarea id="wl-note" class="form-control" rows="2" placeholder="다음 인수 근무자에게 꼭 부탁드릴 내용..."></textarea>
            </div>

            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="WorklogModule.closeModal()">취소</button>
              <button type="submit" class="btn btn-primary font-bold"><i class="fas fa-paper-plane"></i> 인수인계 등록 완료</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.innerHTML = html;

    setTimeout(() => { initWorklogCharts(logs); initShiftDonutChart(logs); }, 50);
  }

  // 월간 달력 그리드 HTML 생성 함수 (PC & 모바일 7열 100% 한눈 핏 정돈)
  function renderMonthlyCalendar(logs, year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0(일)~6(토)
    const daysInMonth = new Date(year, month, 0).getDate();

    let gridHtml = `
      <div class="worklog-calendar-wrapper">
        <div class="worklog-calendar-grid">
          <div class="worklog-cal-header-cell" style="color:#e11d48; background:#fff1f2;">일</div>
          <div class="worklog-cal-header-cell" style="color:#334155; background:#f8fafc;">월</div>
          <div class="worklog-cal-header-cell" style="color:#334155; background:#f8fafc;">화</div>
          <div class="worklog-cal-header-cell" style="color:#334155; background:#f8fafc;">수</div>
          <div class="worklog-cal-header-cell" style="color:#334155; background:#f8fafc;">목</div>
          <div class="worklog-cal-header-cell" style="color:#334155; background:#f8fafc;">금</div>
          <div class="worklog-cal-header-cell" style="color:#2563eb; background:#eff6ff;">토</div>
    `;

    // 1일 이전 공백 칸
    for (let i = 0; i < firstDay; i++) {
      gridHtml += `<div class="worklog-cal-day-cell" style="background:#f8fafc; border-color:#f1f5f9; opacity:0.4; pointer-events:none;"></div>`;
    }

    // 날짜별 칸
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = logs.filter(l => l.date === dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      const dow = (firstDay + d - 1) % 7;
      const dateColor = dow === 0 ? '#e11d48' : dow === 6 ? '#2563eb' : '#0f172a';

      const bgStyle = isToday ? '#ecfdf5' : dayLogs.length > 0 ? '#f0fdf4' : '#ffffff';
      const borderStyle = isToday ? '#10b981' : dayLogs.length > 0 ? '#bbf7d0' : '#e2e8f0';

      gridHtml += `
        <div class="worklog-cal-day-cell" onclick="WorklogModule.openDayDetailModal('${dateStr}')" 
             style="background:${bgStyle}; border-color:${borderStyle};">
          
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="worklog-cal-day-num" style="color:${dateColor}; font-weight:bold;">
              ${d} ${isToday ? '<small class="badge bg-success" style="font-size:8.5px; padding:2px 4px; margin-left:1px;">오늘</small>' : ''}
            </span>
            ${dayLogs.length > 0 ? `<span class="badge bg-primary" style="font-size:9.5px; padding:2px 5px; border-radius:10px;">${dayLogs.length}건</span>` : ''}
          </div>

          ${dayLogs.length === 0 ? `
            <div class="worklog-empty-label" style="font-size:10.5px; color:#cbd5e1; margin-top:8px;">미작성</div>
          ` : dayLogs.map(log => {
            const isShiftA = log.shift && log.shift.includes('A조');
            const isShiftB = log.shift && log.shift.includes('B조');
            const badgeBg = isShiftA ? '#2563eb' : isShiftB ? '#d97706' : '#16a34a';

            return `
              <div class="worklog-cal-badge-pill" style="background:${badgeBg};">
                ${log.shift ? log.shift.substring(0, 3) : '일지'} (${log.authorName})
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    gridHtml += `
        </div>
      </div>
    `;
    return gridHtml;
  }

  function setShiftFilter(filter) {
    activeShiftFilter = filter;
    render('module-content');
  }

  function openDayDetailModal(dateStr) {
    selectedDetailDate = dateStr;
    const modal = document.getElementById('worklog-day-modal');
    const content = document.getElementById('worklog-day-modal-content');
    if (!modal || !content) return;

    const logs = window.SheetsSync.getWorklogs() || [];
    const dayLogs = logs.filter(l => l.date === dateStr);
    const dateWithDay = getFormattedDateWithDay(dateStr);

    let html = `
      <div class="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
        <div style="width:42px; height:42px; border-radius:50%; background:#dbeafe; color:#2563eb; display:flex; justify-content:center; align-items:center; font-size:20px;">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div>
          <h3 style="font-size:20px; font-weight:bold; margin:0; color:#0f172a;">
            📅 ${dateWithDay} 약국 업무일지 & 인수인계
          </h3>
          <p style="font-size:13px; color:#64748b; margin:0;">해당 날짜에 작성된 총 ${dayLogs.length}건의 인수인계 및 전달사항입니다.</p>
        </div>
      </div>
    `;

    if (dayLogs.length === 0) {
      html += `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-folder-open fa-3x mb-3 text-secondary" style="opacity:0.4;"></i>
          <h4 style="font-size:16px; font-weight:bold; color:#334155;">해당 날짜(${dateStr})에 등록된 업무일지가 없습니다.</h4>
          <p style="font-size:13px;">[새 업무일지 작성하기] 버튼을 통해 당일 인수인계를 추가해 보세요!</p>
          <button type="button" class="btn btn-primary mt-2" onclick="WorklogModule.closeDayDetailModal(); WorklogModule.showCreateModal();">
            <i class="fas fa-edit"></i> 이 날짜에 인수인계 작성하기
          </button>
        </div>
      `;
    } else {
      html += dayLogs.map(log => {
        const isShiftA = log.shift && log.shift.includes('A조');
        const isShiftB = log.shift && log.shift.includes('B조');
        const badgeClass = isShiftA ? 'bg-primary' : isShiftB ? 'bg-warning text-dark' : 'bg-success';

        return `
          <div class="card mb-4 shadow-sm" style="border-radius:16px; border:1px solid #cbd5e1; overflow:hidden; background:#ffffff;">
            <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#f8fafc; padding:14px 20px; border-bottom:1px solid #e2e8f0;">
              <div class="d-flex align-items-center gap-2">
                <span class="badge ${badgeClass}" style="font-size:13px; padding:6px 12px; border-radius:20px; font-weight:bold;">
                  ${log.shift || '교대일지'}
                </span>
                <strong style="font-size:16px; color:#0f172a;">작성자: ${log.authorName} (${log.authorRole || '직원'})</strong>
              </div>
              <span class="text-muted" style="font-size:12px;"><i class="far fa-clock"></i> ${log.createdAt || ''}</span>
            </div>

            <div class="card-body" style="padding:20px;">
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <div class="p-3 h-100" style="background:#eff6ff; border-radius:10px; border-left:4px solid #2563eb;">
                    <h5 style="font-size:13.5px; font-weight:bold; color:#1e40af; margin-bottom:6px;"><i class="fas fa-pills"></i> 1. 💊 특이 처방 & 품절 의약품</h5>
                    <div style="font-size:13px; color:#1e293b; line-height:1.6; white-space:pre-wrap;">${log.contentRx ? log.contentRx : '특이사항 없음'}</div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="p-3 h-100" style="background:#f0fdf4; border-radius:10px; border-left:4px solid #16a34a;">
                    <h5 style="font-size:13.5px; font-weight:bold; color:#166534; margin-bottom:6px;"><i class="fas fa-desktop"></i> 2. 🛒 매장 POS & 조제장비</h5>
                    <div style="font-size:13px; color:#1e293b; line-height:1.6; white-space:pre-wrap;">${log.contentPos ? log.contentPos : '특이사항 없음'}</div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="p-3 h-100" style="background:#fffbeb; border-radius:10px; border-left:4px solid #d97706;">
                    <h5 style="font-size:13.5px; font-weight:bold; color:#92400e; margin-bottom:6px;"><i class="fas fa-truck"></i> 3. 📦 도매상 입고 검수</h5>
                    <div style="font-size:13px; color:#1e293b; line-height:1.6; white-space:pre-wrap;">${log.contentDelivery ? log.contentDelivery : '특이사항 없음'}</div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="p-3 h-100" style="background:#faf5ff; border-radius:10px; border-left:4px solid #9333ea;">
                    <h5 style="font-size:13.5px; font-weight:bold; color:#6b21a8; margin-bottom:6px;"><i class="fas fa-bullhorn"></i> 4. 💡 다음 교대조 전달사항</h5>
                    <div style="font-size:13px; color:#1e293b; line-height:1.6; white-space:pre-wrap; font-weight:600;">${log.note ? log.note : '전달사항 없음'}</div>
                  </div>
                </div>
              </div>

              <div class="pt-2 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span style="font-size:12px; font-weight:bold; color:#475569;">
                    <i class="fas fa-user-check text-success"></i> 확인완료 직원:
                  </span>
                  ${(log.checkedBy && log.checkedBy.length > 0) ? log.checkedBy.map(name => `
                    <span class="badge bg-success" style="font-size:11px; padding:4px 8px; border-radius:20px; font-weight:normal;">
                      ✓ ${name}
                    </span>
                  `).join('') : '<span class="text-muted" style="font-size:11.5px;">아직 인수 확인한 직원이 없습니다.</span>'}
                </div>
                <button type="button" class="btn btn-sm btn-success font-bold" onclick="WorklogModule.checkAckInModal('${log.id}', '${dateStr}')" style="border-radius:20px; padding:5px 12px; font-size:12px;">
                  <i class="fas fa-check-circle"></i> [ ✅ 본인 확인완료 체크 ]
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    content.innerHTML = html;
    modal.style.display = 'flex';
  }

  function closeDayDetailModal() {
    const modal = document.getElementById('worklog-day-modal');
    if (modal) modal.style.display = 'none';
  }

  function checkAckInModal(logId, dateStr) {
    checkAck(logId);
    openDayDetailModal(dateStr);
  }

  function showCreateModal() {
    const m = document.getElementById('worklog-modal');
    if (m) m.style.display = 'flex';
  }

  function closeModal() {
    const m = document.getElementById('worklog-modal');
    if (m) m.style.display = 'none';
  }

  function submitWorklog(e) {
    e.preventDefault();
    const curr = window.SheetsSync.getCurrentUser();
    const date = document.getElementById('wl-date').value;
    const shift = document.getElementById('wl-shift').value;
    const contentRx = document.getElementById('wl-rx').value;
    const contentPos = document.getElementById('wl-pos').value;
    const contentDelivery = document.getElementById('wl-delivery').value;
    const note = document.getElementById('wl-note').value;

    const newLog = {
      id: 'w_' + Date.now(),
      date,
      shift,
      authorName: curr ? curr.name : '직원',
      authorRole: curr ? curr.role : '직원',
      contentRx,
      contentPos,
      contentDelivery,
      note,
      checkedBy: [(curr ? curr.name : '직원') + ' (' + (curr ? curr.role : '직원') + ')'],
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const logs = window.SheetsSync.getWorklogs() || [];
    logs.unshift(newLog);
    window.SheetsSync.saveWorklogs(logs);

    closeModal();
    alert('📝 약국 업무일지가 성공적으로 등록되었습니다!');
    render('module-content');
  }

  function checkAck(logId) {
    const curr = window.SheetsSync.getCurrentUser();
    if (!curr) {
      alert('로그인 후 확인 체크가 가능합니다.');
      return;
    }

    const logs = window.SheetsSync.getWorklogs() || [];
    const target = logs.find(l => l.id === logId);
    if (!target) return;

    if (!target.checkedBy) target.checkedBy = [];
    const myTag = curr.name + ' (' + curr.role + ')';
    if (!target.checkedBy.includes(myTag)) {
      target.checkedBy.push(myTag);
      window.SheetsSync.saveWorklogs(logs);
      alert(`✅ ${curr.name} 님의 인수 확인(확답)이 완료되었습니다!`);
      render('module-content');
    } else {
      alert('이미 확인 체크를 완료하셨습니다.');
    }
  }

  let wlChartInst = {};
  function initWorklogCharts(logs) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('worklogTrendCanvas');
    if (!ctx) return;
    if (wlChartInst.bar) wlChartInst.bar.destroy();

    // 최근 6개월 레이블 & 데이터 생성
    const today = new Date();
    const months = [];
    const counts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months.push(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`);
      counts.push(logs.filter(l => (l.date||'').startsWith(prefix)).length);
    }

    wlChartInst.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: '업무일지 건수',
          data: counts,
          backgroundColor: 'rgba(37,99,235,0.82)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  // Donut chart for shift composition of current month
  function initShiftDonutChart(logs) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('shiftDonutCanvas');
    if (!ctx) return;
    if (wlChartInst.donut) wlChartInst.donut.destroy();

    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthLogs = logs.filter(l => (l.date || '').startsWith(monthPrefix));
    const a = monthLogs.filter(l => l.shift && l.shift.includes('A조')).length;
    const b = monthLogs.filter(l => l.shift && l.shift.includes('B조')).length;
    const f = monthLogs.filter(l => l.shift && l.shift.includes('FULL')).length;

    wlChartInst.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['A조', 'B조', 'FULL'],
        datasets: [{
          data: [a, b, f],
          backgroundColor: ['#2563eb', '#d97706', '#6b21a8'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        cutout: '70%'
      }
    });
  }

  return {
    render,
    prevMonth,
    nextMonth,
    toggleCalendar,
    setShiftFilter,
    openDayDetailModal,
    closeDayDetailModal,
    checkAckInModal,
    showCreateModal,
    closeModal,
    submitWorklog,
    checkAck
  };
})();
