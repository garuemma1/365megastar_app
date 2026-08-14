/**
 * 5. 365메가스타약국 취업규칙 열람 모듈 컨트롤러 (Employment Regulations Viewer)
 * 첨부된 취업규칙 전문 조항 검색, 장별 목차 바로가기 및 인쇄 지원
 */
window.RulesModule = (function () {

  let activeChapterId = null;

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rulesData = window.RULES_DATA;

    const html = `
      <div class="module-header">
        <div>
          <h2>📜 365메가스타약국 취업규칙 전문 열람</h2>
          <p class="subtitle">시행일: ${rulesData.effectiveDate} | 약국 전 직원 필수 숙지 인사·노무 규정</p>
        </div>
        <button class="btn btn-outline" onclick="window.print()">
          <i class="fas fa-print"></i> 취업규칙 인쇄/저장
        </button>
      </div>

      <!-- 검색 & 본문 메인 레이아웃 -->
      <div class="rules-main-layout">
        <!-- 좌측 장별 목차 바로가기 -->
        <div class="rules-toc-sidebar sticky-panel">
          <div class="search-box mb-4">
            <i class="fas fa-search"></i>
            <input type="text" id="rules-search-input" placeholder="조항, 키워드 검색 (예: 시용, 연차, 포괄)..." oninput="RulesModule.searchRules()">
          </div>
          <h4><i class="fas fa-list"></i> 목차 (Chapters)</h4>
          <ul class="toc-list">
            ${rulesData.chapters.map(ch => `
              <li>
                <a href="#${ch.id}" class="toc-link" onclick="RulesModule.scrollToChapter('${ch.id}', event)">
                  <span class="toc-num">${ch.number}</span>
                  <span class="toc-title">${ch.title}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- 우측 본문 조항 영역 -->
        <div class="rules-content-area" id="rules-text-container">
          ${renderRulesBody(rulesData.chapters)}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderRulesBody(chapters, searchKeyword = '') {
    return chapters.map(ch => `
      <div class="rules-chapter-card" id="${ch.id}">
        <div class="chapter-header">
          <h3><span class="ch-badge">${ch.number}</span> ${ch.title}</h3>
        </div>
        <div class="chapter-body">
          ${ch.articles.map(art => {
            let contentHtml = art.content.replace(/\n/g, '<br>');

            if (searchKeyword) {
              const regex = new RegExp(`(${searchKeyword})`, 'gi');
              contentHtml = contentHtml.replace(regex, '<mark class="search-hl">$1</mark>');
            }

            return `
              <div class="article-item" id="${art.id}">
                <div class="article-title-bar">
                  <strong>${art.number} [${art.title}]</strong>
                  <div class="article-tags">
                    ${art.tags.map(t => `<span class="tag-pill">#${t}</span>`).join('')}
                  </div>
                </div>
                <div class="article-content">${contentHtml}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  function scrollToChapter(chId, e) {
    if (e) e.preventDefault();
    const elem = document.getElementById(chId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
      const activeLink = document.querySelector(`.toc-link[href="#${chId}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  }

  function searchRules() {
    const query = document.getElementById('rules-search-input').value.trim().toLowerCase();
    const rulesData = window.RULES_DATA;

    if (!query) {
      document.getElementById('rules-text-container').innerHTML = renderRulesBody(rulesData.chapters);
      return;
    }

    const filteredChapters = rulesData.chapters.map(ch => {
      const matchingArticles = ch.articles.filter(art =>
        art.number.toLowerCase().includes(query) ||
        art.title.toLowerCase().includes(query) ||
        art.content.toLowerCase().includes(query) ||
        art.tags.some(t => t.toLowerCase().includes(query))
      );

      if (matchingArticles.length > 0) {
        return {
          ...ch,
          articles: matchingArticles
        };
      }
      return null;
    }).filter(ch => ch !== null);

    if (filteredChapters.length === 0) {
      document.getElementById('rules-text-container').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search-minus"></i>
          <p>'${query}' 키워드와 일치하는 취업규칙 조항이 없습니다.</p>
        </div>
      `;
    } else {
      document.getElementById('rules-text-container').innerHTML = renderRulesBody(filteredChapters, query);
    }
  }

  return {
    render,
    scrollToChapter,
    searchRules
  };
})();
