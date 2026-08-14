/**
 * 10. 스마트약국 정산 시스템 모듈 컨트롤러 (Smart Pharmacy Financial Settlement Engine v33.0)
 * 약국장 전용: 3종 엑셀 데이터(일일결산 회계장부 1순위 / 월간손익 P&L 2순위 / 연도별 장기성장통계 3순위)
 * 일반매출, 카드/현금 수입 세분화 및 구글 시트 엑셀 실시간 연동
 */
window.PharmacySettlementModule = (function () {

  let activeSubTab = 'daily'; // 1순위: 'daily' | 2순위: 'pnl' | 3순위: 'yearly'

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
          <p class="mb-0">스마트약국 정산 시스템은 <strong>약국장(대표약사) 전용 보안 대시보드</strong>입니다.</p>
        </div>
      `;
      return;
    }

    const pData = window.SheetsSync.getPharmacySettlement();
    const emps = window.SheetsSync.getEmployees();
    const schedule = window.SheetsSync.getSchedule();

    // 1. 인건비 실시간 자동 계산 (9인 직원 정산 연동)
    let totalPayrollExpense = 0;
    const pRatesMap = window.SheetsSync.getPharmacistRates ? window.SheetsSync.getPharmacistRates() : {};
    const payrollDetails = emps.map(emp => {
      const empShifts = schedule.filter(s => s.empId === emp.id);
      let payAmount = 0;
      if (emp.role === '근무약사' || (emp.role || '').includes('약사')) {
        const pRate = pRatesMap[emp.id] || { weekdayRate: emp.hourlyRate || 40000, holidayRate: 40000, breakHours: 1.0 };
        const calc = window.LaborCalculator.calculatePharmacistPayroll(empShifts, pRate.weekdayRate, pRate.holidayRate, pRate.breakHours);
        payAmount = calc.totalPayroll;
      } else {
        const baseSal = Number(emp.baseMonthlySalary) || (emp.name === '이승학' ? 2821500 : 2717000);
        payAmount = baseSal;
      }
      totalPayrollExpense += payAmount;

      // 퇴직적립금 추정액 (월선급 1/12)
      const severanceAccrual = Math.round(payAmount / 12);

      return {
        emp,
        payAmount,
        severanceAccrual
      };
    });

    // 2. 수입 산출 (일반매출, 카드 수입, 현금 수입 추가)
    const dispensingFee = Number(pData.dispensingFee) || 18500000;
    const generalRevenue = Number(pData.generalRevenue || pData.posRevenue) || 24200000;
    const patientCopay = Number(pData.patientCopay) || 12000000;
    const nhisClaim = Number(pData.nhisClaim) || 18000000;
    const otherIncome = Number(pData.otherIncome) || 1800000;
    const totalRevenue = dispensingFee + generalRevenue + patientCopay + nhisClaim + otherIncome;

    // 카드 수입 & 현금 수입 (미설정 시 총수입의 85%/15% 자동 할당)
    const cardRevenue = Number(pData.cardRevenue) || Math.round(totalRevenue * 0.85);
    const cashRevenue = Number(pData.cashRevenue) || (totalRevenue - cardRevenue);

    // 3. 약품 사입비 산출 (도매상 현금 + 제약사 카드)
    const cashWholesaleObj = pData.cashWholesale || { '다우약품': 12400000, '산성호': 8500000, '백제약품': 7200000, '지오영': 6800000 };
    const cardPharmaObj = pData.cardPharma || { '대웅제약': 2400000, '동화약품': 1800000, '일양약품': 1200000, '비타민하우스': 950000, 'GC녹십자': 1050000 };

    let totalCashWholesale = 0;
    Object.values(cashWholesaleObj).forEach(v => totalCashWholesale += Number(v) || 0);

    let totalCardPharma = 0;
    Object.values(cardPharmaObj).forEach(v => totalCardPharma += Number(v) || 0);

    const totalDrugCost = totalCashWholesale + totalCardPharma;

    // 4. 공과금 및 고정비
    const rentExp = Number(pData.rentExpense) || 3500000;
    const maintExp = Number(pData.maintExpense) || 500000;
    const ins4Cost = Number(pData.insurance4Cost) || 1850000;
    const taxFee = Number(pData.taxAccountantFee) || 220000;
    const posFee = Number(pData.posCardFee) || 1120000;
    const totalFixedOperating = rentExp + maintExp + ins4Cost + taxFee + posFee;

    // 5. 금융비용
    const loanInterest = Number(pData.loanInterest) || 2150000;
    const loanPrincipal = Number(pData.loanPrincipal) || 1500000;
    const totalFinancialCost = loanInterest + loanPrincipal;

    // 6. 총지출 및 순이익
    const totalExpenses = totalDrugCost + totalPayrollExpense + totalFixedOperating + totalFinancialCost;
    const netProfit = totalRevenue - totalExpenses;
    const marginRate = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    // 일평균 매출
    const dailyAvgRev = Math.round(totalRevenue / 31);

    const fmt = num => new Intl.NumberFormat('ko-KR').format(Math.round(num || 0));

    let html = `
      <div class="module-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 style="font-size:22px; font-weight:800; color:#0f172a; margin:0;"><i class="fas fa-calculator text-primary me-2"></i> 📊 365메가스타약국 스마트 정산 대시보드</h2>
          <p class="subtitle" style="font-size:13px; color:#64748b; margin:4px 0 0 0;">약국장 전용: 2026년 8월 일일결산 장부, 처방 조제·일반매출, 카드/현금 수입, 사입비 및 월 P&L 손익계산서</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-outline-success font-bold" onclick="PharmacySettlementModule.openImportModal()" style="border-radius:10px; padding:7px 14px; font-size:13px; box-shadow:0 2px 6px rgba(16,185,129,0.15);">
            <i class="fas fa-file-import text-success me-1"></i> 📥 구글 스프레드시트 불러오기
          </button>
          <button type="button" class="btn btn-outline-primary font-bold" onclick="App.downloadActiveModuleToGoogleSheets()" style="border-radius:10px; padding:7px 14px; font-size:13px; box-shadow:0 2px 6px rgba(37,99,235,0.15);">
            <i class="fas fa-file-export text-primary me-1"></i> 📊 구글 스프레드시트 내보내기
          </button>
          <span class="badge bg-danger" style="font-size:12.5px; padding:8px 14px; border-radius:10px;">🔐 약국장 전용 보안 대시보드</span>
        </div>
      </div>

      <!-- 💡 상단 핵심 KPI 요약 카드 (Executive Summary KPI Cards) -->
      <div class="row g-3 mb-4">
        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">당월 약국 총 수입</span>
              <div class="kpi-icon-avatar kpi-avatar-blue">
                <i class="fas fa-wallet"></i>
              </div>
            </div>
            <div class="kpi-number-display text-primary">
              ${fmt(totalRevenue)} <span class="currency-unit" style="font-size:14px; font-weight:700;">원</span>
            </div>
            <div class="kpi-subtitle-text">
              조제료 ${fmt(dispensingFee + patientCopay + nhisClaim)}원 · 일반매출 ${fmt(generalRevenue)}원
            </div>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">당월 약국 총 지출</span>
              <div class="kpi-icon-avatar kpi-avatar-red">
                <i class="fas fa-file-invoice-dollar"></i>
              </div>
            </div>
            <div class="kpi-number-display text-danger">
              ${fmt(totalExpenses)} <span class="currency-unit" style="font-size:14px; font-weight:700;">원</span>
            </div>
            <div class="kpi-subtitle-text">
              약품비 ${fmt(totalDrugCost)}원 · 인건비 ${fmt(totalPayrollExpense)}원
            </div>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">당월 약국 순이익 (P&L)</span>
              <div class="kpi-icon-avatar kpi-avatar-emerald">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>
            <div class="kpi-number-display text-success">
              ${fmt(netProfit)} <span class="currency-unit" style="font-size:14px; font-weight:700;">원</span>
            </div>
            <div class="kpi-subtitle-text d-flex align-items-center gap-1">
              <span>손익 마진율:</span>
              <span class="badge bg-success" style="font-size:11px; padding:3px 7px; border-radius:6px;">${marginRate}%</span>
            </div>
          </div>
        </div>

        <div class="col-md-3 col-6">
          <div class="kpi-summary-card">
            <div class="kpi-header-row">
              <span class="kpi-title-text">일평균 매출액 (31일)</span>
              <div class="kpi-icon-avatar kpi-avatar-amber">
                <i class="fas fa-calendar-day"></i>
              </div>
            </div>
            <div class="kpi-number-display text-warning" style="color:#d97706 !important;">
              ${fmt(dailyAvgRev)} <span class="currency-unit" style="font-size:14px; font-weight:700;">원</span>
            </div>
            <div class="kpi-subtitle-text">
              매일 평균 조제 + 일반매출 자동 연동
            </div>
          </div>
        </div>
      </div>

      <!-- 📌 세부 3대 서브 탭 네비게이션 (순서 개편: 1.일일결산 -> 2.월간손익 -> 3.장기통계) -->
      <div class="d-flex gap-2 border-bottom pb-3 mb-4 flex-wrap">
        <button type="button" class="btn ${activeSubTab === 'daily' ? 'btn-primary font-bold' : 'btn-outline-secondary'}" onclick="PharmacySettlementModule.setSubTab('daily')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-book me-1"></i> ① 일일 결산 & 회계 장부 (Daily Log)
        </button>
        <button type="button" class="btn ${activeSubTab === 'pnl' ? 'btn-primary font-bold' : 'btn-outline-secondary'}" onclick="PharmacySettlementModule.setSubTab('pnl')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-file-invoice me-1"></i> ② 월간 종합 손익계산서 (P&L View)
        </button>
        <button type="button" class="btn ${activeSubTab === 'yearly' ? 'btn-primary font-bold' : 'btn-outline-secondary'}" onclick="PharmacySettlementModule.setSubTab('yearly')" style="border-radius:10px; padding:10px 20px; font-size:14px;">
          <i class="fas fa-chart-bar me-1"></i> ③ 연도별 장기 성장 통계 (Historical Trends)
        </button>
      </div>
    `;

    // 1순위 서브 탭: 일일 결산 & 회계 장부 (Daily Log)
    if (activeSubTab === 'daily') {
      const dailyLogs = pData.dailyLogs || [];

      html += `
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style="background:#0f172a; color:#ffffff; padding:16px 20px;">
            <h3 style="font-size:16.5px; font-weight:800; margin:0; color:#ffffff;"><i class="fas fa-book-open me-2 text-warning"></i> 2026년 8월 일일 결산 및 회계 장부 (Daily Log)</h3>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-outline-light font-bold" onclick="App.downloadActiveModuleToGoogleSheets()">
                <i class="fas fa-file-excel text-success me-1"></i> 구글 시트 연동 다운로드
              </button>
              <span style="font-size:12.5px; color:#cbd5e1;">전일 대비 증감 및 요일별 매출 추이</span>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-striped table-hover align-middle mb-0" style="font-size:13px;">
                <thead style="background:#f1f5f9; color:#334155;">
                  <tr>
                    <th style="text-align:center; padding:10px; width:110px;">일자</th>
                    <th style="text-align:center; padding:10px; width:60px;">요일</th>
                    <th style="text-align:right; padding:10px;">조제 매출</th>
                    <th style="text-align:right; padding:10px;">일반 매출</th>
                    <th style="text-align:right; padding:10px;">일 총 매출</th>
                    <th style="text-align:center; padding:10px; width:100px;">카드/현금 비중</th>
                    <th style="text-align:right; padding:10px;">일 소액지출</th>
                    <th style="padding:10px;">비고 및 특이사항</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyLogs.map(log => `
                    <tr>
                      <td style="text-align:center; font-weight:700; color:#0f172a;">${log.date}</td>
                      <td style="text-align:center;">
                        <span class="${log.dayOfWeek === '일' ? 'text-danger font-bold' : (log.dayOfWeek === '토' ? 'text-primary font-bold' : 'text-dark')}">
                          ${log.dayOfWeek}요일
                        </span>
                      </td>
                      <td style="text-align:right; font-weight:700; color:#1e40af; font-family:'Outfit', sans-serif;">${fmt(log.dispensingRevenue)} 원</td>
                      <td style="text-align:right; font-weight:700; color:#0369a1; font-family:'Outfit', sans-serif;">${fmt(log.posRevenue)} 원</td>
                      <td style="text-align:right; font-weight:800; color:#15803d; font-family:'Outfit', sans-serif;">${fmt(log.totalRevenue)} 원</td>
                      <td style="text-align:center;">
                        <span class="badge bg-light text-dark" style="border:1px solid #cbd5e1; font-size:11px;">카드 ${log.cardPay > 0 ? Math.round((log.cardPay/log.totalRevenue)*100) : 85}%</span>
                      </td>
                      <td style="text-align:right; color:#dc2626; font-weight:600; font-family:'Outfit', sans-serif;">${fmt(log.dailyExpense)} 원</td>
                      <td style="color:#64748b; font-size:12px;">${log.note}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // 2순위 서브 탭: 월간 종합 손익계산서 (P&L View)
    else if (activeSubTab === 'pnl') {
      html += `
        <!-- 1. 수입 세부 분석 (카드 수입 & 현금 수입 신규 추가 및 일반매출 용어 적용) -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center" style="background:#eff6ff; border-bottom:1.5px solid #bfdbfe; padding:16px 20px;">
            <h3 style="font-size:16px; font-weight:800; color:#1e40af; margin:0;"><i class="fas fa-coins me-2"></i> 1. 수입 분석 (Revenue Breakdown)</h3>
            <span class="badge bg-primary" style="font-size:12.5px;">총 수입: ${fmt(totalRevenue)} 원</span>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table align-middle mb-0" style="font-size:13.5px;">
                <thead style="background:#f8fafc; color:#334155;">
                  <tr>
                    <th style="padding:12px 16px;">수입 항목 구별</th>
                    <th style="padding:12px 16px;">세부 설명 및 산출 기준</th>
                    <th style="text-align:right; padding:12px 16px; width:220px;">당월 수입 금액 (원)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:700; color:#0f172a;">💊 조제료 수입</td>
                    <td style="color:#64748b;">처방전 조제기술료 및 행위료 총액</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-primary" style="font-size:14px; border-radius:8px; border:1.5px solid #93c5fd;" value="${dispensingFee}" onchange="PharmacySettlementModule.updateField('dispensingFee', this.value)">
                    </td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:#0f172a;">🛒 매장 일반매출</td>
                    <td style="color:#64748b;">일반의약품, 영양제, 의약외품, 마스크 등 카운터 일반매출 결제액</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-primary" style="font-size:14px; border-radius:8px; border:1.5px solid #93c5fd;" value="${generalRevenue}" onchange="PharmacySettlementModule.updateField('generalRevenue', this.value)">
                    </td>
                  </tr>
                  <tr style="background:#f8fafc;">
                    <td style="font-weight:700; color:#2563eb; padding-left:28px;">💳 (세분화) 카드 수입</td>
                    <td style="color:#64748b;">당월 총 수입 중 신용/체크 카드 가맹점 입금액 (약 85%)</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-primary" style="font-size:14px; border-radius:8px; border:1.5px solid #93c5fd;" value="${cardRevenue}" onchange="PharmacySettlementModule.updateField('cardRevenue', this.value)">
                    </td>
                  </tr>
                  <tr style="background:#f8fafc;">
                    <td style="font-weight:700; color:#059669; padding-left:28px;">💵 (세분화) 현금 수입</td>
                    <td style="color:#64748b;">당월 총 수입 중 현금 및 통장 계좌이체 수납액 (약 15%)</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-success" style="font-size:14px; border-radius:8px; border:1.5px solid #a7f3d0;" value="${cashRevenue}" onchange="PharmacySettlementModule.updateField('cashRevenue', this.value)">
                    </td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:#0f172a;">🏥 환자 본인부담금</td>
                    <td style="color:#64748b;">처방전 조제 시 환자 직접 현금/카드 창구 결제액</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-primary" style="font-size:14px; border-radius:8px; border:1.5px solid #93c5fd;" value="${patientCopay}" onchange="PharmacySettlementModule.updateField('patientCopay', this.value)">
                    </td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:#0f172a;">🏛️ 국민건강보험공단 청구금</td>
                    <td style="color:#64748b;">심평원 미지급 청구 및 공단 입금 요양급여비</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-primary" style="font-size:14px; border-radius:8px; border:1.5px solid #93c5fd;" value="${nhisClaim}" onchange="PharmacySettlementModule.updateField('nhisClaim', this.value)">
                    </td>
                  </tr>
                  <tr>
                    <td style="font-weight:700; color:#0f172a;">🔮 비급여 및 기타수입</td>
                    <td style="color:#64748b;">비급여 처방약, 주사제, 제조/판매 기타 제수입</td>
                    <td style="text-align:right;">
                      <input type="number" class="form-control form-control-sm text-end font-bold text-primary" style="font-size:14px; border-radius:8px; border:1.5px solid #93c5fd;" value="${otherIncome}" onchange="PharmacySettlementModule.updateField('otherIncome', this.value)">
                    </td>
                  </tr>
                  <tr style="background:#eff6ff; font-weight:800;">
                    <td colspan="2" style="font-size:15px; color:#1e40af;">총 수입 합계 (Total Gross Revenue)</td>
                    <td style="text-align:right; font-size:16px; color:#1d4ed8; font-family:'Outfit', sans-serif;">${fmt(totalRevenue)} 원</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2. 약품 결제 분석 (도매상 및 제약사 현금결제 + 도매상 및 제약사 카드결제) -->
        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#fef2f2; border-bottom:1.5px solid #fecaca; padding:16px 20px;">
                <h3 style="font-size:15.5px; font-weight:800; color:#991b1b; margin:0;"><i class="fas fa-truck-loading me-2"></i> 2-A. 도매상 및 제약사 현금결제</h3>
              </div>
              <div class="card-body p-0">
                <table class="table align-middle mb-0" style="font-size:13px;">
                  <tbody>
                    ${Object.entries(cashWholesaleObj).map(([name, val]) => `
                      <tr>
                        <td style="font-weight:700; color:#0f172a; padding:10px 16px;">🏢 ${name}</td>
                        <td style="text-align:right; padding:10px 16px;">
                          <input type="number" class="form-control form-control-sm text-end font-bold text-danger" style="width:140px; display:inline-block; border-radius:8px; border:1.5px solid #fca5a5;" value="${val}" onchange="PharmacySettlementModule.updateSubField('cashWholesale', '${name}', this.value)">
                        </td>
                      </tr>
                    `).join('')}
                    <tr style="background:#fef2f2; font-weight:800;">
                      <td style="color:#991b1b; padding:10px 16px;">도매상 및 제약사 현금결제 소계</td>
                      <td style="text-align:right; color:#dc2626; font-size:15px; padding:10px 16px; font-family:'Outfit', sans-serif;">${fmt(totalCashWholesale)} 원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#fff7ed; border-bottom:1.5px solid #fed7aa; padding:16px 20px;">
                <h3 style="font-size:15.5px; font-weight:800; color:#c2410c; margin:0;"><i class="fas fa-credit-card me-2"></i> 2-B. 도매상 및 제약사 카드결제</h3>
              </div>
              <div class="card-body p-0">
                <table class="table align-middle mb-0" style="font-size:13px;">
                  <tbody>
                    ${Object.entries(cardPharmaObj).map(([name, val]) => `
                      <tr>
                        <td style="font-weight:700; color:#0f172a; padding:10px 16px;">💊 ${name}</td>
                        <td style="text-align:right; padding:10px 16px;">
                          <input type="number" class="form-control form-control-sm text-end font-bold text-danger" style="width:140px; display:inline-block; border-radius:8px; border:1.5px solid #fdba74;" value="${val}" onchange="PharmacySettlementModule.updateSubField('cardPharma', '${name}', this.value)">
                        </td>
                      </tr>
                    `).join('')}
                    <tr style="background:#fff7ed; font-weight:800;">
                      <td style="color:#c2410c; padding:10px 16px;">도매상 및 제약사 카드결제 소계</td>
                      <td style="text-align:right; color:#ea580c; font-size:15px; padding:10px 16px; font-family:'Outfit', sans-serif;">${fmt(totalCardPharma)} 원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 인건비 및 퇴직적립금 분석 (9인 직원 자동 연동) -->
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center" style="background:#f0fdf4; border-bottom:1.5px solid #bbf7d0; padding:16px 20px;">
            <h3 style="font-size:16px; font-weight:800; color:#15803d; margin:0;"><i class="fas fa-users me-2"></i> 3. 인건비 및 퇴직적립금 분석 (Labor Cost Breakdown - 9인)</h3>
            <span class="badge bg-success" style="font-size:12.5px;">당월 총 인건비: ${fmt(totalPayrollExpense)} 원</span>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table align-middle mb-0" style="font-size:13px;">
                <thead style="background:#f8fafc;">
                  <tr>
                    <th style="padding:10px 14px;">직원명</th>
                    <th style="padding:10px 10px;">직무 구분</th>
                    <th style="text-align:right; padding:10px 14px;">당월 급여 지급액</th>
                    <th style="text-align:right; padding:10px 14px;">월 퇴직적립금 (1/12)</th>
                    <th style="padding:10px 14px;">적립 상태</th>
                  </tr>
                </thead>
                <tbody>
                  ${payrollDetails.map(item => `
                    <tr>
                      <td style="padding:10px 14px; font-weight:700; color:#0f172a;">👤 ${item.emp.name}</td>
                      <td style="padding:10px 10px;">
                        <span class="badge ${item.emp.role.includes('약사') ? 'bg-primary' : 'bg-success'}" style="font-size:11.5px; padding:3px 8px;">
                          ${item.emp.position || item.emp.role}
                        </span>
                      </td>
                      <td style="text-align:right; padding:10px 14px; font-weight:800; color:#15803d; font-family:'Outfit', sans-serif;">
                        ${fmt(item.payAmount)} 원
                      </td>
                      <td style="text-align:right; padding:10px 14px; font-weight:700; color:#0284c7; font-family:'Outfit', sans-serif;">
                        ${fmt(item.severanceAccrual)} 원
                      </td>
                      <td style="padding:10px 14px;">
                        <span class="badge bg-light text-dark" style="border:1px solid #cbd5e1; font-size:11px; padding:3px 8px;">🟢 정상 적립 중</span>
                      </td>
                    </tr>
                  `).join('')}
                  <tr style="background:#f0fdf4; font-weight:800;">
                    <td colspan="2" style="color:#166534; padding:12px 14px;">인건비 총액 합계</td>
                    <td style="text-align:right; color:#15803d; font-size:15.5px; padding:12px 14px; font-family:'Outfit', sans-serif;">${fmt(totalPayrollExpense)} 원</td>
                    <td style="text-align:right; color:#0369a1; font-size:14.5px; padding:12px 14px; font-family:'Outfit', sans-serif;">${fmt(totalPayrollExpense / 12)} 원</td>
                    <td>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 4. 고정비 & 금융비용 -->
        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; padding:16px 20px;">
                <h3 style="font-size:15.5px; font-weight:800; color:#334155; margin:0;"><i class="fas fa-building me-2"></i> 4. 공과금 및 고정 관리비</h3>
              </div>
              <div class="card-body p-0">
                <table class="table align-middle mb-0" style="font-size:13px;">
                  <tbody>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">🏢 약국 월 임차료</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold" style="width:140px; display:inline-block;" value="${rentExp}" onchange="PharmacySettlementModule.updateField('rentExpense', this.value)">
                      </td>
                    </tr>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">⚡ 건물 관리비 (전기/수도 포함)</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold" style="width:140px; display:inline-block;" value="${maintExp}" onchange="PharmacySettlementModule.updateField('maintExpense', this.value)">
                      </td>
                    </tr>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">🛡️ 4대보험 약국 사업주 부담금</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold" style="width:140px; display:inline-block;" value="${ins4Cost}" onchange="PharmacySettlementModule.updateField('insurance4Cost', this.value)">
                      </td>
                    </tr>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">📑 세무사 기장료 및 결산 수수료</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold" style="width:140px; display:inline-block;" value="${taxFee}" onchange="PharmacySettlementModule.updateField('taxAccountantFee', this.value)">
                      </td>
                    </tr>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">💳 일반매출/카드결제/통신 수수료</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold" style="width:140px; display:inline-block;" value="${posFee}" onchange="PharmacySettlementModule.updateField('posCardFee', this.value)">
                      </td>
                    </tr>
                    <tr style="background:#f8fafc; font-weight:800;">
                      <td style="padding:10px 16px;">고정 관리비 소계</td>
                      <td style="text-align:right; font-size:15px; color:#0f172a; padding:10px 16px; font-family:'Outfit', sans-serif;">${fmt(totalFixedOperating)} 원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card h-100 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
              <div class="card-header" style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; padding:16px 20px;">
                <h3 style="font-size:15.5px; font-weight:800; color:#334155; margin:0;"><i class="fas fa-university me-2"></i> 5. 금융비용 및 원리금 상환</h3>
              </div>
              <div class="card-body p-0">
                <table class="table align-middle mb-0" style="font-size:13px;">
                  <tbody>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">🏦 약국 담보/운전자금 대출 이자</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold text-danger" style="width:140px; display:inline-block;" value="${loanInterest}" onchange="PharmacySettlementModule.updateField('loanInterest', this.value)">
                      </td>
                    </tr>
                    <tr>
                      <td style="font-weight:700; padding:10px 16px;">💸 대출 원리금 상환액</td>
                      <td style="text-align:right; padding:10px 16px;">
                        <input type="number" class="form-control form-control-sm text-end font-bold text-danger" style="width:140px; display:inline-block;" value="${loanPrincipal}" onchange="PharmacySettlementModule.updateField('loanPrincipal', this.value)">
                      </td>
                    </tr>
                    <tr style="background:#f8fafc; font-weight:800;">
                      <td style="padding:10px 16px;">금융비용 소계</td>
                      <td style="text-align:right; font-size:15px; color:#be123c; padding:10px 16px; font-family:'Outfit', sans-serif;">${fmt(totalFinancialCost)} 원</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 3순위 서브 탭: 연도별 장기 성장 통계 (Historical Trends)
    else if (activeSubTab === 'yearly') {
      const stats = pData.yearlyStats || [];

      html += `
        <div class="card mb-4 shadow-sm" style="border-radius:18px; border:1.5px solid #cbd5e1; overflow:hidden;">
          <div class="card-header d-flex justify-content-between align-items-center" style="background:#0f172a; color:#ffffff; padding:16px 20px;">
            <h3 style="font-size:16.5px; font-weight:800; margin:0; color:#ffffff;"><i class="fas fa-chart-line me-2 text-success"></i> 2021년 ~ 2026년 연도별 장기 성장 통계 (Historical Trends)</h3>
            <span class="badge bg-success" style="font-size:12.5px; padding:6px 12px;">연평균 성장률(CAGR): +14.2%</span>
          </div>
          <div class="card-body p-4">
            <div class="table-responsive mb-4">
              <table class="table table-bordered align-middle text-center" style="font-size:13.5px;">
                <thead style="background:#f8fafc; color:#334155;">
                  <tr>
                    <th>연도</th>
                    <th>연 총 매출액</th>
                    <th>약품 사입비</th>
                    <th>총 인건비</th>
                    <th>고정 관리비</th>
                    <th>연 영업 순이익</th>
                    <th>손익 마진율 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.map(s => `
                    <tr class="${s.year === 2026 ? 'table-success font-bold' : ''}">
                      <td style="font-weight:800;">${s.year}년 ${s.year === 2026 ? '(당해 연도)' : ''}</td>
                      <td style="color:#1d4ed8; font-weight:800; font-family:'Outfit', sans-serif;">${fmt(s.revenue)} 원</td>
                      <td style="color:#dc2626; font-family:'Outfit', sans-serif;">${fmt(s.drugCost)} 원</td>
                      <td style="color:#15803d; font-family:'Outfit', sans-serif;">${fmt(s.payroll)} 원</td>
                      <td style="color:#64748b; font-family:'Outfit', sans-serif;">${fmt(s.operating)} 원</td>
                      <td style="color:#047857; font-weight:800; font-size:15px; font-family:'Outfit', sans-serif;">${fmt(s.profit)} 원</td>
                      <td>
                        <span class="badge bg-success" style="font-size:12px; padding:4px 8px;">${s.margin}%</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="alert alert-info p-3" style="border-radius:12px; font-size:13.5px;">
              💡 <strong>계절별 매출 사이클 비교 분석:</strong> 봄/가을 환절기(3~5월, 9~11월) 처방 조제 매출이 연간 매출의 약 58%를 차지하며, 여름철(7~8월)에는 영양제 및 일반의약품 매출 비중이 상승하는 경향을 보입니다.
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function updateField(field, val) {
    const data = window.SheetsSync.getPharmacySettlement();
    data[field] = Number(val) || 0;
    window.SheetsSync.savePharmacySettlement(data);
    render('module-content');
  }

  function updateSubField(category, key, val) {
    const data = window.SheetsSync.getPharmacySettlement();
    if (!data[category]) data[category] = {};
    data[category][key] = Number(val) || 0;
    window.SheetsSync.savePharmacySettlement(data);
    render('module-content');
  }

  function openImportModal() {
    let input = document.getElementById('ps-csv-file-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'ps-csv-file-input';
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
        const pData = window.SheetsSync.getPharmacySettlement();

        lines.forEach(line => {
          const parts = line.split(',').map(s => s.replace(/"/g, '').trim());
          if (parts.length >= 2) {
            const keyName = parts[0];
            const numVal = Number(parts[parts.length - 1]);
            if (!isNaN(numVal) && numVal >= 0) {
              if (keyName.includes('조제료') || keyName.includes('dispensingFee')) pData.dispensingFee = numVal;
              else if (keyName.includes('일반매출') || keyName.includes('generalRevenue')) pData.generalRevenue = numVal;
              else if (keyName.includes('카드 수입') || keyName.includes('cardRevenue')) pData.cardRevenue = numVal;
              else if (keyName.includes('현금 수입') || keyName.includes('cashRevenue')) pData.cashRevenue = numVal;
              else if (keyName.includes('본인부담금') || keyName.includes('patientCopay')) pData.patientCopay = numVal;
              else if (keyName.includes('청구금') || keyName.includes('nhisClaim')) pData.nhisClaim = numVal;
              else if (keyName.includes('기타수입') || keyName.includes('otherIncome')) pData.otherIncome = numVal;
              else if (keyName.includes('임차료') || keyName.includes('rentExpense')) pData.rentExpense = numVal;
              else if (keyName.includes('관리비') || keyName.includes('maintExpense')) pData.maintExpense = numVal;
              else if (keyName.includes('4대보험') || keyName.includes('insurance4Cost')) pData.insurance4Cost = numVal;
              else if (keyName.includes('기장료') || keyName.includes('taxAccountantFee')) pData.taxAccountantFee = numVal;
              else if (keyName.includes('통신 수수료') || keyName.includes('posCardFee')) pData.posCardFee = numVal;
              else if (keyName.includes('대출 이자') || keyName.includes('loanInterest')) pData.loanInterest = numVal;
              else if (keyName.includes('원리금 상환액') || keyName.includes('loanPrincipal')) pData.loanPrincipal = numVal;
              else if (['다우약품', '산성호', '백제약품', '지오영'].some(k => keyName.includes(k))) {
                if (!pData.cashWholesale) pData.cashWholesale = {};
                pData.cashWholesale[keyName] = numVal;
              }
              else if (['대웅제약', '동화약품', '일양약품', '비타민하우스', 'GC녹십자'].some(k => keyName.includes(k))) {
                if (!pData.cardPharma) pData.cardPharma = {};
                pData.cardPharma[keyName] = numVal;
              }
            }
          }
        });

        window.SheetsSync.savePharmacySettlement(pData);
        render('module-content');
        alert(`🎉 구글 스프레드시트 파일(${file.name}) 데이터가 스마트약국 정산으로 연동 반영되었습니다!`);
      } catch (err) {
        alert('❌ 파일 읽기 중 오류가 발생했습니다. 구글 시트에서 다운로드한 CSV 파일 형식을 확인해 주세요.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  return {
    render,
    setSubTab,
    updateField,
    updateSubField,
    openImportModal
  };
})();
