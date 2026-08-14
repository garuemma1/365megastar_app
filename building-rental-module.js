/**
 * 11. 메가스타 건물 임대업 대시보드 모듈 컨트롤러 (Building Rental & Real Estate Asset Engine v34.0)
 * 약국장(건물주) 전용: 9개 실전 부동산 매물 프리셋 탑재, 지분율(단독 vs 동업) 실질 순수익 자동 분리 산출,
 * 임대차 계약 대장 CRUD(추가/수정/삭제), 세금계산서 발행용 사업자정보 원클릭 복사 & D-Day 알림 센터
 */
window.BuildingRentalModule = (function () {

  let activeSubTab = 'ledger'; // 'ledger' | 'ranking' | 'tax_renew'
  let simCurrentRent = 2800000;
  let simPercent = 5;

  function setSubTab(tab) {
    activeSubTab = tab;
    render('module-content');
  }

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentUser = window.SheetsSync.getCurrentUser();

    // 보안 검증: 약국장만 접근 가능
    if (!currentUser || currentUser.role !== '약국장') {
      container.innerHTML = `
        <div class="alert alert-danger p-4 text-center my-5" style="border-radius:16px;">
          <h4><i class="fas fa-lock"></i> 🔒 접근 권한 제한 영역</h4>
          <p class="mb-0">메가스타 건물 임대업 대시보드는 <strong>약국장(건물주) 전용 보안 대시보드</strong>입니다.</p>
        </div>
      `;
      return;
    }

    const rData = window.SheetsSync.getBuildingRental();
    const assetVal = Number(rData.assetValue) || 12500000000; // 125억 원
    const units = rData.units || [];

    // 포트폴리오 집계 변수 (전체 총액 vs 내 지분 실수익)
    let totalDeposit = 0;
    let myDeposit = 0;

    let totalMonthlyRent = 0;
    let myMonthlyRent = 0;

    let totalMonthlyInterest = 0;
    let myMonthlyInterest = 0;

    let totalNetProfit = 0; // (월세 - 이자) 전체
    let myNetProfit = 0;    // (월세 - 이자) * 지분율

    const fmt = num => new Intl.NumberFormat('ko-KR').format(Math.round(num || 0));

    // 유효성 체크 및 지분별 손익 분리 산출
    const calculatedUnits = units.map(u => {
      const dep = Number(u.deposit) || 0;
      const rent = Number(u.rent) || 0;
      const interest = Number(u.mortgageInterest) || 0;
      const shareRate = Number(u.mySharePercent) || (u.ownershipType === 'SOLE' ? 100 : (u.ownershipType === 'JOINT2' ? 50 : 25));
      
      const totalNet = rent - interest;
      const myRentShare = Math.round(rent * (shareRate / 100));
      const myInterestShare = Math.round(interest * (shareRate / 100));
      const myNetShare = Math.round(totalNet * (shareRate / 100));
      const myDepShare = Math.round(dep * (shareRate / 100));

      totalDeposit += dep;
      myDeposit += myDepShare;

      totalMonthlyRent += rent;
      myMonthlyRent += myRentShare;

      totalMonthlyInterest += interest;
      myMonthlyInterest += myInterestShare;

      totalNetProfit += totalNet;
      myNetProfit += myNetShare;

      return {
        ...u,
        shareRate,
        totalNet,
        myRentShare,
        myInterestShare,
        myNetShare,
        myDepShare
      };
    });

    // 내 연간 예상 실질 순수익
    const myAnnualNetProfit = myNetProfit * 12;

    // 계약 만료 D-Day 계산 유틸리티
    const today = new Date();
    const calculateDDay = (endDateStr) => {
      if (!endDateStr) return { days: 999, label: '-' };
      const end = new Date(endDateStr);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { days: diffDays, label: `만료 초과 (${Math.abs(diffDays)}일 경과)` };
      if (diffDays === 0) return { days: 0, label: '오늘 만료' };
      return { days: diffDays, label: `D-${diffDays}` };
    };

    let html = `
      <div class="module-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 style="font-size:22px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-building text-success me-2"></i> 🏢 365메가스타 부동산 임대업 Asset ERP</h2>
          <p class="subtitle" style="font-size:13px; color:#64748b; margin:4px 0 0 0;">약국장(대표 건물주) 전용: 9개 사업장 기본 탑재, 지분율(단독 100% vs 동업 50%/25%) 실질 순수익 정산 & 계약대장 동적 CRUD</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-success font-bold" onclick="BuildingRentalModule.openAddModal()" style="border-radius:10px; padding:7px 16px; font-size:13px; box-shadow:0 4px 12px rgba(22,163,74,0.25);">
            <i class="fas fa-plus-circle me-1"></i> ➕ 신규 상가/호실 등록
          </button>
          <button type="button" class="btn btn-outline-success font-bold" onclick="BuildingRentalModule.openImportModal()" style="border-radius:10px; padding:7px 14px; font-size:13px; box-shadow:0 2px 6px rgba(16,185,129,0.15);">
            <i class="fas fa-file-import text-success me-1"></i> 📥 구글 시트/엑셀 파일 불러오기
          </button>
          <button type="button" class="btn btn-outline-primary font-bold" onclick="App.downloadActiveModuleToGoogleSheets()" style="border-radius:10px; padding:7px 14px; font-size:13px; box-shadow:0 2px 6px rgba(37,99,235,0.15);">
            <i class="fas fa-file-excel text-primary me-1"></i> 📊 구글 시트 엑셀 내보내기
          </button>
        </div>
      </div>

      <!-- 💡 상단 약국장 맞춤형 통합 KPI 카드 (전체 vs 내 지분 순수익 비교) -->
      <div class="row g-3 mb-4">
        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">보유 상가 수 & 보증금</span>
              <div class="kpi-icon-avatar kpi-avatar-blue">
                <i class="fas fa-landmark"></i>
              </div>
            </div>
            <div class="kpi-number-display text-primary">
              ${calculatedUnits.length} <span class="currency-unit" style="font-size:14px; font-weight:700;">개 사업장</span>
            </div>
            <div class="kpi-subtitle-text">
              전체 ${fmt(totalDeposit)}원 ➔ <strong style="color:#1d4ed8;">내 지분 ${fmt(myDeposit)}원</strong>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">당월 총 임대료 수입</span>
              <div class="kpi-icon-avatar kpi-avatar-emerald">
                <i class="fas fa-wallet"></i>
              </div>
            </div>
            <div class="kpi-number-display text-success">
              ${fmt(myMonthlyRent)} <span class="currency-unit" style="font-size:14px; font-weight:700;">원/월</span>
            </div>
            <div class="kpi-subtitle-text">
              전체 총액 ${fmt(totalMonthlyRent)}원 중 <strong style="color:#15803d;">내 실수입</strong>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">당월 대출이자 부담</span>
              <div class="kpi-icon-avatar kpi-avatar-red">
                <i class="fas fa-receipt"></i>
              </div>
            </div>
            <div class="kpi-number-display text-danger">
              ${fmt(myMonthlyInterest)} <span class="currency-unit" style="font-size:14px; font-weight:700;">원/월</span>
            </div>
            <div class="kpi-subtitle-text">
              전체 이자 ${fmt(totalMonthlyInterest)}원 중 <strong style="color:#b91c1c;">내 실부담</strong>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="kpi-summary-card" style="border:2px solid #10b981; background:linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);">
            <div class="kpi-header-row">
              <span class="kpi-title-text" style="color:#15803d; font-weight:800;">★ 약국장 실질 순수입</span>
              <div class="kpi-icon-avatar kpi-avatar-emerald" style="background:#10b981; color:#fff;">
                <i class="fas fa-coins"></i>
              </div>
            </div>
            <div class="kpi-number-display text-success" style="font-size:26px; color:#15803d !important;">
              ${fmt(myNetProfit)} <span class="currency-unit" style="font-size:15px; font-weight:800;">원/월</span>
            </div>
            <div class="kpi-subtitle-text d-flex align-items-center justify-content-between">
              <span>연간 예상 순수익:</span>
              <strong style="color:#047857; font-size:12.5px;">${fmt(myAnnualNetProfit)} 원/연</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- 📌 세부 서브 탭 네비게이션 -->
      <div class="d-flex gap-2 border-bottom pb-3 mb-4 flex-wrap">
        <button type="button" class="btn ${activeSubTab === 'ledger' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="BuildingRentalModule.setSubTab('ledger')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-list-alt me-1"></i> ① 상가별 임대차 관리 마스터 대장 (지분 손익 CRUD)
        </button>
        <button type="button" class="btn ${activeSubTab === 'ranking' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="BuildingRentalModule.setSubTab('ranking')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-trophy me-1"></i> ② 지분별/상가별 수익 기여도 분석 뷰
        </button>
        <button type="button" class="btn ${activeSubTab === 'tax_renew' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="BuildingRentalModule.setSubTab('tax_renew')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-file-invoice-dollar me-1"></i> ③ 세금계산서 발행 & 계약 만료 알림 센터
        </button>
      </div>
    `;

    // 1. [상가별 임대차 관리 마스터 테이블 (세금계산서 & 수지 분석)]
    if (activeSubTab === 'ledger') {
      html += `
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#0f172a; color:#ffffff; padding:16px 20px;">
            <h3 style="font-size:16.5px; font-weight:800; margin:0; color:#ffffff;"><i class="fas fa-table me-2 text-success"></i> 상가/건물 임대차 대장 & 공동투자 지분별 정산표</h3>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-success font-bold" onclick="BuildingRentalModule.openAddModal()">
                <i class="fas fa-plus me-1"></i> 신규 등록
              </button>
              <span style="font-size:12px; color:#cbd5e1;">전체 ${calculatedUnits.length}개 사업장 (수정/삭제 실시간 반영)</span>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-striped table-hover align-middle mb-0" style="font-size:13px;">
                <thead style="background:#f1f5f9; color:#334155;">
                  <tr>
                    <th style="padding:12px 14px;">상호 / 호실명</th>
                    <th style="padding:12px 10px;">명의 및 지분율</th>
                    <th style="padding:12px 10px;">소재지 / 사업자번호</th>
                    <th style="text-align:right; padding:12px 10px;">보증금</th>
                    <th style="text-align:right; padding:12px 10px;">월세 (VAT별도)</th>
                    <th style="text-align:right; padding:12px 10px;">월 대출이자</th>
                    <th style="text-align:right; padding:12px 10px;">전체 순수익</th>
                    <th style="text-align:right; padding:12px 14px; background:#e6f4ea; color:#137333;">★ 내 지분 순수익(월)</th>
                    <th style="text-align:center; padding:12px 10px; width:130px;">계약만료 / D-Day</th>
                    <th style="text-align:center; padding:12px 10px; width:120px;">관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${calculatedUnits.map((u, idx) => {
                    const dday = calculateDDay(u.endDate);
                    const isWarning = dday.days <= 90;

                    return `
                      <tr>
                        <td style="padding:12px 14px;">
                          <strong style="font-size:14px; color:#0f172a;">${u.buildingName}</strong><br>
                          <small class="text-muted">${u.unit} (${u.tenantName})</small>
                        </td>
                        <td style="padding:12px 10px;">
                          <span class="badge ${u.shareRate === 100 ? 'bg-success' : 'bg-primary'}" style="font-size:11.5px; padding:4px 8px;">
                            ${u.ownerLabel || (u.shareRate + '%')}
                          </span>
                        </td>
                        <td style="padding:12px 10px; font-size:12px;">
                          <div style="color:#334155; font-weight:600;">${u.location || '소재지 정보'}</div>
                          <small class="text-muted">사업자: ${u.bizNo || '미등록'}</small>
                        </td>
                        <td style="text-align:right; padding:12px 10px; font-weight:700; font-family:'Outfit', sans-serif;">
                          ${fmt(u.deposit)} 원
                        </td>
                        <td style="text-align:right; padding:12px 10px; font-weight:800; color:#2563eb; font-family:'Outfit', sans-serif;">
                          ${fmt(u.rent)} 원
                          ${u.vatType === 'TAX_EXEMPT' ? '<br><small class="text-success">(면세)</small>' : ''}
                        </td>
                        <td style="text-align:right; padding:12px 10px; font-weight:700; color:#dc2626; font-family:'Outfit', sans-serif;">
                          ${fmt(u.mortgageInterest)} 원
                        </td>
                        <td style="text-align:right; padding:12px 10px; font-weight:700; color:#0f172a; font-family:'Outfit', sans-serif;">
                          ${fmt(u.totalNet)} 원
                        </td>
                        <td style="text-align:right; padding:12px 14px; font-weight:800; color:#15803d; font-size:14.5px; background:#f0fdf4; font-family:'Outfit', sans-serif;">
                          ${fmt(u.myNetShare)} 원
                        </td>
                        <td style="text-align:center; padding:12px 10px; font-size:12px;">
                          <div>${u.endDate}</div>
                          <span class="badge ${isWarning ? 'bg-danger' : 'bg-secondary'}" style="font-size:11px; margin-top:2px;">
                            ${dday.label}
                          </span>
                        </td>
                        <td style="text-align:center; padding:12px 10px;">
                          <div class="d-flex justify-content-center gap-1">
                            <button type="button" class="btn btn-xs btn-outline-primary font-bold" onclick="BuildingRentalModule.openEditModal(${idx})" style="padding:3px 8px; font-size:11.5px;">
                              ✏️ 수정
                            </button>
                            <button type="button" class="btn btn-xs btn-outline-danger font-bold" onclick="BuildingRentalModule.deleteProperty(${idx})" style="padding:3px 8px; font-size:11.5px;">
                              🗑️ 삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <!-- 하단 포트폴리오 합계 대조 행 (Total Row) -->
                <tfoot style="background:#0f172a; color:#ffffff; font-weight:800;">
                  <tr>
                    <td colspan="3" style="padding:14px; font-size:14.5px;">🏢 전체 포트폴리오 총액 합계</td>
                    <td style="text-align:right; padding:14px; font-family:'Outfit', sans-serif;">${fmt(totalDeposit)} 원</td>
                    <td style="text-align:right; padding:14px; color:#93c5fd; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyRent)} 원</td>
                    <td style="text-align:right; padding:14px; color:#fca5a5; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyInterest)} 원</td>
                    <td style="text-align:right; padding:14px; font-family:'Outfit', sans-serif;">${fmt(totalNetProfit)} 원</td>
                    <td style="text-align:right; padding:14px; color:#4ade80; font-size:16px; background:#064e3b; font-family:'Outfit', sans-serif;">-</td>
                    <td colspan="2">-</td>
                  </tr>
                  <tr style="background:#15803d; color:#ffffff; font-weight:800;">
                    <td colspan="3" style="padding:14px; font-size:15px;">★ 약국장(문성도) 지분율 실수익 합계</td>
                    <td style="text-align:right; padding:14px; font-family:'Outfit', sans-serif;">${fmt(myDeposit)} 원</td>
                    <td style="text-align:right; padding:14px; font-family:'Outfit', sans-serif;">${fmt(myMonthlyRent)} 원</td>
                    <td style="text-align:right; padding:14px; font-family:'Outfit', sans-serif;">${fmt(myMonthlyInterest)} 원</td>
                    <td style="text-align:right; padding:14px; font-family:'Outfit', sans-serif;">-</td>
                    <td style="text-align:right; padding:14px; font-size:17px; color:#ffffff; background:#166534; font-family:'Outfit', sans-serif;">${fmt(myNetProfit)} 원/월</td>
                    <td colspan="2" style="font-size:13px; text-align:center;">(연간 ${fmt(myAnnualNetProfit)}원)</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // 2. [지분별/상가별 수익 기여도 분석 뷰]
    else if (activeSubTab === 'ranking') {
      // 내 순수익 높은 순 랭킹 정렬
      const rankedProps = [...calculatedUnits].sort((a, b) => b.myNetShare - a.myNetShare);

      // 단독 소유 vs 동업 소유 수익 비중 계산
      let soleProfit = 0;
      let jointProfit = 0;

      calculatedUnits.forEach(u => {
        if (u.shareRate === 100) soleProfit += u.myNetShare;
        else jointProfit += u.myNetShare;
      });

      const soleRatio = myNetProfit > 0 ? ((soleProfit / myNetProfit) * 100).toFixed(1) : 0;
      const jointRatio = myNetProfit > 0 ? ((jointProfit / myNetProfit) * 100).toFixed(1) : 0;

      html += `
        <div class="row g-4 mb-4">
          <!-- 랭킹 뷰 -->
          <div class="col-md-7">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#f0fdf4; border-bottom:1.5px solid #bbf7d0; padding:16px 20px;">
                <h3 style="font-size:16px; font-weight:800; color:#15803d; margin:0;"><i class="fas fa-trophy me-2 text-warning"></i> 약국장 본인 순수익 기여도 상위 랭킹</h3>
              </div>
              <div class="card-body p-3">
                <div class="d-flex flex-column gap-3">
                  ${rankedProps.map((p, rIdx) => `
                    <div class="p-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:${rIdx === 0 ? '#f0fdf4' : '#f8fafc'}; border:1.5px solid ${rIdx === 0 ? '#bbf7d0' : '#e2e8f0'}; border-radius:14px;">
                      <div class="d-flex align-items-center gap-3">
                        <span class="badge ${rIdx === 0 ? 'bg-warning text-dark' : (rIdx === 1 ? 'bg-secondary' : 'bg-light text-dark')}" style="font-size:14px; padding:8px 12px; border-radius:10px; font-weight:800;">
                          #${rIdx + 1}
                        </span>
                        <div>
                          <strong style="font-size:15px; color:#0f172a;">${p.buildingName}</strong>
                          <span class="badge ${p.shareRate === 100 ? 'bg-success' : 'bg-primary'}" style="font-size:11px; margin-left:6px;">${p.ownerLabel}</span>
                          <div style="font-size:12.5px; color:#64748b; margin-top:2px;">월세 ${fmt(p.rent)}원 | 이자 ${fmt(p.mortgageInterest)}원</div>
                        </div>
                      </div>
                      <div class="text-end">
                        <span style="font-size:12px; color:#64748b; font-weight:700;">내 실질 월 순수익</span>
                        <div style="font-size:18px; font-weight:800; color:#15803d; font-family:'Outfit', sans-serif;">+${fmt(p.myNetShare)} 원/월</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- 소유 형태 비중 시각화 -->
          <div class="col-md-5">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#eff6ff; border-bottom:1.5px solid #bfdbfe; padding:16px 20px;">
                <h3 style="font-size:16px; font-weight:800; color:#1e40af; margin:0;"><i class="fas fa-pie-chart me-2"></i> 단독 소유 vs 동업 소유 수익 비중</h3>
              </div>
              <div class="card-body p-4 text-center">
                <div class="mb-4">
                  <div class="progress mb-2" style="height:24px; border-radius:12px; overflow:hidden;">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${soleRatio}%; font-weight:bold;" title="단독 100%">단독 (${soleRatio}%)</div>
                    <div class="progress-bar bg-primary" role="progressbar" style="width: ${jointRatio}%; font-weight:bold;" title="동업 지분">동업 (${jointRatio}%)</div>
                  </div>
                </div>

                <div class="p-3 mb-3 text-start" style="background:#f0fdf4; border-radius:14px; border:1px solid #bbf7d0;">
                  <div class="d-flex justify-content-between align-items-center">
                    <span style="font-weight:700; color:#166534;">🟢 단독 소유 사업장 (100% 지분)</span>
                    <strong style="font-size:16px; color:#15803d;">월 ${fmt(soleProfit)} 원</strong>
                  </div>
                </div>

                <div class="p-3 text-start" style="background:#eff6ff; border-radius:14px; border:1px solid #bfdbfe;">
                  <div class="d-flex justify-content-between align-items-center">
                    <span style="font-weight:700; color:#1e40af;">🔵 공동 투자 동업 사업장 (50%/25%)</span>
                    <strong style="font-size:16px; color:#2563eb;">월 ${fmt(jointProfit)} 원</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 3. [세무계산서 발행 & 계약 만료 알림 센터]
    else if (activeSubTab === 'tax_renew') {
      const incRent = Math.round(simCurrentRent * (1 + simPercent / 100));
      const addedRentMonth = incRent - simCurrentRent;
      const addedRentYear = addedRentMonth * 12;

      html += `
        <!-- 세금계산서 발행용 원클릭 사업자정보 복사 센터 -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header" style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; padding:16px 20px;">
            <h3 style="font-size:16px; font-weight:800; color:#334155; margin:0;"><i class="fas fa-copy me-2 text-primary"></i> 📑 매월 세금계산서 발행용 사업자 정보 원클릭 복사 센터</h3>
          </div>
          <div class="card-body p-4">
            <div class="row g-3">
              ${calculatedUnits.map(p => `
                <div class="col-md-4 col-sm-6">
                  <div class="p-3" style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:14px;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <strong style="font-size:14px; color:#0f172a;">${p.buildingName}</strong>
                      <span class="badge ${p.vatType === 'TAX_EXEMPT' ? 'bg-secondary' : 'bg-success'}" style="font-size:11px;">
                        ${p.vatType === 'TAX_EXEMPT' ? '면세' : '과세 (VAT별도)'}
                      </span>
                    </div>
                    <div style="font-size:12.5px; color:#64748b;">사업자번호: <strong style="color:#0f172a;">${p.bizNo || '미등록'}</strong></div>
                    <div style="font-size:12.5px; color:#64748b;">임차인/대표: <strong>${p.tenantName} (${p.repName})</strong></div>
                    <div style="font-size:12.5px; color:#64748b;">월세: <strong style="color:#2563eb;">${fmt(p.rent)}원</strong></div>
                    <button type="button" class="btn btn-sm btn-outline-primary w-100 font-bold mt-3" onclick="BuildingRentalModule.copyTaxInfo('${p.buildingName}', '${p.bizNo}', '${p.tenantName}', '${p.repName}', ${p.rent})" style="border-radius:8px;">
                      📋 사업자 정보 복사
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 계약 만료 알림 센터 -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #fde68a; background:#fffbeb; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center" style="background:#fef3c7; padding:16px 20px; border-bottom:1px solid #fde68a;">
            <h3 style="font-size:16px; font-weight:800; color:#b45309; margin:0;"><i class="fas fa-bell me-2"></i> 🔔 3개월 / 6개월 내 계약 만료 도래 알림 센터</h3>
            <span class="badge bg-warning text-dark font-bold" style="font-size:12px;">D-Day 하이라이트</span>
          </div>
          <div class="card-body p-4">
            <div class="row g-3">
              ${calculatedUnits.map(u => {
                const dday = calculateDDay(u.endDate);
                if (dday.days > 180) return '';
                return `
                  <div class="col-md-6">
                    <div class="p-3" style="background:#ffffff; border:1.5px solid #fde68a; border-radius:14px;">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong style="font-size:14.5px; color:#0f172a;">${u.buildingName} (${u.unit})</strong>
                        <span class="badge ${dday.days <= 90 ? 'bg-danger' : 'bg-warning text-dark'}" style="font-size:12.5px; padding:5px 10px;">${dday.label}</span>
                      </div>
                      <div style="font-size:13px; color:#64748b;">임차인: <strong>${u.tenantName} (${u.repName})</strong></div>
                      <div style="font-size:13px; color:#64748b;">계약 만료일: <strong style="color:#dc2626;">${u.endDate}</strong></div>
                      <div style="font-size:13px; color:#64748b;">현재 월세: <strong>${fmt(u.rent)}원</strong></div>
                      <div class="mt-2 text-warning font-bold" style="font-size:12.5px;"><i class="fas fa-exclamation-circle me-1"></i> ${u.note}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- 💡 상가임대차법 법정 5% 증액 시뮬레이션 계산기 -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header" style="background:#f0fdf4; border-bottom:1.5px solid #bbf7d0; padding:16px 20px;">
            <h3 style="font-size:16px; font-weight:800; color:#15803d; margin:0;"><i class="fas fa-calculator me-2"></i> 💡 상가임대차법 법정 연 5% 상한선 임대료 증액 시뮬레이션 계산기</h3>
          </div>
          <div class="card-body p-4">
            <div class="row g-4 align-items-center">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label font-bold" style="font-size:14px; color:#0f172a;">현재 해당 호실 월 임대료 (원)</label>
                  <input type="number" class="form-control form-control-lg font-bold text-primary" style="font-size:18px;" value="${simCurrentRent}" oninput="BuildingRentalModule.updateSimRent(this.value)">
                </div>
                <div class="mb-3">
                  <label class="form-label font-bold" style="font-size:14px; color:#0f172a;">증액 비율 (%) - 법정 상한 5.0%</label>
                  <input type="range" class="form-range" min="1" max="5" step="0.5" value="${simPercent}" oninput="BuildingRentalModule.updateSimPercent(this.value)">
                  <div class="d-flex justify-content-between text-muted" style="font-size:12px;"><span>1%</span><span>2.5%</span><strong class="text-success">5% (법정상한)</strong></div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="p-4" style="background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:16px;">
                  <span style="font-size:13px; color:#166534; font-weight:700;">🚀 ${simPercent}% 인상 후 인상 월 임대료</span>
                  <div style="font-size:26px; font-weight:800; color:#15803d; margin-top:4px; font-family:'Outfit', sans-serif;">${fmt(incRent)} 원</div>
                  <hr style="margin:12px 0;">
                  <div class="d-flex justify-content-between" style="font-size:13.5px;">
                    <span>월 순 추가 수입:</span><strong class="text-success">+${fmt(addedRentMonth)} 원 / 월</strong>
                  </div>
                  <div class="d-flex justify-content-between mt-1" style="font-size:13.5px;">
                    <span>연간 추가 수입:</span><strong class="text-success">+${fmt(addedRentYear)} 원 / 연</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // --- CRUD 기능 구현 (신규 등록 모달 / 수정 모달 / 삭제) ---

  function openAddModal() {
    renderPropertyModal(null);
  }

  function openEditModal(index) {
    const rData = window.SheetsSync.getBuildingRental();
    const target = rData.units ? rData.units[index] : null;
    renderPropertyModal(target, index);
  }

  function renderPropertyModal(target = null, index = null) {
    const isEdit = target !== null;
    let modal = document.getElementById('property-crud-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'property-crud-modal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center;';
      document.body.appendChild(modal);
    }

    const u = target || {
      buildingName: '',
      unit: '',
      ownershipType: 'SOLE',
      mySharePercent: 100,
      ownerLabel: '문성도 (단독 100%)',
      tenantName: '',
      repName: '',
      bizNo: '',
      location: '',
      type: '일반/소매',
      deposit: 50000000,
      rent: 2000000,
      vatType: 'EXCLUSIVE',
      vat: 200000,
      mortgageInterest: 600000,
      maintenanceFee: 300000,
      startDate: '2024-01-01',
      endDate: '2027-01-01',
      note: ''
    };

    modal.innerHTML = `
      <div class="modal-card" style="background:#ffffff; border-radius:20px; max-width:680px; width:95%; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); position:relative; max-height:92vh; overflow-y:auto;">
        <button type="button" class="close-btn" onclick="document.getElementById('property-crud-modal').style.display='none'" style="position:absolute; top:20px; right:24px; font-size:26px; background:none; border:none; color:#64748b; cursor:pointer;">&times;</button>
        
        <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:20px;">
          ${isEdit ? '✏️ 건물/상가 임대 정보 수정' : '➕ 신규 상가/건물 임대 등록'}
        </h3>

        <form onsubmit="BuildingRentalModule.savePropertySubmit(event, ${index})">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">상호 / 건물명 *</label>
              <input type="text" class="form-control" id="pform-buildingName" value="${u.buildingName}" required placeholder="예: 보광프라자 (107호)">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">호수 구분 *</label>
              <input type="text" class="form-control" id="pform-unit" value="${u.unit}" required placeholder="예: 107호, 108호">
            </div>

            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">소유 형태 및 지분율 *</label>
              <select class="form-select" id="pform-ownershipType" onchange="BuildingRentalModule.onOwnershipChange(this.value)">
                <option value="SOLE" ${u.ownershipType === 'SOLE' ? 'selected' : ''}>단독 소유 (100%)</option>
                <option value="JOINT2" ${u.ownershipType === 'JOINT2' ? 'selected' : ''}>2인 공동투자 (50%)</option>
                <option value="JOINT4" ${u.ownershipType === 'JOINT4' ? 'selected' : ''}>4인 공동투자 (25%)</option>
                <option value="CUSTOM" ${u.ownershipType === 'CUSTOM' ? 'selected' : ''}>지분율 직접 입력(%)</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">약국장(문성도) 지분율 (%) *</label>
              <input type="number" class="form-control font-bold text-primary" id="pform-mySharePercent" value="${u.mySharePercent || 100}" min="1" max="100" required>
            </div>

            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">입주 상호명 / 대표자 *</label>
              <input type="text" class="form-control" id="pform-tenantName" value="${u.tenantName}" required placeholder="예: 365메가스타약국">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">임차인 대표자명</label>
              <input type="text" class="form-control" id="pform-repName" value="${u.repName}" placeholder="예: 문성도">
            </div>

            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">사업자등록번호</label>
              <input type="text" class="form-control" id="pform-bizNo" value="${u.bizNo}" placeholder="예: 120-88-12345">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">소재지 주소</label>
              <input type="text" class="form-control" id="pform-location" value="${u.location}" placeholder="예: 경기도 고양시 덕양구 화정동 107호">
            </div>

            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px;">보증금 (원) *</label>
              <input type="number" class="form-control font-bold" id="pform-deposit" value="${u.deposit}" required>
            </div>
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px;">월 임대료 (원) *</label>
              <input type="number" class="form-control font-bold text-primary" id="pform-rent" value="${u.rent}" required>
            </div>
            <div class="col-md-4">
              <label class="form-label font-bold" style="font-size:13px;">월 대출이자 (원)</label>
              <input type="number" class="form-control font-bold text-danger" id="pform-mortgageInterest" value="${u.mortgageInterest || 0}">
            </div>

            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">계약 시작일</label>
              <input type="date" class="form-control" id="pform-startDate" value="${u.startDate}">
            </div>
            <div class="col-md-6">
              <label class="form-label font-bold" style="font-size:13px;">계약 만료일 *</label>
              <input type="date" class="form-control" id="pform-endDate" value="${u.endDate}" required>
            </div>

            <div class="col-12">
              <label class="form-label font-bold" style="font-size:13px;">특약사항 및 비고</label>
              <input type="text" class="form-control" id="pform-note" value="${u.note}" placeholder="예: 365메가스타약국 직접 운영 마스터 점포">
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary font-bold" onclick="document.getElementById('property-crud-modal').style.display='none'">취소</button>
            <button type="submit" class="btn btn-success font-bold px-4">
              <i class="fas fa-save me-1"></i> ${isEdit ? '수정 내용 저장' : '신규 임대 등록 완료'}
            </button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function onOwnershipChange(val) {
    const input = document.getElementById('pform-mySharePercent');
    if (!input) return;
    if (val === 'SOLE') input.value = 100;
    else if (val === 'JOINT2') input.value = 50;
    else if (val === 'JOINT4') input.value = 25;
  }

  function savePropertySubmit(e, index = null) {
    e.preventDefault();
    const rData = window.SheetsSync.getBuildingRental();
    if (!rData.units) rData.units = [];

    const ownershipType = document.getElementById('pform-ownershipType').value;
    const mySharePercent = Number(document.getElementById('pform-mySharePercent').value) || 100;
    
    let ownerLabel = '문성도 (단독 100%)';
    if (mySharePercent === 100) ownerLabel = '문성도 (단독 100%)';
    else ownerLabel = `문성도 외 동업 (${mySharePercent}%)`;

    const newObj = {
      id: index !== null && rData.units[index] ? rData.units[index].id : `prop_${Date.now()}`,
      buildingName: document.getElementById('pform-buildingName').value.trim(),
      unit: document.getElementById('pform-unit').value.trim(),
      ownershipType,
      mySharePercent,
      ownerLabel,
      tenantName: document.getElementById('pform-tenantName').value.trim(),
      repName: document.getElementById('pform-repName').value.trim(),
      bizNo: document.getElementById('pform-bizNo').value.trim(),
      location: document.getElementById('pform-location').value.trim(),
      type: '상가/점포',
      deposit: Number(document.getElementById('pform-deposit').value) || 0,
      rent: Number(document.getElementById('pform-rent').value) || 0,
      vatType: 'EXCLUSIVE',
      vat: Math.round((Number(document.getElementById('pform-rent').value) || 0) * 0.1),
      mortgageInterest: Number(document.getElementById('pform-mortgageInterest').value) || 0,
      maintenanceFee: 300000,
      startDate: document.getElementById('pform-startDate').value,
      endDate: document.getElementById('pform-endDate').value,
      status: 'PAID',
      unpaidDays: 0,
      taxInvoice: true,
      note: document.getElementById('pform-note').value.trim()
    };

    if (index !== null && index >= 0 && index < rData.units.length) {
      rData.units[index] = newObj;
    } else {
      rData.units.push(newObj);
    }

    window.SheetsSync.saveBuildingRental(rData);

    const modal = document.getElementById('property-crud-modal');
    if (modal) modal.style.display = 'none';

    render('module-content');
    alert(`🎉 임대차 대장이 성공적으로 저장되었습니다!`);
  }

  function deleteProperty(index) {
    const rData = window.SheetsSync.getBuildingRental();
    if (!rData.units || !rData.units[index]) return;

    const targetName = rData.units[index].buildingName;
    if (confirm(`🗑️ 정말로 [${targetName}] 상가 임대 대장 항목을 삭제하시겠습니까?`)) {
      rData.units.splice(index, 1);
      window.SheetsSync.saveBuildingRental(rData);
      render('module-content');
      alert(`🗑️ [${targetName}] 항목이 삭제되었습니다.`);
    }
  }

  function copyTaxInfo(bName, bizNo, tenant, rep, rent) {
    const text = `[세금계산서 발행정보]\n상가명: ${bName}\n사업자번호: ${bizNo || '미등록'}\n임차상호: ${tenant}\n대표자명: ${rep}\n월임대료: ${new Intl.NumberFormat('ko-KR').format(rent)}원 (VAT별도 10%)`;
    navigator.clipboard.writeText(text).then(() => {
      alert(`📋 [${bName}] 세금계산서 발행용 사업자 정보가 클립보드에 복사되었습니다!`);
    });
  }

  function updateSimRent(val) {
    simCurrentRent = Number(val) || 0;
    render('module-content');
  }

  function updateSimPercent(val) {
    simPercent = Number(val) || 5;
    render('module-content');
  }

  function openImportModal() {
    let input = document.getElementById('br-csv-file-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'br-csv-file-input';
      input.accept = '.csv, .txt';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', handleCSVImport);
    }
    input.click();
  }

  function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const text = evt.target.result;
        const lines = text.split('\n');
        const rData = window.SheetsSync.getBuildingRental();

        lines.forEach(line => {
          const parts = line.split(',').map(s => s.replace(/"/g, '').trim());
          if (parts.length >= 6) {
            const unitName = parts[0];
            const dep = Number(parts[4]);
            const rent = Number(parts[5]);

            if (unitName && !isNaN(rent) && rent > 0) {
              const existing = (rData.units || []).find(u => u.unit === unitName || u.buildingName.includes(unitName));
              if (existing) {
                existing.rent = rent;
                if (!isNaN(dep) && dep > 0) existing.deposit = dep;
              }
            }
          }
        });

        window.SheetsSync.saveBuildingRental(rData);
        render('module-content');
        alert(`🎉 구글 시트/엑셀 파일(${file.name}) 데이터가 건물 임대 대장으로 연동 반영되었습니다!`);
      } catch (err) {
        alert('❌ 파일 읽기 중 오류가 발생했습니다. CSV 파일 형식을 확인해 주세요.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  return {
    render,
    setSubTab,
    openAddModal,
    openEditModal,
    deleteProperty,
    savePropertySubmit,
    onOwnershipChange,
    copyTaxInfo,
    updateSimRent,
    updateSimPercent,
    openImportModal
  };
})();
