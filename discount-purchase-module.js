/**
 * 직원할인구매대장 모듈 컨트롤러 (Staff Discount Purchase Log Module)
 * 정갈하고 고품격 가시성 높은 월별 합계 정산 대시보드 레이아웃
 */
window.DiscountPurchaseModule = (function () {

  let currentTab = 'monthly'; // 기본 탭: 'monthly': 월별 합계, 'individual': 개별 기록, 'daily': 일자별 합계, 'staff': 개인별 합계
  let searchQuery = '';

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const data = window.SheetsSync.getData();
    const purchases = data.discountPurchases || [];
    const employees = data.employees || [];

    // 월별 통계 집계 (August 2026 기준 & 전체 통계)
    const stats = calculatePurchaseStats(purchases);

    const html = `
      <div class="module-header flex justify-between items-center mb-4">
        <div>
          <h2>🛍️ 직원할인구매대장</h2>
          <p class="subtitle">약국 내 일반의약품, 건강기능식품 및 외용제 직원 할인 구매 내역 관리 및 월별 정산 대장</p>
        </div>
        <button type="button" class="btn btn-primary font-bold px-4 py-2" onclick="DiscountPurchaseModule.openAddModal()" style="font-size: 15px; border-radius: 8px;">
          <i class="fas fa-plus"></i> + 구매 신청 / 등록
        </button>
      </div>

      <!-- 상단 핵심 4대 KPI 요약 통계 대시보드 (가시성 및 정돈 디자인 강화) -->
      <div class="kpi-grid my-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; clear: both;">
        
        <!-- 1. 당월 총 구매 건수 -->
        <div class="kpi-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: -0.3px;">당월(8월) 총 구매 건수</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              <i class="fas fa-shopping-bag"></i>
            </div>
          </div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            ${stats.currentMonthCount} <span style="font-size: 14px; font-weight: 600; color: #64748b;">건</span>
          </div>
        </div>

        <!-- 2. 당월 총 결제 금액 (연두색 하이라이트) -->
        <div class="kpi-card" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1.5px solid #86efac; border-radius: 12px; padding: 18px 20px; box-shadow: 0 4px 12px rgba(34,197,94,0.08); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 700; color: #15803d; letter-spacing: -0.3px;">당월(8월) 총 결제 금액</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #22c55e; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 4px rgba(34,197,94,0.3);">
              <i class="fas fa-wallet"></i>
            </div>
          </div>
          <div style="font-size: 26px; font-weight: 800; color: #15803d; letter-spacing: -0.5px;">
            ${stats.currentMonthTotal.toLocaleString()} <span style="font-size: 14px; font-weight: 600; color: #166534;">원</span>
          </div>
        </div>

        <!-- 3. 구매 참여 직원 수 -->
        <div class="kpi-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: -0.3px;">구매 참여 직원 수</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              <i class="fas fa-users"></i>
            </div>
          </div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            ${stats.uniqueStaffCount} <span style="font-size: 14px; font-weight: 600; color: #64748b;">명</span>
          </div>
        </div>

        <!-- 4. 건당 평균 구매액 -->
        <div class="kpi-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: -0.3px;">건당 평균 구매액</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            ${stats.avgAmount.toLocaleString()} <span style="font-size: 14px; font-weight: 600; color: #64748b;">원</span>
          </div>
        </div>

      </div>

      <!-- 전체 구매 기록 카드리스트 박스 -->
      <div class="card-section" style="border-radius: 14px; padding: 24px; background:#ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #e2e8f0;">
        <div class="section-title-bar mb-3">
          <h3 style="font-size: 18px; font-weight: 800; color: #0f172a;"><i class="fas fa-receipt text-primary mr-1"></i> 할인 구매 내역 및 월별 정산 집계</h3>
        </div>

        <!-- 4단 서브 탭 (월별 합계, 개별 기록, 일자별 합계, 개인별 합계) -->
        <div class="sub-tab-bar mb-3">
          <button type="button" class="sub-tab-btn ${currentTab === 'monthly' ? 'active' : ''}" onclick="DiscountPurchaseModule.switchSubTab('monthly')">
            <i class="fas fa-calendar-check mr-1"></i> 월별 합계
          </button>
          <button type="button" class="sub-tab-btn ${currentTab === 'individual' ? 'active' : ''}" onclick="DiscountPurchaseModule.switchSubTab('individual')">
            <i class="fas fa-list-ul mr-1"></i> 개별 기록
          </button>
          <button type="button" class="sub-tab-btn ${currentTab === 'daily' ? 'active' : ''}" onclick="DiscountPurchaseModule.switchSubTab('daily')">
            <i class="fas fa-calendar-day mr-1"></i> 일자별 합계
          </button>
          <button type="button" class="sub-tab-btn ${currentTab === 'staff' ? 'active' : ''}" onclick="DiscountPurchaseModule.switchSubTab('staff')">
            <i class="fas fa-user-tag mr-1"></i> 개인별 합계
          </button>
        </div>

        <!-- 검색 필터 바 (모바일 100% 핏) -->
        <div class="search-box w-100 my-3" style="box-sizing:border-box; max-width:100%;">
          <i class="fas fa-search text-muted"></i>
          <input type="text" placeholder="직원 이름 또는 의약품/제품명으로 검색..." value="${searchQuery}" oninput="DiscountPurchaseModule.handleSearch(this.value)" style="box-sizing:border-box; width:100%;">
        </div>

        <!-- 탭별 콘텐츠 영역 -->
        <div id="discount-tab-content" class="mt-4">
          ${renderTabContent(purchases, employees)}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function calculatePurchaseStats(purchases) {
    const augustPurchases = purchases.filter(p => (p.dateStr || '').includes('2026. 08') || (p.dateStr || '').includes('2026-08'));
    const currentMonthCount = augustPurchases.length;
    const currentMonthTotal = augustPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const uniqueStaffCount = new Set(augustPurchases.map(p => p.empName)).size;
    const avgAmount = currentMonthCount > 0 ? Math.round(currentMonthTotal / currentMonthCount) : 0;

    return { currentMonthCount, currentMonthTotal, uniqueStaffCount, avgAmount };
  }

  function renderTabContent(purchases, employees) {
    let filtered = purchases.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (p.empName && p.empName.toLowerCase().includes(q)) || (p.itemName && p.itemName.toLowerCase().includes(q));
    });

    if (currentTab === 'monthly') {
      return renderMonthlySummary(filtered);
    } else if (currentTab === 'individual') {
      return renderIndividualList(filtered);
    } else if (currentTab === 'daily') {
      return renderDailySummary(filtered);
    } else {
      return renderStaffSummary(filtered);
    }
  }

  // 1. 월별 합계 (Monthly Summary - 정갈한 테이블 및 대장 형태)
  function renderMonthlySummary(purchases) {
    const monthlyMap = {};
    purchases.forEach(p => {
      let monthKey = "2026년 08월";
      if (p.dateStr) {
        const parts = p.dateStr.split('.');
        if (parts.length >= 2) {
          monthKey = `${parts[0].trim()}년 ${parts[1].trim()}월`;
        }
      }
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { count: 0, total: 0, items: [] };
      monthlyMap[monthKey].count++;
      monthlyMap[monthKey].total += (p.totalPrice || 0);
      monthlyMap[monthKey].items.push(p);
    });

    const months = Object.keys(monthlyMap).sort().reverse();
    if (months.length === 0) return `<div class="empty-state py-8 text-center text-muted">등록된 월별 구매 내역이 없습니다.</div>`;

    return `
      <div class="summary-group-list">
        ${months.map(month => `
          <div class="summary-group-card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding: 22px; box-shadow:0 3px 10px rgba(0,0,0,0.02);">
            <div class="group-header" style="border-bottom: 2px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 8px;">
              <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-size: 18px; font-weight: 800; color: #0f172a;"><i class="fas fa-calendar-alt text-success mr-1"></i> ${month} 정산 대장</span>
                <span style="font-size: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px;">총 ${monthlyMap[month].count}건 결제</span>
              </div>
              <div style="display:flex; align-items:center; gap: 6px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b;">월 합계 총액:</span>
                <strong style="font-size: 20px; font-weight: 800; color: #16a34a; letter-spacing:-0.5px;">${monthlyMap[month].total.toLocaleString()} 원</strong>
              </div>
            </div>
            <div class="table-responsive" style="overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; border:1px solid #e2e8f0;">
              <table class="table data-table w-100 mb-0" style="border-collapse:separate; border-spacing:0; width:100%; min-width:620px; white-space:nowrap; font-size:13.5px;">
                <thead>
                  <tr style="background:#f8fafc; color:#475569; font-weight:700;">
                    <th style="padding:12px 16px; text-align:left; border-top:1px solid #e2e8f0; border-bottom:2px solid #cbd5e1; border-top-left-radius:8px; white-space:nowrap;">구매 일시</th>
                    <th style="padding:12px 16px; text-align:left; border-top:1px solid #e2e8f0; border-bottom:2px solid #cbd5e1; white-space:nowrap;">직원명</th>
                    <th style="padding:12px 16px; text-align:left; border-top:1px solid #e2e8f0; border-bottom:2px solid #cbd5e1; white-space:nowrap;">구매 품목</th>
                    <th style="padding:12px 16px; text-align:right; border-top:1px solid #e2e8f0; border-bottom:2px solid #cbd5e1; white-space:nowrap;">단가 × 수량</th>
                    <th style="padding:12px 16px; text-align:right; border-top:1px solid #e2e8f0; border-bottom:2px solid #cbd5e1; border-top-right-radius:8px; white-space:nowrap;">결재 금액</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthlyMap[month].items.map(item => `
                    <tr style="border-bottom:1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                      <td style="padding:14px 16px; color:#64748b; font-size:13px; white-space:nowrap;">${item.dateStr || '-'}</td>
                      <td style="padding:14px 16px; font-weight:700; color:#1e293b; white-space:nowrap;"><i class="far fa-user text-muted mr-1"></i> ${item.empName}</td>
                      <td style="padding:14px 16px; color:#334155; font-weight:500; white-space:nowrap;">${item.itemName}</td>
                      <td style="padding:14px 16px; text-align:right; color:#64748b; font-size:13px; white-space:nowrap;">${(item.unitPrice || 0).toLocaleString()}원 × ${item.qty}개</td>
                      <td style="padding:14px 16px; text-align:right; font-weight:800; color:#2563eb; font-size:15px; white-space:nowrap;">${(item.totalPrice || 0).toLocaleString()}원</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 2. 개별 기록 리스트
  function renderIndividualList(purchases) {
    if (purchases.length === 0) {
      return `<div class="empty-state py-8 text-center text-muted">등록된 구매 내역이 없습니다.</div>`;
    }

    return `
      <div class="purchase-list-container">
        ${purchases.map(p => `
          <div class="purchase-item-card" style="border-radius:10px; padding:16px 20px; border:1px solid #e2e8f0; margin-bottom:12px;">
            <div class="p-card-left">
              <div class="p-check-icon"><i class="far fa-check-circle text-primary"></i></div>
              <div class="p-info-main">
                <div class="p-meta-date text-xs text-muted mb-1">${p.dateStr || '2026. 08. 10. 14:20'}</div>
                <div class="p-title-row">
                  <strong class="p-emp-name text-dark font-bold mr-2">${p.empName}</strong>
                  <span class="p-item-name font-bold text-primary mr-2">${p.itemName}</span>
                  <span class="p-calc-pill text-xs text-muted" style="background:#f1f5f9; padding:2px 8px; border-radius:12px;">${(p.unitPrice || 0).toLocaleString()}원 × ${p.qty || 1}개</span>
                </div>
              </div>
            </div>
            <div class="p-card-right">
              <strong class="p-total-amount text-success font-bold fs-18">${(p.totalPrice || 0).toLocaleString()}원</strong>
              <div class="p-action-links mt-1">
                <button type="button" class="link-btn text-xs text-muted mr-2" onclick="DiscountPurchaseModule.openEditModal('${p.id}')">수정</button>
                <button type="button" class="link-btn text-xs text-danger" onclick="DiscountPurchaseModule.deletePurchase('${p.id}')">삭제</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 3. 일자별 합계
  function renderDailySummary(purchases) {
    const dailyMap = {};
    purchases.forEach(p => {
      const day = (p.dateStr || '2026. 08. 10.').substring(0, 13);
      if (!dailyMap[day]) dailyMap[day] = { count: 0, total: 0, items: [] };
      dailyMap[day].count++;
      dailyMap[day].total += (p.totalPrice || 0);
      dailyMap[day].items.push(p);
    });

    const days = Object.keys(dailyMap).sort().reverse();
    if (days.length === 0) return `<div class="empty-state py-8 text-center text-muted">구매 내역이 없습니다.</div>`;

    return `
      <div class="summary-group-list">
        ${days.map(day => `
          <div class="summary-group-card mb-3 p-4 border-radius-md" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px;">
            <div class="group-header flex justify-between items-center pb-3 border-b mb-3" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong class="text-dark fs-16 font-bold">📅 ${day}</strong>
                <span class="badge badge-primary ml-2">${dailyMap[day].count}건</span>
              </div>
              <strong class="text-success fs-18 font-bold">${dailyMap[day].total.toLocaleString()} 원</strong>
            </div>
            <div class="group-body">
              ${dailyMap[day].items.map(item => `
                <div class="sub-item-row flex justify-between py-2 border-b text-sm" style="display:flex; justify-content:space-between; border-color:#f1f5f9;">
                  <span><i class="far fa-user text-muted mr-1"></i> <strong>${item.empName}</strong> (${item.itemName})</span>
                  <span class="font-bold text-primary">${(item.totalPrice || 0).toLocaleString()}원</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 4. 개인별 합계
  function renderStaffSummary(purchases) {
    const staffMap = {};
    purchases.forEach(p => {
      const name = p.empName || '직원';
      if (!staffMap[name]) staffMap[name] = { count: 0, total: 0, items: [] };
      staffMap[name].count++;
      staffMap[name].total += (p.totalPrice || 0);
      staffMap[name].items.push(p);
    });

    const staffNames = Object.keys(staffMap);
    if (staffNames.length === 0) return `<div class="empty-state py-8 text-center text-muted">구매 내역이 없습니다.</div>`;

    return `
      <div class="summary-group-list">
        ${staffNames.map(name => `
          <div class="summary-group-card mb-3 p-4 border-radius-md" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px;">
            <div class="group-header flex justify-between items-center pb-3 border-b mb-3" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong class="text-dark fs-16 font-bold">👤 ${name}</strong>
                <span class="badge badge-category ml-2">${staffMap[name].count}건 구매</span>
              </div>
              <strong class="text-primary fs-18 font-bold">${staffMap[name].total.toLocaleString()} 원</strong>
            </div>
            <div class="group-body">
              ${staffMap[name].items.map(item => `
                <div class="sub-item-row flex justify-between py-2 border-b text-sm" style="display:flex; justify-content:space-between; border-color:#f1f5f9;">
                  <span class="text-muted">${item.dateStr.substring(0, 13)} - <strong class="text-dark">${item.itemName}</strong> (${item.qty}개)</span>
                  <span class="font-bold text-success">${(item.totalPrice || 0).toLocaleString()}원</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function switchSubTab(tab) {
    currentTab = tab;
    render('module-content');
  }

  function handleSearch(val) {
    searchQuery = val;
    const content = document.getElementById('discount-tab-content');
    if (content) {
      const data = window.SheetsSync.getData();
      content.innerHTML = renderTabContent(data.discountPurchases || [], data.employees || []);
    }
  }

  function populateEmpSelect(selectedId) {
    const select = document.getElementById('disc-emp');
    if (!select) return;
    const data = window.SheetsSync.getData();
    const employees = data.employees || [];

    select.innerHTML = employees.map(e => `
      <option value="${e.id}" ${e.id === selectedId ? 'selected' : ''}>${e.name} (${e.role})</option>
    `).join('');
  }

  function openAddModal() {
    try {
      const modal = document.getElementById('discount-modal');
      if (!modal) return;

      const form = document.getElementById('discount-form');
      if (form) form.reset();

      const titleElem = document.getElementById('discount-modal-title');
      if (titleElem) titleElem.textContent = '🛍️ 직원 할인 구매 신청';

      const idElem = document.getElementById('disc-id');
      if (idElem) idElem.value = '';

      populateEmpSelect('');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const formattedIso = `${year}-${month}-${day}T${hours}:${minutes}`;

      const dateElem = document.getElementById('disc-datetime');
      if (dateElem) dateElem.value = formattedIso;

      const qtyElem = document.getElementById('disc-qty');
      if (qtyElem) qtyElem.value = 1;

      const priceElem = document.getElementById('disc-price');
      if (priceElem) priceElem.value = '';

      const totalElem = document.getElementById('disc-total');
      if (totalElem) totalElem.value = 0;

      modal.style.display = 'flex';
    } catch (err) {
      console.error("Error in openAddModal:", err);
    }
  }

  function openEditModal(id) {
    try {
      const modal = document.getElementById('discount-modal');
      if (!modal) return;

      const data = window.SheetsSync.getData();
      const item = (data.discountPurchases || []).find(p => p.id === id);
      if (!item) return;

      document.getElementById('discount-modal-title').textContent = '🛍️ 직원 할인 구매 수정';
      document.getElementById('disc-id').value = item.id;
      populateEmpSelect(item.empId);
      document.getElementById('disc-item').value = item.itemName;
      document.getElementById('disc-price').value = item.unitPrice;
      document.getElementById('disc-qty').value = item.qty;
      document.getElementById('disc-total').value = item.totalPrice;

      modal.style.display = 'flex';
    } catch (err) {
      console.error("Error in openEditModal:", err);
    }
  }

  function closeModal() {
    const modal = document.getElementById('discount-modal');
    if (modal) modal.style.display = 'none';
  }

  function calcTotal() {
    const price = parseFloat(document.getElementById('disc-price').value) || 0;
    const qty = parseInt(document.getElementById('disc-qty').value) || 1;
    document.getElementById('disc-total').value = price * qty;
  }

  function savePurchase(e) {
    e.preventDefault();
    const id = document.getElementById('disc-id').value;
    const empId = document.getElementById('disc-emp').value;
    const datetime = document.getElementById('disc-datetime').value;
    const itemName = document.getElementById('disc-item').value.trim();
    const unitPrice = parseFloat(document.getElementById('disc-price').value) || 0;
    const qty = parseInt(document.getElementById('disc-qty').value) || 1;
    const totalPrice = unitPrice * qty;

    const data = window.SheetsSync.getData();
    const emp = (data.employees || []).find(e => e.id === empId);

    const dateObj = new Date(datetime);
    const dateStr = `${dateObj.getFullYear()}. ${String(dateObj.getMonth()+1).padStart(2,'0')}. ${String(dateObj.getDate()).padStart(2,'0')}. ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;

    let purchases = data.discountPurchases || [];

    if (id) {
      const idx = purchases.findIndex(p => p.id === id);
      if (idx >= 0) {
        purchases[idx] = {
          id, empId, empName: emp ? emp.name : '직원', dateStr, itemName, unitPrice, qty, totalPrice
        };
      }
    } else {
      purchases.unshift({
        id: 'disc_' + Date.now(),
        empId,
        empName: emp ? emp.name : '직원',
        dateStr,
        itemName,
        unitPrice,
        qty,
        totalPrice
      });
    }

    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.DISCOUNT_PURCHASES || '365_discount_purchases', purchases);
    closeModal();
    render('module-content');
    alert('할인 구매 내역이 저장되었습니다.');
  }

  function deletePurchase(id) {
    if (!confirm('정말로 이 구매 내역을 삭제하시겠습니까?')) return;
    const data = window.SheetsSync.getData();
    let purchases = data.discountPurchases || [];
    purchases = purchases.filter(p => p.id !== id);
    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.DISCOUNT_PURCHASES || '365_discount_purchases', purchases);
    render('module-content');
  }

  return {
    render,
    switchSubTab,
    handleSearch,
    openAddModal,
    openEditModal,
    closeModal,
    calcTotal,
    savePurchase,
    deletePurchase
  };
})();
