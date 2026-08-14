/**
 * 365메가스타약국 HR/OPS 플랫폼 메인 애플리케이션 코어 (App Main Controller)
 * 10개 통합 모듈 사이드바 관리, 직원 개별 로그인, RBAC 권한 제어 및 10자리 복합 비밀번호 검증
 */
window.App = (function () {

  let activeModule = 'notices';
  let isDrawerOpen = false;

  const MODULE_TITLES = {
    'notices': '📢 공지사항 & 업무 SOP',
    'worklog': '📝 약국 업무일지 & 인수인계',
    'schedule': '📅 월간 근무 스케줄',
    'annual-leave': '🌴 연차대장 & 연차 전용 달력',
    'discount-purchase': '🛍️ 직원할인구매대장',
    'rules': '📜 365메가스타약국 취업규칙 전문 열람',
    'emergency-contacts': '☎️ 약국 운영 지원 연락망 센터',
    'approval': '🔐 약국장 결재 & 인사승인 센터 (약국장 전용)',
    'staff-directory': '👤 약국 직원 명부 (약국장 전용)',
    'pharmacy-settlement': '📊 스마트약국 정산 대시보드 (약국장 전용)',
    'building-rental': '🏢 건물 임대업 대시보드 (약국장 전용)'
  };

  const MODULE_ICONS = {
    'notices': 'fa-bullhorn',
    'worklog': 'fa-pen-fancy',
    'schedule': 'fa-calendar-alt',
    'annual-leave': 'fa-umbrella-beach',
    'discount-purchase': 'fa-shopping-bag',
    'rules': 'fa-book-medical',
    'emergency-contacts': 'fa-phone-alt',
    'approval': 'fa-user-check',
    'staff-directory': 'fa-address-book',
    'pharmacy-settlement': 'fa-coins',
    'building-rental': 'fa-building'
  };

  function init() {
    loadSavedTheme();
    setupEventListeners();
    updateSheetSyncBadge();
    
    // 유저 세션 및 사이드바 권한 렌더링
    renderSidebarNavigation();
    renderUserHeader();
    renderQuickLoginButtons();

    // 핸드폰/스마트폰 및 PC 접속 시 드로어 메뉴 가동
    openDrawer();

    renderActiveModule();
  }

  function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSheetModal();
        closeDrawer();
        closeEmpModal();
        closeLeaveModal();
        closeDateDetailModal();
        closeDiscountModal();
        closeChangePwModal();
        if (window.NoticesModule) window.NoticesModule.closeModal();
        if (window.ScheduleModule) window.ScheduleModule.closeShiftModal();
        if (window.WorklogModule) window.WorklogModule.closeModal();
        if (window.DiscountPurchaseModule) window.DiscountPurchaseModule.closeModal();
        const pModal = document.getElementById('property-crud-modal');
        if (pModal) pModal.style.display = 'none';
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        openDrawer();
      }
    });
  }

  function renderSidebarNavigation() {
    const nav = document.querySelector('.drawer-menu');
    if (!nav) return;

    const currUser = window.SheetsSync.getCurrentUser();
    const isDirector = currUser && currUser.role === '약국장';

    // 맞춤 허용 탭 목록 (null 안전성 확보)
    const allowed = (currUser && currUser.allowedTabs) ? currUser.allowedTabs : [
      'notices-module', 'worklog-module', 'schedule-module',
      'annual-leave-module', 'discount-purchase-module', 'rules-module', 'emergency-contacts-module'
    ];

    let html = `
      <button class="menu-item ${activeModule === 'notices' ? 'active' : ''}" data-module="notices" onclick="App.switchModule('notices', true)">
        <i class="fas fa-bullhorn"></i>
        <span>공지사항 & SOP</span>
      </button>

      ${(isDirector || allowed.includes('worklog-module')) ? `
        <button class="menu-item ${activeModule === 'worklog' ? 'active' : ''}" data-module="worklog" onclick="App.switchModule('worklog', true)">
          <i class="fas fa-pen-fancy"></i>
          <span>업무일지 & 인수인계</span>
        </button>
      ` : ''}

      ${(isDirector || allowed.includes('schedule-module')) ? `
        <button class="menu-item ${activeModule === 'schedule' ? 'active' : ''}" data-module="schedule" onclick="App.switchModule('schedule', true)">
          <i class="fas fa-calendar-alt"></i>
          <span>월간 근무 스케줄</span>
        </button>
      ` : ''}

      ${(isDirector || allowed.includes('annual-leave-module')) ? `
        <button class="menu-item ${activeModule === 'annual-leave' ? 'active' : ''}" data-module="annual-leave" onclick="App.switchModule('annual-leave', true)">
          <i class="fas fa-umbrella-beach"></i>
          <span>연차대장 & 달력</span>
        </button>
      ` : ''}

      ${(isDirector || allowed.includes('discount-purchase-module')) ? `
        <button class="menu-item ${activeModule === 'discount-purchase' ? 'active' : ''}" data-module="discount-purchase" onclick="App.switchModule('discount-purchase', true)">
          <i class="fas fa-shopping-bag"></i>
          <span>직원할인구매대장</span>
        </button>
      ` : ''}

      ${(isDirector || allowed.includes('rules-module')) ? `
        <button class="menu-item ${activeModule === 'rules' ? 'active' : ''}" data-module="rules" onclick="App.switchModule('rules', true)">
          <i class="fas fa-book-medical"></i>
          <span>취업규칙 전문</span>
        </button>
      ` : ''}

      ${(isDirector || allowed.includes('emergency-contacts-module')) ? `
        <button class="menu-item ${activeModule === 'emergency-contacts' ? 'active' : ''}" data-module="emergency-contacts" onclick="App.switchModule('emergency-contacts', true)">
          <i class="fas fa-phone-alt text-warning"></i>
          <span>약국 운영 지원 연락망</span>
        </button>
      ` : ''}
    `;

    // 약국장 전용 보안 4대 메뉴
    if (isDirector) {
      html += `
        <div style="padding:12px 16px 4px 16px; font-size:11px; font-weight:bold; color:#ef4444; text-transform:uppercase;">
          🔒 약국장 전용 관리 메뉴
        </div>
        <button class="menu-item ${activeModule === 'approval' ? 'active' : ''}" data-module="approval" onclick="App.switchModule('approval', true)">
          <i class="fas fa-user-check text-danger"></i>
          <span>약국장 결재</span>
        </button>
        <button class="menu-item ${activeModule === 'staff-directory' ? 'active' : ''}" data-module="staff-directory" onclick="App.switchModule('staff-directory', true)">
          <i class="fas fa-address-book text-danger"></i>
          <span>직원 명부</span>
        </button>
        <button class="menu-item ${activeModule === 'pharmacy-settlement' ? 'active' : ''}" data-module="pharmacy-settlement" onclick="App.switchModule('pharmacy-settlement', true)">
          <i class="fas fa-coins text-warning"></i>
          <span>스마트약국 정산</span>
        </button>
        <button class="menu-item ${activeModule === 'building-rental' ? 'active' : ''}" data-module="building-rental" onclick="App.switchModule('building-rental', true)">
          <i class="fas fa-building text-info"></i>
          <span>건물 임대업 대시보드</span>
        </button>
      `;
    }

    nav.innerHTML = html;
  }

  function renderUserHeader() {
    const badge = document.getElementById('user-profile-badge');
    if (!badge) return;

    const curr = window.SheetsSync.getCurrentUser();
    if (curr) {
      const isDirector = curr.role === '약국장';
      const isPharm = curr.role === '근무약사';
      
      const badgeStyle = isDirector
        ? 'background:linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color:#ffffff;'
        : isPharm
        ? 'background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#ffffff;'
        : 'background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#ffffff;';

      const iconClass = isDirector ? 'fa-crown text-warning' : isPharm ? 'fa-user-md' : 'fa-user-nurse';

      badge.innerHTML = `
        <div class="d-flex align-items-center gap-1" style="white-space:nowrap; flex-wrap:nowrap;">
          <span class="user-badge-pill" style="${badgeStyle} font-size:12.5px; font-weight:700; padding:5px 12px; border-radius:20px; box-shadow:0 2px 6px rgba(0,0,0,0.12); display:inline-flex; align-items:center; gap:5px;" title="${curr.name} (${curr.role})">
            <i class="fas ${iconClass}"></i>
            <span>${curr.name}</span>
          </span>

          <button type="button" class="header-action-btn" onclick="App.openChangePwModal()" title="비밀번호 자율 변경" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:20px; font-size:11.5px; font-weight:700; color:#334155; padding:5px 10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
            <i class="fas fa-key text-warning"></i>
            <span>비번 변경</span>
          </button>

          <button type="button" class="header-action-btn" onclick="App.userLogout()" title="계정 로그아웃 및 계정 전환" style="background:#fff1f2; border:1px solid #fecdd3; border-radius:20px; font-size:11.5px; font-weight:700; color:#e11d48; padding:5px 10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onmouseover="this.style.background='#ffe4e6'; this.style.borderColor='#fda4af';" onmouseout="this.style.background='#fff1f2'; this.style.borderColor='#fecdd3';">
            <i class="fas fa-sign-out-alt"></i>
            <span>로그아웃</span>
          </button>
        </div>
      `;
    } else {
      badge.innerHTML = `
        <button class="btn btn-sm font-bold shadow-sm" onclick="App.showLoginModal()" style="background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#ffffff; border:none; border-radius:20px; font-size:12px; padding:6px 14px; display:inline-flex; align-items:center; gap:5px;">
          <i class="fas fa-user-lock"></i> <span>직원 로그인</span>
        </button>
      `;
    }
  }

  function renderQuickLoginButtons() {
    const container = document.getElementById('quick-login-buttons');
    if (!container) return;

    const emps = window.SheetsSync.getEmployees();

    const director = emps.filter(e => e.role === '약국장');
    const pharmacists = emps.filter(e => e.role === '근무약사');
    const staff = emps.filter(e => e.role === '일반직원');

    container.innerHTML = `
      <div class="w-100 mb-3 text-start">
        <div style="font-size:11px; font-weight:bold; color:#dc2626; margin-bottom:6px; letter-spacing:0.5px;">👑 대표 약국장</div>
        <div class="d-flex flex-wrap gap-2">
          ${director.map(e => `
            <button type="button" class="btn btn-sm" onclick="App.quickSelectLogin('${e.email || e.username}')" style="background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:#fff; border:none; border-radius:20px; font-size:13px; padding:7px 16px; font-weight:bold; box-shadow:0 2px 6px rgba(220,38,38,0.25);">
              🏆 ${e.name} (${e.role})
            </button>
          `).join('')}
        </div>
      </div>

      <div class="w-100 mb-3 text-start">
        <div style="font-size:11px; font-weight:bold; color:#2563eb; margin-bottom:6px; letter-spacing:0.5px;">👨‍⚕️ 근무약사 (4인)</div>
        <div class="d-flex flex-wrap gap-2">
          ${pharmacists.map(e => `
            <button type="button" class="btn btn-sm" onclick="App.quickSelectLogin('${e.email || e.username}')" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:20px; font-size:13px; padding:6px 14px; font-weight:600;" onmouseover="this.style.background='#dbeafe';" onmouseout="this.style.background='#eff6ff';">
              👨‍⚕️ ${e.name} (${e.position || '약사'})
            </button>
          `).join('')}
        </div>
      </div>

      <div class="w-100 text-start">
        <div style="font-size:11px; font-weight:bold; color:#059669; margin-bottom:6px; letter-spacing:0.5px;">👨‍💼 일반직원 (4인)</div>
        <div class="d-flex flex-wrap gap-2">
          ${staff.map(e => `
            <button type="button" class="btn btn-sm" onclick="App.quickSelectLogin('${e.email || e.username}')" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; border-radius:20px; font-size:13px; padding:6px 14px; font-weight:600;" onmouseover="this.style.background='#dcfce7';" onmouseout="this.style.background='#f0fdf4';">
              👨‍💼 ${e.name} (${e.position || '직원'})
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function quickSelectLogin(val) {
    const input = document.getElementById('login-username');
    if (input) input.value = val;

    const passInput = document.getElementById('login-passcode');
    if (passInput) {
      passInput.value = ''; // 🔒 보안 수칙: 비밀번호는 자동 입력되지 않으며 본인이 직접 입력합니다.
      passInput.focus();
    }
  }

  function showLoginModal() {
    renderQuickLoginButtons();
    const m = document.getElementById('login-modal');
    if (m) m.style.display = 'flex';
  }

  function closeLoginModal() {
    const m = document.getElementById('login-modal');
    if (m) m.style.display = 'none';
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    const inputVal = document.getElementById('login-username').value.trim().toLowerCase();
    const pass = document.getElementById('login-passcode').value.trim();

    const emps = window.SheetsSync.getEmployees();
    
    // 유연한 다중 조건 매칭 (이름, 이메일, 아이디, ID 접두사 모두 가능)
    const target = emps.find(emp => {
      const u = (emp.username || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const name = (emp.name || '').toLowerCase();
      const id = (emp.id || '').toLowerCase();
      const shortUser = u.split('@')[0];

      return inputVal === u ||
             inputVal === email ||
             inputVal === name ||
             inputVal === id ||
             inputVal === shortUser ||
             u.startsWith(inputVal) ||
             email.startsWith(inputVal);
    });

    if (!target) {
      alert('❌ 존재하지 않는 아이디(이메일 또는 이름)입니다.');
      return;
    }

    if (target.passcode !== pass) {
      alert(`❌ 비밀번호가 올바르지 않습니다. (${target.name} 님의 비밀번호를 다시 확인해 주세요)`);
      return;
    }

    window.SheetsSync.setCurrentUser(target);
    closeLoginModal();

    if (window.ScheduleModule && window.ScheduleModule.closeInlinePanel) {
      window.ScheduleModule.closeInlinePanel();
    }

    renderSidebarNavigation();
    renderUserHeader();

    // 🚨 약국장의 스케줄 수정(반려) 요청이 있는 경우 스케줄 탭으로 자동 이동 및 알림 팝업 전송!
    checkPendingRejectionNotice(true, target);
  }

  function checkPendingRejectionNotice(isLoginEvent = false, targetUser = null) {
    const currUser = targetUser || window.SheetsSync.getCurrentUser();
    if (!currUser || currUser.role === '약국장') {
      if (isLoginEvent) {
        alert(`🎉 반가워요, ${currUser ? currUser.name : ''} ${currUser ? currUser.role : ''}님! 성공적으로 로그인되었습니다.`);
        switchModule('notices', true);
      }
      return;
    }

    const data = window.SheetsSync.getData();
    const scheduleStatus = data.scheduleStatus || {};

    let pendingComment = null;
    let pendingMonthKey = null;

    Object.keys(scheduleStatus).forEach(mKey => {
      const st = scheduleStatus[mKey];
      if (st && st.directorComment && !st.directorApproved) {
        pendingComment = st.directorComment;
        pendingMonthKey = mKey;
      }
    });

    if (pendingComment) {
      switchModule('schedule', true);
      setTimeout(() => {
        alert(`🚨 [약국장 스케줄 재조율(수정) 요청 알림]\n\n💬 약국장 전달 사유: "${pendingComment}"\n\n팀원들과 위 사유를 확인하신 후, 하단 스케줄표에서 근무 시간 및 OFF를 보정하고 [스케줄 제출하기] 버튼을 다시 눌러주세요.`);
      }, 300);
    } else if (isLoginEvent) {
      alert(`🎉 반가워요, ${currUser.name} ${currUser.role}님! 성공적으로 로그인되었습니다.`);
      switchModule('notices', true);
    }
  }

  function userLogout() {
    window.SheetsSync.logoutUser();
    if (window.ScheduleModule && window.ScheduleModule.closeInlinePanel) {
      window.ScheduleModule.closeInlinePanel();
    }
    renderSidebarNavigation();
    renderUserHeader();
    switchModule('notices', true);
    // 💡 로그아웃 즉시 다음 직원이 로그인할 수 있도록 로그인 모달을 즉시 오픈합니다!
    setTimeout(() => {
      showLoginModal();
    }, 100);
  }

  function openChangePwModal() {
    const curr = window.SheetsSync.getCurrentUser();
    if (!curr) {
      alert('🔒 먼저 상단 [🔑 직원 로그인 / 계정 선택]을 통해 접속한 후 비밀번호를 변경해 주세요.');
      return;
    }
    const m = document.getElementById('change-password-modal');
    if (m) {
      document.getElementById('cpw-current').value = '';
      document.getElementById('cpw-new').value = '';
      document.getElementById('cpw-confirm').value = '';
      document.getElementById('pw-realtime-msg').innerText = '비밀번호를 입력해 주세요.';
      document.getElementById('pw-realtime-msg').className = 'mb-3 p-2 text-center text-muted';
      m.style.display = 'flex';
    }
  }

  function closeChangePwModal() {
    const m = document.getElementById('change-password-modal');
    if (m) m.style.display = 'none';
  }

  function checkPwRealtime() {
    const newPw = document.getElementById('cpw-new').value;
    const msgBox = document.getElementById('pw-realtime-msg');
    if (!msgBox) return;

    const res = window.SheetsSync.validatePasswordComplexity(newPw);
    if (res.valid) {
      msgBox.className = 'mb-3 p-2 text-center text-white bg-success';
      msgBox.innerText = '✅ ' + res.message;
    } else {
      msgBox.className = 'mb-3 p-2 text-center text-white bg-danger';
      msgBox.innerText = '❌ ' + res.message;
    }
  }

  function handleChangePwSubmit(e) {
    e.preventDefault();
    const curr = window.SheetsSync.getCurrentUser();
    const currentPw = document.getElementById('cpw-current').value.trim();
    const newPw = document.getElementById('cpw-new').value.trim();
    const confirmPw = document.getElementById('cpw-confirm').value.trim();

    if (newPw !== confirmPw) {
      alert('❌ 새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const res = window.SheetsSync.changePassword(curr.id, currentPw, newPw);
    if (res.success) {
      alert('🎉 ' + res.message);
      closeChangePwModal();
    } else {
      alert('❌ ' + res.message);
    }
  }

  function renderActiveModule() {
    switch (activeModule) {
      case 'notices':
        if (window.NoticesModule) window.NoticesModule.render('module-content');
        break;
      case 'worklog':
        if (window.WorklogModule) window.WorklogModule.render('module-content');
        break;
      case 'schedule':
        if (window.ScheduleModule) window.ScheduleModule.render('module-content');
        break;
      case 'annual-leave':
        if (window.AnnualLeaveModule) window.AnnualLeaveModule.render('module-content');
        break;
      case 'staff-directory':
        if (window.StaffDirectoryModule) window.StaffDirectoryModule.render('module-content');
        break;
      case 'discount-purchase':
        if (window.DiscountPurchaseModule) window.DiscountPurchaseModule.render('module-content');
        break;
      case 'rules':
        if (window.RulesModule) window.RulesModule.render('module-content');
        break;
      case 'emergency-contacts':
        if (window.EmergencyContactsModule) window.EmergencyContactsModule.render('module-content');
        break;
      case 'pharmacy-settlement':
        if (window.PharmacySettlementModule) window.PharmacySettlementModule.render('module-content');
        break;
      case 'building-rental':
        if (window.BuildingRentalModule) window.BuildingRentalModule.render('module-content');
        break;
      case 'approval':
        if (window.ApprovalModule) window.ApprovalModule.render('module-content');
        break;
    }
  }

  function switchModule(moduleName, isUserAction = false) {
    if (!MODULE_TITLES[moduleName]) return;

    // 보안 접근 가드 (약국장 전용 4대 모듈)
    const curr = window.SheetsSync.getCurrentUser();
    const isDirector = curr && curr.role === '약국장';

    if (['approval', 'staff-directory', 'pharmacy-settlement', 'building-rental'].includes(moduleName) && !isDirector) {
      alert('🔒 보안 안내: 선택하신 메뉴는 약국장 전용 관리 영역입니다.');
      return;
    }

    activeModule = moduleName;

    document.querySelectorAll('.menu-item').forEach(btn => {
      if (btn.getAttribute('data-module') === moduleName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const titleElem = document.getElementById('active-module-title');
    if (titleElem) {
      titleElem.textContent = MODULE_TITLES[moduleName];
    }

    renderActiveModule();

    if (isUserAction && window.innerWidth <= 900) {
      closeDrawer();
    }
  }

  function openDrawer() {
    isDrawerOpen = true;
    const sidebar = document.getElementById('app-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const wrapper = document.getElementById('main-wrapper');

    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    if (wrapper) wrapper.classList.add('drawer-open');
  }

  function closeDrawer() {
    isDrawerOpen = false;
    const sidebar = document.getElementById('app-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const wrapper = document.getElementById('main-wrapper');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (wrapper) wrapper.classList.remove('drawer-open');
  }

  function toggleDrawer() {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function loadSavedTheme() {
    try {
      const saved = localStorage.getItem('365_theme');
      const body = document.body;
      const icon = document.getElementById('theme-toggle-icon');
      if (saved === 'dark') {
        body.setAttribute('data-theme', 'dark');
        body.classList.add('dark-theme');
        if (icon) icon.className = 'fas fa-sun text-warning';
      }
    } catch(e){}
  }

  function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-toggle-icon');
    const isDark = body.getAttribute('data-theme') === 'dark' || body.classList.contains('dark-theme');

    if (isDark) {
      body.removeAttribute('data-theme');
      body.classList.remove('dark-theme');
      if (icon) icon.className = 'fas fa-moon';
      try { localStorage.setItem('365_theme', 'light'); } catch(e){}
    } else {
      body.setAttribute('data-theme', 'dark');
      body.classList.add('dark-theme');
      if (icon) icon.className = 'fas fa-sun text-warning';
      try { localStorage.setItem('365_theme', 'dark'); } catch(e){}
    }
  }

  function updateSheetSyncBadge() {
    const textElem = document.getElementById('sheet-sync-status-text');
    if (textElem) {
      textElem.textContent = `📊 구글 시트 다운로드`;
    }
  }

  function downloadActiveModuleToGoogleSheets() {
    const data = window.SheetsSync.getData();
    const employees = data.employees || [];
    const schedule = data.schedule || [];
    const currentYear = 2026;
    const currentMonth = 8;
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let moduleName = MODULE_TITLES[activeModule] || activeModule;
    moduleName = moduleName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    let filename = `365메가스타약국_${moduleName}_${currentYear}년${String(currentMonth).padStart(2, '0')}월.csv`;
    let rows = [];

    if (activeModule === 'schedule') {
      filename = `365메가스타약국_월간근무스케줄및급여정산표_${currentYear}년${String(currentMonth).padStart(2, '0')}월.csv`;
      
      rows.push(['365메가스타약국 월간 근무 스케줄 및 세전/세후 급여 정산 집계표']);
      rows.push(['산출년월', `${currentYear}년 ${currentMonth}월`]);
      rows.push([]);

      rows.push(['[ 1. 근무약사 급여 정산표 ]']);
      rows.push(['약사명', '직무', '평일 시급(원)', '주말/공휴일 시급(원)', '총 실근무 시수', '평일 시수', '주말/공휴일 시수', '평일 산출액(원)', '주말/공휴일 산출액(원)', '월 세전 총급여액(원)']);

      const pharmacists = employees.filter(e => e.role === '근무약사' || (e.role || '').includes('약사'));
      const pRatesMap = window.SheetsSync.getPharmacistRates ? window.SheetsSync.getPharmacistRates() : {};

      pharmacists.forEach(p => {
        const empShifts = schedule.filter(r => r.empId === p.id && r.date.startsWith(monthKey));
        const rateObj = pRatesMap[p.id] || { weekdayRate: p.hourlyRate || 35000, holidayRate: 40000, breakHours: 1.0 };
        const calc = window.LaborCalculator.calculatePharmacistPayroll(empShifts, rateObj.weekdayRate, rateObj.holidayRate, rateObj.breakHours);
        rows.push([p.name, p.role, rateObj.weekdayRate, rateObj.holidayRate, calc.totalNetHours, calc.weekdayNetHours, calc.holidayNetHours, calc.weekdayPay, calc.holidayPay, calc.totalPayroll]);
      });

      rows.push([]);
      rows.push(['[ 2. 일반직원 급여 정산표 ]']);
      rows.push(['직원명', '직무', '기준시급(원)', '기본월급(원)', '비과세 식대(원)', '초과수당(원)', '공제삭감(원)', '조정반영 세전총급여(원)']);

      const staffMembers = employees.filter(e => !e.role.includes('약사') && e.role !== '약국장');
      const allAdjustments = window.SheetsSync.getOvertimeAdjustments ? window.SheetsSync.getOvertimeAdjustments() : {};
      const monthAdj = allAdjustments[monthKey] || {};

      staffMembers.forEach(s => {
        const empShifts = schedule.filter(r => r.empId === s.id && r.date.startsWith(monthKey));
        const calc = window.LaborCalculator.calculateStaffPayroll(empShifts, s.hourlyRate || 13500);
        const empAdj = monthAdj[s.id] || { overtimePay: 0, deductionPay: 0 };
        const baseSal = s.baseMonthlySalary || 2621500;
        const total = baseSal + 200000 + (empAdj.overtimePay || 0) - (empAdj.deductionPay || 0);
        rows.push([s.name, s.position, s.hourlyRate || 13500, baseSal, 200000, empAdj.overtimePay || 0, empAdj.deductionPay || 0, total]);
      });

      rows.push([]);
      rows.push(['[ 3. 상세 일자별 근무 기록표 ]']);
      rows.push(['일자', '직원명', '직무', '근무구분', '출근시간', '퇴근시간', '휴게시간 차감']);
      schedule.filter(r => r.date.startsWith(monthKey)).forEach(r => {
        const emp = employees.find(e => e.id === r.empId);
        rows.push([r.date, emp ? emp.name : r.empId, emp ? emp.role : '', r.shift, r.startTime || '-', r.endTime || '-', `${r.breakHours || 1.0}시간`]);
      });

    } else if (activeModule === 'staff-directory') {
      filename = `365메가스타약국_직원명부.csv`;
      rows.push(['365메가스타약국 정식 직원 명부 (약국장 포함 9인)']);
      rows.push(['성명', '구분/직무', '직책', '급여유형', '입사일자', '약정시급/기본급', '연락처', '이메일 계정', '잔여연차', '비고']);
      employees.forEach(e => {
        rows.push([e.name, e.role, e.position, e.payType, e.joinDate, e.baseMonthlySalary || e.hourlyRate, e.phone, e.email, (15 - (e.usedLeave || 0)), e.memo]);
      });

    } else if (activeModule === 'annual-leave') {
      filename = `365메가스타약국_연차대장.csv`;
      rows.push(['365메가스타약국 연차 유급휴가 대장 (근로기준법 제60조)']);
      rows.push(['성명', '직무', '입사일자', '법정 총 연차일수', '사용 연차일수', '잔여 연차일수']);
      employees.forEach(e => {
        const calc = window.LaborCalculator.calculateStatutoryLeave(e.joinDate);
        rows.push([e.name, e.role, e.joinDate, calc.totalGranted, e.usedLeave || 0, (calc.totalGranted - (e.usedLeave || 0))]);
      });

      rows.push([]);
      rows.push(['[ 연차 신청 및 사용 상세 기록 ]']);
      rows.push(['신청일시', '직원명', '직무', '시작일', '종료일', '사용일수', '구분', '사유', '승인상태']);
      (data.leaveRequests || []).forEach(l => {
        rows.push([l.createdAt, l.empName, l.role, l.startDate, l.endDate, l.daysCount, l.type, l.reason, l.status]);
      });

    } else if (activeModule === 'discount-purchase') {
      filename = `365메가스타약국_직원할인구매대장.csv`;
      rows.push(['365메가스타약국 직원 할인 구매 정산 대장']);
      rows.push(['구매일시', '직원명', '품목명', '도매가(단가)', '수량', '결제 총금액']);
      (data.discountPurchases || []).forEach(d => {
        rows.push([d.dateStr, d.empName, d.itemName, d.unitPrice, d.qty, d.totalPrice]);
      });

    } else if (activeModule === 'notices') {
      filename = `365메가스타약국_공지사항및SOP.csv`;
      rows.push(['365메가스타약국 공지사항 & 업무 SOP 목록']);
      rows.push(['등록일자', '카테고리', '제목', '작성자', '상단고정여부', '내용']);
      (data.notices || []).forEach(n => {
        rows.push([n.date, n.category, n.title, n.author, n.isPinned ? '예' : '아니오', n.content.replace(/\n/g, ' ')]);
      });

    } else if (activeModule === 'worklog') {
      filename = `365메가스타약국_업무일지.csv`;
      rows.push(['365메가스타약국 약국 업무일지 & 인수인계 목록']);
      rows.push(['작성일자', '작성자', '구분', '업무 내용', '진행상태']);
      (data.worklogs || []).forEach(w => {
        rows.push([w.date, w.author, w.category, w.content, w.status]);
      });

    } else if (activeModule === 'emergency-contacts') {
      filename = `365메가스타약국_운영지원연락망.csv`;
      rows.push(['365메가스타약국 약국 운영 지원 연락망 Center']);
      rows.push(['구분', '담당자/기관명', '직통 연락처', '비고']);
      (data.emergencyContacts || []).forEach(c => {
        rows.push([c.category, c.name, c.phone, c.memo]);
      });

    } else if (activeModule === 'pharmacy-settlement') {
      filename = `365메가스타약국_스마트정산대시보드_2026년08월.csv`;
      const ps = data.pharmacySettlement || {};
      const dispensingFee = Number(ps.dispensingFee) || 18500000;
      const generalRevenue = Number(ps.generalRevenue || ps.posRevenue) || 24200000;
      const patientCopay = Number(ps.patientCopay) || 12000000;
      const nhisClaim = Number(ps.nhisClaim) || 18000000;
      const otherIncome = Number(ps.otherIncome) || 1800000;
      const totalRev = dispensingFee + generalRevenue + patientCopay + nhisClaim + otherIncome;
      const cardRev = Number(ps.cardRevenue) || Math.round(totalRev * 0.85);
      const cashRev = Number(ps.cashRevenue) || (totalRev - cardRev);

      rows.push(['365메가스타약국 스마트 정산 손익 대시보드']);
      rows.push(['산출년월', '2026년 08월']);
      rows.push([]);
      rows.push(['[ 1. 월간 손익 요약 (P&L Summary) ]']);
      rows.push(['수입 항목', '산출 설명', '금액(원)']);
      rows.push(['처방전 조제료 수입', '조제기술료 및 행위료', dispensingFee]);
      rows.push(['매장 일반매출', '일반의약품, 영양제, 의약외품', generalRevenue]);
      rows.push(['(세분화) 카드 수입', '신용/체크카드 결제 수납액', cardRev]);
      rows.push(['(세분화) 현금 수입', '현금 및 계좌이체 수납액', cashRev]);
      rows.push(['환자 본인부담금', '창구 직접 결제액', patientCopay]);
      rows.push(['국민건강보험공단 청구금', '공단 입금 요양급여비', nhisClaim]);
      rows.push(['비급여 및 기타수입', '비급여 주사제/제수입', otherIncome]);
      rows.push(['당월 총수입 합계', '', totalRev]);
      rows.push([]);
      rows.push(['[ 2. 2026년 8월 일일 결산 회계 장부 ]']);
      rows.push(['일자', '요일', '조제매출(원)', '일반매출(원)', '일총매출(원)', '카드수입액(원)', '현금수입액(원)', '일소액지출(원)', '비고']);
      (ps.dailyLogs || []).forEach(l => {
        rows.push([l.date, l.dayOfWeek, l.dispensingRevenue, l.posRevenue, l.totalRevenue, l.cardPay, l.cashPay, l.dailyExpense, l.note]);
      });

    } else if (activeModule === 'building-rental') {
      filename = `365메가스타타워_건물임대업_자산대장.csv`;
      const br = data.buildingRental || {};
      rows.push(['365메가스타 타워 건물 임대업 대시보드 자산 대장']);
      rows.push(['건물명', br.buildingName || '365메가스타 타워']);
      rows.push(['보유 자산가치', br.assetValue || 5500000000]);
      rows.push([]);
      rows.push(['[ 호실별 임대차 계약 대장 ]']);
      rows.push(['호실', '입주 상호명', '대표자명', '업종', '보증금(원)', '월 임대료(원)', '월 관리비(원)', '부가세 VAT(원)', '계약 시작일', '계약 만료일', '수납 상태', '비고']);
      (br.units || []).forEach(u => {
        rows.push([u.unit, u.tenantName, u.repName || '대표자', u.type, u.deposit, u.rent, u.maintenanceFee, u.vat || (u.rent * 0.1), u.startDate, u.endDate, u.status === 'PAID' ? '수납완료' : '당월미납', u.note]);
      });

    } else {
      filename = `365메가스타약국_${activeModule}.csv`;
      rows.push(['365메가스타약국 데이터 내보내기']);
      rows.push(['모듈', activeModule]);
      employees.forEach(e => {
        rows.push([e.name, e.role, e.email, e.phone]);
      });
    }

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`📊 현재 화면 [${MODULE_TITLES[activeModule] || activeModule}] 주요 데이터가 구글 스프레드시트 연동 전용 파일(${filename})로 다운로드되었습니다!`);
  }

  function openSheetModal() {
    downloadActiveModuleToGoogleSheets();
  }

  function closeSheetModal() {
    const modal = document.getElementById('sheet-modal');
    if (modal) modal.style.display = 'none';
  }

  function copyGasScriptCode() {
    const code = `// 365메가스타약국 구글 시트 100% 실시간 동기화 스크립트`;
    navigator.clipboard.writeText(code).then(() => {
      alert("📋 구글 시트 데이터 내보내기 기능이 실행되었습니다.");
    });
  }

  function openEmpModal() {
    if (window.StaffDirectoryModule && window.StaffDirectoryModule.openNewEmpModal) {
      window.StaffDirectoryModule.openNewEmpModal();
      return;
    }
    let modal = document.getElementById('new-emp-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'new-emp-modal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.style.zIndex = '9999999';
  }

  function saveNewEmployee(e) {
    e.preventDefault();
    const curr = window.SheetsSync.getCurrentUser();
    if (curr && curr.role !== '약국장' && curr.name !== '문성도') {
      alert('🔒 [권한 통제] 약국장님만 신규 직원을 등록할 수 있습니다.');
      return;
    }

    const name = document.getElementById('new-emp-name').value.trim();
    const role = document.getElementById('new-emp-role').value;
    const position = document.getElementById('new-emp-position').value.trim();
    const payType = document.getElementById('new-emp-paytype').value;
    const hourlyRate = parseInt(document.getElementById('new-emp-rate').value) || 35000;
    const baseMonthlySalary = parseInt(document.getElementById('new-emp-salary').value) || 2717000;
    const email = document.getElementById('new-emp-email').value.trim();
    const phone = document.getElementById('new-emp-phone').value.trim();
    const joinDate = document.getElementById('new-emp-joindate').value;
    const memo = document.getElementById('new-emp-memo').value.trim();

    const emps = window.SheetsSync.getEmployees() || [];
    
    if (emps.some(emp => emp.email === email || emp.username === email)) {
      alert('⚠️ 이미 등록된 이메일 계정이 존재합니다. 다른 이메일을 사용하세요.');
      return;
    }

    const ALL_COMMON_TABS = [
      'notices-module', 'worklog-module', 'schedule-module',
      'annual-leave-module', 'discount-purchase-module', 'rules-module', 'emergency-contacts-module'
    ];

    const newEmp = {
      id: 'emp_' + (emps.length + 1) + '_' + Date.now(),
      username: email,
      email: email,
      passcode: '1234',
      name: name,
      role: role,
      position: position,
      payType: payType,
      joinDate: joinDate,
      hourlyRate: hourlyRate,
      baseMonthlySalary: baseMonthlySalary,
      phone: phone,
      usedLeave: 0,
      pendingLeave: 0,
      memo: memo,
      allowedTabs: [...ALL_COMMON_TABS]
    };

    emps.push(newEmp);
    window.SheetsSync.saveEmployees(emps);

    if (role.includes('약사')) {
      const rates = window.SheetsSync.getPharmacistRates ? window.SheetsSync.getPharmacistRates() : {};
      rates[newEmp.id] = { weekdayRate: hourlyRate, holidayRate: Math.round(hourlyRate * 1.15), breakHours: 1.0 };
      if (window.SheetsSync.savePharmacistRates) window.SheetsSync.savePharmacistRates(rates);
    }

    document.getElementById('new-emp-modal').style.display = 'none';
    alert(`🎉 신규 직원 [${name} ${role}] 님의 계정 및 명부 등록이 완료되었습니다!\n(초기 비밀번호: 1234)`);
    
    if (window.StaffDirectoryModule) {
      window.StaffDirectoryModule.render('module-content');
    }
  }

  function openLeaveModal() {
    if (window.AnnualLeaveModule && window.AnnualLeaveModule.openLeaveModal) {
      window.AnnualLeaveModule.openLeaveModal();
    }
  }

  function submitLeaveRequest(e) {
    if (window.AnnualLeaveModule && window.AnnualLeaveModule.submitLeaveApplication) {
      window.AnnualLeaveModule.submitLeaveApplication(e);
    }
  }

  return {
    init,
    renderSidebarNavigation,
    renderUserHeader,
    quickSelectLogin,
    showLoginModal,
    closeLoginModal,
    handleLoginSubmit,
    userLogout,
    openChangePwModal,
    closeChangePwModal,
    checkPwRealtime,
    handleChangePwSubmit,
    switchModule,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    toggleTheme,
    downloadActiveModuleToGoogleSheets,
    openSheetModal,
    closeSheetModal,
    copyGasScriptCode,
    openEmpModal,
    saveNewEmployee,
    openLeaveModal,
    submitLeaveRequest,
    checkPendingRejectionNotice
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
