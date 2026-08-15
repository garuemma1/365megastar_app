/**
 * 9. 약국 운영 지원 연락망 모듈 컨트롤러 (Pharmacy Operations Support Hub v7.0)
 * 4대 탭(내부인력 / 의약품공급 / 전산·조제장비 / 소모품·시설관리)
 * - 내부인력: 직원명부(getEmployees) 100% 실시간 자동 동기화
 * - 의약품공급, 전산·조제장비, 소모품·시설관리: 카테고리별 업체 추가(Add) & 삭제(Delete) 지원
 */
window.EmergencyContactsModule = (function () {

  let activeTab = 'family'; // 'family', 'pharma', 'equipment', 'facilities'
  let staffRoleFilter = 'ALL'; // 'ALL', '약국장', '근무약사', '일반직원'
  let showAddForm = false; // 업체 추가 폼 열림 상태

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const data = window.SheetsSync.getEmergencyContacts() || {};
    const employees = window.SheetsSync.getEmployees() || [];
    const pharmaData = data.wholesalers || [];
    const equipmentData = data.equipment || data.support || [];
    const facilitiesData = data.facilities || [];

    const html = `
      <div class="module-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style="font-size:24px; font-weight:bold; color:var(--primary-color); margin-bottom:4px;">
            ☎️ 365메가스타약국 운영 지원 연락망 Center
          </h2>
          <p class="subtitle" style="color:var(--text-muted); font-size:14px; margin:0;">
            내부 인력(직원명부 실시간 동기화), 의약품 공급, 전산·조제장비 및 소모품·시설관리 업체 추가/삭제 관리
          </p>
        </div>
      </div>

      <!-- 📊 Lean-OPS KPI 4카드 -->
      <div class="mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); gap:10px;">
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bbf7d0; background:#f0fdf4; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#15803d;">내부 인력</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#dcfce7;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-users"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#15803d;font-family:'Outfit',sans-serif;">${employees.length}<span style="font-size:12px;"> 명</span></div>
          <div style="font-size:10.5px;color:#059669;">약국패밀리</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #bfdbfe; background:#eff6ff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#1e40af;">의약품 공급</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-pills"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#1d4ed8;font-family:'Outfit',sans-serif;">${pharmaData.length}<span style="font-size:12px;"> 개사</span></div>
          <div style="font-size:10.5px;color:#2563eb;">도매/제약사</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #e9d5ff; background:#faf5ff; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#6b21a8;">전산·장비</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#f3e8ff;color:#9333ea;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-laptop-medical"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#9333ea;font-family:'Outfit',sans-serif;">${equipmentData.length}<span style="font-size:12px;"> 개처</span></div>
          <div style="font-size:10.5px;color:#7c3aed;">조제장비</div>
        </div>
        <div class="kpi-summary-card p-3" style="border-radius:16px; border:1.5px solid #fde68a; background:#fffbeb; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span style="font-size:12px; font-weight:800; color:#92400e;">시설 관리</span>
            <div style="width:24px;height:24px;border-radius:6px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fas fa-building"></i></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:#d97706;font-family:'Outfit',sans-serif;">${facilitiesData.length}<span style="font-size:12px;"> 개처</span></div>
          <div style="font-size:10.5px;color:#b45309;">소모품/시설</div>
        </div>
      </div>

      <!-- 상단 4대 카테고리 전용 탭 네비게이션 바 -->
      <div class="emergency-tabs-bar mb-4" style="display:flex; gap:8px; border-bottom:2px solid #e2e8f0; padding-bottom:12px; flex-wrap:wrap;">
        <button type="button" class="tab-nav-btn ${activeTab === 'family' ? 'active' : ''}" onclick="EmergencyContactsModule.setActiveTab('family')" style="${getTabBtnStyle(activeTab === 'family', 'family')}">
          <i class="fas fa-users"></i> 👥 1. 내부인력(약국패밀리) <span class="badge ${activeTab === 'family' ? 'bg-white text-emerald' : 'bg-secondary'}" style="margin-left:4px; font-size:11px;">${employees.length}인</span>
        </button>

        <button type="button" class="tab-nav-btn ${activeTab === 'pharma' ? 'active' : ''}" onclick="EmergencyContactsModule.setActiveTab('pharma')" style="${getTabBtnStyle(activeTab === 'pharma', 'pharma')}">
          <i class="fas fa-pills"></i> 🏭 2. 의약품 공급 (도매/제약) <span class="badge ${activeTab === 'pharma' ? 'bg-white text-blue' : 'bg-secondary'}" style="margin-left:4px; font-size:11px;">${pharmaData.length}개사</span>
        </button>

        <button type="button" class="tab-nav-btn ${activeTab === 'equipment' ? 'active' : ''}" onclick="EmergencyContactsModule.setActiveTab('equipment')" style="${getTabBtnStyle(activeTab === 'equipment', 'equipment')}">
          <i class="fas fa-laptop-medical"></i> 💻 3. 전산 및 조제 장비 <span class="badge ${activeTab === 'equipment' ? 'bg-white text-purple' : 'bg-secondary'}" style="margin-left:4px; font-size:11px;">${equipmentData.length}개처</span>
        </button>

        <button type="button" class="tab-nav-btn ${activeTab === 'facilities' ? 'active' : ''}" onclick="EmergencyContactsModule.setActiveTab('facilities')" style="${getTabBtnStyle(activeTab === 'facilities', 'facilities')}">
          <i class="fas fa-building font-bold"></i> 🏬 4. 소모품 및 시설 관리 <span class="badge ${activeTab === 'facilities' ? 'bg-white text-amber' : 'bg-secondary'}" style="margin-left:4px; font-size:11px;">${facilitiesData.length}개처</span>
        </button>
      </div>

      <!-- 선택된 탭별 본문 섹션 -->
      <div class="tab-content-container">
        ${activeTab === 'family' ? renderFamilyTab(employees) : ''}
        ${activeTab === 'pharma' ? renderPharmaTab(pharmaData) : ''}
        ${activeTab === 'equipment' ? renderEquipmentTab(equipmentData) : ''}
        ${activeTab === 'facilities' ? renderFacilitiesTab(facilitiesData) : ''}
      </div>
    `;

    container.innerHTML = html;
  }

  function getTabBtnStyle(isActive, tabType) {
    if (isActive) {
      if (tabType === 'family') return 'background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#ffffff; font-weight:bold; border-radius:14px; padding:11px 16px; font-size:14px; border:none; box-shadow:0 4px 12px rgba(5,150,105,0.3); cursor:pointer; flex:1; min-width:160px; text-align:center;';
      if (tabType === 'pharma') return 'background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#ffffff; font-weight:bold; border-radius:14px; padding:11px 16px; font-size:14px; border:none; box-shadow:0 4px 12px rgba(2,132,199,0.3); cursor:pointer; flex:1; min-width:160px; text-align:center;';
      if (tabType === 'equipment') return 'background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color:#ffffff; font-weight:bold; border-radius:14px; padding:11px 16px; font-size:14px; border:none; box-shadow:0 4px 12px rgba(124,58,237,0.3); cursor:pointer; flex:1; min-width:160px; text-align:center;';
      if (tabType === 'facilities') return 'background:linear-gradient(135deg, #d97706 0%, #b45309 100%); color:#ffffff; font-weight:bold; border-radius:14px; padding:11px 16px; font-size:14px; border:none; box-shadow:0 4px 12px rgba(217,119,6,0.3); cursor:pointer; flex:1; min-width:160px; text-align:center;';
    }
    return 'background:#ffffff; color:#64748b; font-weight:600; border-radius:14px; padding:11px 14px; font-size:13.5px; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05); cursor:pointer; flex:1; min-width:160px; text-align:center;';
  }

  function setActiveTab(tabName) {
    activeTab = tabName;
    showAddForm = false;
    render('module-content');
  }

  function setStaffRoleFilter(role) {
    staffRoleFilter = role;
    render('module-content');
  }

  function toggleAddForm(forceState) {
    showAddForm = forceState !== undefined ? forceState : !showAddForm;
    render('module-content');
  }

  /* [카테고리 1] 👥 1. 약국모든직원연락처 (직원명부 getEmployees 100% 실시간 연동) */
  function renderFamilyTab(employees) {
    const filtered = staffRoleFilter === 'ALL' ? employees : employees.filter(s => s.role === staffRoleFilter);
    const directorList = filtered.filter(s => s.role === '약국장');
    const pharmList = filtered.filter(s => s.role === '근무약사');
    const generalStaffList = filtered.filter(s => s.role === '일반직원');

    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <div>
            <h3 style="font-size:18px; font-weight:bold; color:#065f46; margin:0;">
              <i class="fas fa-users text-emerald"></i> 👥 내부인력 (약국패밀리) (총 ${employees.length}명)
            </h3>
            <span class="text-muted" style="font-size:13px;">
              <i class="fas fa-sync-alt text-success"></i> [👥 직원 명부] 실시간 자동 연동 — 대표약국장, 약사진(근무약사) 및 일반직원
            </span>
          </div>

          <div class="d-flex gap-1 flex-wrap">
            <button type="button" class="btn btn-sm ${staffRoleFilter === 'ALL' ? 'btn-emerald font-bold' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('ALL')" style="border-radius:10px; padding:5px 12px; font-size:12px;">전체 보기 (${employees.length}명)</button>
            <button type="button" class="btn btn-sm ${staffRoleFilter === '약국장' ? 'btn-danger font-bold' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('약국장')" style="border-radius:10px; padding:5px 12px; font-size:12px;">👑 대표약국장</button>
            <button type="button" class="btn btn-sm ${staffRoleFilter === '근무약사' ? 'btn-primary font-bold' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('근무약사')" style="border-radius:10px; padding:5px 12px; font-size:12px;">👨‍⚕️ 약사진 (근무약사)</button>
            <button type="button" class="btn btn-sm ${staffRoleFilter === '일반직원' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('일반직원')" style="border-radius:10px; padding:5px 12px; font-size:12px;">👨‍💼 일반직원 팀</button>
          </div>
        </div>

        ${directorList.length > 0 ? `
          <div class="sub-category-section mb-4">
            <h4 style="font-size:15px; font-weight:bold; color:#dc2626; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-crown"></i> 👑 대표약국장 (총괄 및 24시간 비상 긴급 대응)
            </h4>
            <div class="row g-3">
              ${directorList.map(s => renderStaffCard(s)).join('')}
            </div>
          </div>
        ` : ''}

        ${pharmList.length > 0 ? `
          <div class="sub-category-section mb-4">
            <h4 style="font-size:15px; font-weight:bold; color:#2563eb; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-user-md"></i> 👨‍⚕️ 약사진 (조제료 / DUR / 야간조제 / 신약검수)
            </h4>
            <div class="row g-3">
              ${pharmList.map(s => renderStaffCard(s)).join('')}
            </div>
          </div>
        ` : ''}

        ${generalStaffList.length > 0 ? `
          <div class="sub-category-section">
            <h4 style="font-size:15px; font-weight:bold; color:#059669; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-user-nurse"></i> 👨‍💼 일반직원 팀 (약국전산 / ATC조제기 / 매장관리 / 조제보조)
            </h4>
            <div class="row g-3">
              ${generalStaffList.map(s => renderStaffCard(s)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderStaffCard(s) {
    const isDirector = s.role === '약국장';
    const isPharm = s.role === '근무약사';
    const badgeBg = isDirector ? '#dc2626' : isPharm ? '#2563eb' : '#059669';
    const phone = s.phone || '010-3679-0000';

    return `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="p-3 shadow-sm" style="background:${isDirector ? '#fef2f2' : isPharm ? '#eff6ff' : '#f0fdf4'}; border-radius:16px; border:1.5px solid ${isDirector ? '#fecdd3' : isPharm ? '#bfdbfe' : '#bbf7d0'}; position:relative;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong style="font-size:17px; color:#0f172a;">${s.name}</strong>
              <span class="badge" style="background:${badgeBg}; color:#fff; font-size:11px; margin-left:6px; padding:4px 8px; border-radius:12px;">${s.role}</span>
            </div>
            <a href="tel:${phone}" class="btn btn-sm font-bold" style="background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#fff; border-radius:20px; font-size:12px; padding:6px 14px; box-shadow:0 2px 6px rgba(5,150,105,0.25);">
              <i class="fas fa-phone-alt"></i> 📞 1초 직통 전화
            </a>
          </div>
          <div style="font-size:13.5px; color:#334155; margin-bottom:6px;">
            <i class="fas fa-briefcase text-muted"></i> 상세 직책: <strong>${s.position || s.dept || '직원'}</strong>
          </div>
          <div style="font-size:15px; font-weight:bold; color:${badgeBg}; margin-bottom:8px;">
            <i class="fas fa-mobile-alt"></i> <a href="tel:${phone}" style="color:inherit; text-decoration:none;">${phone}</a>
          </div>
          <div style="font-size:12.5px; color:#475569; background:#ffffff; padding:8px 12px; border-radius:10px; border:1px solid #e2e8f0;">
            💡 ${s.memo || s.notes || '약국 운영 및 인수인계'}
          </div>
        </div>
      </div>
    `;
  }

  /* [카테고리 2] 🏭 2. 의약품 공급 (도매상 / 제약사 직거래 - 업체 추가/삭제 포함) */
  function renderPharmaTab(pharmaList) {
    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <div>
            <h3 style="font-size:18px; font-weight:bold; color:#0369a1; margin:0;">
              <i class="fas fa-truck-loading text-blue"></i> 🏭 의약품 공급 (도매상 & 제약사 직거래)
            </h3>
            <span class="text-muted" style="font-size:13px;">의약품 공급업체 전용 연락망 (신규 업체 추가 및 삭제 기능 탑재)</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary font-bold shadow-sm" onclick="EmergencyContactsModule.toggleAddForm()" style="border-radius:12px; padding:8px 18px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:none;">
            <i class="fas ${showAddForm ? 'fa-times' : 'fa-plus'}"></i> ${showAddForm ? '닫기' : '➕ 신규 업체 등록'}
          </button>
        </div>

        ${showAddForm ? renderAddVendorForm('pharma') : ''}

        <div class="row g-3">
          ${pharmaList.map((item, idx) => renderVendorCard('pharma', item, idx)).join('')}
        </div>
      </div>
    `;
  }

  /* [카테고리 3] 💻 3. 전산 및 조제 장비 (ATC/PharmIT3000/POS/PC프린터 - 업체 추가/삭제 포함) */
  function renderEquipmentTab(equipmentList) {
    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <div>
            <h3 style="font-size:18px; font-weight:bold; color:#6d28d9; margin:0;">
              <i class="fas fa-laptop-medical text-purple"></i> 💻 전산 및 조제 장비 (시스템/장비 지원)
            </h3>
            <span class="text-muted" style="font-size:13px;">ATC/포장기, 약국 전산(PharmIT3000), 카드단말기(POS) 및 PC/프린터 유지보수 업체</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary font-bold shadow-sm" onclick="EmergencyContactsModule.toggleAddForm()" style="border-radius:12px; padding:8px 18px; background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); border:none;">
            <i class="fas ${showAddForm ? 'fa-times' : 'fa-plus'}"></i> ${showAddForm ? '닫기' : '➕ 신규 장비업체 등록'}
          </button>
        </div>

        ${showAddForm ? renderAddVendorForm('equipment') : ''}

        <div class="row g-3">
          ${equipmentList.map((item, idx) => renderVendorCard('equipment', item, idx)).join('')}
        </div>
      </div>
    `;
  }

  /* [카테고리 4] 🏬 4. 소모품 및 시설 관리 (조은봉투/건물관리/보안캡스/폐기물 - 업체 추가/삭제 포함) */
  function renderFacilitiesTab(facilitiesList) {
    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <div>
            <h3 style="font-size:18px; font-weight:bold; color:#b45309; margin:0;">
              <i class="fas fa-building text-amber"></i> 🏬 소모품 및 시설 관리 (시설/운영 지원)
            </h3>
            <span class="text-muted" style="font-size:13px;">조은봉투(소모품), 건물 관리사무소, ADT캡스/세스코 보안 및 의료폐기물 수거</span>
          </div>
          <button type="button" class="btn btn-sm btn-warning text-dark font-bold shadow-sm" onclick="EmergencyContactsModule.toggleAddForm()" style="border-radius:12px; padding:8px 18px; background:#f59e0b; border:none;">
            <i class="fas ${showAddForm ? 'fa-times' : 'fa-plus'}"></i> ${showAddForm ? '닫기' : '➕ 신규 시설업체 등록'}
          </button>
        </div>

        ${showAddForm ? renderAddVendorForm('facilities') : ''}

        <div class="row g-3">
          ${facilitiesList.map((item, idx) => renderVendorCard('facilities', item, idx)).join('')}
        </div>
      </div>
    `;
  }

  /* 깔끔 명료한 신규 업체 등록 폼 */
  function renderAddVendorForm(tabType) {
    const isPharma = tabType === 'pharma';
    const isEquip = tabType === 'equipment';
    const borderColor = isPharma ? '#0284c7' : isEquip ? '#7c3aed' : '#d97706';
    const bgColor = isPharma ? '#f0f9ff' : isEquip ? '#f5f3ff' : '#fffbeb';

    return `
      <div class="card p-3 mb-4 shadow-sm" style="border-radius:16px; border:2px solid ${borderColor}; background:${bgColor};">
        <h4 style="font-size:16px; font-weight:bold; color:${borderColor}; margin-bottom:14px;">
          <i class="fas fa-plus-circle"></i> ➕ 신규 업체 / 연락처 등록 폼
        </h4>
        <form onsubmit="EmergencyContactsModule.saveNewVendor(event, '${tabType}')">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">업체 / 기관명</label>
              <input type="text" id="vendor-name" class="form-control font-bold" placeholder="예: 지오영 / JVM / 조은봉투" required style="border-radius:10px; padding:9px 12px;">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">구분 / 카테고리</label>
              <input type="text" id="vendor-category" class="form-control" placeholder="${isPharma ? '예: 도매상 또는 제약사 직거래' : isEquip ? '예: ATC/포장기, 약국전산, 카드단말기' : '예: 소모품, 건물관리, 보안방제'}" required style="border-radius:10px; padding:9px 12px;">
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">담당자 이름 / 직함</label>
              <input type="text" id="vendor-rep" class="form-control" placeholder="예: 김지오 팀장" style="border-radius:10px; padding:9px 12px;">
            </div>
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">직통 전화번호</label>
              <input type="text" id="vendor-phone" class="form-control font-bold" placeholder="예: 010-1234-5678 또는 1588-0000" required style="border-radius:10px; padding:9px 12px;">
            </div>
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">마감/운영시간</label>
              <input type="text" id="vendor-cutoff" class="form-control" placeholder="예: 오후 5:30 마감 / 24시간" style="border-radius:10px; padding:9px 12px;">
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label font-bold" style="font-size:13px; color:#334155;">취급품목 / 메모</label>
            <input type="text" id="vendor-notes" class="form-control" placeholder="주요 취급품목 및 긴급 A/S 처리 안내..." style="border-radius:10px; padding:9px 12px;">
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-secondary" onclick="EmergencyContactsModule.toggleAddForm(false)" style="border-radius:10px; padding:7px 16px;">취소</button>
            <button type="submit" class="btn btn-sm btn-success font-bold" style="border-radius:10px; padding:7px 20px; background:#059669;"><i class="fas fa-check"></i> 업체 등록 완료</button>
          </div>
        </form>
      </div>
    `;
  }

  /* 개별 업체 카드 & 깔끔한 삭제 버튼 지원 */
  function renderVendorCard(tabType, item, idx) {
    const isPharma = tabType === 'pharma';
    const isEquip = tabType === 'equipment';
    const borderColor = isPharma ? '#0284c7' : isEquip ? '#7c3aed' : '#d97706';
    const titleColor = isPharma ? '#0369a1' : isEquip ? '#5b21b6' : '#92400e';
    const bgColor = isPharma ? '#f0f9ff' : isEquip ? '#f5f3ff' : '#fffbeb';
    const categoryBadge = item.category || item.type || '운영지원';
    const cutoffText = item.cutoff || item.notes || '상시 운영';

    return `
      <div class="col-lg-6 col-12">
        <div class="p-3 shadow-sm" style="background:${bgColor}; border-radius:16px; border-left:5px solid ${borderColor}; border-top:1px solid #e2e8f0; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; position:relative;">
          <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
            <div>
              <span class="badge mb-1" style="background:${borderColor}; color:#fff; font-size:11px; padding:4px 8px; border-radius:6px;">${categoryBadge}</span>
              <h4 style="font-size:17px; font-weight:bold; margin:0; color:${titleColor};">${item.name}</h4>
            </div>
            
            <div class="d-flex align-items-center gap-2">
              <a href="tel:${item.phone}" class="btn btn-sm font-bold" style="background:linear-gradient(135deg, ${borderColor} 0%, #1e293b 100%); color:#fff; border-radius:20px; font-size:12px; padding:6px 14px; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                <i class="fas fa-phone-alt"></i> 📞 1초 직통 전화
              </a>
              <button type="button" class="btn btn-xs btn-outline-danger" onclick="EmergencyContactsModule.deleteVendor('${tabType}', ${idx}, '${item.name}')" title="업체 삭제" style="border-radius:14px; padding:4px 8px; font-size:11px;">
                <i class="fas fa-trash-alt"></i> 삭제
              </button>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2 mb-2 flex-wrap" style="font-size:13px; color:#334155;">
            ${item.repName ? `<span>담당자: <strong>${item.repName}</strong></span>` : ''}
            <span class="badge" style="background:#ffffff; color:#334155; border:1px solid #cbd5e1; font-size:11.5px; padding:3px 8px; border-radius:6px;">
              <i class="far fa-clock"></i> ${cutoffText}
            </span>
          </div>

          <div style="font-size:14.5px; font-weight:bold; color:${titleColor}; margin-bottom:6px;">
            <i class="fas fa-phone"></i> <a href="tel:${item.phone}" style="color:inherit; text-decoration:none;">${item.phone}</a>
          </div>

          <div style="font-size:12.5px; color:#475569; background:#ffffff; padding:7px 10px; border-radius:10px; border:1px solid #e2e8f0;">
            📦 메모: ${item.items || item.notes || '약국 운영 지원 연락처'}
          </div>
        </div>
      </div>
    `;
  }

  /* 신규 업체 저장 처리 */
  function saveNewVendor(e, tabType) {
    if (e) e.preventDefault();

    const name = document.getElementById('vendor-name').value.trim();
    const category = document.getElementById('vendor-category').value.trim();
    const repName = document.getElementById('vendor-rep').value.trim();
    const phone = document.getElementById('vendor-phone').value.trim();
    const cutoff = document.getElementById('vendor-cutoff').value.trim();
    const notes = document.getElementById('vendor-notes').value.trim();

    if (!name || !phone) {
      alert('⚠️ 업체명과 직통 전화번호는 필수 입력 항목입니다.');
      return;
    }

    const data = window.SheetsSync.getEmergencyContacts() || { staff: [], wholesalers: [], equipment: [], facilities: [] };

    const newVendor = {
      name: name,
      category: category || '운영지원',
      type: category || '운영지원',
      repName: repName || '담당자',
      phone: phone,
      cutoff: cutoff || '상시 운영',
      items: notes || '약국 운영 지원',
      notes: notes || '약국 운영 지원'
    };

    if (tabType === 'pharma') {
      if (!data.wholesalers) data.wholesalers = [];
      data.wholesalers.push(newVendor);
    } else if (tabType === 'equipment') {
      if (!data.equipment) data.equipment = [];
      data.equipment.push(newVendor);
    } else if (tabType === 'facilities') {
      if (!data.facilities) data.facilities = [];
      data.facilities.push(newVendor);
    }

    window.SheetsSync.saveEmergencyContacts(data);
    showAddForm = false;

    alert(`🎉 신규 업체 [${name}] 연락처가 성공적으로 등록되었습니다!`);
    render('module-content');
  }

  /* 업체 삭제 처리 */
  function deleteVendor(tabType, idx, vendorName) {
    if (!confirm(`'${vendorName}' 업체를 운영지원연락망에서 삭제하시겠습니까?`)) {
      return;
    }

    const data = window.SheetsSync.getEmergencyContacts() || {};

    if (tabType === 'pharma' && data.wholesalers) {
      data.wholesalers.splice(idx, 1);
    } else if (tabType === 'equipment' && data.equipment) {
      data.equipment.splice(idx, 1);
    } else if (tabType === 'facilities' && data.facilities) {
      data.facilities.splice(idx, 1);
    }

    window.SheetsSync.saveEmergencyContacts(data);
    alert(`🗑️ '${vendorName}' 업체가 성공적으로 삭제되었습니다.`);
    render('module-content');
  }

  return {
    render,
    setActiveTab,
    setStaffRoleFilter,
    toggleAddForm,
    saveNewVendor,
    deleteVendor
  };
})();
