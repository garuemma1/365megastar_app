/**
 * 10. 스마트약국 정산 시스템 모듈 컨트롤러 (Smart Pharmacy Financial Settlement Hub)
 * 약국장 전용: 처방 조제 매출, 매장 POS 매출, 약품 사입비, 고정 관리비, 인건비 및 월 최종 약국 순이익(P&L) 산출
 */
window.PharmacySettlementModule = (function () {

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentUser = window.SheetsSync.getCurrentUser();

    // 보안 검증: 약국장만 접근 가능
    if (!currentUser || currentUser.role !== '약국장') {
      container.innerHTML = `
        <div class="alert alert-danger p-4 text-center my-5" style="border-radius:12px;">
          <h4><i class="fas fa-lock"></i> 🔒 접근 권한 제한 영역</h4>
          <p class="mb-0">스마트약국 정산 시스템은 <strong>약국장(대표약사) 전용 보안 메뉴</strong>입니다.</p>
        </div>
      `;
      return;
    }

    const data = window.SheetsSync.getPharmacySettlement();
    const emps = window.SheetsSync.getEmployees();
    const schedule = window.SheetsSync.getSchedule();

    let totalPayrollExpense = 0;
    const pRatesMap = window.SheetsSync.getPharmacistRates ? window.SheetsSync.getPharmacistRates() : {};
    emps.forEach(emp => {
      const empShifts = schedule.filter(s => s.empId === emp.id);
      if (emp.role === '근무약사' || (emp.role || '').includes('약사')) {
        const pRate = pRatesMap[emp.id] || { weekdayRate: emp.hourlyRate || 35000, holidayRate: 40000, breakHours: 1.0 };
        const pay = window.LaborCalculator.calculatePharmacistPayroll(empShifts, pRate.weekdayRate, pRate.holidayRate, pRate.breakHours);
        totalPayrollExpense += pay.totalPayroll;
      } else if (emp.role === '일반직원') {
        const pay = window.LaborCalculator.calculateStaffPayroll(empShifts, 11000);
        totalPayrollExpense += pay.totalMonthlySalary;
      }
    });

    const totalRevenue = data.dispensingRevenue + data.posRevenue;
    const totalExpenses = data.drugPurchaseExpense + data.operatingExpense + data.cardFeeExpense + totalPayrollExpense;
    const netProfit = totalRevenue - totalExpenses;

    const fmt = num => new Intl.NumberFormat('ko-KR').format(Math.round(num));

    const html = `
      <div class="module-header">
        <div>
          <h2>📊 365메가스타약국 스마트 정산 대시보드</h2>
          <p class="subtitle">약국장 전용: 2026년 8월 처방 조제·POS 총매출, 약품 사입비, 인건비 및 월 순이익 P&L 손익 대시보드</p>
        </div>
        <span class="badge bg-danger" style="font-size:13px; padding:8px 14px; border-radius:20px;">🔒 약국장 비공개 대시보드</span>
      </div>

      <!-- 상단 핵심 4대 금융 KPI 카드 -->
      <div class="kpi-cards-grid mb-4">
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#fff;">
          <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;"><i class="fas fa-coins"></i></div>
          <div class="kpi-info">
            <span class="kpi-label" style="color:#93c5fd;">당월 약국 총 매출 (조제+POS)</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#fff;">${fmt(totalRevenue)} 원</span>
          </div>
        </div>
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:linear-gradient(135deg, #991b1b, #dc2626); color:#fff;">
          <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;"><i class="fas fa-file-invoice-dollar"></i></div>
          <div class="kpi-info">
            <span class="kpi-label" style="color:#fca5a5;">당월 총 지출 (사입+인건비+관리비)</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#fff;">${fmt(totalExpenses)} 원</span>
          </div>
        </div>
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:linear-gradient(135deg, #065f46, #10b981); color:#fff;">
          <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;"><i class="fas fa-chart-line"></i></div>
          <div class="kpi-info">
            <span class="kpi-label" style="color:#a7f3d0;">당월 약국 최종 순이익 (P&L)</span>
            <span class="kpi-value" style="font-size:26px; font-weight:extrabold; color:#fff;">${fmt(netProfit)} 원</span>
          </div>
        </div>
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:var(--bg-surface); border:1px solid var(--border-color);">
          <div class="kpi-icon" style="background:#fef3c7; color:#d97706;"><i class="fas fa-percent"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">약국 순이익률</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#d97706;">${((netProfit / totalRevenue) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- 상세 매출 & 지출 구조 분해 손익표 -->
      <div class="row g-4 mb-4">
        <!-- 1. 매출 내역 -->
        <div class="col-md-6">
          <div class="card h-100" style="border-radius:14px; border:1px solid var(--border-color);">
            <div class="card-header" style="background:#eff6ff; padding:16px 20px; border-bottom:1px solid #bfdbfe;">
              <h3 style="font-size:16px; font-weight:bold; margin:0; color:#1e40af;"><i class="fas fa-file-medical-alt"></i> 1. 당월 매출 집계 (Revenue Breakdown)</h3>
            </div>
            <div class="card-body" style="padding:20px;">
              <table class="table align-middle">
                <tbody>
                  <tr>
                    <td><strong>💊 처방전 조제 총 매출</strong><br><small class="text-muted">조제료 1,850만 + 본인부담 1,200만 + 공단청구 1,800만</small></td>
                    <td class="text-end font-weight-bold" style="font-size:16px; color:#1e40af;">${fmt(data.dispensingRevenue)} 원</td>
                  </tr>
                  <tr>
                    <td><strong>🛒 매장 POS 매출</strong><br><small class="text-muted">일반의약품, 영양제, 의약외품 (카드 85% / 현금 15%)</small></td>
                    <td class="text-end font-weight-bold" style="font-size:16px; color:#1e40af;">${fmt(data.posRevenue)} 원</td>
                  </tr>
                  <tr style="background:#f8fafc; font-weight:bold;">
                    <td>총 매출 합계</td>
                    <td class="text-end style="font-size:18px; color:#2563eb;">${fmt(totalRevenue)} 원</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2. 지출 내역 -->
        <div class="col-md-6">
          <div class="card h-100" style="border-radius:14px; border:1px solid var(--border-color);">
            <div class="card-header" style="background:#fef2f2; padding:16px 20px; border-bottom:1px solid #fecaca;">
              <h3 style="font-size:16px; font-weight:bold; margin:0; color:#991b1b;"><i class="fas fa-file-invoice-dollar"></i> 2. 당월 지출 집계 (Expenses Breakdown)</h3>
            </div>
            <div class="card-body" style="padding:20px;">
              <table class="table align-middle">
                <tbody>
                  <tr>
                    <td><strong>📦 약품 사입비 (도매상)</strong><br><small class="text-muted">지오영, 백제약품, 동원약품, 유진약품 입고 정산</small></td>
                    <td class="text-end font-weight-bold" style="color:#dc2626;">${fmt(data.drugPurchaseExpense)} 원</td>
                  </tr>
                  <tr>
                    <td><strong>👨‍⚕️ 직원 인건비 총액</strong><br><small class="text-muted">약국 9인 급여 정산표 자동 연동 집계</small></td>
                    <td class="text-end font-weight-bold" style="color:#dc2626;">${fmt(totalPayrollExpense)} 원</td>
                  </tr>
                  <tr>
                    <td><strong>🏢 약국 고정 관리비</strong><br><small class="text-muted">임대료 350만 + 건물관리비 80만 + 세무/보안/기타</small></td>
                    <td class="text-end font-weight-bold" style="color:#dc2626;">${fmt(data.operatingExpense)} 원</td>
                  </tr>
                  <tr>
                    <td><strong>💳 카드 가맹점 수수료</strong><br><small class="text-muted">POS 및 카운터 결제 수수료 (약 1.5%)</small></td>
                    <td class="text-end font-weight-bold" style="color:#dc2626;">${fmt(data.cardFeeExpense)} 원</td>
                  </tr>
                  <tr style="background:#fff5f5; font-weight:bold;">
                    <td>총 지출 합계</td>
                    <td class="text-end style="font-size:18px; color:#dc2626;">${fmt(totalExpenses)} 원</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  return {
    render
  };
})();
