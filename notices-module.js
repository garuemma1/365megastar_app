/**
 * 1. 공지사항 모듈 컨트롤러 (Notice Board Controller)
 * 365메가스타약국 공지사항 & 업무 SOP 최고급 정갈 리디자인
 */
window.NoticesModule = (function () {

  let selectedCategory = 'ALL';

  function render(containerId) {
    const container = document.getElementById(containerId || 'module-content');
    if (!container) return;

    const data = window.SheetsSync.getData();
    const notices = data.notices || [];

    // 카테고리별 건수 집계
    const totalCount = notices.length;
    const urgentCount = notices.filter(n => n.category === '긴급/근무').length;
    const dispensingCount = notices.filter(n => n.category === '조제/투약').length;
    const hrCount = notices.filter(n => n.category === '인사/연차').length;

    const html = `
      <div class="module-header">
        <div>
          <h2>📢 약국 공지사항 & 업무 SOP</h2>
          <p class="subtitle">365메가스타약국 주요 전달사항, 조제 수칙 및 교대 인수인계 가이드라인</p>
        </div>
        <button type="button" class="btn btn-primary" onclick="NoticesModule.openCreateModal()">
          <i class="fas fa-plus"></i> 새 공지사항 작성
        </button>
      </div>

      <!-- 핵심 공지 분류 요약 스탯 카드 4열 Grid -->
      <div class="stats-overview-grid mb-6">
        <div class="stat-card" onclick="NoticesModule.filterCategory('ALL')" style="cursor: pointer;">
          <div class="stat-icon bg-emerald-light text-emerald"><i class="fas fa-bullhorn"></i></div>
          <div class="stat-info">
            <span class="stat-label">전체 공지 & SOP</span>
            <strong class="stat-value">${totalCount} <small>건</small></strong>
          </div>
        </div>
        <div class="stat-card" onclick="NoticesModule.filterCategory('긴급/근무')" style="cursor: pointer;">
          <div class="stat-icon bg-amber-light text-amber"><i class="fas fa-exclamation-circle"></i></div>
          <div class="stat-info">
            <span class="stat-label">긴급 / 근무 지침</span>
            <strong class="stat-value text-warning">${urgentCount} <small>건</small></strong>
          </div>
        </div>
        <div class="stat-card" onclick="NoticesModule.filterCategory('조제/투약')" style="cursor: pointer;">
          <div class="stat-icon bg-blue-light text-blue"><i class="fas fa-pills"></i></div>
          <div class="stat-info">
            <span class="stat-label">조제 / 투약 수칙</span>
            <strong class="stat-value text-primary">${dispensingCount} <small>건</small></strong>
          </div>
        </div>
        <div class="stat-card" onclick="NoticesModule.filterCategory('인사/연차')" style="cursor: pointer;">
          <div class="stat-icon bg-purple-light text-purple"><i class="fas fa-user-clock"></i></div>
          <div class="stat-info">
            <span class="stat-label">인사 / 연차 지침</span>
            <strong class="stat-value text-purple">${hrCount} <small>건</small></strong>
          </div>
        </div>
      </div>

      <!-- 검색 & 카테고리 필터 바 -->
      <div class="card-section mb-6">
        <div class="filter-bar-header mb-4">
          <div class="search-box w-100 mb-3">
            <i class="fas fa-search text-muted"></i>
            <input type="text" id="notice-search" placeholder="공지 제목, 업무 SOP 내용, 작성자 검색..." oninput="NoticesModule.filterNotices()">
          </div>
          <div class="category-tabs">
            <button type="button" class="cat-btn ${selectedCategory === 'ALL' ? 'active' : ''}" onclick="NoticesModule.filterCategory('ALL', this)">전체 보기</button>
            <button type="button" class="cat-btn ${selectedCategory === '긴급/근무' ? 'active' : ''}" onclick="NoticesModule.filterCategory('긴급/근무', this)">🚨 긴급/근무</button>
            <button type="button" class="cat-btn ${selectedCategory === '조제/투약' ? 'active' : ''}" onclick="NoticesModule.filterCategory('조제/투약', this)">💊 조제/투약</button>
            <button type="button" class="cat-btn ${selectedCategory === '인사/연차' ? 'active' : ''}" onclick="NoticesModule.filterCategory('인사/연차', this)">🌴 인사/연차</button>
            <button type="button" class="cat-btn ${selectedCategory === '일반공지' ? 'active' : ''}" onclick="NoticesModule.filterCategory('일반공지', this)">📢 일반공지</button>
          </div>
        </div>

        <!-- 공지사항 카드 리스트 Grid -->
        <div class="notices-grid" id="notices-list-container">
          ${renderNoticesList(notices)}
        </div>
      </div>

      <!-- 공지사항 작성/편집 모달 -->
      <div class="modal-overlay" id="notice-modal" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="notice-modal-title">📢 새 공지사항 / 업무 SOP 등록</h3>
            <button class="close-btn" onclick="NoticesModule.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="notice-form" onsubmit="NoticesModule.saveNotice(event)">
              <div class="form-group">
                <label>공지 제목</label>
                <input type="text" id="form-notice-title" required placeholder="예: [중요] 8월 연차 신청 및 야간 교대 지침">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>카테고리</label>
                  <select id="form-notice-category">
                    <option value="긴급/근무">🚨 긴급/근무</option>
                    <option value="조제/투약">💊 조제/투약</option>
                    <option value="인사/연차">🌴 인사/연차</option>
                    <option value="일반공지">📢 일반공지</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>작성자</label>
                  <input type="text" id="form-notice-author" value="약국장" required>
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-weight: 700; cursor: pointer;">
                  <input type="checkbox" id="form-notice-pinned" style="width: auto;"> 📌 최상단 우선 고지 (Important Pin)
                </label>
              </div>
              <div class="form-group">
                <label>공지 상세 내용 및 업무 인수인계 수칙</label>
                <textarea id="form-notice-content" rows="6" required placeholder="공지 상세 내용 및 업무 인수인계 수칙을 입력하세요."></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="NoticesModule.closeModal()">취소</button>
                <button type="submit" class="btn btn-primary">등록하기</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderNoticesList(notices) {
    if (notices.length === 0) {
      return `
        <div class="empty-state py-8 text-center text-muted col-span-full">
          <i class="fas fa-bullhorn fs-2 mb-2"></i>
          <p>등록되거나 검색된 공지사항이 없습니다.</p>
        </div>
      `;
    }

    // Pinned notices first
    const sorted = [...notices].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    return sorted.map(notice => `
      <div class="notice-card ${notice.isPinned ? 'pinned' : ''}">
        <div class="notice-card-header">
          <div class="notice-badges">
            ${notice.isPinned ? `<span class="badge badge-pinned"><i class="fas fa-thumbtack"></i> 최상단 고정</span>` : ''}
            <span class="badge badge-category">${notice.category}</span>
          </div>
          <span class="notice-date"><i class="far fa-clock"></i> ${notice.date}</span>
        </div>
        <h3 class="notice-title">${notice.title}</h3>
        <p class="notice-content">${notice.content.replace(/\n/g, '<br>')}</p>
        <div class="notice-card-footer">
          <span class="notice-author"><i class="fas fa-user-circle text-primary"></i> ${notice.author}</span>
          <button type="button" class="link-btn text-danger" onclick="NoticesModule.deleteNotice('${notice.id}')">
            <i class="fas fa-trash-alt"></i> 삭제
          </button>
        </div>
      </div>
    `).join('');
  }

  function filterNotices() {
    const data = window.SheetsSync.getData();
    let notices = data.notices || [];
    const searchElem = document.getElementById('notice-search');
    const query = searchElem ? searchElem.value.toLowerCase() : '';

    if (selectedCategory !== 'ALL') {
      notices = notices.filter(n => n.category === selectedCategory);
    }

    if (query) {
      notices = notices.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.author.toLowerCase().includes(query)
      );
    }

    const container = document.getElementById('notices-list-container');
    if (container) {
      container.innerHTML = renderNoticesList(notices);
    }
  }

  function filterCategory(cat, btnElem) {
    selectedCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if (btnElem) {
      btnElem.classList.add('active');
    }
    filterNotices();
  }

  function openCreateModal() {
    document.getElementById('notice-form').reset();
    document.getElementById('notice-modal').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('notice-modal').style.display = 'none';
  }

  function saveNotice(e) {
    e.preventDefault();
    const title = document.getElementById('form-notice-title').value.trim();
    const category = document.getElementById('form-notice-category').value;
    const author = document.getElementById('form-notice-author').value.trim();
    const isPinned = document.getElementById('form-notice-pinned').checked;
    const content = document.getElementById('form-notice-content').value.trim();

    const data = window.SheetsSync.getData();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const newNotice = {
      id: 'not_' + Date.now(),
      title,
      category,
      author,
      isPinned,
      content,
      date: dateStr
    };

    data.notices.unshift(newNotice);
    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.NOTICES, data.notices);

    closeModal();
    render('module-content');
    alert('새 공지사항이 성공적으로 등록되었습니다.');
  }

  function deleteNotice(id) {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
    const data = window.SheetsSync.getData();
    data.notices = data.notices.filter(n => n.id !== id);
    window.SheetsSync.saveData(window.SheetsSync.STORAGE_KEYS.NOTICES, data.notices);
    render('module-content');
  }

  return {
    render,
    filterNotices,
    filterCategory,
    openCreateModal,
    closeModal,
    saveNotice,
    deleteNotice
  };
})();
