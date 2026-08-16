/**
 * 4. 약국장 결재 모듈 컨트롤러 (Pharmacy Director Approval Hub)
 * 정돈되고 깔끔한 이그제큐티브 대시보드 레이아웃 (스케줄 팀별 승인 및 연차 결재 통합)
 */
window.ApprovalModule = (function () {

  let isAuthenticated = false; // 약국장 인증 상태

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const currentUser = window.SheetsSync.getCurrentUser();
    // 약국장 계정으로 로그인한 경우 2차 암호 입력 없이 1초 즉시 승인 공개!
    if (currentUser && currentUser.role === '약국장') {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      container.innerHTML = `
        <div class="alert alert-danger p-4 text-center my-5" style="border-radius:12px;">
          <h4><i class="fas fa-lock"></i> 🔒 약국장 전용 권한 구역</h4>
          <p class="mb-0">약국장 결재 센터는 <strong>약국장 계정으로 로그인한 경우에만</strong> 공개됩니다.</p>
        </div>
      `;
      return;
    }

    const data = window.SheetsSync.getData();
    const leaveRequests = data.leaveRequests || [];
    const pendingRequests = leaveRequests.filter(r => r.status === 'PENDING');
    const processedRequests = leaveRequests.filter(r => r.status !== 'PENDING');

    const html = `
      <div class="module-header flex justify-between items-center pb-4 mb-6 border-b">
        <div>
          <h2>🔐 약국장 결재 & 인사승인 센터</h2>
          <p class="subtitle">365메가스타약국 근무스케줄 결재 및 연차 유급휴가 종합 승인 관리자 구역</p>
        </div>
        <div class="header-actions flex items-center gap-2">
          <span class="badge badge-success"><i class="fas fa-user-shield"></i> 약국장 인증됨</span>
          <button type="button" class="btn btn-outline-danger btn-sm ml-2 font-bold" onclick="ApprovalModule.logout()">
            <i class="fas fa-lock"></i> 잠금 (로그아웃)
          </button>
        </div>
      </div>

      <!-- 📊 Lean-OPS KPI 4카드 -->
      <div class="mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:10px;">
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #fde68a; background:#fffbeb; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#92400e;">결재 대기</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-hourglass-half"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#d97706;font-family:'Outfit',sans-serif;">${pendingRequests.length}<span style="font-size:12px;"> 건</span></div>
          <div style="font-size:10.5px;color:#b45309;">승인 대기 중</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bbf7d0; background:#f0fdf4; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#15803d;">승인 완료</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#dcfce7;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-check-circle"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#15803d;font-family:'Outfit',sans-serif;">${leaveRequests.filter(r => r.status === 'APPROVED').length}<span style="font-size:12px;"> 건</span></div>
          <div style="font-size:10.5px;color:#059669;">연차 승인</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #fca5a5; background:#fff5f5; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#991b1b;">반려/삭제</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-times-circle"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#b91c1c;font-family:'Outfit',sans-serif;">${leaveRequests.filter(r => r.status === 'REJECTED').length}<span style="font-size:12px;"> 건</span></div>
          <div style="font-size:10.5px;color:#ef4444;">반려 처리</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bfdbfe; background:#eff6ff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#1e40af;">스케줄 결재</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-calendar-check"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#1d4ed8;font-family:'Outfit',sans-serif;">${((data.scheduleStatus||{})['2026-08']||{}).pharmacistStatus === 'APPROVED' ? '✅' : '⏳'}</div>
          <div style="font-size:10.5px;color:#2563eb;">8월 스케줄</div>
        </div>
      </div>

    
      <!-- 1. 결재 대기 연차 신청 목록 -->
      <div class="card-section mb-6">
        <div class="section-title-bar flex justify-between items-center flex-wrap-gap">
          <h3><i class="fas fa-hourglass-half text-warning"></i> 결재 대기 연차 신청 목록 <span class="badge badge-warning ml-1">${pendingRequests.length}건</span></h3>
          
          <div class="bulk-action-group flex items-center gap-2">
            <label class="checkbox-label text-sm font-bold flex items-center gap-1 cursor-pointer mr-2">
              <input type="checkbox" id="select-all-pending" onchange="ApprovalModule.toggleSelectAll(this)">
              <span>전체 선택</span> (<span id="selected-count">0</span>건)
            </label>
            <button type="button" class="btn btn-sm btn-success font-bold" onclick="ApprovalModule.bulkApprove()">
              <i class="fas fa-check-double"></i> 선택 일괄 승인
            </button>
            <button type="button" class="btn btn-sm btn-danger font-bold ml-1" onclick="ApprovalModule.bulkDelete()">
              <i class="fas fa-trash-alt"></i> 선택 일괄 삭제 / 반려
            </button>
          </div>
        </div>

        <div class="table-responsive mt-3">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">선택</th>
                <th style="width: 140px;">신청 직원</th>
                <th style="width: 90px; text-align: center;">구분</th>
                <th style="width: 180px; text-align: center;">신청 기간</th>
                <th style="width: 90px; text-align: center;">차감 일수</th>
                <th>신청 사유</th>
                <th style="width: 140px; text-align: center;">신청 일시</th>
                <th style="width: 130px; text-align: center;">개별 결재</th>
              </tr>
            </thead>
            <tbody>
              ${renderPendingRows(pendingRequests)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. 결재 처리 완료 이력 -->
      <div class="card-section">
        <div class="section-title-bar">
          <h3><i class="fas fa-history"></i> 결재 처리 완료 이력 (${processedRequests.length}건)</h3>
        </div>
        <div class="table-responsive mt-3">
          <table class="data-table text-muted-table">
            <thead>
              <tr>
                <th style="width: 140px;">직원명</th>
                <th style="width: 90px; text-align: center;">구분</th>
                <th style="width: 180px; text-align: center;">휴가 기간</th>
                <th style="width: 90px; text-align: center;">차감 일수</th>
                <th style="width: 110px; text-align: center;">처리 상태</th>
                <th style="width: 150px; text-align: center;">처리 일시</th>
              </tr>
            </thead>
            <tbody>
              ${renderProcessedRows(processedRequests)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderAuthForm() {
    return `
      <div class="auth-card-container py-12 flex justify-center items-center">
        <div class="auth-card text-center" style="max-width: 420px; width: 100%; margin: 40px auto; padding: 32px; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); box-shadow: var(--shadow-md);">
          <div class="auth-icon mb-4"><i class="fas fa-user-lock text-warning" style="font-size: 48px;"></i></div>
          <h3 class="fs-20 font-bold mb-2">🔐 약국장 인증 보안</h3>
          <p class="text-sm text-muted mb-4">약국장 결재 및 연차 승인은 <strong>약국장 전용 보안 구역</strong>입니다.<br>약국장 비밀번호를 입력해 주세요.</p>
          <div class="form-group mb-4">
            <input type="password" id="director-passcode" class="form-control text-center fs-18" placeholder="비밀번호 입력" autofocus onkeyup="if(event.key==='Enter') ApprovalModule.verifyPassword(event)">
          </div>
          <button type="button" class="btn btn-primary w-100 py-3 font-bold" onclick="ApprovalModule.verifyPassword(event)">인증하기</button>
        </div>
      </div>
    `;
  }

  function verifyPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pass = document.getElementById('director-passcode').value.trim();
    if (pass === '367900') {
      isAuthenticated = true;
      render('module-content');
    } else {
      alert('❌ 비밀번호가 올바르지 않습니다.');
    }
  }

  function logout() {
    isAuthenticated = false;
    render('module-content');
  }

  function renderPendingRows(requests) {
    if (requests.length === 0) {
      return `<tr><td colspan="8" class="text-center py-6 text-muted"><i class="fas fa-check-circle text-success fs-3 mb-2"></i><br><strong>현재 결재 대기 중인 연차 신청 건이 없습니다.</strong></td></tr>`;
    }

    return requests.map(req => `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="pending-chk" value="${req.id}" onchange="ApprovalModule.updateSelectedCount()">
        </td>
        <td>
          <strong class="fs-15">${req.empName}</strong>
          <span class="emp-role-badge ${req.role.includes('약사') ? 'badge-pharmacist' : 'badge-staff'} ml-1">${req.role}</span>
        </td>
        <td style="text-align: center;"><span class="badge badge-type">${req.type}</span></td>
        <td style="text-align: center;"><span class="text-mono text-sm">${req.startDate} ~ ${req.endDate}</span></td>
        <td style="text-align: center;"><strong class="text-primary fs-15">${req.daysCount}일</strong></td>
        <td>${req.reason}</td>
        <td style="text-align: center;"><small class="text-muted text-mono">${req.createdAt}</small></td>
        <td style="text-align: center;">
          <div class="action-btn-group justify-center">
            <button type="button" class="btn btn-sm btn-success" onclick="ApprovalModule.approveSingle('${req.id}')">
              <i class="fas fa-check"></i> 승인
            </button>
            <button type="button" class="btn btn-sm btn-danger ml-1" onclick="ApprovalModule.rejectSingle('${req.id}')">
              <i class="fas fa-times"></i> 반려
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderProcessedRows(requests) {
    if (requests.length === 0) {
      return `<tr><td colspan="6" class="text-center py-4 text-muted">결재 처리 완료 내역이 없습니다.</td></tr>`;
    }

    return requests.map(req => `
      <tr>
        <td><strong>${req.empName}</strong></td>
        <td style="text-align: center;"><span class="badge badge-type">${req.type}</span></td>
        <td style="text-align: center;"><span class="text-mono text-sm">${req.startDate} ~ ${req.endDate}</span></td>
        <td style="text-align: center;"><strong>${req.daysCount}일</strong></td>
        <td style="text-align: center;">
          <span class="badge ${req.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}">
            ${req.status === 'APPROVED' ? '승인 완료' : '반려됨'}
          </span>
        </td>
        <td style="text-align: center;"><small class="text-muted text-mono">${req.approvedAt || req.createdAt}</small></td>
      </tr>
    `).join('');
  }

  function updateSelectedCount() {
    const chks = document.querySelectorAll('.pending-chk:checked');
    const el = document.getElementById('selected-count');
    if (el) el.textContent = chks.length;
  }

  function toggleSelectAll(masterChk) {
    const chks = document.querySelectorAll('.pending-chk');
    chks.forEach(c => c.checked = masterChk.checked);
    updateSelectedCount();
  }

  function approveSingle(reqId) {
    const data = window.SheetsSync.getData();
    const req = data.leaveRequests.find(r => r.id === reqId);
    if (!req) return;

    if (!confirm(`'${req.empName}' 님의 ${req.type} (${req.daysCount}일) 신청을 승인하시겠습니까?`)) {
      return;
    }

    req.status = 'APPROVED';
    req.approvedAt = new Date().toLocaleString();

    const emp = data.employees.find(e => e.id === req.empId);
    if (emp) {
      emp.usedLeave = (emp.usedLeave || 0) + req.daysCount;
    }

    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.EMPLOYEES, data.employees);
    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.LEAVE_REQUESTS, data.leaveRequests);

    render('module-content');
    alert(`'${req.empName}' 님의 연차가 성공적으로 승인 처리되었습니다.`);
  }

  function rejectSingle(reqId) {
    const data = window.SheetsSync.getData();
    const req = data.leaveRequests.find(r => r.id === reqId);
    if (!req) return;

    if (!confirm(`'${req.empName}' 님의 ${req.type} 신청을 반려하시겠습니까?`)) {
      return;
    }

    req.status = 'REJECTED';
    req.approvedAt = new Date().toLocaleString();

    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.LEAVE_REQUESTS, data.leaveRequests);
    render('module-content');
    alert(`'${req.empName}' 님의 연차 신청이 반려 처리되었습니다.`);
  }

  function bulkApprove() {
    const chks = document.querySelectorAll('.pending-chk:checked');
    if (chks.length === 0) {
      alert('일괄 승인할 연차 신청 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${chks.length}건의 연차 신청을 일괄 승인하시겠습니까?`)) {
      return;
    }

    const data = window.SheetsSync.getData();
    const idsToApprove = Array.from(chks).map(c => c.value);

    idsToApprove.forEach(id => {
      const req = data.leaveRequests.find(r => r.id === id);
      if (req && req.status === 'PENDING') {
        req.status = 'APPROVED';
        req.approvedAt = new Date().toLocaleString();
        const emp = data.employees.find(e => e.id === req.empId);
        if (emp) {
          emp.usedLeave = (emp.usedLeave || 0) + req.daysCount;
        }
      }
    });

    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.EMPLOYEES, data.employees);
    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.LEAVE_REQUESTS, data.leaveRequests);

    render('module-content');
    alert(`${chks.length}건의 연차가 일괄 승인 처리되었습니다.`);
  }

  function bulkDelete() {
    const chks = document.querySelectorAll('.pending-chk:checked');
    if (chks.length === 0) {
      alert('일괄 삭제/반려할 연차 신청 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${chks.length}건의 연차 신청 항목을 삭제하시겠습니까?`)) {
      return;
    }

    const data = window.SheetsSync.getData();
    const idsToDelete = Array.from(chks).map(c => c.value);

    data.leaveRequests = data.leaveRequests.filter(r => !idsToDelete.includes(r.id));
    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.LEAVE_REQUESTS, data.leaveRequests);

    render('module-content');
    alert(`${idsToDelete.length}건의 항목이 삭제되었습니다.`);
  }

  
  return {
    render,
    verifyPassword,
    logout,
    updateSelectedCount,
    toggleSelectAll,
    approveSingle,
    rejectSingle,
    bulkApprove,
    bulkDelete,
  };
})();
