/**
 * 8. 약국 업무일지 & 교대 인수인계 모듈 컨트롤러 (Daily Duty Handover & Work Log)
 * 근무조 필터링, 상단 카드 타임라인, 하단 월간 달력, 글자 깨짐 방지 레이아웃 및 확인 뱃지 실시간 동기화 완료
 */
window.WorklogModule = (function () {

  let activeShiftFilter = 'ALL';  // 'ALL', 'A조', 'B조', 'FULL'
  let currentYear = 2026;
  let currentMonth = 8;
  let selectedDetailDate = null; 
  let showCalendar = true; 

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
    const monthLogs = logs.filter(l => (l.date || '').startsWith(monthPrefix));
    const aCount = monthLogs.filter(l => l.shift && l.shift.includes('A조')).length;
    const bCount = monthLogs.filter(l => l.shift && l.shift.includes('B조')).length;
    const fullCount = monthLogs.filter(l => l.shift && l.shift.includes('FULL')).length;
    const totalShift = aCount + bCount + fullCount;
    const aPct = totalShift ? ((aCount / totalShift) * 100).toFixed(1) : 0;
    const bPct = totalShift ? ((bCount / totalShift) * 100).toFixed(1) : 0;

    const html = `
      <div class="module-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:#0f172a; margin-bottom:4px; letter-spacing:-0.5px;">
            📝 365메가스타약국 업무일지 & 인수인계
          </h2>
          <p class="subtitle" style="color:#64748b; font-size:14px; margin:0;">
            A/B/FULL 교대 근무자 간 특이 처방, 품절 의약품, 매장/전산 특이사항 및 상단 월간 달력 날짜별 원클릭 팝업
          </p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn ${showCalendar ? 'btn-outline-primary' : 'btn-primary'} font-bold shadow-sm" onclick="WorklogModule.toggleCalendar()" style="border-radius:12px; padding:10px 16px; font-size:14px;">
            <i class="fas ${showCalendar ? 'fa-chevron-up' : 'fa-calendar-alt'}"></i> ${showCalendar ? '📅 달력 접기' : '📅 월간 달력 펼치기'}
          </button>
          <button class="btn btn-primary font-bold shadow-sm" onclick="WorklogModule.showCreateModal()" style="border-radius:12px; padding:10px 20px; font-size:15px; box-shadow:0 4px 12px rgba(37,99,235,0.2);">
            <i class="fas fa-edit me-1"></i> 📝 새 업무일지 작성하기
          </button>
        </div>
      </div>

      <!-- 📊 KPI 4카드 -->
      <div class="mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:16px;">
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.02); display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12.5px; font-weight:700; color:#64748b;">전체 일지</span>
            <div style="width:28px; height:28px; border-radius:8px; background:#f1f5f9; color:#475569; display:flex; align-items:center; justify-content:center; font-size:13px;"><i class="fas fa-book"></i></div>
          </div>
          <div style="font-size:24px; font-weight:800; color:#0f172a;">${logs.length}<span style="font-size:13px; font-weight:600; color:#94a3b8;"> 건</span></div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1px solid #bfdbfe; background:#eff6ff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12.5px; font-weight:700; color:#1e40af;">금월 작성</span>
            <div style="width:28px; height:28px; border-radius:8px; background:#dbeafe; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:13px;"><i class="fas fa-calendar"></i></div>
          </div>
          <div style="font-size:24px; font-weight:800; color:#1d4ed8;">${monthLogs.length}<span style="font-size:13px; font-weight:600; color:#3b82f6;"> 건</span></div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1px solid #bbf7d0; background:#f0fdf4; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12.5px; font-weight:700; color:#166534;">A조 일지</span>
            <div style="width:28px; height:28px; border-radius:8px; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:13px;"><i class="fas fa-sun"></i></div>
          </div>
          <div style="font-size:24px; font-weight:800; color:#15803d;">${aCount}<span style="font-size:13px; font-weight:600; color:#22c55e;"> 건</span></div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1px solid #fde68a; background:#fffbeb; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12.5px; font-weight:700; color:#92400e;">B조 일지</span>
            <div style="width:28px; height:28px; border-radius:8px; background:#fef3c7; color:#d97706; display:flex; align-items:center; justify-content:center; font-size:13px;"><i class="fas fa-moon"></i></div>
          </div>
          <div style="font-size:24px; font-weight:800; color:#d97706;">${bCount}<span style="font-size:13px; font-weight:600; color:#f59e0b;"> 건</span></div>
        </div>
      </div>

      <!-- 📊 Charts Row -->
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card shadow-sm" style="border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
            <div class="card-header d-flex justify-content-between align-items-center" style="background:#ffffff; border-bottom:1px solid #f1f5f9; padding:14px 20px;">
              <h4 style="font-size:14.5px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-chart-bar text-primary me-2"></i>월별 업무일지 작성 추세</h4>
            </div>
            <div style="position:relative; height:180px; width:100%; padding:12px;"><canvas id="worklogTrendCanvas"></canvas></div>
          </div>
        </div>
      </div>

      <!-- 1. 달력 섹션 -->
      <div class="card shadow-sm mb-4" style="border-radius:20px; border:1px solid #cbd5e1; background:#ffffff; overflow:hidden;">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-3" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff; padding:18px 24px;">
          <div class="d-flex align-items-center gap-3">
            <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.1); display:flex; justify-content:center; align-items:center;"><i class="fas fa-calendar-alt text-warning" style="font-size:20px;"></i></div>
            <div>
              <h3 style="font-size:17px; font-weight:bold; margin:0; color:#ffffff;">📅 ${currentYear}년 ${currentMonth}월 업무일지 달력</h3>
              <p style="font-size:12.5px; margin:0; color:#94a3b8; margin-top:2px;">날짜를 누르시면 당일 인수인계 내용이 팝업으로 상세히 나타납니다.</p>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-light" style="border-radius:8px;" onclick="WorklogModule.prevMonth()"><i class="fas fa-chevron-left"></i></button>
            <span class="badge bg-primary" style="font-size:14px; padding:8px 16px; border-radius:8px;">${currentYear}년 ${String(currentMonth).padStart(2, '0')}월</span>
            <button type="button" class="btn btn-sm btn-outline-light" style="border-radius:8px;" onclick="WorklogModule.nextMonth()"><i class="fas fa-chevron-right"></i></button>
            <button type="button" class="btn btn-sm btn-warning font-bold text-dark ms-2" onclick="WorklogModule.toggleCalendar()" style="border-radius:8px; padding:6px 12px;">
              <i class="fas ${showCalendar ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> ${showCalendar ? '접기' : '펼치기'}
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
      <div class="card mb-4 shadow-sm" style="border-radius:16px; border:1px solid #e2e8f0; background:#ffffff;">
        <div class="card-body" style="padding:16px 24px;">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-3">
              <span style="font-size:14px; font-weight:800; color:#1e293b;"><i class="fas fa-filter text-primary me-1"></i> 근무조 조회 필터</span>
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm ${activeShiftFilter === 'ALL' ? 'btn-primary font-bold' : 'btn-outline-secondary'}" onclick="WorklogModule.setShiftFilter('ALL')" style="font-size:13.5px; padding:6px 16px;">전체 조</button>
                <button type="button" class="btn btn-sm ${activeShiftFilter === 'A조' ? 'btn-primary font-bold' : 'btn-outline-secondary'}" onclick="WorklogModule.setShiftFilter('A조')" style="font-size:13.5px; padding:6px 16px;">🟢 A조 (오프닝)</button>
                <button type="button" class="btn btn-sm ${activeShiftFilter === 'B조' ? 'btn-warning text-dark font-bold' : 'btn-outline-secondary'}" onclick="WorklogModule.setShiftFilter('B조')" style="font-size:13.5px; padding:6px 16px;">🟡 B조 (마감)</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 최근 업무일지 타임라인 구역 (★ 레이아웃 깨짐 방지 완벽 적용) -->
      <div class="worklog-timeline-wrapper mb-5">
        ${filteredLogs.length === 0 ? `
          <div class="card p-5 text-center text-muted mb-4" style="border-radius:16px; border:2px dashed #cbd5e1; background:#f8fafc;">
            <i class="fas fa-clipboard-list fa-3x mb-3 text-primary" style="opacity:0.4;"></i>
            <h4 style="font-size:16px; font-weight:bold; color:#475569;">등록된 업무일지가 없습니다.</h4>
            <p class="mb-0" style="font-size:13.5px;">상단 [새 업무일지 작성하기] 버튼을 누르거나 달력을 확인해 보세요.</p>
          </div>
        ` : filteredLogs.slice(0, 10).map(log => {
          const isShiftA = log.shift && log.shift.includes('A조');
          const isShiftB = log.shift && log.shift.includes('B조');
          const dateWithDay = getFormattedDateWithDay(log.date);

          return `
            <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1px solid #e2e8f0; overflow:hidden; background:#ffffff;">
              <!-- 카드 헤더 -->
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%); padding:16px 24px; border-bottom:1px solid #e2e8f0;">
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                  <span style="background:${isShiftA?'#eff6ff':isShiftB?'#fffbeb':'#f0fdf4'}; color:${isShiftA?'#2563eb':isShiftB?'#d97706':'#16a34a'}; border:1px solid ${isShiftA?'#bfdbfe':isShiftB?'#fde68a':'#bbf7d0'}; font-size:12.5px; font-weight:800; padding:6px 14px; border-radius:20px;">
                    ${log.shift || '교대일지'}
                  </span>
                  <span style="font-size:16px; font-weight:800; color:#0f172a;">📅 ${dateWithDay}</span>
                  <span style="font-size:13.5px; color:#64748b; font-weight:600;"><i class="fas fa-user-edit me-1"></i>${log.authorName}</span>
                </div>
                <button type="button" onclick="WorklogModule.openDayDetailModal('${log.date}')" class="btn btn-sm btn-white font-bold" style="border:1px solid #cbd5e1; border-radius:12px; color:#475569; padding:6px 14px; font-size:12.5px; background:#fff;">
                  <i class="fas fa-expand-arrows-alt me-1"></i> 일일 상세 팝업 보기
                </button>
              </div>

              <!-- ★ 레이아웃 깨짐 방지를 위해 CSS Grid 사용 및 최소 너비 설정 -->
              <div style="padding:20px 24px; display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">

                <!-- 섹션1: 특이처방 -->
                <div style="border-radius:14px; border:1px solid #bfdbfe; background:#f8fbff; overflow:hidden;">
                  <div style="padding:10px 16px; background:#eff6ff; border-bottom:1px solid #dbeafe;">
                    <span style="font-size:13.5px; font-weight:800; color:#1e40af;"><i class="fas fa-pills me-1"></i> 1. 특이 처방 & 품절 약품</span>
                  </div>
                  <div style="padding:16px; font-size:14px; color:#1e293b; line-height:1.7; word-break:break-word;">
                    ${log.contentRx ? log.contentRx.replace(/\n/g,'<br>') : '<span style="color:#94a3b8; font-style:italic;">특이사항 없음</span>'}
                  </div>
                </div>

                <!-- 섹션2: POS/조제장비 -->
                <div style="border-radius:14px; border:1px solid #bbf7d0; background:#f8fffe; overflow:hidden;">
                  <div style="padding:10px 16px; background:#f0fdf4; border-bottom:1px solid #dcfce7;">
                    <span style="font-size:13.5px; font-weight:800; color:#166534;"><i class="fas fa-desktop me-1"></i> 2. 매장 POS & 조제장비</span>
                  </div>
                  <div style="padding:16px; font-size:14px; color:#1e293b; line-height:1.7; word-break:break-word;">
                    ${log.contentPos ? log.contentPos.replace(/\n/g,'<br>') : '<span style="color:#94a3b8; font-style:italic;">특이사항 없음</span>'}
                  </div>
                </div>

                <!-- 섹션3: 도매상 입고 -->
                <div style="border-radius:14px; border:1px solid #fde68a; background:#fffef8; overflow:hidden;">
                  <div style="padding:10px 16px; background:#fffbeb; border-bottom:1px solid #fef3c7;">
                    <span style="font-size:13.5px; font-weight:800; color:#92400e;"><i class="fas fa-truck me-1"></i> 3. 도매상 입고 검수 완료건</span>
                  </div>
                  <div style="padding:16px; font-size:14px; color:#1e293b; line-height:1.7; word-break:break-word;">
                    ${log.contentDelivery ? log.contentDelivery.replace(/\n/g,'<br>') : '<span style="color:#94a3b8; font-style:italic;">특이사항 없음</span>'}
                  </div>
                </div>

                <!-- 섹션4: 다음 교대조 전달사항 -->
                <div style="border-radius:14px; border:1px solid #e9d5ff; background:#fdfaff; overflow:hidden;">
                  <div style="padding:10px 16px; background:#faf5ff; border-bottom:1px solid #f3e8ff;">
                    <span style="font-size:13.5px; font-weight:800; color:#6b21a8;"><i class="fas fa-bullhorn me-1"></i> 4. 다음 교대조 전달사항</span>
                  </div>
                  <div style="padding:16px; font-size:14px; color:#1e293b; line-height:1.7; font-weight:600; word-break:break-word;">
                    ${log.note ? log.note.replace(/\n/g,'<br>') : '<span style="color:#94a3b8; font-style:italic; font-weight:normal;">전달사항 없음</span>'}
                  </div>
                </div>

              </div>

              <!-- ★ 하단 확인 바 (뱃지 동기화 완벽 복구) -->
              <div style="padding:14px 24px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span style="font-size:13px; font-weight:800; color:#475569;"><i class="fas fa-user-check text-success me-1"></i> 인수인계 확인완료:</span>
                  ${(log.checkedBy && log.checkedBy.length > 0) ? log.checkedBy.map(name => `
                    <span class="badge" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; font-size:12px; padding:6px 12px; border-radius:20px; font-weight:700;">
                      <i class="fas fa-check me-1"></i>${name}
                    </span>
                  `).join('') : '<span style="font-size:12.5px; color:#94a3b8; background:#f1f5f9; padding:4px 10px; border-radius:12px;">아직 확인한 직원이 없습니다.</span>'}
                </div>
                <!-- 바깥 리스트에서도 바로 확인 체크 가능하도록 추가 -->
                <button type="button" class="btn btn-sm btn-success font-bold" onclick="WorklogModule.checkAckInList('${log.id}')" style="border-radius:10px; font-size:12.5px; padding:6px 14px;">
                  <i class="fas fa-check-circle me-1"></i> 인수인계 확인 체크
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 4. 팝업 모달 영역들 (기존과 동일하게 유지하되 디자인 살짝 다듬음) -->
      <!-- 당일 업무일지 상세 팝업 모달 -->
      <div class="modal-overlay" id="worklog-day-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card shadow-lg" style="background:#fff; border-radius:24px; max-width:800px; width:94%; max-height:85vh; overflow-y:auto; padding:32px; position:relative;">
          <button type="button" class="close-btn" onclick="WorklogModule.closeDayDetailModal()" style="position:absolute; top:24px; right:24px; width:36px; height:36px; background:#f1f5f9; border-radius:50%; border:none; font-size:18px; color:#64748b; cursor:pointer;"><i class="fas fa-times"></i></button>
          <div id="worklog-day-modal-content"></div>
        </div>
      </div>

      <!-- 신규 인수인계 작성 모달 -->
      <div class="modal-overlay" id="worklog-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card shadow-lg" style="background:#fff; border-radius:24px; max-width:680px; width:92%; max-height:90vh; overflow-y:auto; padding:32px; position:relative;">
          <button type="button" class="close-btn" onclick="WorklogModule.closeModal()" style="position:absolute; top:24px; right:24px; width:36px; height:36px; background:#f1f5f9; border-radius:50%; border:none; font-size:18px; color:#64748b; cursor:pointer;"><i class="fas fa-times"></i></button>
          
          <div class="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
            <div style="width:48px; height:48px; border-radius:14px; background:#eff6ff; color:#2563eb; display:flex; justify-content:center; align-items:center; font-size:20px;"><i class="fas fa-pen-fancy"></i></div>
            <div>
              <h3 style="font-size:20px; font-weight:800; margin:0; color:#0f172a;">신규 업무일지 & 인수인계 작성</h3>
              <p class="text-muted mb-0" style="font-size:13.5px; margin-top:4px;">다음 교대 근무자가 명확하게 확인할 수 있도록 정확히 기재해 주세요.</p>
            </div>
          </div>

          <form onsubmit="WorklogModule.submitWorklog(event)">
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label class="form-label" style="font-size:13.5px; font-weight:800; color:#1e293b;">작성일자</label>
                <input type="date" id="wl-date" class="form-control" style="background:#f8fafc; border-radius:10px;" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
              <div class="col-md-6">
                <label class="form-label" style="font-size:13.5px; font-weight:800; color:#1e293b;">근무 교대조</label>
                <select id="wl-shift" class="form-select font-bold" style="background:#f8fafc; border-radius:10px;" required>
                  <option value="A조 오프닝 (09:00~17:30)">🟢 A조 오프닝 (09:00~17:30)</option>
                  <option value="B조 마감 (13:30~22:00)">🟡 B조 마감 (13:30~22:00)</option>
                </select>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label" style="font-size:13.5px; font-weight:800; color:#1e40af;"><i class="fas fa-pills"></i> 1. 특이 처방 & 품절 의약품 현황</label>
              <textarea id="wl-rx" class="form-control" rows="2" style="border-radius:12px; border-color:#bfdbfe; background:#f8fbff;" placeholder="품절 약품, 긴급 발주 내역, 주의 처방전 전달사항..."></textarea>
            </div>

            <div class="mb-4">
              <label class="form-label" style="font-size:13.5px; font-weight:800; color:#166534;"><i class="fas fa-desktop"></i> 2. 매장 & POS 전산 / 조제장비 특이사항</label>
              <textarea id="wl-pos" class="form-control" rows="2" style="border-radius:12px; border-color:#bbf7d0; background:#f0fdf4;" placeholder="POS 정산 차액, 자동조제기(ATC) 상태, 키오스크 점검..."></textarea>
            </div>

            <div class="mb-4">
              <label class="form-label" style="font-size:13.5px; font-weight:800; color:#92400e;"><i class="fas fa-truck"></i> 3. 도매상 입고 검수 완료건</label>
              <textarea id="wl-delivery" class="form-control" rows="2" style="border-radius:12px; border-color:#fde68a; background:#fffbeb;" placeholder="지오영, 백제 등 입고 수량 및 반품/유통기한 특이사항..."></textarea>
            </div>

            <div class="mb-5">
              <label class="form-label" style="font-size:13.5px; font-weight:800; color:#6b21a8;"><i class="fas fa-bullhorn"></i> 4. 다음 교대조 전달사항</label>
              <textarea id="wl-note" class="form-control" rows="2" style="border-radius:12px; border-color:#e9d5ff; background:#faf5ff;" placeholder="다음 인수 근무자에게 꼭 부탁드릴 내용..."></textarea>
            </div>

            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-light px-4 font-bold" style="border-radius:10px;" onclick="WorklogModule.closeModal()">취소</button>
              <button type="submit" class="btn btn-primary px-4 font-bold" style="border-radius:10px;"><i class="fas fa-paper-plane me-1"></i> 인수인계 등록 완료</button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.innerHTML = html;
    setTimeout(() => { initWorklogCharts(logs); }, 50);
  }

  // 달력 렌더링 함수
  function renderMonthlyCalendar(logs, year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
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

    for (let i = 0; i < firstDay; i++) {
      gridHtml += `<div class="worklog-cal-day-cell" style="background:#f8fafc; border-color:#f1f5f9; opacity:0.4; pointer-events:none;"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = logs.filter(l => l.date === dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      const dow = (firstDay + d - 1) % 7;
      const dateColor = dow === 0 ? '#e11d48' : dow === 6 ? '#2563eb' : '#0f172a';
      const bgStyle = isToday ? '#ecfdf5' : dayLogs.length > 0 ? '#f0fdf4' : '#ffffff';
      const borderStyle = isToday ? '#10b981' : dayLogs.length > 0 ? '#bbf7d0' : '#e2e8f0';

      gridHtml += `
        <div class="worklog-cal-day-cell" onclick="WorklogModule.openDayDetailModal('${dateStr}')" style="background:${bgStyle}; border-color:${borderStyle}; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="worklog-cal-day-num" style="color:${dateColor}; font-weight:800; font-size:14px;">
              ${d} ${isToday ? '<small class="badge bg-success ms-1" style="font-size:9px; padding:3px 6px;">오늘</small>' : ''}
            </span>
            ${dayLogs.length > 0 ? `<span class="badge bg-primary" style="font-size:10px; padding:3px 6px; border-radius:10px;">${dayLogs.length}건</span>` : ''}
          </div>

          ${dayLogs.length === 0 ? `
            <div class="worklog-empty-label" style="font-size:11px; color:#cbd5e1; margin-top:12px; text-align:center;">미작성</div>
          ` : dayLogs.map(log => {
            const isShiftA = log.shift && log.shift.includes('A조');
            const isShiftB = log.shift && log.shift.includes('B조');
            const badgeBg = isShiftA ? '#3b82f6' : isShiftB ? '#f59e0b' : '#10b981';

            return `
              <div class="worklog-cal-badge-pill" style="background:${badgeBg}; color:#fff; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px; margin-bottom:4px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                ${log.shift ? log.shift.substring(0, 3) : '일지'} (${log.authorName})
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    gridHtml += `</div></div>`;
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
        <div style="width:48px; height:48px; border-radius:14px; background:#eff6ff; color:#2563eb; display:flex; justify-content:center; align-items:center; font-size:20px;">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div>
          <h3 style="font-size:20px; font-weight:800; margin:0; color:#0f172a;">📅 ${dateWithDay} 상세 인수인계</h3>
          <p style="font-size:13px; color:#64748b; margin:0; margin-top:4px;">해당 날짜에 작성된 총 ${dayLogs.length}건의 인수인계 내역입니다.</p>
        </div>
      </div>
    `;

    if (dayLogs.length === 0) {
      html += `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-folder-open fa-3x mb-3 text-secondary" style="opacity:0.3;"></i>
          <h4 style="font-size:16px; font-weight:bold; color:#475569;">해당 날짜(${dateStr})에 등록된 일지가 없습니다.</h4>
          <p style="font-size:13.5px;">[새 업무일지 작성하기] 버튼을 통해 당일 인수인계를 추가해 보세요!</p>
          <button type="button" class="btn btn-primary mt-3 font-bold" style="border-radius:10px; padding:10px 20px;" onclick="WorklogModule.closeDayDetailModal(); WorklogModule.showCreateModal();">
            <i class="fas fa-edit me-1"></i> 이 날짜에 인수인계 작성하기
          </button>
        </div>
      `;
    } else {
      // 팝업 내부 카드도 Grid 레이아웃으로 변경 (깨짐 방지)
      html += dayLogs.map(log => {
        const isShiftA = log.shift && log.shift.includes('A조');
        const isShiftB = log.shift && log.shift.includes('B조');
        const badgeBg = isShiftA ? '#eff6ff' : isShiftB ? '#fffbeb' : '#f0fdf4';
        const badgeColor = isShiftA ? '#2563eb' : isShiftB ? '#d97706' : '#16a34a';
        const badgeBorder = isShiftA ? '#bfdbfe' : isShiftB ? '#fde68a' : '#bbf7d0';

        return `
          <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1px solid #cbd5e1; overflow:hidden; background:#ffffff;">
            <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#f8fafc; padding:16px 24px; border-bottom:1px solid #e2e8f0;">
              <div class="d-flex align-items-center gap-3 flex-wrap">
                <span style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; font-size:13px; font-weight:800; padding:6px 14px; border-radius:20px;">
                  ${log.shift || '교대일지'}
                </span>
                <strong style="font-size:16px; color:#0f172a;"><i class="fas fa-user-edit me-1"></i> ${log.authorName} (${log.authorRole || '직원'})</strong>
              </div>
              <span class="text-muted font-bold" style="font-size:12.5px;"><i class="far fa-clock"></i> ${log.createdAt || ''}</span>
            </div>

            <div class="card-body" style="padding:24px;">
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:16px; margin-bottom:20px;">
                <div class="p-3 h-100" style="background:#f8fbff; border:1px solid #bfdbfe; border-radius:14px;">
                  <h5 style="font-size:13.5px; font-weight:800; color:#1e40af; margin-bottom:8px;"><i class="fas fa-pills me-1"></i> 1. 특이 처방 & 품절</h5>
                  <div style="font-size:14px; color:#1e293b; line-height:1.7; white-space:pre-wrap; word-break:break-word;">${log.contentRx ? log.contentRx : '<span style="color:#94a3b8; font-style:italic;">특이사항 없음</span>'}</div>
                </div>

                <div class="p-3 h-100" style="background:#f8fffe; border:1px solid #bbf7d0; border-radius:14px;">
                  <h5 style="font-size:13.5px; font-weight:800; color:#166534; margin-bottom:8px;"><i class="fas fa-desktop me-1"></i> 2. 매장 POS & 조제장비</h5>
                  <div style="font-size:14px; color:#1e293b; line-height:1.7; white-space:pre-wrap; word-break:break-word;">${log.contentPos ? log.contentPos : '<span style="color:#94a3b8; font-style:italic;">특이사항 없음</span>'}</div>
                </div>

                <div class="p-3 h-100" style="background:#fffef8; border:1px solid #fde68a; border-radius:14px;">
                  <h5 style="font-size:13.5px; font-weight:800; color:#92400e; margin-bottom:8px;"><i class="fas fa-truck me-1"></i> 3. 도매상 입고 검수</h5>
                  <div style="font-size:14px; color:#1e293b; line-height:1.7; white-space:pre-wrap; word-break:break-word;">${log.contentDelivery ? log.contentDelivery : '<span style="color:#94a3b8; font-style:italic;">특이사항 없음</span>'}</div>
                </div>

                <div class="p-3 h-100" style="background:#fdfaff; border:1px solid #e9d5ff; border-radius:14px;">
                  <h5 style="font-size:13.5px; font-weight:800; color:#6b21a8; margin-bottom:8px;"><i class="fas fa-bullhorn me-1"></i> 4. 전달사항</h5>
                  <div style="font-size:14px; color:#1e293b; line-height:1.7; white-space:pre-wrap; font-weight:600; word-break:break-word;">${log.note ? log.note : '<span style="color:#94a3b8; font-style:italic; font-weight:normal;">전달사항 없음</span>'}</div>
                </div>
              </div>

              <!-- 팝업 내 하단 확인 바 -->
              <div class="pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span style="font-size:13px; font-weight:800; color:#475569;">
                    <i class="fas fa-user-check text-success me-1"></i> 확인완료 직원:
                  </span>
                  ${(log.checkedBy && log.checkedBy.length > 0) ? log.checkedBy.map(name => `
                    <span class="badge" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; font-size:12px; padding:6px 12px; border-radius:20px; font-weight:700;">
                      <i class="fas fa-check me-1"></i>${name}
                    </span>
                  `).join('') : '<span style="font-size:12.5px; color:#94a3b8; background:#f1f5f9; padding:4px 10px; border-radius:12px;">아직 확인한 직원이 없습니다.</span>'}
                </div>
                <button type="button" class="btn btn-success font-bold shadow-sm" onclick="WorklogModule.checkAckInModal('${log.id}', '${dateStr}')" style="border-radius:10px; padding:8px 16px; font-size:13.5px;">
                  <i class="fas fa-check-circle me-1"></i> 본인 확인완료 체크
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

  // ★ 팝업 및 리스트 외부 양쪽에서 모두 체크 가능하게 분리
  function checkAckInModal(logId, dateStr) {
    if(checkAckCore(logId)) {
      openDayDetailModal(dateStr); // 팝업 재렌더링
      render('module-content');    // 바깥쪽 리스트도 즉시 재렌더링하여 뱃지 동기화!
    }
  }

  function checkAckInList(logId) {
    if(checkAckCore(logId)) {
      render('module-content'); // 바깥쪽 리스트 클릭 시 즉시 재렌더링!
    }
  }

  // 코어 체크 함수
  function checkAckCore(logId) {
    const curr = window.SheetsSync.getCurrentUser();
    if (!curr) {
      alert("🚨 보안 안내: 최상단에서 '직원 로그인'을 먼저 진행해 주세요!");
      return false;
    }

    const logs = window.SheetsSync.getWorklogs() || [];
    const target = logs.find(l => l.id === logId);
    if (!target) return false;

    if (!target.checkedBy) target.checkedBy = [];
    const myTag = curr.name; 
    
    // 이미 체크했는지 이름(myTag)으로 확인 (괄호 직책 제외하고 이름만 심플하게 표시)
    if (!target.checkedBy.includes(myTag)) {
      target.checkedBy.push(myTag);
      window.SheetsSync.saveWorklogs(logs);
      alert(`✅ [${curr.name}] 님의 인수인계 확인이 완료되었습니다!`);
      return true; // 변경 성공
    } else {
      alert('⚠️ 이미 이 일지의 확인 체크를 완료하셨습니다.');
      return false;
    }
  }

  function showCreateModal() {
    const curr = window.SheetsSync.getCurrentUser();
    if (!curr) {
      alert("🚨 작성 권한: 상단의 '직원 로그인'을 먼저 진행해 주세요!");
      return;
    }
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
      checkedBy: [curr ? curr.name : '직원'], // 작성자는 자동 체크됨 (이름만 깔끔하게 저장)
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const logs = window.SheetsSync.getWorklogs() || [];
    logs.unshift(newLog);
    window.SheetsSync.saveWorklogs(logs);

    closeModal();
    alert('📝 약국 업무일지가 성공적으로 등록되었습니다!');
    render('module-content');
  }

  // ── Chart.js Bar Chart Only (전체 너비) ──
  let wlChartInst = {};
  function initWorklogCharts(logs) {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('worklogTrendCanvas');
    if (!ctx) return;
    if (wlChartInst.bar) wlChartInst.bar.destroy();

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
          label: '작성 건수',
          data: counts,
          backgroundColor: 'rgba(59,130,246,0.85)',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  return {
    render, prevMonth, nextMonth, toggleCalendar, setShiftFilter,
    openDayDetailModal, closeDayDetailModal,
    checkAckInModal, checkAckInList, // 둘 다 오픈
    showCreateModal, closeModal, submitWorklog
  };
})();