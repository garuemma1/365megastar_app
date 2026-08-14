/**
 * 11. 메가스타 건물 임대업 대시보드 모듈 컨트롤러 (Megastar Building Rental & Leasing Hub)
 * 약국장 전용: 건물 호실별 임대차 대장, 월세/관리비 완납/연체 관리, 계약 만료 D-60 알림, 임대업 월 순수익 산출
 */
window.BuildingRentalModule = (function () {

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentUser = window.SheetsSync.getCurrentUser();

    // 보안 검증: 약국장만 접근 가능
    if (!currentUser || currentUser.role !== '약국장') {
      container.innerHTML = `
        <div class="alert alert-danger p-4 text-center my-5" style="border-radius:12px;">
          <h4><i class="fas fa-lock"></i> 🔒 접근 권한 제한 영역</h4>
          <p class="mb-0">메가스타 건물 임대업 대시보드는 <strong>약국장(건물주) 전용 보안 메뉴</strong>입니다.</p>
        </div>
      `;
      return;
    }

    const data = window.SheetsSync.getBuildingRental();

    let totalRentIncome = 0;
    let totalMaintenanceIncome = 0;
    let totalDeposit = 0;

    data.units.forEach(u => {
      totalRentIncome += u.rent;
      totalMaintenanceIncome += u.maintenanceFee;
      totalDeposit += u.deposit;
    });

    const totalIncome = totalRentIncome + totalMaintenanceIncome;
    const totalCosts = data.financialSummary.mortgageInterest + data.financialSummary.buildingMaintenance;
    const netRentalIncome = totalIncome - totalCosts;

    const fmt = num => new Intl.NumberFormat('ko-KR').format(Math.round(num));

    const html = `
      <div class="module-header">
        <div>
          <h2>🏢 365메가스타 타워 건물 임대업 대시보드</h2>
          <p class="subtitle">약국장 전용: 건물 호실별 임대차 대장, 월세/관리비 입금 정산, 만료 알림 및 임대 수입 관리</p>
        </div>
        <span class="badge bg-danger" style="font-size:13px; padding:8px 14px; border-radius:20px;">🔒 약국장 전용 임대업 대시보드</span>
      </div>

      <!-- 상단 핵심 4대 임대업 금융 KPI 카드 -->
      <div class="kpi-cards-grid mb-4">
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:linear-gradient(135deg, #065f46, #059669); color:#fff;">
          <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;"><i class="fas fa-building"></i></div>
          <div class="kpi-info">
            <span class="kpi-label" style="color:#a7f3d0;">당월 총 임대/관리비 수입</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#fff;">${fmt(totalIncome)} 원</span>
          </div>
        </div>
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:linear-gradient(135deg, #1e3a8a, #3b82f6); color:#fff;">
          <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;"><i class="fas fa-vault"></i></div>
          <div class="kpi-info">
            <span class="kpi-label" style="color:#bfdbfe;">임대 보증금 총액</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#fff;">${fmt(totalDeposit)} 원</span>
          </div>
        </div>
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:linear-gradient(135deg, #7c2d12, #ea580c); color:#fff;">
          <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;"><i class="fas fa-chart-line"></i></div>
          <div class="kpi-info">
            <span class="kpi-label" style="color:#fed7aa;">임대업 당월 순수익</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#fff;">${fmt(netRentalIncome)} 원</span>
          </div>
        </div>
        <div class="kpi-card" style="padding:20px; border-radius:14px; background:var(--bg-surface); border:1px solid var(--border-color);">
          <div class="kpi-icon" style="background:#dbeafe; color:#2563eb;"><i class="fas fa-door-open"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">총 호실 및 임대율</span>
            <span class="kpi-value" style="font-size:24px; font-weight:bold; color:#2563eb;">4 / 4 호실 (100%)</span>
          </div>
        </div>
      </div>

      <!-- 호실별 임대차 계약 대장 테이블 -->
      <div class="card mb-4" style="border-radius:14px; border:1px solid var(--border-color);">
        <div class="card-header d-flex justify-content-between align-items-center" style="background:var(--bg-hover); padding:16px 20px;">
          <h3 style="font-size:16px; font-weight:bold; margin:0; color:var(--primary-color);"><i class="fas fa-file-contract"></i> 🏢 건물 호실별 임대차 계약 대장 & 입금 정산 현황</h3>
        </div>
        <div class="card-body" style="padding:20px;">
          <div class="table-responsive">
            <table class="table align-middle">
              <thead>
                <tr style="background:#f8fafc;">
                  <th>호실</th>
                  <th>임차인 (상호/업종)</th>
                  <th>보증금</th>
                  <th>월 임대료</th>
                  <th>월 관리비</th>
                  <th>계약 기간</th>
                  <th>당월 입금 상태</th>
                  <th>비고 및 만료 알림</th>
                </tr>
              </thead>
              <tbody>
                ${data.units.map(u => `
                  <tr>
                    <td><span class="badge bg-primary" style="font-size:13px; padding:6px 10px;">${u.unit}</span></td>
                    <td>
                      <strong>${u.tenantName}</strong><br>
                      <small class="text-muted">${u.type}</small>
                    </td>
                    <td><strong>${fmt(u.deposit)} 원</strong></td>
                    <td style="color:#2563eb; font-weight:bold;">${fmt(u.rent)} 원</td>
                    <td style="color:#64748b;">${fmt(u.maintenanceFee)} 원</td>
                    <td style="font-size:13px;">${u.startDate} ~ <strong>${u.endDate}</strong></td>
                    <td>
                      ${u.status === 'PAID' ? '<span class="badge bg-success" style="font-size:12px; padding:6px 10px;">🟢 완납</span>' : '<span class="badge bg-warning text-dark" style="font-size:12px; padding:6px 10px;">🟡 입금 대기</span>'}
                    </td>
                    <td style="font-size:13px;">
                      ${u.note.includes('만료 D-') ? '<span class="badge bg-danger" style="font-size:12px;">⚠️ 만료 임박</span> ' : ''}
                      ${u.note}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 건물 금융 손익 요약 -->
      <div class="card" style="border-radius:14px; border:1px solid var(--border-color);">
        <div class="card-header" style="background:#f8fafc; padding:16px 20px;">
          <h3 style="font-size:16px; font-weight:bold; margin:0; color:#334155;"><i class="fas fa-calculator"></i> 📈 건물 임대업 손익 구조 (P&L)</h3>
        </div>
        <div class="card-body" style="padding:20px;">
          <div class="row g-3">
            <div class="col-md-6">
              <div class="p-3" style="background:#f0fdf4; border-radius:10px;">
                <h4 style="font-size:14px; font-weight:bold; color:#166534; margin-bottom:8px;">(+) 총 임대 수입</h4>
                <div class="d-flex justify-content-between"><span>월 임대료 수입:</span><strong>${fmt(totalRentIncome)} 원</strong></div>
                <div class="d-flex justify-content-between"><span>월 관리비 수입:</span><strong>${fmt(totalMaintenanceIncome)} 원</strong></div>
                <hr>
                <div class="d-flex justify-content-between" style="font-size:16px; font-weight:bold; color:#166534;"><span>수입 합계:</span><span>${fmt(totalIncome)} 원</span></div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-3" style="background:#fef2f2; border-radius:10px;">
                <h4 style="font-size:14px; font-weight:bold; color:#991b1b; margin-bottom:8px;">(-) 건물 유지 지출</h4>
                <div class="d-flex justify-content-between"><span>건물 융자 이자:</span><strong>${fmt(data.financialSummary.mortgageInterest)} 원</strong></div>
                <div class="d-flex justify-content-between"><span>건물 미화/유지보수비:</span><strong>${fmt(data.financialSummary.buildingMaintenance)} 원</strong></div>
                <hr>
                <div class="d-flex justify-content-between" style="font-size:16px; font-weight:bold; color:#991b1b;"><span>지출 합계:</span><span>${fmt(totalCosts)} 원</span></div>
              </div>
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
