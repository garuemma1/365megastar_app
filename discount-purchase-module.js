/**
 * 직원할인구매대장 모듈 컨트롤러 (Staff Discount Purchase Log Module)
 * 권한 통제 완벽 적용 + PC/모바일 반응형 테이블 글씨 깨짐 방지 및 레이아웃 밸런스 최적화
 */
window.DiscountPurchaseModule = (function () {

  let currentTab = 'monthly';
  let searchQuery = '';
  let discountBarChartInstance = null;
  let discountDonutChartInstance = null;

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    try {
      const data = window.SheetsSync.getData();
      const purchases = data.discountPurchases || [];
      const employees = data.employees || [];

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const stats = calculatePurchaseStats(purchases, currentYear, currentMonth);
      const monthLabel = `${currentYear}년 ${String(currentMonth).padStart(2,'0')}월`;

      const html = `
        <div class="module-header flex justify-between items-center mb-4">
          <div>
            <h2 style="font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">🛍️ 직원할인구매대장</h2>
            <p class="subtitle" style="color: #64748b; margin-top: 4px;">약국 내 일반의약품, 건강기능식품 및 외용제 직원 할인 구매 내역 관리 및 월별 정산 대장</p>
          </div>
          <button type="button" class="btn btn-primary shadow-sm" onclick="DiscountPurchaseModule.openAddModal()" style="font-size: 15px; font-weight: 700; border-radius: 10px; padding: 10px 20px; transition: all 0.2s;">
            <i class="fas fa-plus me-1"></i> + 구매 신청 / 등록
          </button>
        </div>

        <!-- 상단 4대 KPI 요약 통계 -->
        <div class="kpi-grid my-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; clear: both;">
          <div class="kpi-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 13.5px; font-weight: 700; color: #64748b;">당월 총 구매 건수</span>
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size:16px;"><i class="fas fa-shopping-bag"></i></div>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${stats.currentMonthCount} <span style="font-size: 14px; font-weight: 600; color: #94a3b8;">건</span></div>
          </div>

          <div class="kpi-card" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); border: none; border-radius: 16px; padding: 20px; box-shadow: 0 8px 20px rgba(22,163,74,0.2);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 13.5px; font-weight: 700; color: #dcfce7;">당월 총 결제 금액</span>
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.2); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size:16px;"><i class="fas fa-wallet"></i></div>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${stats.currentMonthTotal.toLocaleString()} <span style="font-size: 15px; font-weight: 600; color: #bbf7d0;">원</span></div>
          </div>

          <div class="kpi-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 13.5px; font-weight: 700; color: #64748b;">구매 참여 직원 수</span>
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size:16px;"><i class="fas fa-users"></i></div>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${stats.uniqueStaffCount} <span style="font-size: 14px; font-weight: 600; color: #94a3b8;">명</span></div>
          </div>

          <div class="kpi-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 13.5px; font-weight: 700; color: #64748b;">건당 평균 구매액</span>
              <div style="width: 36px; height: 36px; border-radius: 10px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size:16px;"><i class="fas fa-chart-line"></i></div>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${stats.avgAmount.toLocaleString()} <span style="font-size: 14px; font-weight: 600; color: #94a3b8;">원</span></div>
          </div>
        </div>

        <!-- 📊 Chart.js 영역 -->
        <div class="row g-3 mb-4">
          <div class="col-lg-7">
            <div class="card" style="border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.02); overflow:hidden;">
              <div class="card-header d-flex justify-content-between align-items-center" style="background:#ffffff; border-bottom:1px solid #f1f5f9; padding:16px 20px;">
                <h4 style="font-size:15px; font-weight:800; color:#1e293b; margin:0;"><i class="fas fa-chart-bar text-primary me-2"></i>월별 할인 구매금액 추세</h4>
              </div>
              <div style="position:relative; height:240px; width:100%; padding:16px;"><canvas id="discountBarCanvas"></canvas></div>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="card" style="border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.02); overflow:hidden;">
              <div class="card-header d-flex justify-content-between align-items-center" style="background:#ffffff; border-bottom:1px solid #f1f5f9; padding:16px 20px;">
                <h4 style="font-size:15px; font-weight:800; color:#1e293b; margin:0;"><i class="fas fa-chart-pie text-success me-2"></i>직원별 구매비중</h4>
              </div>
              <div style="position:relative; height:240px; width:100%; padding:16px;"><canvas id="discountDonutCanvas"></canvas></div>
            </div>
          </div>
        </div>

        <!-- 하단 탭 및 데이터 리스트 -->
        <div class="card-section" style="border-radius: 20px; padding: 28px; background:#ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <h3 style="font-size: 19px; font-weight: 800; color: #0f172a; margin:0;"><i class="fas fa-receipt text-primary me-2"></i>할인 구매 내역 및 월별 정산 집계</h3>
            
            <div class="p-1" style="background:#f1f5f9; border-radius:12px; display:inline-flex;">
              <button class="btn btn-sm ${currentTab === 'monthly' ? 'bg-white shadow-sm text-primary font-bold' : 'text-muted border-0'}" 
                      style="border-radius:10px; padding:8px 18px; transition:all 0.2s; font-size:13.5px;" 
                      onclick="DiscountPurchaseModule.switchSubTab('monthly')">
                <i class="fas fa-calendar-check me-1"></i> 월별 합계
              </button>
              <button class="btn btn-sm ${currentTab === 'individual' ? 'bg-white shadow-sm text-primary font-bold' : 'text-muted border-0'}" 
                      style="border-radius:10px; padding:8px 18px; transition:all 0.2s; font-size:13.5px;" 
                      onclick="DiscountPurchaseModule.switchSubTab('individual')">
                <i class="fas fa-list-ul me-1"></i> 개별 기록
              </button>
            </div>
          </div>

          <div class="search-box mb-4 position-relative">
            <i class="fas fa-search position-absolute text-muted" style="top: 50%; left: 16px; transform: translateY(-50%);"></i>
            <input type="text" class="form-control" placeholder="직원 이름 또는 의약품/제품명으로 검색해 보세요..." 
                   value="${searchQuery}" oninput="DiscountPurchaseModule.handleSearch(this.value)" 
                   style="border-radius:12px; padding: 12px 16px 12px 42px; background:#f8fafc; border:1px solid #e2e8f0; font-size:14px; transition:all 0.2s;">
          </div>

          <div id="discount-tab-content">
            ${renderTabContent(purchases, employees)}
          </div>
        </div>

        <!-- 🛑 모달창 (숨김 처리) -->
        <div id="discount-modal-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index:999999; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s;">
          <div class="modal-card shadow-lg" style="background:#fff; width:90%; max-width:550px; border-radius:20px; padding:28px; position:relative; transform:translateY(20px); transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <button type="button" onclick="DiscountPurchaseModule.closeModal()" style="position:absolute; top:20px; right:20px; background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; font-size:18px; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
            <h3 id="discount-modal-title" style="font-size:20px; font-weight:800; margin-bottom:24px; color:#0f172a;">🛍️ 직원 할인 구매 신청</h3>
            
            <form id="discount-form" onsubmit="DiscountPurchaseModule.savePurchase(event)">
              <input type="hidden" id="disc-id">
              
              <div class="row g-3 mb-3">
                <div class="col-sm-6">
                  <label class="form-label" style="font-size:13px; font-weight:700; color:#475569;">구매 직원 선택</label>
                  <select id="disc-emp" class="form-select" style="border-radius:10px; font-weight:bold; background:#f8fafc;" required></select>
                  <small id="disc-emp-hint" class="text-danger d-none mt-1" style="font-size:11.5px; font-weight:600;"><i class="fas fa-lock me-1"></i>본인 내역만 등록 가능</small>
                </div>
                <div class="col-sm-6">
                  <label class="form-label" style="font-size:13px; font-weight:700; color:#475569;">구매 일시</label>
                  <input type="datetime-local" id="disc-datetime" class="form-control" style="border-radius:10px; background:#f8fafc;" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label" style="font-size:13px; font-weight:700; color:#475569;">약품 / 물품명</label>
                <input type="text" id="disc-item" class="form-control" style="border-radius:10px; background:#f8fafc;" placeholder="예: 유로펜정 1통" required>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-4">
                  <label class="form-label" style="font-size:13px; font-weight:700; color:#475569;">할인 단가(원)</label>
                  <input type="number" id="disc-price" class="form-control" style="border-radius:10px; background:#f8fafc;" required oninput="DiscountPurchaseModule.calcTotal()">
                </div>
                <div class="col-4">
                  <label class="form-label" style="font-size:13px; font-weight:700; color:#475569;">수량</label>
                  <input type="number" id="disc-qty" class="form-control" style="border-radius:10px; background:#f8fafc;" value="1" min="1" required oninput="DiscountPurchaseModule.calcTotal()">
                </div>
                <div class="col-4">
                  <label class="form-label" style="font-size:13px; font-weight:800; color:#2563eb;">총 결제금액</label>
                  <input type="number" id="disc-total" class="form-control font-bold text-primary" style="border-radius:10px; background:#eff6ff; border-color:#bfdbfe;" readonly>
                </div>
              </div>

              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px; margin-bottom:24px;">
                <h5 style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:14px;"><i class="fas fa-user-shield text-warning me-1"></i> 결제 및 검수 통제 <span style="font-weight:normal; font-size:12px; color:#64748b;">(권한자 전용)</span></h5>
                
                <div class="form-check mb-2 d-flex align-items-center">
                  <input class="form-check-input me-2" type="checkbox" id="disc-crosscheck" style="cursor:pointer; width:18px; height:18px; margin-top:0;">
                  <label class="form-check-label" for="disc-crosscheck" style="font-size:14px; color:#1e293b; font-weight:700; cursor:pointer;">🩺 검수약사 확인 완료</label>
                </div>
                
                <div class="form-check d-flex align-items-center">
                  <input class="form-check-input me-2" type="checkbox" id="disc-paid" style="cursor:pointer; width:18px; height:18px; margin-top:0;">
                  <label class="form-check-label" for="disc-paid" style="font-size:14px; color:#1e293b; font-weight:700; cursor:pointer;">💰 약국장 입금 정산 완료</label>
                </div>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-light px-4 font-bold" style="border-radius:10px; background:#f1f5f9; color:#475569;" onclick="DiscountPurchaseModule.closeModal()">취소</button>
                <button type="submit" class="btn btn-success px-4 font-bold" style="border-radius:10px;"><i class="fas fa-check me-1"></i> 내역 등록</button>
              </div>
            </form>
          </div>
        </div>
      `;

      container.innerHTML = html;

      setTimeout(() => {
        initDiscountBarChart(purchases);
        initDiscountDonutChart(purchases);
      }, 150);

    } catch (e) {
      console.error("할인구매대장 렌더링 오류:", e);
      container.innerHTML = `<div class="alert alert-danger m-4">화면을 불러오는 중 오류가 발생했습니다.</div>`;
    }
  }

  function calculatePurchaseStats(purchases, year, month) {
    const yearStr = String(year);
    const monthStr = String(month).padStart(2, '0');
    const currentMonthPurchases = purchases.filter(p => (p.dateStr || '').includes(`${yearStr}. ${monthStr}`));
    const currentMonthCount = currentMonthPurchases.length;
    const currentMonthTotal = currentMonthPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const uniqueStaffCount = new Set(currentMonthPurchases.map(p => p.empName)).size;
    const avgAmount = currentMonthCount > 0 ? Math.round(currentMonthTotal / currentMonthCount) : 0;
    return { currentMonthCount, currentMonthTotal, uniqueStaffCount, avgAmount };
  }

  function renderTabContent(purchases, employees) {
    let filtered = purchases.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (p.empName && p.empName.toLowerCase().includes(q)) || (p.itemName && p.itemName.toLowerCase().includes(q));
    });

    if (currentTab === 'monthly') return renderMonthlySummary(filtered);
    return renderIndividualList(filtered);
  }

  // ★ 표(Table) CSS 밸런스 및 글자 깨짐 완벽 방지 패치
  function renderMonthlySummary(purchases) {
    const monthlyMap = {};
    purchases.forEach(p => {
      let monthKey = "2026년 08월";
      if (p.dateStr) {
        const parts = p.dateStr.split('.');
        if (parts.length >= 2) monthKey = `${parts[0].trim()}년 ${parts[1].trim()}월`;
      }
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { count: 0, total: 0, items: [] };
      monthlyMap[monthKey].count++;
      monthlyMap[monthKey].total += (p.totalPrice || 0);
      monthlyMap[monthKey].items.push(p);
    });

    const months = Object.keys(monthlyMap).sort().reverse();
    if (months.length === 0) return `<div class="text-center text-muted py-5" style="font-size:14px; background:#f8fafc; border-radius:12px;"><i class="fas fa-inbox mb-2" style="font-size:24px;"></i><br>등록된 내역이 없습니다.</div>`;

    return months.map(month => `
      <div class="mb-4" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
        <div class="d-flex justify-content-between align-items-center p-4 border-bottom" style="background:#f8fafc;">
          <span style="font-size:17px; font-weight:800; color:#0f172a;"><i class="far fa-calendar-check text-primary me-2"></i>${month} 정산</span>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:2px;">월 총합계</div>
            <strong style="font-size:20px; color:#16a34a; letter-spacing:-0.5px;">${monthlyMap[month].total.toLocaleString()} 원</strong>
          </div>
        </div>
        
        <!-- 모바일 가로 스크롤 & PC 밸런스 유지 영역 -->
        <div style="overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%;">
          <table style="width:100%; min-width:750px; border-collapse:collapse; text-align:left; font-size:13.5px; white-space:nowrap;">
            <thead style="background:#ffffff; border-bottom:2px solid #e2e8f0; color:#64748b; font-weight:700;">
              <tr>
                <th style="padding:14px 20px; width:20%;">구매일시</th>
                <th style="padding:14px 20px; width:15%;">직원명</th>
                <th style="padding:14px 20px; width:25%;">구매품목</th>
                <th style="padding:14px 20px; width:15%; text-align:right;">금액</th>
                <th style="padding:14px 20px; width:12.5%; text-align:center;">검수약사</th>
                <th style="padding:14px 20px; width:12.5%; text-align:center;">입금확인</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyMap[month].items.map(item => `
                <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding:14px 20px; color:#64748b;">${item.dateStr || '-'}</td>
                  <td style="padding:14px 20px; font-weight:700; color:#1e293b;">
                    <div style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:#f1f5f9; color:#475569; font-size:10px; margin-right:6px;"><i class="fas fa-user"></i></div>
                    ${item.empName}
                  </td>
                  <td style="padding:14px 20px; color:#334155; font-weight:500;">${item.itemName}</td>
                  <td style="padding:14px 20px; color:#2563eb; font-weight:800; text-align:right; font-size:14.5px;">${(item.totalPrice || 0).toLocaleString()}원</td>
                  <td style="padding:14px 20px; text-align:center;">
                    ${item.isCrossChecked 
                      ? '<span style="background:#eff6ff; color:#2563eb; padding:5px 10px; border-radius:20px; font-size:11.5px; font-weight:700;"><i class="fas fa-check-double me-1"></i>검수완료</span>' 
                      : '<span style="background:#f1f5f9; color:#64748b; padding:5px 10px; border-radius:20px; font-size:11.5px; font-weight:600;">대기</span>'}
                  </td>
                  <td style="padding:14px 20px; text-align:center;">
                    ${item.isPaid 
                      ? '<span style="background:#dcfce7; color:#16a34a; padding:5px 10px; border-radius:20px; font-size:11.5px; font-weight:700;"><i class="fas fa-check-circle me-1"></i>입금완료</span>' 
                      : '<span style="background:#fef2f2; color:#ef4444; padding:5px 10px; border-radius:20px; font-size:11.5px; font-weight:600;">미입금</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  }

  // ★ 개별 기록 (레이아웃 밸런스 조정)
  function renderIndividualList(purchases) {
    if (purchases.length === 0) return `<div class="text-center text-muted py-5" style="font-size:14px; background:#f8fafc; border-radius:12px;"><i class="fas fa-inbox mb-2" style="font-size:24px;"></i><br>등록된 내역이 없습니다.</div>`;

    return purchases.map(p => `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:20px 24px; margin-bottom:12px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:16px; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s;">
        
        <div class="d-flex align-items-center" style="min-width:260px;">
          <div style="width:44px; height:44px; border-radius:12px; background:#f8fafc; color:#64748b; display:flex; align-items:center; justify-content:center; font-size:18px; margin-right:16px; flex-shrink:0;">
            <i class="fas fa-shopping-basket"></i>
          </div>
          <div>
            <div style="font-size:12px; color:#94a3b8; font-weight:600; margin-bottom:4px;">${p.dateStr || ''}</div>
            <div>
              <strong style="color:#0f172a; font-size:15px; margin-right:8px;">${p.empName}</strong>
              <span style="color:#3b82f6; font-weight:700; font-size:14.5px; word-break:break-all;">${p.itemName}</span>
            </div>
            <div style="font-size:12.5px; color:#64748b; margin-top:4px;">단가 ${(p.unitPrice || 0).toLocaleString()}원 × <strong style="color:#475569;">${p.qty || 1}개</strong></div>
          </div>
        </div>
        
        <div style="text-align:right; min-width:180px;">
          <strong style="color:#16a34a; font-size:18px; font-weight:800; display:block; margin-bottom:8px; letter-spacing:-0.5px;">${(p.totalPrice || 0).toLocaleString()}원</strong>
          <div class="d-flex align-items-center justify-content-end gap-2 flex-wrap">
            ${p.isCrossChecked 
              ? '<span style="background:#eff6ff; color:#3b82f6; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;"><i class="fas fa-check-double me-1"></i>검수완료</span>' 
              : '<span style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;">검수대기</span>'}
            ${p.isPaid 
              ? '<span style="background:#dcfce7; color:#16a34a; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;"><i class="fas fa-check-circle me-1"></i>입금완료</span>' 
              : '<span style="background:#fef2f2; color:#ef4444; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;">미입금</span>'}
            
            <button type="button" style="background:none; border:none; padding:4px; margin-left:4px; color:#94a3b8;" onclick="DiscountPurchaseModule.openEditModal('${p.id}')" title="수정/확인"><i class="fas fa-edit"></i></button>
            <button type="button" style="background:none; border:none; padding:4px; color:#94a3b8;" onclick="DiscountPurchaseModule.deletePurchase('${p.id}')" title="삭제"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function switchSubTab(tab) {
    currentTab = tab;
    render('module-content');
  }

  function handleSearch(val) {
    searchQuery = val;
    render('module-content');
  }

  function openAddModal() {
    const currentUser = window.SheetsSync.getCurrentUser();
    if (!currentUser) {
      alert("🚨 보안 안내: 화면 최상단의 '직원 로그인'을 먼저 진행해 주세요!");
      return;
    }

    const modal = document.getElementById('discount-modal-container');
    if (!modal) { alert("모달 창을 찾을 수 없습니다."); return; }

    document.getElementById('discount-form').reset();
    document.getElementById('discount-modal-title').textContent = '🛍️ 직원 할인 구매 신청';
    document.getElementById('disc-id').value = '';
    
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    document.getElementById('disc-datetime').value = localISOTime;

    applyRolePermissions(currentUser, null);

    modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; modal.querySelector('.modal-card').style.transform = 'translateY(0)'; }, 10);
  }

  function openEditModal(id) {
    const currentUser = window.SheetsSync.getCurrentUser();
    if (!currentUser) { alert("로그인이 필요합니다."); return; }

    const modal = document.getElementById('discount-modal-container');
    const data = window.SheetsSync.getData();
    const item = (data.discountPurchases || []).find(p => p.id === id);
    if (!item) return;

    document.getElementById('discount-modal-title').textContent = '🛍️ 할인 구매 내역 수정 및 확인';
    document.getElementById('disc-id').value = item.id;
    document.getElementById('disc-item').value = item.itemName;
    document.getElementById('disc-price').value = item.unitPrice;
    document.getElementById('disc-qty').value = item.qty;
    document.getElementById('disc-total').value = item.totalPrice;

    applyRolePermissions(currentUser, item);

    modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; modal.querySelector('.modal-card').style.transform = 'translateY(0)'; }, 10);
  }

  function applyRolePermissions(currentUser, existingItem) {
    const select = document.getElementById('disc-emp');
    const hint = document.getElementById('disc-emp-hint');
    const checkCross = document.getElementById('disc-crosscheck');
    const checkPaid = document.getElementById('disc-paid');

    const isDirector = currentUser.role === '약국장';
    const isPharmacist = currentUser.role.includes('약사');

    const employees = window.SheetsSync.getData().employees || [];
    const targetEmpId = existingItem ? existingItem.empId : currentUser.id;

    if (isDirector) {
      select.innerHTML = employees.map(e => `<option value="${e.id}" ${e.id === targetEmpId ? 'selected' : ''}>${e.name} (${e.role})</option>`).join('');
      select.disabled = false;
      hint.classList.add('d-none');
    } else {
      const me = employees.find(e => e.id === targetEmpId) || currentUser;
      select.innerHTML = `<option value="${me.id}" selected>${me.name} (${me.role})</option>`;
      select.disabled = true;
      if (!existingItem) hint.classList.remove('d-none');
    }

    checkCross.checked = existingItem ? (existingItem.isCrossChecked || false) : false;
    checkPaid.checked = existingItem ? (existingItem.isPaid || false) : false;

    checkCross.disabled = !(isDirector || isPharmacist); 
    checkPaid.disabled = !isDirector; 
  }

  function closeModal() {
    const modal = document.getElementById('discount-modal-container');
    modal.style.opacity = '0';
    modal.querySelector('.modal-card').style.transform = 'translateY(20px)';
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }

  function calcTotal() {
    const price = parseFloat(document.getElementById('disc-price').value) || 0;
    const qty = parseInt(document.getElementById('disc-qty').value) || 1;
    document.getElementById('disc-total').value = price * qty;
  }

  function savePurchase(e) {
    e.preventDefault();
    const id = document.getElementById('disc-id').value;
    
    const selectElem = document.getElementById('disc-emp');
    let empId = selectElem.value;
    if (selectElem.disabled) { 
       const currentUser = window.SheetsSync.getCurrentUser();
       if(currentUser) empId = currentUser.id;
    }

    const datetime = document.getElementById('disc-datetime').value;
    const itemName = document.getElementById('disc-item').value.trim();
    const unitPrice = parseFloat(document.getElementById('disc-price').value) || 0;
    const qty = parseInt(document.getElementById('disc-qty').value) || 1;
    const totalPrice = unitPrice * qty;
    
    const isCrossChecked = document.getElementById('disc-crosscheck').checked;
    const isPaid = document.getElementById('disc-paid').checked;

    const data = window.SheetsSync.getData();
    const emp = (data.employees || []).find(employee => employee.id === empId);
    const dateObj = new Date(datetime);
    const dateStr = `${dateObj.getFullYear()}. ${String(dateObj.getMonth()+1).padStart(2,'0')}. ${String(dateObj.getDate()).padStart(2,'0')}. ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;

    let purchases = data.discountPurchases || [];

    if (id) {
      const idx = purchases.findIndex(p => p.id === id);
      if (idx >= 0) {
        purchases[idx] = { id, empId, empName: emp ? emp.name : '직원', dateStr, itemName, unitPrice, qty, totalPrice, isCrossChecked, isPaid };
      }
    } else {
      purchases.unshift({ id: 'disc_' + Date.now(), empId, empName: emp ? emp.name : '직원', dateStr, itemName, unitPrice, qty, totalPrice, isCrossChecked, isPaid });
    }

    window.SheetsSync.saveDiscountPurchases(purchases);
    closeModal();
    render('module-content');
  }

  function deletePurchase(id) {
    if (!confirm('정말로 이 구매 내역을 삭제하시겠습니까?')) return;
    const data = window.SheetsSync.getData();
    let purchases = data.discountPurchases || [];
    purchases = purchases.filter(p => p.id !== id);
    window.SheetsSync.saveDiscountPurchases(purchases);
    render('module-content');
  }

  // ── Chart.js 범례(Legend) 위치 최적화 패치 완료 ──
  function initDiscountBarChart(purchases) {
    const canvas = document.getElementById('discountBarCanvas');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;

    if (discountBarChartInstance) { discountBarChartInstance.destroy(); discountBarChartInstance = null; }

    const labels = [];
    const totals = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      labels.push(`${y}.${m}`);
      const monthTotal = purchases
        .filter(p => { const ds = p.dateStr || ''; return ds.includes(`${y}. ${m}`) || ds.includes(`${y}-${m}`); })
        .reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      totals.push(monthTotal);
    }

    const ctx = canvas.getContext('2d');
    discountBarChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '구매 금액',
          data: totals,
          backgroundColor: totals.map((v, i) => i === 5 ? 'rgba(59,130,246,0.85)' : 'rgba(59,130,246,0.3)'),
          borderColor: totals.map((v, i) => i === 5 ? '#2563eb' : '#93c5fd'),
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `  ${ctx.parsed.y.toLocaleString()}원` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#64748b' } },
          y: { grid: { color: 'rgba(226,232,240,0.6)' }, ticks: { font: { size: 10 }, color: '#94a3b8', callback: v => v === 0 ? '0' : (v >= 10000 ? (v / 10000).toFixed(0) + '만' : v.toLocaleString()) } }
        }
      }
    });
  }

  function initDiscountDonutChart(purchases) {
    const canvas = document.getElementById('discountDonutCanvas');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;

    if (discountDonutChartInstance) { discountDonutChartInstance.destroy(); discountDonutChartInstance = null; }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const monthPurchases = purchases.filter(p => { const ds = p.dateStr || ''; return ds.includes(`${y}. ${m}`) || ds.includes(`${y}-${m}`); });

    const staffMap = {};
    monthPurchases.forEach(p => { const name = p.empName || '미상'; staffMap[name] = (staffMap[name] || 0) + (p.totalPrice || 0); });

    const entries = Object.entries(staffMap).sort((a, b) => b[1] - a[1]);
    const totalAmount = entries.reduce((s, e) => s + e[1], 0);

    if (entries.length === 0) {
      const ctx = canvas.getContext('2d');
      discountDonutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['데이터 없음'], datasets: [{ data: [1], backgroundColor: ['#f1f5f9'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      return;
    }

    const palette = ['#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#14b8a6','#a855f7','#64748b'];
    const labels = entries.map(([name, amt]) => { const pct = totalAmount > 0 ? ((amt / totalAmount) * 100).toFixed(1) : 0; return `${name} (${pct}%)`; });
    const data = entries.map(([, amt]) => amt);
    const colors = entries.map((_, i) => palette[i % palette.length]);

    const ctx = canvas.getContext('2d');
    discountDonutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff', hoverBorderWidth: 3, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          // ★ 차트 범례 위치를 '하단(bottom)'으로 옮겨 모바일과 PC 모두 예쁘게 꽉 차게 수정!
          legend: { display: true, position: 'bottom', labels: { font: { size: 11, weight: '600' }, color: '#475569', padding: 12, boxWidth: 12, boxHeight: 12 } },
          tooltip: { callbacks: { label: ctx => { const val = ctx.parsed; const pct = totalAmount > 0 ? ((val / totalAmount) * 100).toFixed(1) : 0; return `  ${val.toLocaleString()}원 (${pct}%)`; } } }
        }
      }
    });
  }

  return {
    render, switchSubTab, handleSearch, openAddModal, openEditModal, closeModal, calcTotal, savePurchase, deletePurchase
  };
})();