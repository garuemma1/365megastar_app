/**
 * 11. 메가스타 건물 임대업 대시보드 모듈 컨트롤러 (Building Rental & Real Estate Asset Engine v30.0)
 * 약국장(건물주) 전용: 호실별 임대차 매트릭스, D-Day 알림, 수납상태 토글, P&L 수지결산, 5% 증액 시뮬레이터
 */
window.BuildingRentalModule = (function () {

  let activeSubTab = 'units'; // 'units' | 'income' | 'renew'
  let simCurrentRent = 2200000;
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
          <p class="mb-0">메가스타 건물 임대업 대시보드는 <strong>약국장(건물주) 전용 보안 메뉴</strong>입니다.</p>
        </div>
      `;
      return;
    }

    const rData = window.SheetsSync.getBuildingRental();
    const assetVal = Number(rData.assetValue) || 5500000000; // 55억 원
    const units = rData.units || [];
    const expObj = rData.expenses || { mortgageInterest: 2150000, fireInsurance: 250000, propertyTax: 450000, buildingMaintenance: 400000 };

    // 수입 및 보증금 집계
    let totalDeposit = 0;
    let totalMonthlyRent = 0;
    let totalMonthlyMaint = 0;
    let totalVat = 0;

    units.forEach(u => {
      totalDeposit += Number(u.deposit) || 0;
      totalMonthlyRent += Number(u.rent) || 0;
      totalMonthlyMaint += Number(u.maintenanceFee) || 0;
      totalVat += Number(u.vat) || (Number(u.rent) * 0.1);
    });

    const totalMonthlyIncome = totalMonthlyRent + totalMonthlyMaint;
    const totalMonthlyExpense = (Number(expObj.mortgageInterest) || 0) + (Number(expObj.fireInsurance) || 0) + (Number(expObj.propertyTax) || 0) + (Number(expObj.buildingMaintenance) || 0);
    const netMonthlyIncome = totalMonthlyIncome - totalMonthlyExpense;
    const netAnnualIncome = netMonthlyIncome * 12;

    // Cap Rate (실질 임대수익률 %) = (연간 순수익 / (자산가치 - 총보증금)) * 100
    const netInvestment = Math.max(1, assetVal - totalDeposit);
    const capRate = ((netAnnualIncome / netInvestment) * 100).toFixed(2);

    const fmt = num => new Intl.NumberFormat('ko-KR').format(Math.round(num || 0));

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
          <h2 style="font-size:22px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-building text-success me-2"></i> 🏢 365메가스타 타워 건물 임대업 대시보드</h2>
          <p class="subtitle" style="font-size:13px; color:#64748b; margin:4px 0 0 0;">약국장(건물주) 전용: 상가 호실별 임대차 매트릭스, D-Day 만료 알림, 수납 관리 및 수익률(Cap Rate) 분석</p>
        </div>
        <span class="badge bg-danger" style="font-size:12.5px; padding:8px 14px; border-radius:10px;">🔒 대표 건물주 전용 대시보드</span>
      </div>

      <!-- 💡 상단 핵심 자산 KPI 요약 카드 (Asset KPI Cards) -->
      <div class="row g-3 mb-4">
        <div class="col-md-3 col-6">
          <div class="card p-3 h-100 text-white shadow-sm" style="background:linear-gradient(135deg, #065f46 0%, #059669 100%); border-radius:16px; border:none;">
            <span style="font-size:12.5px; color:#a7f3d0; font-weight:700;"><i class="fas fa-landmark me-1"></i> 총 자산가치 / 보증금</span>
            <div style="font-size:20px; font-weight:800; margin-top:6px; font-family:'Outfit', sans-serif;">${fmt(assetVal)} 원</div>
            <span style="font-size:11.5px; color:#d1fae5; margin-top:4px;">보증금 합계: <strong style="color:#ffffff;">${fmt(totalDeposit)}원</strong></span>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card p-3 h-100 text-white shadow-sm" style="background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); border-radius:16px; border:none;">
            <span style="font-size:12.5px; color:#93c5fd; font-weight:700;"><i class="fas fa-wallet me-1"></i> 당월 총 임대 수입</span>
            <div style="font-size:22px; font-weight:800; margin-top:6px; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyIncome)} 원</div>
            <span style="font-size:11.5px; color:#bfdbfe; margin-top:4px;">월세 ${fmt(totalMonthlyRent)}원 / 관리비 ${fmt(totalMonthlyMaint)}원</span>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card p-3 h-100 text-white shadow-sm" style="background:linear-gradient(135deg, #7c2d12 0%, #ea580c 100%); border-radius:16px; border:none;">
            <span style="font-size:12.5px; color:#fed7aa; font-weight:700;"><i class="fas fa-receipt me-1"></i> 당월 유지 지출</span>
            <div style="font-size:22px; font-weight:800; margin-top:6px; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyExpense)} 원</div>
            <span style="font-size:11.5px; color:#ffedd5; margin-top:4px;">대출이자 ${fmt(expObj.mortgageInterest)}원 / 기타 ${fmt(totalMonthlyExpense - expObj.mortgageInterest)}원</span>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card p-3 h-100 shadow-sm" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:16px;">
            <span style="font-size:12.5px; color:#64748b; font-weight:700;"><i class="fas fa-chart-pie me-1 text-primary"></i> 실질 임대수익률 (Cap Rate)</span>
            <div style="font-size:24px; font-weight:800; color:#2563eb; margin-top:6px; font-family:'Outfit', sans-serif;">${capRate}%</div>
            <span style="font-size:11.5px; color:#64748b; margin-top:4px;">연 순수익: <strong style="color:#0f172a;">${fmt(netAnnualIncome)}원</strong></span>
          </div>
        </div>
      </div>

      <!-- 📌 세부 3대 서브 탭 네비게이션 -->
      <div class="d-flex gap-2 border-bottom pb-3 mb-4 flex-wrap">
        <button type="button" class="btn ${activeSubTab === 'units' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="BuildingRentalModule.setSubTab('units')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-door-open me-1"></i> ① 호실별 임대 현황판 (호실 매트릭스)
        </button>
        <button type="button" class="btn ${activeSubTab === 'income' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="BuildingRentalModule.setSubTab('income')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-balance-scale me-1"></i> ② 월별/연간 수지 결산 (Income & Expense)
        </button>
        <button type="button" class="btn ${activeSubTab === 'renew' ? 'btn-success font-bold' : 'btn-outline-secondary'}" onclick="BuildingRentalModule.setSubTab('renew')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-calendar-check me-1"></i> ③ 만료/갱신 알림 & 5% 증액 계산기
        </button>
      </div>
    `;

    // 서브 탭 1: 호실별 임대 현황판 (호실 매트릭스)
    if (activeSubTab === 'units') {
      html += `
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#0f172a; color:#ffffff; padding:16px 20px;">
            <h3 style="font-size:16.5px; font-weight:800; margin:0; color:#ffffff;"><i class="fas fa-th-large me-2 text-success"></i> 건물 호실별 임대차 계약 대장 & 수납 관리</h3>
            <span style="font-size:12.5px; color:#cbd5e1;">전체 ${units.length}개 호실 (임대율 100%)</span>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-striped table-hover align-middle mb-0" style="font-size:13px;">
                <thead style="background:#f1f5f9; color:#334155;">
                  <tr>
                    <th style="text-align:center; padding:12px; width:90px;">호실</th>
                    <th style="padding:12px;">입주 상호 (대표자 / 업종)</th>
                    <th style="text-align:right; padding:12px;">보증금</th>
                    <th style="text-align:right; padding:12px;">월 임대료</th>
                    <th style="text-align:right; padding:12px;">월 관리비</th>
                    <th style="text-align:right; padding:12px;">부가세 (VAT)</th>
                    <th style="text-align:center; padding:12px; width:150px;">계약 기간 및 D-Day</th>
                    <th style="text-align:center; padding:12px; width:110px;">수납 상태</th>
                    <th style="text-align:center; padding:12px; width:120px;">수납 변경</th>
                  </tr>
                </thead>
                <tbody>
                  ${units.map((u, idx) => {
                    const dday = calculateDDay(u.endDate);
                    const isWarning = dday.days <= 90;
                    const isPaid = u.status === 'PAID';

                    return `
                      <tr>
                        <td style="text-align:center;"><span class="badge bg-dark" style="font-size:13px; padding:6px 10px; border-radius:8px;">${u.unit}</span></td>
                        <td>
                          <strong style="font-size:14px; color:#0f172a;">${u.tenantName}</strong><br>
                          <small class="text-muted">대표: ${u.repName || '대표자'} (${u.type})</small>
                        </td>
                        <td style="text-align:right; font-weight:700; color:#0f172a; font-family:'Outfit', sans-serif;">${fmt(u.deposit)} 원</td>
                        <td style="text-align:right; font-weight:800; color:#2563eb; font-size:14px; font-family:'Outfit', sans-serif;">${fmt(u.rent)} 원</td>
                        <td style="text-align:right; font-weight:700; color:#64748b; font-family:'Outfit', sans-serif;">${fmt(u.maintenanceFee)} 원</td>
                        <td style="text-align:right; color:#94a3b8; font-family:'Outfit', sans-serif;">${fmt(u.vat || u.rent * 0.1)} 원</td>
                        <td style="text-align:center; font-size:12px;">
                          <div>${u.startDate} ~ ${u.endDate}</div>
                          <span class="badge ${isWarning ? 'bg-danger' : 'bg-secondary'}" style="font-size:11px; margin-top:2px;">
                            ${dday.label}
                          </span>
                        </td>
                        <td style="text-align:center;">
                          ${isPaid ? `
                            <span class="badge bg-success" style="font-size:12px; padding:6px 10px;">🟢 수납완료</span>
                          ` : `
                            <span class="badge bg-danger" style="font-size:12px; padding:6px 10px;">🔴 당월 미납 (${u.unpaidDays || 5}일 연체)</span>
                          `}
                        </td>
                        <td style="text-align:center;">
                          <button type="button" class="btn btn-xs ${isPaid ? 'btn-outline-danger' : 'btn-success'} font-bold" onclick="BuildingRentalModule.togglePaymentStatus(${idx})" style="font-size:12px; padding:4px 10px; border-radius:6px;">
                            ${isPaid ? '미납 처리' : '완납 처리'}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // 서브 탭 2: 월별/연간 수지 결산 (Income & Expense)
    else if (activeSubTab === 'income') {
      html += `
        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#f0fdf4; border-bottom:1.5px solid #bbf7d0; padding:16px 20px;">
                <h3 style="font-size:16px; font-weight:800; color:#15803d; margin:0;"><i class="fas fa-plus-circle me-2"></i> (+) 월간 건물 임대 수입 총액</h3>
              </div>
              <div class="card-body p-0">
                <table class="table align-middle mb-0" style="font-size:13.5px;">
                  <tbody>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">🏬 상가 호실별 월세 총액</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:800; color:#2563eb; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyRent)} 원</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">⚡ 호실별 월 건물 관리비 총액</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:800; color:#0284c7; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyMaint)} 원</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">🧾 건물 월 부가세 (VAT) 별도 수납액</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:700; color:#64748b; font-family:'Outfit', sans-serif;">${fmt(totalVat)} 원</td>
                    </tr>
                    <tr style="background:#f0fdf4; font-weight:800;">
                      <td style="padding:14px 16px; color:#166534; font-size:15px;">월 임대 수입 합계</td>
                      <td style="text-align:right; padding:14px 16px; color:#15803d; font-size:17px; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyIncome)} 원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#fef2f2; border-bottom:1.5px solid #fecaca; padding:16px 20px;">
                <h3 style="font-size:16px; font-weight:800; color:#991b1b; margin:0;"><i class="fas fa-minus-circle me-2"></i> (-) 월간 건물 유지 지출 총액</h3>
              </div>
              <div class="card-body p-0">
                <table class="table align-middle mb-0" style="font-size:13.5px;">
                  <tbody>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">🏦 건물 담보대출 월 이출금</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:800; color:#dc2626; font-family:'Outfit', sans-serif;">${fmt(expObj.mortgageInterest)} 원</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">🔥 건물 화재/재해 종합보험료 (월 할당)</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:700; color:#dc2626; font-family:'Outfit', sans-serif;">${fmt(expObj.fireInsurance)} 원</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">🏛️ 지방 재산세 및 종합부동산세 (월 할당)</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:700; color:#dc2626; font-family:'Outfit', sans-serif;">${fmt(expObj.propertyTax)} 원</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px; font-weight:700;">🛠️ 건물 미화 및 시설 유지보수비</td>
                      <td style="text-align:right; padding:12px 16px; font-weight:700; color:#dc2626; font-family:'Outfit', sans-serif;">${fmt(expObj.buildingMaintenance)} 원</td>
                    </tr>
                    <tr style="background:#fef2f2; font-weight:800;">
                      <td style="padding:14px 16px; color:#991b1b; font-size:15px;">월 유지 지출 합계</td>
                      <td style="text-align:right; padding:14px 16px; color:#be123c; font-size:17px; font-family:'Outfit', sans-serif;">${fmt(totalMonthlyExpense)} 원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- 세금 예상 시뮬레이션 -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header" style="background:#eff6ff; padding:16px 20px; border-bottom:1.5px solid #bfdbfe;">
            <h3 style="font-size:16px; font-weight:800; color:#1e40af; margin:0;"><i class="fas fa-calculator me-2"></i> 연간 예상 종합소득세 및 제세공과금 시뮬레이션</h3>
          </div>
          <div class="card-body p-4">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="p-3" style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                  <span style="font-size:13px; color:#64748b; font-weight:700;">🏛️ 연간 예상 종합소득세 (임대 소득분)</span>
                  <div style="font-size:22px; font-weight:800; color:#1e40af; margin-top:4px; font-family:'Outfit', sans-serif;">약 ${fmt(netAnnualIncome * 0.12)} 원</div>
                  <small class="text-muted">필요경비 공제 및 산출세율 과세표준 적용 추정치</small>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3" style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                  <span style="font-size:13px; color:#64748b; font-weight:700;">🏠 연간 예상 재산세 및 종합부동산세</span>
                  <div style="font-size:22px; font-weight:800; color:#c2410c; margin-top:4px; font-family:'Outfit', sans-serif;">약 ${fmt(expObj.propertyTax * 12)} 원</div>
                  <small class="text-muted">공시가격 시가표준액 기준 보유세 고지 추정치</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 서브 탭 3: 만료/갱신 알림 센터 & 5% 증액 계산기
    else if (activeSubTab === 'renew') {
      const incRent = Math.round(simCurrentRent * (1 + simPercent / 100));
      const addedRentMonth = incRent - simCurrentRent;
      const addedRentYear = addedRentMonth * 12;

      html += `
        <!-- 계약 만료 알림 센터 -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #fde68a; background:#fffbeb; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center" style="background:#fef3c7; padding:16px 20px; border-bottom:1px solid #fde68a;">
            <h3 style="font-size:16px; font-weight:800; color:#b45309; margin:0;"><i class="fas fa-bell me-2"></i> 🔔 3개월 / 6개월 내 계약 만료 도래 알림 센터</h3>
            <span class="badge bg-warning text-dark font-bold" style="font-size:12px;">D-Day 하이라이트</span>
          </div>
          <div class="card-body p-4">
            <div class="row g-3">
              ${units.map(u => {
                const dday = calculateDDay(u.endDate);
                if (dday.days > 180) return '';
                return `
                  <div class="col-md-6">
                    <div class="p-3" style="background:#ffffff; border:1.5px solid #fde68a; border-radius:14px;">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-dark" style="font-size:12px;">${u.unit}</span>
                        <span class="badge bg-danger" style="font-size:12.5px; padding:5px 10px;">${dday.label}</span>
                      </div>
                      <h4 style="font-size:15px; font-weight:800; color:#0f172a; margin-bottom:4px;">${u.tenantName} (${u.repName})</h4>
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
                  <div class="d-flex justify-content-between style="font-size:13.5px;">
                    <span>월 순 추가 수입:</span><strong class="text-success">+${fmt(addedRentMonth)} 원 / 월</strong>
                  </div>
                  <div class="d-flex justify-content-between mt-1 style="font-size:13.5px;">
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

  function togglePaymentStatus(index) {
    const rData = window.SheetsSync.getBuildingRental();
    if (rData.units && rData.units[index]) {
      rData.units[index].status = rData.units[index].status === 'PAID' ? 'UNPAID' : 'PAID';
      if (rData.units[index].status === 'PAID') {
        rData.units[index].unpaidDays = 0;
      } else {
        rData.units[index].unpaidDays = 5;
      }
      window.SheetsSync.saveBuildingRental(rData);
      render('module-content');
    }
  }

  function updateSimRent(val) {
    simCurrentRent = Number(val) || 0;
    render('module-content');
  }

  function updateSimPercent(val) {
    simPercent = Number(val) || 5;
    render('module-content');
  }

  return {
    render,
    setSubTab,
    togglePaymentStatus,
    updateSimRent,
    updateSimPercent
  };
})();
