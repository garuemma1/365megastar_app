/**
 * 8. 약국 업무일지 & 교대 인수인계 모듈 (카톡 대체형 완결판)
 * 기능: 칸반형 업무 현황판, 이미지 자동 압축 첨부, 완료 시 달력 히스토리 보관
 */
window.WorklogModule = (function () {

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1;
  let showCalendar = true;
  
  // 구글 앱스 스크립트 웹 앱 URL (★ 1단계에서 배포한 URL로 반드시 변경해주세요!)
  const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyVsOK5a0PVtW1-h8SlSZ1PGa4J-xx6T6i-tKAICePoP7D3aZ52coIFFYzRvRR0G8IVEw/exec'; 

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const logs = window.SheetsSync.getWorklogs() || [];

    // 1. 진행 중인 업무 (PENDING 상태) - 상단 게시판용
    const pendingTasks = logs.filter(l => l.status === 'PENDING');
    
    // 2. 당월 달력용 데이터 (완료된 것 + 당일 등록된 것 모두 포함)
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthLogs = logs.filter(l => (l.date || '').startsWith(monthPrefix));

    const html = `
      <div class="module-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:#0f172a; margin-bottom:4px; letter-spacing:-0.5px;">
            📝 실시간 약국 업무 & 인수인계 보드
          </h2>
          <p class="subtitle" style="color:#64748b; font-size:14px; margin:0;">
            품절약, 주문 요청, 특이사항을 카톡 대신 올리고 완료 시 체크해 주세요.
          </p>
        </div>
        <!-- 교체할 고급 UI 영역 시작 -->
        <div class="d-flex align-items-center gap-3 flex-wrap mt-2">
          
          <!-- 🔍 고급스러운 통합 검색창 (포커스 시 부드러운 파란색 테두리 효과) -->
          <div style="display:flex; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:4px 6px; width:280px; transition:all 0.2s;" onfocusin="this.style.borderColor='#3b82f6'; this.style.background='#ffffff'; this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)';" onfocusout="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.boxShadow='none';">
            
            <input type="text" id="wl-search-input" placeholder="약 이름, 품절약 검색..." onkeypress="if(event.key==='Enter') WorklogModule.executeSearch()" style="border:none; background:transparent; outline:none; padding:8px 12px; width:100%; font-size:14px; color:#1e293b; font-weight:600;">
            
            <button type="button" onclick="WorklogModule.executeSearch()" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; color:#2563eb; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='#ffffff'">
              <i class="fas fa-search"></i>
            </button>
            
          </div>

          <!-- 📝 정갈한 새 업무 등록 버튼 (에메랄드 그라데이션 & 마우스 오버 효과) -->
          <button type="button" onclick="WorklogModule.showCreateModal()" style="display:flex; align-items:center; gap:8px; background:linear-gradient(135deg, #059669 0%, #047857 100%); color:#ffffff; border:none; border-radius:12px; padding:10px 20px; font-size:15px; font-weight:800; box-shadow:0 4px 12px rgba(5, 150, 105, 0.25); cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <i class="fas fa-plus-circle" style="font-size:16px;"></i> 새 업무 등록
          </button>
          
        </div>
        <!-- 교체할 고급 UI 영역 끝 -->
      </div>

      <!-- 상단: 진행 중인 실시간 업무 보드 (To-Do List) -->
      <div class="card shadow-sm mb-5" style="border-radius:16px; border:1px solid #e2e8f0; background:#ffffff; overflow:hidden;">
        <div class="card-header d-flex justify-content-between align-items-center" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:16px 24px;">
          <h3 style="font-size:16px; font-weight:800; margin:0; color:#1e40af;">
            🚨 미해결 업무 및 품절 현황 <span class="badge bg-danger ms-2" style="border-radius:10px;">${pendingTasks.length}건</span>
          </h3>
          <span style="font-size:12px; color:#64748b;">처리가 완료되면 우측 체크박스를 눌러주세요.</span>
        </div>
        
        <div class="table-responsive">
          <table class="table mb-0" style="font-size:14px; vertical-align:middle;">
            <thead style="background:#f1f5f9; color:#475569; font-size:13px;">
              <tr>
                <th style="padding:12px 24px; width:10%;">태그</th>
                <th style="padding:12px 10px; width:50%;">내용 및 사진</th>
                <th style="padding:12px 10px; width:15%;">등록일 (작성자)</th>
                <th style="padding:12px 24px; width:20%; text-align:right;">완료 처리</th>
              </tr>
            </thead>
            <tbody>
              ${pendingTasks.length === 0 ? `
                <tr><td colspan="4" class="text-center py-5 text-muted" style="font-weight:600;"><i class="fas fa-check-circle fa-2x mb-2 text-success" style="opacity:0.5;"></i><br>현재 대기 중인 업무가 없습니다.</td></tr>
              ` : pendingTasks.map(task => `
                <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                  <td style="padding:16px 24px;">${getTagBadge(task.tag)}</td>
                  <td style="padding:16px 10px;">
                    <div style="font-weight:700; color:#0f172a; margin-bottom:4px; white-space:pre-wrap; line-height:1.5;">${task.content}</div>
                    ${task.imageUrl ? `
  <div style="margin-top:10px;">
    <a href="${task.imageUrl}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; background:#ffffff; border:1px solid #cbd5e1; padding:6px 14px; border-radius:20px; font-size:13px; color:#475569; text-decoration:none; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe'; this.style.color='#2563eb';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1'; this.style.color='#475569';">
      <i class="far fa-image" style="color:#3b82f6; font-size:15px;"></i> 첨부사진 보기
    </a>
  </div>
` : ''}
                  </td>
                  <td style="padding:16px 10px;">
                    <div style="font-size:12px; color:#64748b;">${task.date.substring(5)}</div>
                    <div style="font-size:13px; font-weight:700; color:#334155;">${task.authorName}</div>
                  </td>
                  <td style="padding:16px 24px; text-align:right;">
                    <button class="btn btn-sm btn-outline-success font-bold" onclick="WorklogModule.completeTask('${task.id}')" style="border-radius:8px; padding:6px 12px;">
                      <i class="fas fa-check me-1"></i> 완료 확인
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 하단: 일일 교대일지 달력 (히스토리 보관소) -->
      <div class="card shadow-sm mb-4" style="border-radius:20px; border:1px solid #cbd5e1; background:#ffffff; overflow:hidden;">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-3" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff; padding:18px 24px;">
          <div class="d-flex align-items-center gap-3">
            <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.1); display:flex; justify-content:center; align-items:center;"><i class="fas fa-calendar-alt text-warning" style="font-size:20px;"></i></div>
            <div>
              <h3 style="font-size:17px; font-weight:bold; margin:0; color:#ffffff;">📅 ${currentYear}년 ${currentMonth}월 업무 달력 (완료 보관소)</h3>
              <p style="font-size:12.5px; margin:0; color:#94a3b8; margin-top:2px;">날짜를 누르시면 완료된 내역과 당일 히스토리가 팝업으로 나타납니다.</p>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-light" onclick="WorklogModule.changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
            <span class="badge bg-primary" style="font-size:14px; padding:8px 16px;">${currentYear}년 ${String(currentMonth).padStart(2, '0')}월</span>
            <button class="btn btn-sm btn-outline-light" onclick="WorklogModule.changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
        <div class="card-body" style="padding:20px;">
          ${renderMonthlyCalendar(logs, currentYear, currentMonth)}
        </div>
      </div>

     <!-- 신규 업무 등록 모달 (사진 첨부 포함) -->
      <div class="modal-overlay" id="worklog-create-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(5px); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card shadow-lg" style="background:#fff; border-radius:24px; max-width:540px; width:92%; padding:36px; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
          
          <button class="close-btn" onclick="WorklogModule.closeModal()" style="position:absolute; top:24px; right:24px; background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; font-size:18px; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;"><i class="fas fa-times"></i></button>
          
          <div class="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
            <div style="width:48px; height:48px; border-radius:14px; background:#eff6ff; color:#2563eb; display:flex; justify-content:center; align-items:center; font-size:20px;"><i class="fas fa-pen-fancy"></i></div>
            <div>
              <h3 style="font-size:20px; font-weight:800; margin:0; color:#0f172a;">새 업무/이슈 등록</h3>
              <p class="text-muted mb-0" style="font-size:13.5px; margin-top:4px;">정확한 인수인계를 위해 내용을 상세히 적어주세요.</p>
            </div>
          </div>

          <form onsubmit="WorklogModule.submitTask(event)">
            <div class="mb-4">
              <label class="form-label font-bold" style="font-size:14px; color:#334155; margin-bottom:8px;">구분 태그 <span class="text-danger">*</span></label>
              <select id="wl-tag" class="form-select font-bold" style="border-radius:12px; background:#f8fafc; border:1px solid #cbd5e1; padding:12px 16px; font-size:15px; width:100%; box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);" required>
                <option value="품절">🔴 품절약 등록 (입고 요망)</option>
                <option value="주문">🟡 주문 요청 (도매상/본사)</option>
                <option value="고객">🔵 특정 환자/예약/선결제</option>
                <option value="입고">🟢 입고 완료 / 지시사항 전달</option>
                <option value="메모" selected>⚪ 일반 업무 / 기타 메모</option>
              </select>
            </div>

            <div class="mb-4">
              <label class="form-label font-bold" style="font-size:14px; color:#334155; margin-bottom:8px;">내용 작성 <span class="text-danger">*</span></label>
              <textarea id="wl-content" class="form-control" rows="5" style="border-radius:12px; background:#f8fafc; border:1px solid #cbd5e1; padding:16px; font-size:15px; width:100%; resize:none; line-height:1.6; box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);" placeholder="어떤 약이 품절인지, 누구에게 전달할 메모인지 구체적으로 작성해 주세요..." required></textarea>
            </div>

            <div class="mb-4">
              <label class="form-label font-bold" style="font-size:14px; color:#334155; margin-bottom:8px;">사진 첨부 (선택)</label>
              <input type="file" id="wl-image" class="form-control" accept="image/*" style="border-radius:12px; border:1px dashed #cbd5e1; padding:10px 16px; background:#f8fafc; width:100%; color:#64748b; cursor:pointer;" onchange="WorklogModule.previewImage(event)">
              
              <div id="wl-preview-container" style="display:none; margin-top:16px; text-align:center; background:#f1f5f9; padding:16px; border-radius:12px;">
                <img id="wl-preview-img" style="max-height:180px; border-radius:8px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" />
                <input type="hidden" id="wl-compressed-base64" />
              </div>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-2">
              <button type="button" class="btn btn-light font-bold" onclick="WorklogModule.closeModal()" style="border-radius:12px; padding:12px 24px; font-size:15px; background:#f1f5f9; color:#475569; border:none;">취소</button>
              <button type="submit" id="wl-submit-btn" class="btn btn-primary font-bold" style="border-radius:12px; padding:12px 24px; font-size:15px; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border:none; box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                <i class="fas fa-paper-plane me-1"></i> 등록하기
              </button>
            </div>
          </form>
        </div>
      </div>
<!-- 🔍 검색 결과 팝업 모달 -->
      <div class="modal-overlay" id="worklog-search-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(5px); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card shadow-lg" style="background:#fff; border-radius:24px; max-width:650px; width:92%; max-height:85vh; overflow-y:auto; padding:32px; position:relative;">
          <button class="close-btn" onclick="document.getElementById('worklog-search-modal').style.display='none'" style="position:absolute; top:20px; right:20px; background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; font-size:18px; color:#64748b; cursor:pointer;"><i class="fas fa-times"></i></button>
          <div id="worklog-search-modal-content"></div>
        </div>
      </div>
      <!-- 당일 상세 팝업 모달 -->
      <div class="modal-overlay" id="worklog-day-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-card shadow-lg" style="background:#fff; border-radius:24px; max-width:600px; width:92%; max-height:85vh; overflow-y:auto; padding:32px; position:relative;">
          <button class="close-btn" onclick="WorklogModule.closeDayModal()" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:20px; color:#64748b;">&times;</button>
          <div id="worklog-day-modal-content"></div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // 헬퍼: 태그 배지 생성기
  function getTagBadge(tag) {
    if(tag === '품절') return '<span class="badge" style="background:#fee2e2; color:#ef4444; border:1px solid #fca5a5; padding:6px 12px;">🔴 품절</span>';
    if(tag === '주문') return '<span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a; padding:6px 12px;">🟡 주문</span>';
    if(tag === '고객') return '<span class="badge" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:6px 12px;">🔵 고객/예약</span>';
    if(tag === '입고') return '<span class="badge" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; padding:6px 12px;">🟢 입고/처리</span>';
    return '<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:6px 12px;">⚪ 일반/메모</span>';
  }

  // 달력 렌더링 (이전 달력 뷰 재활용)
  function renderMonthlyCalendar(logs, year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let gridHtml = `
      <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:1px; background:#e2e8f0; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden;">
        <div style="background:#fff1f2; color:#e11d48; text-align:center; padding:10px; font-weight:800; font-size:13px;">일</div>
        <div style="background:#f8fafc; color:#334155; text-align:center; padding:10px; font-weight:800; font-size:13px;">월</div>
        <div style="background:#f8fafc; color:#334155; text-align:center; padding:10px; font-weight:800; font-size:13px;">화</div>
        <div style="background:#f8fafc; color:#334155; text-align:center; padding:10px; font-weight:800; font-size:13px;">수</div>
        <div style="background:#f8fafc; color:#334155; text-align:center; padding:10px; font-weight:800; font-size:13px;">목</div>
        <div style="background:#f8fafc; color:#334155; text-align:center; padding:10px; font-weight:800; font-size:13px;">금</div>
        <div style="background:#eff6ff; color:#2563eb; text-align:center; padding:10px; font-weight:800; font-size:13px;">토</div>
    `;

    for (let i = 0; i < firstDay; i++) { gridHtml += `<div style="background:#f8fafc; min-height:80px;"></div>`; }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = logs.filter(l => l.date === dateStr);
      const isToday = dateStr === todayStr;

      gridHtml += `
        <div onclick="WorklogModule.openDayModal('${dateStr}')" style="background:#ffffff; min-height:80px; padding:8px; cursor:pointer; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
          <div style="font-weight:800; font-size:13px; color:${(firstDay+d-1)%7===0?'#e11d48':(firstDay+d-1)%7===6?'#2563eb':'#0f172a'};">
            ${d} ${isToday ? '<span class="badge bg-primary" style="font-size:9px;">오늘</span>' : ''}
          </div>
          <div style="margin-top:6px; display:flex; flex-direction:column; gap:2px;">
            ${dayLogs.slice(0,3).map(l => `
              <div style="font-size:10px; background:${l.status === 'PENDING' ? '#fee2e2' : '#f1f5f9'}; color:${l.status === 'PENDING' ? '#ef4444' : '#475569'}; padding:2px 4px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${l.status === 'PENDING' ? '🚨' : '✅'} ${l.content || '업무일지'}
              </div>
            `).join('')}
            ${dayLogs.length > 3 ? `<div style="font-size:10px; color:#94a3b8; text-align:center;">+${dayLogs.length - 3}건 더보기</div>` : ''}
          </div>
        </div>
      `;
    }
    gridHtml += `</div>`;
    return gridHtml;
  }

  // --- 이미지 자동 압축 엔진 (HTML5 Canvas 사용) ---
  function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // 가로 최대 800px로 압축
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // JPEG 포맷으로 품질 70% 압축 (원래 용량의 약 1/10)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        document.getElementById('wl-preview-img').src = compressedBase64;
        document.getElementById('wl-compressed-base64').value = compressedBase64;
        document.getElementById('wl-preview-container').style.display = 'block';
      }
    };
  }

  // 폼 제출 로직 (업무 등록)
  async function submitTask(e) {
    e.preventDefault();
    const btn = document.getElementById('wl-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

    const curr = window.SheetsSync.getCurrentUser();
    if (!curr) { alert("로그인이 필요합니다."); btn.disabled = false; btn.innerText = '등록하기'; return; }

    const tag = document.getElementById('wl-tag').value;
    const content = document.getElementById('wl-content').value;
    const base64Data = document.getElementById('wl-compressed-base64').value;
    let imageUrl = '';

    // 사진이 첨부되었다면 구글 앱스 스크립트(GAS)로 업로드 요청
    if (base64Data) {
      try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 사진 업로드 중...';
        // (주의: 실제 GAS 환경에 맞춰 fetch POST 요청이 필요합니다)
        // 아래 코드는 GAS Web App과 JSON 통신을 하는 일반적인 예시입니다.
        const response = await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'uploadImage', data: base64Data, filename: `업무사진_${Date.now()}.jpg` })
        });
        const result = await response.json();
        imageUrl = result.url || '';
      } catch (err) {
        console.warn("이미지 업로드 실패(임시로 저장 진행):", err);
      }
    }

    const newLog = {
      id: 'task_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      authorName: curr.name,
      tag: tag,
      content: content,
      imageUrl: imageUrl,
      status: 'PENDING', // 기본 상태: 미해결
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const logs = window.SheetsSync.getWorklogs() || [];
    logs.unshift(newLog);
    window.SheetsSync.saveWorklogs(logs);

    closeModal();
    alert('✅ 성공적으로 등록되었습니다.');
    render('module-content');
  }

  // 업무 완료 처리 (하단 달력으로 이동)
  function completeTask(id) {
    const curr = window.SheetsSync.getCurrentUser();
    if (!curr) { alert("로그인이 필요합니다."); return; }

    if (!confirm('이 업무를 완료(확인) 처리하시겠습니까?\n처리 후 달력 기록으로 이동됩니다.')) return;

    const logs = window.SheetsSync.getWorklogs() || [];
    const target = logs.find(l => l.id === id);
    if (target) {
      target.status = 'COMPLETED';
      target.completedBy = curr.name;
      target.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      window.SheetsSync.saveWorklogs(logs);
      render('module-content');
    }
  }

  // 모달 제어 함수
  function showCreateModal() { document.getElementById('worklog-create-modal').style.display = 'flex'; }
  function closeModal() { document.getElementById('worklog-create-modal').style.display = 'none'; }
  function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    else if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    render('module-content');
  }
// 🔍 통합 검색 실행 함수
  function executeSearch() {
    const keyword = document.getElementById('wl-search-input').value.trim();
    if (!keyword) { alert('검색어를 입력해 주세요.'); return; }

    const logs = window.SheetsSync.getWorklogs() || [];
    const lowerKeyword = keyword.toLowerCase();
    
    // 내용, 작성자, 태그에서 검색어 찾기
    const results = logs.filter(l => {
      const text = (l.content || '') + (l.authorName || '') + (l.tag || '');
      return text.toLowerCase().includes(lowerKeyword);
    });

    const content = document.getElementById('worklog-search-modal-content');
    let html = `
      <div class="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
        <div style="width:48px; height:48px; border-radius:14px; background:#f0fdf4; color:#16a34a; display:flex; justify-content:center; align-items:center; font-size:22px;"><i class="fas fa-search"></i></div>
        <div>
          <h3 style="font-size:20px; font-weight:800; margin:0; color:#0f172a;">'${keyword}' 검색 결과</h3>
          <p class="text-muted mb-0" style="font-size:13.5px; margin-top:4px;">총 ${results.length}건의 기록이 발견되었습니다.</p>
        </div>
      </div>
    `;

    if (results.length === 0) {
      html += `<div class="text-center py-5"><i class="fas fa-search-minus fa-3x mb-3 text-secondary" style="opacity:0.3;"></i><h4 style="font-size:16px; color:#475569;">일치하는 내역이 없습니다.</h4></div>`;
    } else {
      html += `<div style="display:flex; flex-direction:column; gap:16px;">`;
      html += results.map(l => {
        const isCompleted = l.status === 'COMPLETED';
        const contentText = l.content || l.contentRx || l.note || '내용 없음';
        // 검색어 노란색 형광펜 하이라이트 효과
        const highlightedText = contentText.replace(new RegExp(keyword, 'gi'), match => `<mark style="background:#fef08a; padding:0 2px; border-radius:4px; font-weight:bold;">${match}</mark>`);

        return `
        <div class="p-4" style="background:${isCompleted ? '#f8fafc' : '#ffffff'}; border:1px solid ${isCompleted ? '#e2e8f0' : '#cbd5e1'}; border-radius:16px;">
          <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span style="font-size:12px; color:#64748b; background:#f1f5f9; padding:4px 8px; border-radius:6px;"><i class="far fa-calendar-alt me-1"></i>${l.date}</span>
              ${l.tag ? getTagBadge(l.tag) : ''}
              <span style="font-size:14px; font-weight:800; color:#1e293b;">${l.authorName}</span>
            </div>
            <div style="font-size:12px; font-weight:700; padding:4px 10px; border-radius:6px; background:${isCompleted ? '#dcfce7' : '#fee2e2'}; color:${isCompleted ? '#16a34a' : '#ef4444'};">
              ${isCompleted ? `✅ ${l.completedBy} 완료` : '🚨 진행 중'}
            </div>
          </div>
          <div style="font-size:15px; color:#334155; line-height:1.6; background:#f1f5f9; padding:16px; border-radius:12px;">${highlightedText}</div>
          ${l.imageUrl ? `
            <div style="margin-top:12px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; padding:12px; border-radius:12px;">
              <a href="${l.imageUrl}" target="_blank"><img src="${l.imageUrl}" style="max-height:180px; border-radius:8px;" alt="첨부사진" /></a>
            </div>
          ` : ''}
        </div>
      `}).join('');
      html += `</div>`;
    }
    
    content.innerHTML = html;
    document.getElementById('worklog-search-modal').style.display = 'flex';
  }
 // 달력 특정 날짜 팝업 열기 (세련되고 정갈한 레이아웃 적용)
  function openDayModal(dateStr) {
    const logs = window.SheetsSync.getWorklogs() || [];
    const dayLogs = logs.filter(l => l.date === dateStr);
    const content = document.getElementById('worklog-day-modal-content');
    
    let html = `
      <div class="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
        <div style="width:48px; height:48px; border-radius:14px; background:#fff1f2; color:#e11d48; display:flex; justify-content:center; align-items:center; font-size:22px;">
          <i class="fas fa-calendar-day"></i>
        </div>
        <div>
          <h3 style="font-size:20px; font-weight:800; margin:0; color:#0f172a;">${dateStr} 업무 히스토리</h3>
          <p class="text-muted mb-0" style="font-size:13.5px; margin-top:4px;">해당 날짜에 등록되거나 처리된 총 ${dayLogs.length}건의 업무입니다.</p>
        </div>
      </div>
    `;
    
    if (dayLogs.length === 0) {
      html += `
        <div class="text-center py-5">
          <i class="fas fa-inbox fa-3x mb-3 text-secondary" style="opacity:0.3;"></i>
          <h4 style="font-size:16px; font-weight:bold; color:#475569;">이 날짜에 기록된 내역이 없습니다.</h4>
        </div>
      `;
    } else {
      html += `<div style="display:flex; flex-direction:column; gap:16px;">`;
      html += dayLogs.map(l => {
        // 이전 버전 데이터(구 일지)와 호환 처리
        const contentText = l.content || l.contentRx || l.note || '<span style="color:#94a3b8; font-style:italic;">내용 없음</span>';
        const isCompleted = l.status === 'COMPLETED';

        return `
        <div class="p-4" style="background:${isCompleted ? '#f8fafc' : '#ffffff'}; border:1px solid ${isCompleted ? '#e2e8f0' : '#cbd5e1'}; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
          
          <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              ${l.tag ? getTagBadge(l.tag) : '<span class="badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:6px 12px; border-radius:8px;">⚪ 구 일지</span>'}
              <span style="font-size:15px; font-weight:800; color:#1e293b;"><i class="fas fa-user-edit me-1" style="color:#94a3b8;"></i>${l.authorName}</span>
            </div>
            <div style="font-size:13px; font-weight:700; padding:6px 12px; border-radius:8px; background:${isCompleted ? '#dcfce7' : '#fee2e2'}; color:${isCompleted ? '#16a34a' : '#ef4444'}; display:inline-flex; align-items:center;">
              ${isCompleted ? `<i class="fas fa-check-circle me-1"></i>${l.completedBy} 완료` : '🚨 진행 중'}
            </div>
          </div>
          
          <div style="font-size:15px; color:#334155; line-height:1.7; white-space:pre-wrap; word-break:break-word; background:#f1f5f9; padding:16px; border-radius:12px;">${contentText}</div>
          
        
          ${l.imageUrl ? `
            <div style="margin-top:12px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; padding:16px; border-radius:12px;">
              <a href="${l.imageUrl}" target="_blank" style="display:inline-flex; align-items:center; gap:8px; background:#ffffff; border:1px solid #cbd5e1; padding:8px 18px; border-radius:24px; font-size:14px; color:#475569; text-decoration:none; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.04); transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe'; this.style.color='#2563eb';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1'; this.style.color='#475569';">
                <i class="far fa-image" style="color:#3b82f6; font-size:16px;"></i> 첨부사진 열기
              </a>
            </div>
          ` : ''}
        </div>
      `}).join('');
      html += `</div>`;
    }
    
    content.innerHTML = html;
    document.getElementById('worklog-day-modal').style.display = 'flex';
  }
  function closeDayModal() { document.getElementById('worklog-day-modal').style.display = 'none'; }

  // 맨 마지막 줄을 아래처럼 수정하세요. (executeSearch 추가)
  return { render, showCreateModal, closeModal, previewImage, submitTask, completeTask, changeMonth, openDayModal, closeDayModal, executeSearch };
})();