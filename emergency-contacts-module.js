/**
 * 9. 약국 운영 지원 연락망 모듈 컨트롤러 (Pharmacy Operations Support Hub)
 * [업데이트] 최고급 카드-탭 일체형 UI, 불필요 버튼 삭제 및 상단 스마트폰 자동연결 안내 배너 적용
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
      <div class="module-header d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:#0f172a; margin-bottom:4px; letter-spacing:-0.5px;">
            ☎️ 365메가스타약국 운영 지원 연락망 Center
          </h2>
          <p class="subtitle" style="color:#64748b; font-size:14px; margin:0;">
            내부 인력(직원명부 실시간 동기화), 의약품 공급, 전산·조제장비 및 소모품·시설관리 업체 추가/삭제 관리
          </p>
        </div>
      </div>

      <!-- ★ 새롭게 추가된 깔끔한 전화 연결 안내 배너 (선택하신 B옵션) -->
      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
        <div style="width:36px; height:36px; border-radius:10px; background:#e0f2fe; color:#0284c7; display:flex; justify-content:center; align-items:center; font-size:18px; flex-shrink:0;">
          <i class="fas fa-info-circle"></i>
        </div>
        <div style="font-size:14px; color:#0f172a; line-height:1.5;">
          <strong style="color:#0284c7;">📞 빠른 전화 연결:</strong> 하단의 각 담당자 <strong>연락처 번호(파란색 글씨)를 누르시면</strong> 스마트폰 통화 화면으로 즉시 자동 연결됩니다.
        </div>
      </div>

      <!-- ★ 핵심 개조: KPI 카드를 클릭 가능한 탭 버튼으로 일체화 (공간 절약 및 UX 극대화) -->
      <div class="mb-4" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px;">
        
        <!-- 1. 내부 인력 카드 (클릭 시 탭 이동) -->
        <div onclick="EmergencyContactsModule.setActiveTab('family')" 
             style="cursor:pointer; border-radius:18px; padding:20px; transition:all 0.2s; background:#f0fdf4; border:2px solid ${activeTab === 'family' ? '#16a34a' : '#bbf7d0'}; box-shadow:${activeTab === 'family' ? '0 8px 20px rgba(22,163,74,0.15)' : 'none'}; transform:${activeTab === 'family' ? 'translateY(-3px)' : 'none'}; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span style="font-size:14px; font-weight:800; color:#15803d;">1. 내부 인력</span>
            <div style="width:32px;height:32px;border-radius:10px;background:#dcfce7;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="fas fa-users"></i></div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#15803d;">${employees.length}<span style="font-size:14px; font-weight:600;"> 명</span></div>
          <div style="font-size:12px;color:#059669;font-weight:600;margin-top:4px;">약국패밀리 (실시간)</div>
        </div>

        <!-- 2. 의약품 공급 카드 -->
        <div onclick="EmergencyContactsModule.setActiveTab('pharma')" 
             style="cursor:pointer; border-radius:18px; padding:20px; transition:all 0.2s; background:#eff6ff; border:2px solid ${activeTab === 'pharma' ? '#2563eb' : '#bfdbfe'}; box-shadow:${activeTab === 'pharma' ? '0 8px 20px rgba(37,99,235,0.15)' : 'none'}; transform:${activeTab === 'pharma' ? 'translateY(-3px)' : 'none'}; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span style="font-size:14px; font-weight:800; color:#1e40af;">2. 의약품 공급</span>
            <div style="width:32px;height:32px;border-radius:10px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="fas fa-pills"></i></div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#1d4ed8;">${pharmaData.length}<span style="font-size:14px; font-weight:600;"> 개사</span></div>
          <div style="font-size:12px;color:#2563eb;font-weight:600;margin-top:4px;">도매 / 제약사</div>
        </div>

        <!-- 3. 전산 장비 카드 -->
        <div onclick="EmergencyContactsModule.setActiveTab('equipment')" 
             style="cursor:pointer; border-radius:18px; padding:20px; transition:all 0.2s; background:#faf5ff; border:2px solid ${activeTab === 'equipment' ? '#9333ea' : '#e9d5ff'}; box-shadow:${activeTab === 'equipment' ? '0 8px 20px rgba(147,51,234,0.15)' : 'none'}; transform:${activeTab === 'equipment' ? 'translateY(-3px)' : 'none'}; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span style="font-size:14px; font-weight:800; color:#6b21a8;">3. 전산 및 장비</span>
            <div style="width:32px;height:32px;border-radius:10px;background:#f3e8ff;color:#9333ea;display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="fas fa-laptop-medical"></i></div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#9333ea;">${equipmentData.length}<span style="font-size:14px; font-weight:600;"> 개처</span></div>
          <div style="font-size:12px;color:#7c3aed;font-weight:600;margin-top:4px;">ATC / POS / 전산</div>
        </div>

        <!-- 4. 시설 관리 카드 -->
        <div onclick="EmergencyContactsModule.setActiveTab('facilities')" 
             style="cursor:pointer; border-radius:18px; padding:20px; transition:all 0.2s; background:#fffbeb; border:2px solid ${activeTab === 'facilities' ? '#d97706' : '#fde68a'}; box-shadow:${activeTab === 'facilities' ? '0 8px 20px rgba(217,119,6,0.15)' : 'none'}; transform:${activeTab === 'facilities' ? 'translateY(-3px)' : 'none'}; display:flex; flex-direction:column; justify-content:space-between;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span style="font-size:14px; font-weight:800; color:#92400e;">4. 시설 및 소모품</span>
            <div style="width:32px;height:32px;border-radius:10px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="fas fa-building"></i></div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#d97706;">${facilitiesData.length}<span style="font-size:14px; font-weight:600;"> 개처</span></div>
          <div style="font-size:12px;color:#b45309;font-weight:600;margin-top:4px;">봉투 / 방범 / 폐기물</div>
        </div>
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

  /* [카테고리 1] 👥 1. 약국모든직원연락처 */
  function renderFamilyTab(employees) {
    const filtered = staffRoleFilter === 'ALL' ? employees : employees.filter(s => s.role === staffRoleFilter);
    const directorList = filtered.filter(s => s.role === '약국장');
    const pharmList = filtered.filter(s => s.role === '근무약사');
    const generalStaffList = filtered.filter(s => s.role === '일반직원');

    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <div>
            <h3 style="font-size:19px; font-weight:800; color:#065f46; margin:0; letter-spacing:-0.5px;">
              <i class="fas fa-users text-emerald me-1"></i> 내부인력 (약국패밀리 명부)
            </h3>
            <span class="text-muted" style="font-size:13px;">
              <i class="fas fa-sync-alt text-success me-1"></i>직원 명부 데이터가 실시간 자동 연동됩니다.
            </span>
          </div>

          <div class="d-flex gap-1 flex-wrap">
            <button type="button" class="btn btn-sm ${staffRoleFilter === 'ALL' ? 'btn-success font-bold text-white' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('ALL')" style="border-radius:10px; padding:6px 14px;">전체 보기 (${employees.length}명)</button>
            <button type="button" class="btn btn-sm ${staffRoleFilter === '약국장' ? 'btn-danger font-bold text-white' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('약국장')" style="border-radius:10px; padding:6px 14px;">👑 대표약국장</button>
            <button type="button" class="btn btn-sm ${staffRoleFilter === '근무약사' ? 'btn-primary font-bold text-white' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('근무약사')" style="border-radius:10px; padding:6px 14px;">👨‍⚕️ 약사진</button>
            <button type="button" class="btn btn-sm ${staffRoleFilter === '일반직원' ? 'btn-success font-bold text-white' : 'btn-outline-secondary'}" onclick="EmergencyContactsModule.setStaffRoleFilter('일반직원')" style="border-radius:10px; padding:6px 14px;">👨‍💼 일반직원</button>
          </div>
        </div>

        ${directorList.length > 0 ? `
          <div class="sub-category-section mb-5">
            <h4 style="font-size:15px; font-weight:800; color:#dc2626; margin-bottom:14px;"><i class="fas fa-crown me-1"></i> 대표약국장 (총괄 및 긴급 대응)</h4>
            <div class="row g-3">${directorList.map(s => renderStaffCard(s)).join('')}</div>
          </div>
        ` : ''}

        ${pharmList.length > 0 ? `
          <div class="sub-category-section mb-5">
            <h4 style="font-size:15px; font-weight:800; color:#2563eb; margin-bottom:14px;"><i class="fas fa-user-md me-1"></i> 약사진 (조제료 / 야간조제 / 신약검수)</h4>
            <div class="row g-3">${pharmList.map(s => renderStaffCard(s)).join('')}</div>
          </div>
        ` : ''}

        ${generalStaffList.length > 0 ? `
          <div class="sub-category-section">
            <h4 style="font-size:15px; font-weight:800; color:#059669; margin-bottom:14px;"><i class="fas fa-user-nurse me-1"></i> 일반직원 팀 (전산 / 조제보조 / 매장관리)</h4>
            <div class="row g-3">${generalStaffList.map(s => renderStaffCard(s)).join('')}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ★ 1초 직통 전화 버튼이 제거되고 깔끔해진 내부 인력 카드
  function renderStaffCard(s) {
    const isDirector = s.role === '약국장';
    const isPharm = s.role === '근무약사';
    const badgeBg = isDirector ? '#dc2626' : isPharm ? '#2563eb' : '#059669';
    const phone = s.phone || '010-0000-0000';

    return `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="p-4 shadow-sm" style="background:${isDirector ? '#fef2f2' : isPharm ? '#eff6ff' : '#f0fdf4'}; border-radius:18px; border:1px solid ${isDirector ? '#fecdd3' : isPharm ? '#bfdbfe' : '#bbf7d0'}; height:100%;">
          <div class="d-flex align-items-center mb-3">
            <div style="width:40px; height:40px; border-radius:50%; background:#ffffff; display:flex; justify-content:center; align-items:center; font-size:18px; color:${badgeBg}; margin-right:12px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
              <i class="fas ${isDirector ? 'fa-crown' : isPharm ? 'fa-user-md' : 'fa-user'}"></i>
            </div>
            <div>
              <strong style="font-size:17px; font-weight:800; color:#0f172a;">${s.name}</strong>
              <span class="badge ms-1" style="background:${badgeBg}; color:#fff; font-size:11px; padding:4px 8px; border-radius:12px;">${s.role}</span>
            </div>
          </div>
          
          <div style="font-size:13.5px; color:#475569; margin-bottom:8px; font-weight:600;">
            <i class="fas fa-briefcase text-muted me-1"></i> ${s.position || s.dept || '담당직원'}
          </div>
          
          <!-- 파란색 번호 텍스트. 클릭 시 바로 전화 걸림 -->
          <div style="margin-bottom:12px;">
            <a href="tel:${phone}" style="display:inline-flex; align-items:center; gap:8px; font-size:18px; font-weight:800; color:#2563eb; text-decoration:none; background:#ffffff; padding:6px 14px; border-radius:12px; border:1px solid #bfdbfe; transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'">
              <i class="fas fa-phone-alt" style="font-size:14px;"></i> ${phone}
            </a>
          </div>

          <div style="font-size:13px; color:#64748b; background:#ffffff; padding:10px 14px; border-radius:12px; border:1px solid #e2e8f0; line-height:1.5;">
            💡 ${s.memo || s.notes || '약국 운영 및 인수인계 지원'}
          </div>
        </div>
      </div>
    `;
  }

  /* [카테고리 2] 🏭 2. 의약품 공급 */
  function renderPharmaTab(pharmaList) {
    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <h3 style="font-size:19px; font-weight:800; color:#0369a1; margin:0;"><i class="fas fa-truck-loading text-blue me-1"></i> 의약품 공급 (도매상 & 제약사)</h3>
          <button type="button" class="btn btn-sm btn-primary font-bold shadow-sm" onclick="EmergencyContactsModule.toggleAddForm()" style="border-radius:12px; padding:8px 18px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:none;">
            <i class="fas ${showAddForm ? 'fa-times' : 'fa-plus'} me-1"></i> ${showAddForm ? '닫기' : '신규 업체 등록'}
          </button>
        </div>
        ${showAddForm ? renderAddVendorForm('pharma') : ''}
        <div class="row g-3">${pharmaList.map((item, idx) => renderVendorCard('pharma', item, idx)).join('')}</div>
      </div>
    `;
  }

  /* [카테고리 3] 💻 3. 전산 및 조제 장비 */
  function renderEquipmentTab(equipmentList) {
    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <h3 style="font-size:19px; font-weight:800; color:#6d28d9; margin:0;"><i class="fas fa-laptop-medical text-purple me-1"></i> 전산 및 조제 장비 유지보수</h3>
          <button type="button" class="btn btn-sm btn-primary font-bold shadow-sm" onclick="EmergencyContactsModule.toggleAddForm()" style="border-radius:12px; padding:8px 18px; background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); border:none;">
            <i class="fas ${showAddForm ? 'fa-times' : 'fa-plus'} me-1"></i> ${showAddForm ? '닫기' : '신규 장비업체 등록'}
          </button>
        </div>
        ${showAddForm ? renderAddVendorForm('equipment') : ''}
        <div class="row g-3">${equipmentList.map((item, idx) => renderVendorCard('equipment', item, idx)).join('')}</div>
      </div>
    `;
  }

  /* [카테고리 4] 🏬 4. 소모품 및 시설 관리 */
  function renderFacilitiesTab(facilitiesList) {
    return `
      <div class="card p-4 mb-4" style="border-radius:20px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 border-bottom pb-3">
          <h3 style="font-size:19px; font-weight:800; color:#b45309; margin:0;"><i class="fas fa-building text-amber me-1"></i> 시설 및 소모품 지원</h3>
          <button type="button" class="btn btn-sm btn-warning text-dark font-bold shadow-sm" onclick="EmergencyContactsModule.toggleAddForm()" style="border-radius:12px; padding:8px 18px; background:#f59e0b; border:none;">
            <i class="fas ${showAddForm ? 'fa-times' : 'fa-plus'} me-1"></i> ${showAddForm ? '닫기' : '신규 시설업체 등록'}
          </button>
        </div>
        ${showAddForm ? renderAddVendorForm('facilities') : ''}
        <div class="row g-3">${facilitiesList.map((item, idx) => renderVendorCard('facilities', item, idx)).join('')}</div>
      </div>
    `;
  }

  /* 신규 업체 등록 폼 */
  function renderAddVendorForm(tabType) {
    const isPharma = tabType === 'pharma';
    const isEquip = tabType === 'equipment';
    const borderColor = isPharma ? '#0284c7' : isEquip ? '#7c3aed' : '#d97706';
    const bgColor = isPharma ? '#f0f9ff' : isEquip ? '#f5f3ff' : '#fffbeb';

    return `
      <div class="card p-4 mb-4 shadow-sm" style="border-radius:16px; border:2px solid ${borderColor}; background:${bgColor};">
        <h4 style="font-size:16px; font-weight:800; color:${borderColor}; margin-bottom:16px;"><i class="fas fa-plus-circle me-1"></i> 신규 업체 / 연락처 등록 폼</h4>
        <form onsubmit="EmergencyContactsModule.saveNewVendor(event, '${tabType}')">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">업체 / 기관명</label>
              <input type="text" id="vendor-name" class="form-control font-bold" placeholder="예: 지오영 / JVM" required style="border-radius:10px; padding:10px 14px;">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">구분 / 카테고리</label>
              <input type="text" id="vendor-category" class="form-control" placeholder="예: 도매상, 약국전산, 건물관리 등" required style="border-radius:10px; padding:10px 14px;">
            </div>
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">담당자 이름 / 직함</label>
              <input type="text" id="vendor-rep" class="form-control" placeholder="예: 김지오 팀장" style="border-radius:10px; padding:10px 14px;">
            </div>
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">직통 전화번호</label>
              <input type="text" id="vendor-phone" class="form-control font-bold text-primary" placeholder="010-1234-5678" required style="border-radius:10px; padding:10px 14px;">
            </div>
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px; color:#334155;">마감/운영시간</label>
              <input type="text" id="vendor-cutoff" class="form-control" placeholder="오후 5:30 마감" style="border-radius:10px; padding:10px 14px;">
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label font-bold" style="font-size:13px; color:#334155;">취급품목 / 메모</label>
            <input type="text" id="vendor-notes" class="form-control" placeholder="주요 취급품목 및 긴급 A/S 처리 안내..." style="border-radius:10px; padding:10px 14px;">
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-light font-bold" onclick="EmergencyContactsModule.toggleAddForm(false)" style="border-radius:10px; padding:8px 20px;">취소</button>
            <button type="submit" class="btn btn-success font-bold" style="border-radius:10px; padding:8px 20px;"><i class="fas fa-check me-1"></i> 업체 등록 완료</button>
          </div>
        </form>
      </div>
    `;
  }

  // ★ 1초 직통 전화 버튼이 제거되고 깔끔해진 협력업체 카드
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
        <div class="p-4 shadow-sm" style="background:${bgColor}; border-radius:18px; border:1px solid #e2e8f0; border-left:6px solid ${borderColor}; height:100%; position:relative;">
          
          <button type="button" onclick="EmergencyContactsModule.deleteVendor('${tabType}', ${idx}, '${item.name}')" style="position:absolute; top:16px; right:16px; background:none; border:none; color:#94a3b8; font-size:16px; transition:color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'" title="업체 삭제">
            <i class="fas fa-trash-alt"></i>
          </button>

          <div class="mb-3 pr-4">
            <span class="badge mb-2" style="background:${borderColor}; color:#fff; font-size:11px; padding:5px 10px; border-radius:8px;">${categoryBadge}</span>
            <h4 style="font-size:18px; font-weight:800; margin:0; color:${titleColor};">${item.name}</h4>
          </div>

          <div class="d-flex align-items-center gap-2 mb-3 flex-wrap" style="font-size:13.5px; color:#475569; font-weight:600;">
            ${item.repName ? `<span>담당자: <strong>${item.repName}</strong></span>` : ''}
            <span class="badge" style="background:#ffffff; color:#475569; border:1px solid #cbd5e1; font-size:11.5px; padding:4px 8px; border-radius:6px;">
              <i class="far fa-clock"></i> ${cutoffText}
            </span>
          </div>

          <!-- 파란색 번호 텍스트. 클릭 시 바로 전화 걸림 -->
          <div style="margin-bottom:14px;">
            <a href="tel:${item.phone}" style="display:inline-flex; align-items:center; gap:8px; font-size:18px; font-weight:800; color:#2563eb; text-decoration:none; background:#ffffff; padding:6px 14px; border-radius:12px; border:1px solid #bfdbfe; transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'">
              <i class="fas fa-phone-alt" style="font-size:14px;"></i> ${item.phone}
            </a>
          </div>

          <div style="font-size:13px; color:#64748b; background:#ffffff; padding:10px 14px; border-radius:12px; border:1px solid #e2e8f0; line-height:1.5;">
            📦 메모: ${item.items || item.notes || '약국 운영 지원 연락처'}
          </div>
        </div>
      </div>
    `;
  }

  function saveNewVendor(e, tabType) {
    if (e) e.preventDefault();
    const name = document.getElementById('vendor-name').value.trim();
    const category = document.getElementById('vendor-category').value.trim();
    const repName = document.getElementById('vendor-rep').value.trim();
    const phone = document.getElementById('vendor-phone').value.trim();
    const cutoff = document.getElementById('vendor-cutoff').value.trim();
    const notes = document.getElementById('vendor-notes').value.trim();

    if (!name || !phone) { alert('⚠️ 업체명과 직통 전화번호는 필수 입력 항목입니다.'); return; }

    const data = window.SheetsSync.getEmergencyContacts() || { staff: [], wholesalers: [], equipment: [], facilities: [] };
    const newVendor = { name, category: category || '운영지원', type: category || '운영지원', repName: repName || '담당자', phone, cutoff: cutoff || '상시 운영', items: notes || '약국 운영 지원', notes: notes || '약국 운영 지원' };

    if (tabType === 'pharma') { if (!data.wholesalers) data.wholesalers = []; data.wholesalers.push(newVendor); } 
    else if (tabType === 'equipment') { if (!data.equipment) data.equipment = []; data.equipment.push(newVendor); } 
    else if (tabType === 'facilities') { if (!data.facilities) data.facilities = []; data.facilities.push(newVendor); }

    window.SheetsSync.saveEmergencyContacts(data);
    showAddForm = false;
    alert(`🎉 신규 업체 [${name}] 연락처가 성공적으로 등록되었습니다!`);
    render('module-content');
  }

  function deleteVendor(tabType, idx, vendorName) {
    if (!confirm(`'${vendorName}' 업체를 삭제하시겠습니까?`)) return;
    const data = window.SheetsSync.getEmergencyContacts() || {};
    if (tabType === 'pharma' && data.wholesalers) data.wholesalers.splice(idx, 1);
    else if (tabType === 'equipment' && data.equipment) data.equipment.splice(idx, 1);
    else if (tabType === 'facilities' && data.facilities) data.facilities.splice(idx, 1);

    window.SheetsSync.saveEmergencyContacts(data);
    render('module-content');
  }

  return { render, setActiveTab, setStaffRoleFilter, toggleAddForm, saveNewVendor, deleteVendor };
})();