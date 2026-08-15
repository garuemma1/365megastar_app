/**
 * 3. 연차대장 & 직원 관리 모듈 컨트롤러 (Annual Leave Ledger & Employee Management v5.0)
 * 약국장(문성도) 제외 근무약사 및 일반직원 8인 전용 법정 연차 대장 및 유급휴가 신청 센터
 */
window.AnnualLeaveModule = (function () {

  let currentCalYear = 2026;
  let currentCalMonth = 8;
  let calViewMode = 'grid'; // 'grid': 달력 뷰, 'list': 모바일 리스트 뷰
  let showInlineLeaveForm = false;

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const data = window.SheetsSync.getData();
    const employees = data.employees || [];
    const leaveRequests = data.leaveRequests || [];

    // 약국장(문성도) 제외 연차 대상 직원 전용 필터링
    const targetEmployees = employees.filter(e => !e.role.includes('약국장') && e.name !== '문성도');

    // 대장 전체 요약 집계 (약국장 제외)
    const totalGrantedSum = targetEmployees.reduce((sum, e) => {
      const calc = window.LaborCalculator.calculateStatutoryLeave(e.joinDate);
      return sum + calc.totalGranted;
    }, 0);
    const totalUsedSum = targetEmployees.reduce((sum, e) => sum + (e.usedLeave || 0), 0);
    const pendingRequestsCount = leaveRequests.filter(r => r.status === 'PENDING').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const currUser = window.SheetsSync.getCurrentUser() || targetEmployees[0] || { id: 'emp_2', name: '권명주', role: '근무약사' };

    const html = `
      <div class="module-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style="font-size:24px; font-weight:bold; color:var(--primary-color); margin-bottom:4px;">
            🌴 365메가스타약국 법정 연차대장 & 유급휴가 신청 센터
          </h2>
          <p class="subtitle" style="color:var(--text-muted); font-size:14px; margin:0;">
            근로기준법 제60조 입사일 기준 법정 연차 자동 산정 대장 및 유급휴가 온라인 신청·결재 관리
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary font-bold shadow-sm" onclick="AnnualLeaveModule.openLeaveModal()" style="border-radius:12px; padding:10px 20px; font-size:15px; background:linear-gradient(135deg, #059669 0%, #047857 100%); border:none;">
            <i class="fas fa-paper-plane"></i> 🌴 연차유급휴가 신청
          </button>
        </div>
      </div>

      <!-- 상단 연차유급휴가 신청 인라인 펼치기 폼 -->
      ${showInlineLeaveForm ? `
        <div id="inline-leave-box" class="card mb-4 shadow-sm" style="border-radius:20px; border:2px solid #059669; background:#ecfdf5; padding:24px;">
          <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            <h3 style="font-size:18px; font-weight:bold; color:#047857; margin:0;">
              <i class="fas fa-paper-plane text-success"></i> 🌴 연차 유급휴가 신청서 작성
            </h3>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="AnnualLeaveModule.toggleInlineLeaveForm(false)" style="border-radius:10px;">✕ 닫기</button>
          </div>
          <form onsubmit="AnnualLeaveModule.submitLeaveApplication(event)">
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label font-bold" style="font-size:13px; color:#334155;">신청 직원 선택</label>
                <select id="inline-leave-emp-id" class="form-select font-bold" required style="border-radius:10px; padding:10px;">
                  ${targetEmployees.map(e => `
                    <option value="${e.id}" ${currUser.id === e.id ? 'selected' : ''}>${e.name} (${e.role} / ${e.position || '직원'})</option>
                  `).join('')}
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label font-bold" style="font-size:13px; color:#334155;">휴가 구분</label>
                <select id="inline-leave-type" class="form-select font-bold" required style="border-radius:10px; padding:10px;">
                  <option value="연차" selected>🌴 전일 연차 (1.0일 차감)</option>
                  <option value="오전반차">🌅 오전 반차 (0.5일 차감)</option>
                  <option value="오후반차">🌆 오후 반차 (0.5일 차감)</option>
                </select>
              </div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label font-bold" style="font-size:13px; color:#334155;">휴가 시작일자</label>
                <input type="date" id="inline-leave-start" class="form-control font-bold" value="${todayStr}" required style="border-radius:10px; padding:10px;">
              </div>
              <div class="col-md-6">
                <label class="form-label font-bold" style="font-size:13px; color:#334155;">휴가 종료일자</label>
                <input type="date" id="inline-leave-end" class="form-control font-bold" value="${todayStr}" required style="border-radius:10px; padding:10px;">
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">연차 신청 사유</label>
              <textarea id="inline-leave-reason" class="form-control" rows="2" placeholder="연차 신청 사유를 입력하세요 (예: 여름 정기 휴가, 개인 사정, 병원 진료 등)..." required style="border-radius:10px; padding:10px;"></textarea>
            </div>

            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="AnnualLeaveModule.toggleInlineLeaveForm(false)" style="border-radius:10px; padding:8px 18px;">취소</button>
              <button type="submit" class="btn btn-success font-bold" style="border-radius:10px; padding:8px 24px; font-size:15px; background:#059669;"><i class="fas fa-check"></i> 🌴 연차 신청서 제출 완료</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- 📊 Lean-OPS KPI 4카드 -->
      <div class="mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:10px;">
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #cbd5e1; background:#ffffff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#475569;">연차 대상</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-users"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#0f172a;font-family:'Outfit',sans-serif;">${targetEmployees.length}<span style="font-size:12px;"> 명</span></div>
          <div style="font-size:10.5px;color:#64748b;">약국장 제외</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bfdbfe; background:#eff6ff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#1e40af;">총 발생 연차</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-calendar-check"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#1d4ed8;font-family:'Outfit',sans-serif;">${totalGrantedSum}<span style="font-size:12px;"> 일</span></div>
          <div style="font-size:10.5px;color:#2563eb;">전체 직원 합계</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #fca5a5; background:#fff5f5; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#991b1b;">사용 연차</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-umbrella-beach"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#b91c1c;font-family:'Outfit',sans-serif;">${totalUsedSum}<span style="font-size:12px;"> 일</span></div>
          <div style="font-size:10.5px;color:#ef4444;">누적 사용 합계</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #fde68a; background:#fffbeb; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#92400e;">결재 대기</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-clock"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#d97706;font-family:'Outfit',sans-serif;">${pendingRequestsCount}<span style="font-size:12px;"> 건</span></div>
          <div style="font-size:10.5px;color:#b45309;">승인 대기 중</div>
        </div>
      </div>

      <!-- 근로기준법 제60조 주요 규정 안내 럭셔리 카드 -->
      <div class="labor-law-banner mb-6">
        <div class="law-icon"><i class="fas fa-balance-scale"></i></div>
        <div class="law-text">
          <strong>⚖️ 근로기준법 제60조(연차 유급휴가) 법정 산정 기준 요약 (근무약사 & 일반직원 대상)</strong>
          <ul>
            <li><strong>1년 미만 근로자:</strong> 1개월 개근 시 1일 유급휴가 발생 (입사 후 1년간 최대 11일)</li>
            <li><strong>1년 이상 근로자:</strong> 1년간 80% 이상 출근 시 15일 기본 유급휴가 부여</li>
            <li><strong>2년 이상 근속자:</strong> 3년차부터 매 2년마다 1일 추가 가산 (15일 + Math.floor((근속년 - 1) / 2), 최대 25일 한도)</li>
          </ul>
        </div>
      </div>

      <!-- 📊 Chart.js: 직원별 잔여연차 Bar + 사용/잔여 비율 Donut -->
      <div class="row g-3 mb-4">
        <div class="col-md-7">
          <div class="card shadow-sm" style="border-radius:16px; border:1.5px solid #cbd5e1; overflow:hidden;">
            <div class="card-header d-flex justify-content-between align-items-center" style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; padding:12px 18px;">
              <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-chart-bar text-success me-2"></i>🌴 직원별 잔여 연차일수</h4>
            </div>
            <div style="position:relative; height:200px; width:100%; padding:12px;">
              <canvas id="leaveBarCanvas"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-5">
          <div class="card shadow-sm" style="border-radius:16px; border:1.5px solid #cbd5e1; overflow:hidden;">
            <div class="card-header d-flex justify-content-between align-items-center" style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; padding:12px 18px;">
              <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-chart-pie text-warning me-2"></i>🍩 연차 사용/잔여 비율</h4>
            </div>
            <div style="position:relative; height:200px; width:100%; padding:12px;">
              <canvas id="leaveDonutCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="card-section mb-6">
        <div class="section-title-bar">
          <div>
            <h3><i class="fas fa-list-alt text-primary"></i> 365메가스타약국 직원별 연차 유급휴가 산정 대장</h3>
            <span class="text-muted">📜 근로기준법 제60조 및 취업규칙 제13조 연차 유급휴가 관리 대장</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>성명</th>
                <th>구분 / 직무</th>
                <th>상세 직책</th>
                <th>입사 일자</th>
                <th>근속 연수</th>
                <th style="width: 110px; text-align: center;">총 법정 연차</th>
                <th style="width: 100px; text-align: center;">사용 연차</th>
                <th style="width: 100px; text-align: center;">잔여 연차</th>
                <th>비고 및 법정 산정 기준</th>
              </tr>
            </thead>
            <tbody>
              ${targetEmployees.map(emp => {
                const calc = window.LaborCalculator.calculateStatutoryLeave(emp.joinDate);
                const used = emp.usedLeave || 0;
                const remaining = calc.totalGranted - used;

                return `
                  <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td>
                      <span class="badge ${emp.role.includes('약사') ? 'badge-pharmacist' : 'badge-staff'}">
                        ${emp.role}
                      </span>
                    </td>
                    <td>${emp.position || '직원'}</td>
                    <td>${emp.joinDate}</td>
                    <td><strong>${calc.tenureText}</strong></td>
                    <td class="text-center font-bold text-primary">${calc.totalGranted} 일</td>
                    <td class="text-center font-bold text-muted">${used} 일</td>
                    <td class="text-center font-bold ${remaining > 0 ? 'text-success' : 'text-danger'}" style="font-size:16px;">
                      ${remaining} 일
                    </td>
                    <td><small class="text-muted">${calc.description}</small></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. 연차 전용 달력 & 리스트 뷰 섹션 -->
      <div class="card-section">
        <div class="section-title-bar flex-between flex-wrap gap-2">
          <div>
            <h3><i class="far fa-calendar-alt text-warning"></i> 연차 신청 및 승인 달력 현황 (${currentCalYear}년 ${currentCalMonth}월)</h3>
            <span class="text-muted">📅 확정된 연차 승인 및 결재 대기 중인 휴가 현황</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="view-mode-toggle">
              <button type="button" class="mode-btn ${calViewMode === 'grid' ? 'active' : ''}" onclick="AnnualLeaveModule.setCalViewMode('grid')">
                <i class="fas fa-th"></i> 달력 보기
              </button>
              <button type="button" class="mode-btn ${calViewMode === 'list' ? 'active' : ''}" onclick="AnnualLeaveModule.setCalViewMode('list')">
                <i class="fas fa-list"></i> 목록 보기
              </button>
            </div>
            <div class="month-nav-btns">
              <button type="button" class="btn btn-icon" onclick="AnnualLeaveModule.changeCalMonth(-1)"><i class="fas fa-chevron-left"></i></button>
              <span class="current-month-label font-bold">${currentCalYear}년 ${currentCalMonth}월</span>
              <button type="button" class="btn btn-icon" onclick="AnnualLeaveModule.changeCalMonth(1)"><i class="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>

        <div id="annual-leave-calendar-container" class="mt-4">
          ${calViewMode === 'grid' ? renderCalendarGrid(leaveRequests) : renderCalendarList(leaveRequests)}
        </div>
      </div>
    `;

    container.innerHTML = html;

    setTimeout(() => {
      initLeaveCharts(targetEmployees);
    }, 50);
  }

  function toggleInlineLeaveForm(forceState) {
    if (forceState !== undefined) {
      showInlineLeaveForm = forceState;
    } else {
      showInlineLeaveForm = !showInlineLeaveForm;
    }
    render('module-content');
    if (showInlineLeaveForm) {
      setTimeout(() => {
        const box = document.getElementById('inline-leave-box');
        if (box && typeof box.scrollIntoView === 'function') {
          box.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  }

  function openLeaveModal() {
    toggleInlineLeaveForm(true);

    let modal = document.getElementById('global-leave-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-leave-modal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center;';
      document.body.appendChild(modal);
    }

    const data = window.SheetsSync.getData();
    const employees = data.employees || [];
    const targetEmployees = employees.filter(e => !e.role.includes('약국장') && e.name !== '문성도');
    const currUser = window.SheetsSync.getCurrentUser() || targetEmployees[0];
    const todayStr = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div class="modal-card" style="background:#ffffff; border-radius:20px; max-width:600px; width:94%; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); position:relative; max-height:92vh; overflow-y:auto;">
        <button type="button" class="close-btn" onclick="document.getElementById('global-leave-modal').style.display='none'" style="position:absolute; top:20px; right:24px; font-size:26px; background:none; border:none; color:#64748b; cursor:pointer;">&times;</button>
        
        <div class="d-flex align-items-center gap-3 mb-4">
          <div style="width:48px; height:48px; border-radius:50%; background:#d1fae5; color:#059669; display:flex; justify-content:center; align-items:center; font-size:22px; font-weight:bold;">
            <i class="fas fa-umbrella-beach"></i>
          </div>
          <div>
            <h3 style="font-size:20px; font-weight:bold; margin:0; color:#0f172a;">🌴 연차 유급휴가 신청서 작성</h3>
            <p class="text-muted mb-0" style="font-size:13px;">365메가스타약국 근로기준법 제60조 법정 연차 휴가를 신청합니다.</p>
          </div>
        </div>

        <form onsubmit="AnnualLeaveModule.submitLeaveApplication(event)">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">신청 직원 선택</label>
              <select id="leave-form-emp-id" class="form-select font-bold" required style="border-radius:10px; padding:10px;">
                ${targetEmployees.map(e => `
                  <option value="${e.id}" ${currUser.id === e.id ? 'selected' : ''}>${e.name} (${e.role} / ${e.position || '직원'})</option>
                `).join('')}
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">휴가 구분</label>
              <select id="leave-form-type" class="form-select font-bold" required style="border-radius:10px; padding:10px;">
                <option value="연차" selected>🌴 전일 연차 (1.0일 차감)</option>
                <option value="오전반차">🌅 오전 반차 (0.5일 차감)</option>
                <option value="오후반차">🌆 오후 반차 (0.5일 차감)</option>
              </select>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">휴가 시작일자</label>
              <input type="date" id="leave-form-start" class="form-control font-bold" value="${todayStr}" required style="border-radius:10px; padding:10px;">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">휴가 종료일자</label>
              <input type="date" id="leave-form-end" class="form-control font-bold" value="${todayStr}" required style="border-radius:10px; padding:10px;">
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label font-bold" style="font-size:13px; color:#334155;">연차 신청 사유</label>
            <textarea id="leave-form-reason" class="form-control" rows="3" placeholder="연차 신청 사유를 입력하세요 (예: 여름 정기 휴가, 개인 사정, 병원 진료 등)..." required style="border-radius:10px; padding:10px;"></textarea>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('global-leave-modal').style.display='none'" style="border-radius:10px; padding:8px 18px;">취소</button>
            <button type="submit" class="btn btn-success font-bold" style="border-radius:10px; padding:8px 24px; font-size:15px; background:#059669;"><i class="fas fa-check"></i> 🌴 연차 신청서 제출 완료</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = 'flex';
    modal.style.zIndex = '9999999';
  }

  function submitLeaveApplication(e) {
    if (e) e.preventDefault();

    const form = e ? e.target : null;
    const getVal = (id1, id2) => {
      if (form && typeof form.querySelector === 'function') {
        const input = form.querySelector(`#${id1}, #${id2}`);
        if (input && input.value.trim()) return input.value.trim();
      }
      const el1 = document.getElementById(id1);
      if (el1 && el1.value.trim()) return el1.value.trim();
      const el2 = document.getElementById(id2);
      if (el2 && el2.value.trim()) return el2.value.trim();
      return '';
    };

    const empId = getVal('leave-form-emp-id', 'inline-leave-emp-id');
    const type = getVal('leave-form-type', 'inline-leave-type') || '연차';
    const startDate = getVal('leave-form-start', 'inline-leave-start');
    const endDate = getVal('leave-form-end', 'inline-leave-end');
    const reason = getVal('leave-form-reason', 'inline-leave-reason');

    if (!startDate || !endDate || !reason) {
      alert('⚠️ 시작일자, 종료일자, 신청 사유는 필수 입력 사항입니다.');
      return;
    }

    const emps = window.SheetsSync.getEmployees() || [];
    const target = emps.find(emp => emp.id === empId) || window.SheetsSync.getCurrentUser();

    const daysCount = type === '연차' ? 1.0 : 0.5;

    const data = window.SheetsSync.getData();
    const leaveRequests = data.leaveRequests || [];

    const newReq = {
      id: 'l_' + Date.now(),
      empId: target ? target.id : 'emp_unknown',
      empName: target ? target.name : '직원',
      role: target ? target.role : '일반직원',
      startDate: startDate,
      endDate: endDate,
      daysCount: daysCount,
      type: type,
      reason: reason,
      status: 'PENDING',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    leaveRequests.push(newReq);
    window.SheetsSync.saveLeaveRequests(leaveRequests);

    showInlineLeaveForm = false;
    const modal = document.getElementById('global-leave-modal');
    if (modal) modal.style.display = 'none';

    alert(`🎉 [${target ? target.name : '직원'}] 님의 ${type} 유급휴가 신청서(${startDate} ~ ${endDate}, ${daysCount}일)가 정상적으로 제출되었습니다!\n(약국장 승인 후 연차 대장에 자동 차감 반영됩니다)`);
    
    render('module-content');
  }

  function renderCalendarGrid(leaveRequests) {
    const year = currentCalYear;
    const month = currentCalMonth;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let html = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:10px 14px; margin-bottom:14px;" class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="d-flex align-items-center gap-3 flex-wrap" style="font-size:12px; font-weight:700;">
          <span style="color:#059669; background:#d1fae5; border:1px solid #6ee7b7; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;">
            <i class="fas fa-check-circle"></i> 🌴 승인 확정 연차
          </span>
          <span style="color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;">
            <i class="fas fa-clock"></i> ⏳ 결재 대기 중
          </span>
        </div>
        <span style="font-size:11.5px; color:#64748b; font-weight:600;">
          <i class="fas fa-mobile-alt me-1"></i> PC/모바일 7열 자동 맞춤 (터치 시 상세보기)
        </span>
      </div>

      <div class="calendar-scroll-wrapper" style="border-radius:16px; border:1.5px solid #cbd5e1; box-shadow:0 4px 16px rgba(0,0,0,0.04); background:#fff; overflow:hidden;">
        <div class="leave-calendar-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:1px; background:#e2e8f0; width:100%;">
          <div class="cal-day-header text-danger" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#ef4444;">일</div>
          <div class="cal-day-header" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#334155;">월</div>
          <div class="cal-day-header" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#334155;">화</div>
          <div class="cal-day-header" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#334155;">수</div>
          <div class="cal-day-header" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#334155;">목</div>
          <div class="cal-day-header" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#334155;">금</div>
          <div class="cal-day-header text-primary" style="background:#fff; padding:12px 4px; text-align:center; font-weight:800; font-size:13.5px; border-bottom:2px solid #cbd5e1; color:#2563eb;">토</div>
    `;

    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="cal-cell empty" style="background:#fafafa; min-height:105px;"></div>`;
    }

    const monthStr = String(month).padStart(2, '0');

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const dObj = new Date(year, month - 1, day);
      const isSunday = dObj.getDay() === 0;
      const isSaturday = dObj.getDay() === 6;
      const isToday = dateKey === todayStr;

      const dayLeaves = leaveRequests.filter(l => l.startDate <= dateKey && l.endDate >= dateKey);

      let cellBg = '#ffffff';
      if (isSunday) cellBg = '#fff8f8';
      if (isSaturday) cellBg = '#f0f9ff';

      let numColor = '#0f172a';
      if (isSunday) numColor = '#dc2626';
      if (isSaturday) numColor = '#2563eb';

      html += `
        <div class="cal-cell" style="background:${cellBg}; min-height:110px; padding:8px 4px; display:flex; flex-direction:column; justify-content:space-between; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; overflow:hidden;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="cal-num" style="font-weight:800; font-size:14px; color:${numColor}; font-family:'Outfit', sans-serif; ${isToday ? 'background:#2563eb; color:#ffffff; padding:2px 6px; border-radius:50%; font-size:12px;' : ''}">
              ${day}
            </span>
            ${isToday ? `<span style="font-size:9px; color:#2563eb; font-weight:700; background:#dbeafe; padding:1px 4px; border-radius:4px;">오늘</span>` : ''}
          </div>
          <div class="cal-leave-items" style="display:flex; flex-direction:column; gap:3px; flex:1; justify-content:flex-start;">
            ${dayLeaves.map(l => {
              const isApproved = l.status === 'APPROVED';
              const bgStyle = isApproved 
                ? 'background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#ffffff; box-shadow:0 2px 5px rgba(5,150,105,0.25);'
                : 'background:linear-gradient(135deg, #d97706 0%, #b45309 100%); color:#ffffff; box-shadow:0 2px 5px rgba(217,119,6,0.25);';

              return `
                <div class="leave-item-chip" style="${bgStyle} border-radius:6px; padding:3px 4px; font-size:10.5px; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:2px; cursor:pointer; width:100%; box-sizing:border-box; overflow:hidden;" title="${l.empName} (${l.type} - ${l.reason})">
                  <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0;">
                    <i class="fas ${isApproved ? 'fa-umbrella-beach' : 'fa-clock'}" style="font-size:9px; margin-right:1px; opacity:0.9;"></i> ${l.empName}
                  </div>
                  <span style="font-size:9px; background:rgba(255,255,255,0.25); padding:1px 3px; border-radius:3px; white-space:nowrap; flex-shrink:0;">
                    ${l.type}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    return html;
  }

  function renderCalendarList(leaveRequests) {
    const monthStr = `${currentCalYear}-${String(currentCalMonth).padStart(2, '0')}`;
    const filteredLeaves = leaveRequests.filter(l => l.startDate.startsWith(monthStr) || l.endDate.startsWith(monthStr));

    if (filteredLeaves.length === 0) {
      return `
        <div class="empty-leave-state">
          <i class="fas fa-umbrella-beach text-muted fs-1"></i>
          <p class="mt-2">${currentCalYear}년 ${currentCalMonth}월에는 신청되거나 승인된 연차가 없습니다.</p>
        </div>
      `;
    }

    return `
      <div class="leave-timeline-list">
        ${filteredLeaves.map(l => {
          const d = new Date(l.startDate);
          const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
          const isApproved = l.status === 'APPROVED';

          return `
            <div class="timeline-item ${isApproved ? 'item-approved' : 'item-pending'}">
              <div class="timeline-date-badge">
                <span class="tl-date">${l.startDate.substring(5)}</span>
                <span class="tl-day">(${dayName})</span>
              </div>
              <div class="timeline-content">
                <div class="tl-header">
                  <strong>${l.empName}</strong>
                  <span class="emp-role-badge ${l.role.includes('약사') ? 'badge-pharmacist' : 'badge-staff'}">${l.role}</span>
                  <span class="badge ${isApproved ? 'badge-success' : 'badge-danger'}">
                    ${isApproved ? '<i class="fas fa-check"></i> 승인 완료' : '<i class="fas fa-hourglass-half"></i> 약국장 결재 대기'}
                  </span>
                </div>
                <div class="tl-details">
                  <span class="badge badge-type">${l.type} (-${l.daysCount}일)</span>
                  <span class="tl-reason">${l.reason}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function setCalViewMode(mode) {
    calViewMode = mode;
    render('module-content');
  }

  function changeCalMonth(delta) {
    currentCalMonth += delta;
    if (currentCalMonth > 12) {
      currentCalMonth = 1;
      currentCalYear++;
    } else if (currentCalMonth < 1) {
      currentCalMonth = 12;
      currentCalYear--;
    }
    render('module-content');
  }

  let leaveChartInst = {};
  function initLeaveCharts(targetEmployees) {
    if (typeof Chart === 'undefined') return;

    const barCtx = document.getElementById('leaveBarCanvas');
    if (barCtx) {
      if (leaveChartInst.bar) leaveChartInst.bar.destroy();
      leaveChartInst.bar = new Chart(barCtx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
          labels: targetEmployees.map(e => e.name),
          datasets: [
            {
              label: '잔여연차',
              data: targetEmployees.map(e => {
                const calc = window.LaborCalculator.calculateStatutoryLeave(e.joinDate);
                return Math.max(0, calc.totalGranted - (e.usedLeave || 0));
              }),
              backgroundColor: 'rgba(16,185,129,0.82)',
              borderRadius: 4
            },
            {
              label: '사용연차',
              data: targetEmployees.map(e => e.usedLeave || 0),
              backgroundColor: 'rgba(239,68,68,0.65)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
          scales: { x: { stacked: false, ticks: { stepSize: 1 } } }
        }
      });
    }

    const donutCtx = document.getElementById('leaveDonutCanvas');
    if (donutCtx) {
      if (leaveChartInst.donut) leaveChartInst.donut.destroy();
      leaveChartInst.donut = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: ['잔여 연차 (마일)', '사용 연차 (마일)'],
          datasets: [{
            data: [
              Math.max(0, targetEmployees.reduce((s,e) => { const c = window.LaborCalculator.calculateStatutoryLeave(e.joinDate); return s + c.totalGranted - (e.usedLeave||0); }, 0)),
              targetEmployees.reduce((s,e) => s + (e.usedLeave||0), 0)
            ],
            backgroundColor: ['#10b981', '#ef4444']
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
        }
      });
    }
  }

  return {
    render,
    toggleInlineLeaveForm,
    openLeaveModal,
    submitLeaveApplication,
    changeCalMonth,
    setCalViewMode
  };
})();
