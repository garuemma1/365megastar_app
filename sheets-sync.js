/**
 * 구글 시트 데이터 연동 & 로컬 스토리 관리 모듈 (Google Sheets Data Sync)
 * 365메가스타약국 전용 9인 정식 명단 (약국장 1명, 근무약사 4명, 일반직원 4명)
 */
window.SheetsSync = (function () {

  const STORAGE_KEYS = {
    EMPLOYEES: '365_employees_v5',
    SCHEDULE: '365_schedule_v3',
    SCHEDULE_STATUS: '365_schedule_status_v1',
    NOTICES: '365_notices_v2',
    LEAVE_REQUESTS: '365_leave_requests_v2',
    DISCOUNT_PURCHASES: '365_discount_purchases_v2',
    WORKLOGS: '365_worklogs_v1',
    EMERGENCY_CONTACTS: '365_emergency_contacts_v1',
    PHARMACY_SETTLEMENT: '365_pharmacy_settlement_v1',
    BUILDING_RENTAL: '365_building_rental_v1',
    PAYSTUBS: '365_paystubs_v1',
    OVERTIME_ADJUSTMENTS: '365_overtime_adjustments_v1',
    CURRENT_USER: '365_current_user_v1',
    SHEET_URL: '365_sheet_url',
    LAST_SYNC: '365_last_sync'
  };

  const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/16yVS9f9bQs9Z2S1k2McnxhHGb9QjQguPa93MxZvNtP0/edit?gid=0#gid=0";

  // 기본 허용 탭 목록 (전 직원 공용)
  const ALL_COMMON_TABS = [
    'notices-module',
    'worklog-module',
    'schedule-module',
    'annual-leave-module',
    'discount-purchase-module',
    'rules-module',
    'emergency-contacts-module'
  ];

  // 365메가스타약국 최신 9인 정식 명단 및 디폴트 정보 (약국장 1명, 근무약사 4명, 일반직원 4명)
  const INITIAL_EMPLOYEES = [
    { id: 'emp_1', username: 'director@365megastar.com', email: 'director@365megastar.com', passcode: '367900', name: '문성도', role: '약국장', position: '대표약사', payType: 'DIRECTOR', joinDate: '2020-03-01', hourlyRate: 45000, baseMonthlySalary: 0, phone: '010-3679-0000', usedLeave: 3, pendingLeave: 0, memo: '365메가스타약국 대표약사 최고 관리자 계정', allowedTabs: [...ALL_COMMON_TABS, 'approval-module', 'staff-directory-module', 'pharmacy-settlement-module', 'building-rental-module'] },
    { id: 'emp_2', username: 'kwon@365megastar.com', email: 'kwon@365megastar.com', passcode: '1234', name: '권명주', role: '근무약사', position: '관리약사', payType: 'HOURLY', joinDate: '2024-09-06', hourlyRate: 40000, baseMonthlySalary: 0, phone: '010-2385-0402', usedLeave: 2, pendingLeave: 0, memo: '조제 팀장 / 약정시급제 적용 근무약사', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_3', username: 'yang@365megastar.com', email: 'yang@365megastar.com', passcode: '1234', name: '양윤지', role: '근무약사', position: '근무약사', payType: 'HOURLY', joinDate: '2023-10-04', hourlyRate: 25000, baseMonthlySalary: 0, phone: '010-4726-9807', usedLeave: 6, pendingLeave: 0, memo: '처방검수및일반관리/ 약정시급제 적용 근무약사', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_4', username: 'kimdw@365megastar.com', email: 'kimdw@365megastar.com', passcode: '1234', name: '김동완', role: '근무약사', position: '근무약사', payType: 'HOURLY', joinDate: '2026-03-01', hourlyRate: 23000, baseMonthlySalary: 0, phone: '010-8236-9650', usedLeave: 5, pendingLeave: 0, memo: '처방검수및일반관리/ 약정시급제 적용 근무약사', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_5', username: 'yoo@365megastar.com', email: 'yoo@365megastar.com', passcode: '1234', name: '유호종', role: '근무약사', position: '파트약사', payType: 'HOURLY', joinDate: '2026-03-01', hourlyRate: 25000, baseMonthlySalary: 0, phone: '010-4055-5868', usedLeave: 2, pendingLeave: 0, memo: '처방검수및일반관리/ 약정시급제 적용 파트약사', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_6', username: 'lee@365megastar.com', email: 'lee@365megastar.com', passcode: '1234', name: '이승학', role: '일반직원', position: '전산팀', payType: 'MONTHLY', joinDate: '2024-04-01', hourlyRate: 13500, baseMonthlySalary: 2490000, phone: '010-5678-9012', usedLeave: 0, pendingLeave: 0, memo: '전산 팀장 / 주40시간 정액 월급제 (식대 20만 포함)', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_7', username: 'kimjh@365megastar.com', email: 'kimjh@365megastar.com', passcode: '1234', name: '김제희', role: '일반직원', position: '약국전반업무관리', payType: 'MONTHLY', joinDate: '2024-11-01', hourlyRate: 13000, baseMonthlySalary: 2170000, phone: '010-7273-7155', usedLeave: 6, pendingLeave: 0, memo: '조제실실무전반 직간접업무관리 / 월급 임금제', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_8', username: 'yoon@365megastar.com', email: 'yoon@365megastar.com', passcode: '1234', name: '윤세라', role: '일반직원', position: '조제보조', payType: 'MONTHLY', joinDate: '2026-03-01', hourlyRate: 13000, baseMonthlySalary: 1720810, phone: '010-6371-4073', usedLeave: 1, pendingLeave: 0, memo: '조제보조/정약 임금제 (식대 20만 포함)', allowedTabs: [...ALL_COMMON_TABS] },
    { id: 'emp_9', username: 'kimbay@365megastar.com', email: 'kimbay@365megastar.com', passcode: '1234', name: '김배영', role: '일반직원', position: '조제보조', payType: 'MONTHLY', joinDate: '2025-03-01', hourlyRate: 13000, baseMonthlySalary: 1306700, phone: '010-8901-2345', usedLeave: 0, pendingLeave: 0, memo: '전산/매장보조 / 주40시간 정액 월급제 (식대 20만 포함)', allowedTabs: [...ALL_COMMON_TABS] }
  ];

  const INITIAL_DISCOUNT_PURCHASES = [
    { id: 'disc_1', empId: 'emp_8', empName: '윤세라', dateStr: '2026. 08. 10. 14:20', itemName: '유로펜정', unitPrice: 1980, qty: 2, totalPrice: 4400 },
    { id: 'disc_2', empId: 'emp_6', empName: '이승학', dateStr: '2026. 08. 09. 17:57', itemName: '일동하이퍼비타민씨', unitPrice: 26000, qty: 1, totalPrice: 28600 },
    { id: 'disc_3', empId: 'emp_9', empName: '김배영', dateStr: '2026. 08. 07. 10:31', itemName: '산리오큐빅피규어스탬프', unitPrice: 4200, qty: 2, totalPrice: 9300 },
    { id: 'disc_4', empId: 'emp_7', empName: '김제희', dateStr: '2026. 08. 06. 18:09', itemName: '파인싹연질캡슐', unitPrice: 880, qty: 1, totalPrice: 1000 },
    { id: 'disc_5', empId: 'emp_3', empName: '양윤지', dateStr: '2026. 08. 06. 09:43', itemName: '탁센레이디(10cap) 외 1건', unitPrice: 7705, qty: 1, totalPrice: 8500 },
    { id: 'disc_6', empId: 'emp_2', empName: '권명주', dateStr: '2026. 08. 05. 17:47', itemName: '핑크퐁 퍼즐미로', unitPrice: 3300, qty: 1, totalPrice: 3700 },
    { id: 'disc_7', empId: 'emp_5', empName: '유호종', dateStr: '2026. 08. 05. 10:15', itemName: '한미썬크림', unitPrice: 9900, qty: 1, totalPrice: 10900 }
  ];

  const INITIAL_SCHEDULE = [];

  const INITIAL_NOTICES = [
    { id: 'n1', title: '📢 [중요] 2026년 8월 광복절 및 대체공휴일 교대근무 및 휴일수당 안내', content: '8월 15일(광복절) 및 8월 17일(대체공휴일) 근무는 근로기준법에 따라 휴일근로가산수당(1.5배)이 자동 적용됩니다.', date: '2026-08-01', author: '문성도 약국장', category: '긴급/근무', isPinned: true },
    { id: 'n2', title: '💊 [SOP] 야간 및 주말 복약지도 및 처방전 조제 보조 지침', content: '야간(18시 이후) 및 주말 처방전 입력 시 이중점검(DUR 확인) 후 투약 봉투 출력 절차를 준수해 주세요.', date: '2026-08-03', author: '권명주 근무약사', category: '조제/투약', isPinned: true },
    { id: 'n3', title: '🌴 [연차] 8월 여름 휴가 및 연차 신청서 사전 제출 요청', content: '여름 휴가 기간 연차 사용 시 취업규칙 제13조에 따라 최소 14일 전 신청서를 제출하여 약국장 결재를 받으시기 바랍니다.', date: '2026-08-05', author: '문성도 약국장', category: '인사/연차', isPinned: false }
  ];

  const INITIAL_LEAVE_REQUESTS = [
    { id: 'l1', empId: 'emp_7', empName: '김제희', role: '일반직원', startDate: '2026-08-14', endDate: '2026-08-14', daysCount: 1.0, type: '연차', reason: '여름 개인 휴가', status: 'PENDING', createdAt: '2026-08-05 10:30' },
    { id: 'l2', empId: 'emp_2', empName: '권명주', role: '근무약사', startDate: '2026-08-21', endDate: '2026-08-21', daysCount: 1.0, type: '연차', reason: '학회 참석 및 정기휴가', status: 'APPROVED', createdAt: '2026-08-01 14:00' }
  ];

  // 신규: 약국 업무일지 & 교대 인수인계 초기 데이터
  const INITIAL_WORKLOGS = [
    { id: 'w1', date: '2026-08-11', shift: 'A조 오프닝', authorName: '권명주', authorRole: '근무약사', contentRx: '유로펜정 재고 2병 남음. 백제약품 긴급 주문완료.', contentPos: '자동조제기 2번 카세트 소모품 교체 및 클리닝 완료.', contentDelivery: '지오영 3상자 입고 검수 완료 및 라벨링 수령함.', note: 'B조 마감 시 18시 이후 처방전 DUR 이중확인 부탁드립니다.', checkedBy: ['문성도 약국장', '이승학 전산팀장'], createdAt: '2026-08-11 13:30' },
    { id: 'w2', date: '2026-08-10', shift: 'B조 마감', authorName: '이승학', authorRole: '일반직원', contentRx: '야간 처방전 총 142건 입력 완료.', contentPos: 'POS 단말기 2번 정산 완료 및 현금 영수증 차액 이상 없음.', contentDelivery: '택배 수거 물품 매장 입구 전산 수거함 배치 완료.', note: '내일 오프닝 조 8:50분 매장 라인 정돈 부탁드립니다.', checkedBy: ['문성도 약국장'], createdAt: '2026-08-10 22:05' }
  ];

  // 신규: 약국 운영 지원 연락망 초기 데이터 (4대 카테고리)
  const INITIAL_EMERGENCY_CONTACTS = {
    staff: [
      { name: '문성도', role: '약국장', dept: '대표약사 / 총괄', phone: '010-3679-0000', emergencyPhone: '010-3679-0000', notes: '24시간 약국 긴급 비상 연락 1순위' },
      { name: '권명주', role: '근무약사', dept: '조제 팀장', phone: '010-1234-5678', emergencyPhone: '010-1234-5678', notes: '조제실 긴급 인수인계 및 주말 전담' },
      { name: '양윤지', role: '근무약사', dept: 'DUR 검수약사', phone: '010-2345-6789', emergencyPhone: '010-2345-6789', notes: '처방전 시스템 및 학회 문의' },
      { name: '김동완', role: '근무약사', dept: '야간 담당 약사', phone: '010-3456-7890', emergencyPhone: '010-3456-7890', notes: '야간 및 공휴일 조제 지정 근무자' },
      { name: '유호종', role: '근무약사', dept: '신약/약품관리', phone: '010-4567-8901', emergencyPhone: '010-4567-8901', notes: '신규 입고약 수량 점검 및 검수' },
      { name: '이승학', role: '일반직원', dept: '전산 팀장', phone: '010-5678-9012', emergencyPhone: '010-5678-9012', notes: '팜IT3000 전산 장애 및 심평원 청구' },
      { name: '김제희', role: '일반직원', dept: '조제보조 / ATC', phone: '010-6789-0123', emergencyPhone: '010-6789-0123', notes: 'ATC 자동조제기 A/S 및 소모품' },
      { name: '윤세라', role: '일반직원', dept: '매장관리 / 재고', phone: '010-7890-1234', emergencyPhone: '010-7890-1234', notes: '일반의약품 및 매장 재고 관리' },
      { name: '김배영', role: '일반직원', dept: '전산 / 매장보조', phone: '010-8901-2345', emergencyPhone: '010-8901-2345', notes: '매장 안내 및 전산 서포트' }
    ],
    wholesalers: [
      { name: '지오영 (주요 도매)', repName: '김지오 팀장', phone: '010-9988-1122', cutoff: '오후 5:30 마감 (익일 오전 배송)', items: '전문의약품, 일반의약품 전 품목', type: '도매상' },
      { name: '백제약품', repName: '박백제 차장', phone: '010-8877-2233', cutoff: '오후 6:00 마감 (당일 야간/익일 첫차)', items: '긴급 전문약, 주사제, 소모품', type: '도매상' },
      { name: '동원약품', repName: '최동원 과장', phone: '010-7766-3344', cutoff: '오후 5:00 마감', items: '일반의약품, 건강기능식품', type: '도매상' },
      { name: '유진약품', repName: '정유진 대리', phone: '010-6655-4455', cutoff: '오후 4:30 마감', items: '한방 의약품, 의약외품', type: '도매상' },
      { name: '한미약품 직거래', repName: '이한미 팀장', phone: '010-1111-2222', cutoff: '오후 4:00 마감', items: '한미 전문약 (아모디핀/로수젯 등)', type: '제약사 직거래' },
      { name: '유한양행 직거래', repName: '박유한 차장', phone: '010-3333-4444', cutoff: '오후 4:00 마감', items: '유한 전문약/일반약 (삐꼼씨/트윈스타)', type: '제약사 직거래' },
      { name: '대웅제약 직거래', repName: '정대웅 과장', phone: '010-5555-6666', cutoff: '오후 4:30 마감', items: '대웅 전문약/일반약 (우루사/올메텍)', type: '제약사 직거래' }
    ],
    equipment: [
      { category: 'ATC / 포장기', name: 'JVM ATC 자동조제기 A/S센터', phone: '1577-1234', notes: '카세트 정밀 교체, 전산 연동 및 롤포지 보충 A/S' },
      { category: '약국 전산', name: '팜IT3000 유지보수센터', phone: '1588-0000', notes: '평일 09:00~20:00 / 토 09:00~15:00 (심평원 청구 및 장애)' },
      { category: '카드 단말기', name: 'NICE 정보통신 POS A/S', phone: '1544-4567', notes: 'POS 카드가맹점 결제 장애 24h 긴급 출동 지원' },
      { category: 'PC / 프린터(잉크)', name: '메가 오피스 전산 & 토너/잉크 A/S', phone: '02-555-1234', notes: '처방전 봉투 프린터, 잉크 카트리지 및 PC 긴급 수리' }
    ],
    facilities: [
      { category: '조은봉투 (소모품)', name: '조은봉투 (약봉투/약포지 주문)', phone: '1544-0000', notes: '약국 조제 봉투, 복약지도지, 롤포지 자동 인쇄 소모품' },
      { category: '건물 관리사무소', name: '365메가스타 타워 관리사무소', phone: '032-888-0000', notes: '주차장 안내, 엘리베이터, 누수/전기/냉난방 관리' },
      { category: '보안 및 방제', name: 'ADT 캡스 무인경비 & 세스코 방제', phone: '1588-6400', notes: '24시간 무인 출입 보안 및 세스코 위생/방제 관리' },
      { category: '의료폐기물 / 관공서', name: '관할 보건소 의약과 & 폐기물', phone: '031-123-4567', notes: '마약류 보고, 의약품 수불 및 의료폐기물 수거' }
    ]
  };

  // 신규: 약국 정산 시스템 초기 데이터 (Director Only)
  const INITIAL_PHARMACY_SETTLEMENT = {
    month: '2026-08',
    dispensingRevenue: 48500000, // 조제 총 매출 (조제료 1,850만 + 본인부담금 1,200만 + 공단청구 1,800만)
    posRevenue: 24200000,        // 매장 POS 매출 (일반약, 영양제, 카운터)
    drugPurchaseExpense: 42100000, // 약품 사입비 (지오영, 백제 등)
    operatingExpense: 6800000,     // 고정 관리비 (임대료 350만 + 관리비 80만 + 세무/보안/기타 250만)
    cardFeeExpense: 1120000        // 카드 가맹점 수수료
  };

  // 신규: 메가스타 건물 임대업 대시보드 초기 데이터 (Director Only)
  const INITIAL_BUILDING_RENTAL = {
    buildingName: '365메가스타 타워',
    units: [
      { unit: '101호', tenantName: '365메가스타약국 (자사)', type: '약국', rent: 3500000, maintenanceFee: 500000, deposit: 100000000, startDate: '2020-03-01', endDate: '2030-03-01', status: 'PAID', taxInvoice: true, note: '약국장 직접 운영' },
      { unit: '102호', tenantName: '메가 커피앤베이커리', type: '카페', rent: 2200000, maintenanceFee: 300000, deposit: 50000000, startDate: '2023-05-01', endDate: '2026-10-31', status: 'PAID', taxInvoice: true, note: '계약 만료 D-79 (갱신 상담 예정)' },
      { unit: '201호', tenantName: '연세 바른의원 (내과/이비인후과)', type: '병원', rent: 4800000, maintenanceFee: 700000, deposit: 150000000, startDate: '2021-04-01', endDate: '2027-04-01', status: 'PAID', taxInvoice: true, note: '처방전 주요 연계 병원' },
      { unit: '202호', tenantName: '메가스타 치과의원', type: '병원', rent: 3800000, maintenanceFee: 550000, deposit: 100000000, startDate: '2022-09-01', endDate: '2026-09-30', status: 'PENDING', taxInvoice: false, note: '당월 입금 대기 중 (8월 15일 입금 예정)' }
    ],
    financialSummary: {
      mortgageInterest: 2150000, // 건물 융자 이자
      buildingMaintenance: 650000 // 건물 미화 및 화재보험 등 유지비
    }
  };

  function generateScheduleForMonth(year, month) {
    const list = [];
    const empIds = ['emp_1', 'emp_2', 'emp_3', 'emp_4', 'emp_5', 'emp_6', 'emp_7', 'emp_8', 'emp_9'];
    const totalDays = new Date(year, month, 0).getDate();
    const monthStr = String(month).padStart(2, '0');

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;

      empIds.forEach(empId => {
        // 최초 기본값: 0시간 / OFF (하단 '+ 근무/휴무 설정'을 통해 설정 시 자동 합산)
        list.push({
          id: `sch_${dateStr}_${empId}`,
          empId,
          date: dateStr,
          shift: 'OFF',
          startTime: '',
          endTime: ''
        });
      });
    }
    return list;
  }

  function generateInitialAllSchedules() {
    return [
      ...generateScheduleForMonth(2026, 6),
      ...generateScheduleForMonth(2026, 7),
      ...generateScheduleForMonth(2026, 8),
      ...generateScheduleForMonth(2026, 9)
    ];
  }

  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage warning:", e);
      return null;
    }
  }

  function safeSetItem(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      console.warn("Storage save warning:", e);
    }
  }

  function getCurrentUser() {
    const isLoggedOut = safeGetItem('365_is_logged_out');
    if (isLoggedOut === 'true') {
      return null;
    }

    const raw = safeGetItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    // 기본 첫 접속 시 약국장 세션 기본 적용
    const emps = getEmployees();
    return emps.find(e => e.id === 'emp_1') || emps[0];
  }

  function setCurrentUser(emp) {
    safeSetItem('365_is_logged_out', 'false');
    safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(emp));
  }

  function logoutUser() {
    safeSetItem('365_is_logged_out', 'true');
    try { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch(e) {}
  }

  // 비밀번호 10자리 복합 규칙 검증 (숫자4+영문4+특수기호2)
  function validatePasswordComplexity(pw) {
    if (!pw || pw.length < 10) {
      return { valid: false, message: '비밀번호는 최소 10자리 이상이어야 합니다.' };
    }
    const digits = (pw.match(/[0-9]/g) || []).length;
    if (digits < 4) {
      return { valid: false, message: '숫자가 최소 4개 이상 포함되어야 합니다. (현재 ' + digits + '개)' };
    }
    const letters = (pw.match(/[a-zA-Z]/g) || []).length;
    if (letters < 4) {
      return { valid: false, message: '영문자가 최소 4개 이상 포함되어야 합니다. (현재 ' + letters + '개)' };
    }
    const symbols = (pw.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (symbols < 2) {
      return { valid: false, message: '특수기호가 최소 2개 이상 포함되어야 합니다. (현재 ' + symbols + '개)' };
    }
    return { valid: true, message: '안전한 10자리 복합 비밀번호입니다!' };
  }

  function changePassword(empId, currentPw, newPw) {
    const emps = getEmployees();
    const target = emps.find(e => e.id === empId);
    if (!target) return { success: false, message: '해당 직원을 찾을 수 없습니다.' };

    if (target.passcode !== currentPw) {
      return { success: false, message: '현재 비밀번호가 일치하지 않습니다.' };
    }

    const check = validatePasswordComplexity(newPw);
    if (!check.valid) {
      return { success: false, message: check.message };
    }

    target.passcode = newPw;
    saveEmployees(emps);
    
    // 현재 세션 갱신
    const curr = getCurrentUser();
    if (curr && curr.id === empId) {
      curr.passcode = newPw;
      setCurrentUser(curr);
    }

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다!' };
  }

  function resetPassword(empId) {
    const emps = getEmployees();
    const target = emps.find(e => e.id === empId);
    if (!target) return false;
    target.passcode = '1234'; // 초기값 1234로 비상 리셋
    saveEmployees(emps);
    return true;
  }

  function updateStaffPermissions(empId, allowedTabs) {
    const emps = getEmployees();
    const target = emps.find(e => e.id === empId);
    if (!target) return false;
    target.allowedTabs = allowedTabs;
    saveEmployees(emps);

    // 현재 세션 유저 업데이트
    const curr = getCurrentUser();
    if (curr && curr.id === empId) {
      curr.allowedTabs = allowedTabs;
      setCurrentUser(curr);
    }
    return true;
  }

  // --- 저장소 Getter & Setter 유틸리티 ---
  function getEmployees() {
    let emps;
    try {
      const raw = safeGetItem(STORAGE_KEYS.EMPLOYEES);
      emps = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
    } catch (e) {
      emps = INITIAL_EMPLOYEES;
    }

    if (!Array.isArray(emps) || emps.length === 0) {
      emps = INITIAL_EMPLOYEES;
    }

    // 최신 정식 9인 명단(INITIAL_EMPLOYEES)을 기본 디폴트로 병합하여 언제 어디서나 디폴트값 보장
    const finalEmps = INITIAL_EMPLOYEES.map(init => {
      const saved = emps.find(e => e.id === init.id || e.name === init.name);
      return {
        ...init,
        ...(saved || {}),
        phone: (saved && saved.phone && saved.phone.length > 5) ? saved.phone : init.phone,
        hourlyRate: (saved && saved.hourlyRate !== undefined) ? saved.hourlyRate : init.hourlyRate,
        joinDate: (saved && saved.joinDate && saved.joinDate !== '0001-01-01') ? saved.joinDate : init.joinDate,
        memo: (saved && saved.memo) ? saved.memo : init.memo,
        position: (saved && saved.position) ? saved.position : init.position
      };
    });

    safeSetItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(finalEmps));
    return finalEmps;
  }

  function saveEmployees(data) {
    safeSetItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(data));
    pushToCloud();
  }

  function getWorklogs() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.WORKLOGS);
      return raw ? JSON.parse(raw) : INITIAL_WORKLOGS;
    } catch(e) { return INITIAL_WORKLOGS; }
  }

  function saveWorklogs(data) {
    safeSetItem(STORAGE_KEYS.WORKLOGS, JSON.stringify(data));
    pushToCloud();
  }

  function getEmergencyContacts() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
      return raw ? JSON.parse(raw) : INITIAL_EMERGENCY_CONTACTS;
    } catch(e) { return INITIAL_EMERGENCY_CONTACTS; }
  }

  function saveEmergencyContacts(data) {
    safeSetItem(STORAGE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(data));
    pushToCloud();
  }

  function getPharmacySettlement() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.PHARMACY_SETTLEMENT);
      return raw ? JSON.parse(raw) : INITIAL_PHARMACY_SETTLEMENT;
    } catch(e) { return INITIAL_PHARMACY_SETTLEMENT; }
  }

  function savePharmacySettlement(data) {
    safeSetItem(STORAGE_KEYS.PHARMACY_SETTLEMENT, JSON.stringify(data));
    pushToCloud();
  }

  function getBuildingRental() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.BUILDING_RENTAL);
      return raw ? JSON.parse(raw) : INITIAL_BUILDING_RENTAL;
    } catch(e) { return INITIAL_BUILDING_RENTAL; }
  }

  function saveBuildingRental(data) {
    safeSetItem(STORAGE_KEYS.BUILDING_RENTAL, JSON.stringify(data));
    pushToCloud();
  }

  function getSchedule() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.SCHEDULE);
      let list = raw ? JSON.parse(raw) : null;
      if (!list || !Array.isArray(list) || list.length === 0) {
        list = generateInitialAllSchedules();
        safeSetItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(list));
      }
      return list;
    } catch(e) {
      return generateInitialAllSchedules();
    }
  }

  function saveSchedule(data) {
    safeSetItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(data));
    pushToCloud();
  }

  function getNotices() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.NOTICES);
      return raw ? JSON.parse(raw) : INITIAL_NOTICES;
    } catch(e) { return INITIAL_NOTICES; }
  }

  function saveNotices(data) {
    safeSetItem(STORAGE_KEYS.NOTICES, JSON.stringify(data));
    pushToCloud();
  }

  function getLeaveRequests() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.LEAVE_REQUESTS);
      return raw ? JSON.parse(raw) : INITIAL_LEAVE_REQUESTS;
    } catch(e) { return INITIAL_LEAVE_REQUESTS; }
  }

  function saveLeaveRequests(data) {
    safeSetItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(data));
    pushToCloud();
  }

  function getDiscountPurchases() {
    try {
      const raw = safeGetItem(STORAGE_KEYS.DISCOUNT_PURCHASES);
      return raw ? JSON.parse(raw) : INITIAL_DISCOUNT_PURCHASES;
    } catch(e) { return INITIAL_DISCOUNT_PURCHASES; }
  }

  const CLOUD_DB_ID = "ff8081819ff5b110019fffda0f871a37";
  const CLOUD_URL = `https://api.restful-api.dev/objects/${CLOUD_DB_ID}`;
  let isSyncing = false;

  async function pushToCloud() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    try {
      const payload = {
        name: "365megastar_pharmacy_master_db_v1",
        data: {
          updatedAt: new Date().toISOString(),
          employees: getEmployees(),
          schedule: getSchedule(),
          scheduleStatus: safeGetItem(STORAGE_KEYS.SCHEDULE_STATUS) ? JSON.parse(safeGetItem(STORAGE_KEYS.SCHEDULE_STATUS)) : {},
          notices: getNotices(),
          leaveRequests: getLeaveRequests(),
          discountPurchases: getDiscountPurchases(),
          worklogs: getWorklogs(),
          emergencyContacts: getEmergencyContacts(),
          pharmacySettlement: getPharmacySettlement(),
          buildingRental: getBuildingRental(),
          paystubs: getPaystubs(),
          overtimeAdjustments: getOvertimeAdjustments()
        }
      };

      await window.fetch(CLOUD_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      safeSetItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      updateSyncStatusUI('success');
    } catch(e) {
      updateSyncStatusUI('error');
    }
  }

  async function pullFromCloud(callback) {
    if (isSyncing || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    isSyncing = true;
    try {
      const res = await window.fetch(CLOUD_URL);
      if (res && res.ok) {
        const json = await res.json();
        const cloudData = json && json.data;
        if (cloudData) {
          let updated = false;
          if (cloudData.worklogs) { safeSetItem(STORAGE_KEYS.WORKLOGS, JSON.stringify(cloudData.worklogs)); updated = true; }
          if (cloudData.notices) { safeSetItem(STORAGE_KEYS.NOTICES, JSON.stringify(cloudData.notices)); updated = true; }
          if (cloudData.leaveRequests) { safeSetItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(cloudData.leaveRequests)); updated = true; }
          if (cloudData.discountPurchases) { safeSetItem(STORAGE_KEYS.DISCOUNT_PURCHASES, JSON.stringify(cloudData.discountPurchases)); updated = true; }
          if (cloudData.schedule) { safeSetItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(cloudData.schedule)); updated = true; }
          if (cloudData.scheduleStatus) { safeSetItem(STORAGE_KEYS.SCHEDULE_STATUS, JSON.stringify(cloudData.scheduleStatus)); updated = true; }
          if (cloudData.paystubs) { safeSetItem(STORAGE_KEYS.PAYSTUBS, JSON.stringify(cloudData.paystubs)); updated = true; }
          if (cloudData.overtimeAdjustments) { safeSetItem(STORAGE_KEYS.OVERTIME_ADJUSTMENTS, JSON.stringify(cloudData.overtimeAdjustments)); updated = true; }
          if (cloudData.employees) { safeSetItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(cloudData.employees)); updated = true; }
          safeSetItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
          updateSyncStatusUI('success');
          if (updated) {
            if (typeof callback === 'function') callback();
            if (window.App && typeof window.App.checkPendingRejectionNotice === 'function') {
              window.App.checkPendingRejectionNotice();
            }
          }
        }
      }
    } catch(e) {
    } finally {
      isSyncing = false;
    }
  }

  function updateSyncStatusUI(status) {
    const el = document.getElementById('cloud-sync-badge');
    if (el) {
      if (status === 'success') {
        el.innerHTML = '<span class="badge bg-success" style="font-size:11.5px; padding:5px 9px; border-radius:12px;"><i class="fas fa-cloud-check me-1"></i> ☁️ 실시간 클라우드 공유 연동 중</span>';
      } else {
        el.innerHTML = '<span class="badge bg-secondary" style="font-size:11.5px; padding:5px 9px; border-radius:12px;"><i class="fas fa-cloud me-1"></i> ☁️ 동기화 가동 중</span>';
      }
    }
  }

  // 앱 시동 및 화면 복귀(Focus) 시 클라우드 동기화 자동 실행
  if (typeof window !== 'undefined') {
    setTimeout(() => pullFromCloud(), 1000);
    window.addEventListener('focus', () => pullFromCloud());
    setInterval(() => pullFromCloud(), 30000); // 30초마다 백그라운드 자동 동기화
  }

  function saveDiscountPurchases(data) {
    safeSetItem(STORAGE_KEYS.DISCOUNT_PURCHASES, JSON.stringify(data));
    pushToCloud();
  }

  function getSheetUrl() {
    return safeGetItem(STORAGE_KEYS.SHEET_URL) || DEFAULT_SHEET_URL;
  }

  function setSheetUrl(url) {
    safeSetItem(STORAGE_KEYS.SHEET_URL, url);
  }

  function getPaystubs() {
    const raw = safeGetItem(STORAGE_KEYS.PAYSTUBS);
    return raw ? JSON.parse(raw) : {};
  }

  function savePaystubs(data) {
    safeSetItem(STORAGE_KEYS.PAYSTUBS, JSON.stringify(data));
    pushToCloud();
  }

  function getOvertimeAdjustments() {
    const raw = safeGetItem(STORAGE_KEYS.OVERTIME_ADJUSTMENTS);
    return raw ? JSON.parse(raw) : {};
  }

  function saveOvertimeAdjustments(data) {
    safeSetItem(STORAGE_KEYS.OVERTIME_ADJUSTMENTS, JSON.stringify(data));
    pushToCloud();
  }

  function getData() {
    return {
      employees: getEmployees(),
      schedule: getSchedule(),
      scheduleStatus: safeGetItem(STORAGE_KEYS.SCHEDULE_STATUS) ? JSON.parse(safeGetItem(STORAGE_KEYS.SCHEDULE_STATUS)) : {},
      notices: getNotices(),
      leaveRequests: getLeaveRequests(),
      discountPurchases: getDiscountPurchases(),
      worklogs: getWorklogs(),
      emergencyContacts: getEmergencyContacts(),
      pharmacySettlement: getPharmacySettlement(),
      buildingRental: getBuildingRental(),
      paystubs: getPaystubs(),
      overtimeAdjustments: getOvertimeAdjustments()
    };
  }

  function saveData(key, data) {
    safeSetItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    pushToCloud();
  }

  function getPharmacistRates() {
    try {
      const raw = safeGetItem('365_pharmacist_rates_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      'emp_2': { weekdayRate: 40000, holidayRate: 40000, breakHours: 1.0 },
      'emp_3': { weekdayRate: 35000, holidayRate: 40000, breakHours: 1.0 },
      'emp_4': { weekdayRate: 23000, holidayRate: 25000, breakHours: 1.0 },
      'emp_5': { weekdayRate: 25000, holidayRate: 27000, breakHours: 1.0 }
    };
  }

  function savePharmacistRates(data) {
    safeSetItem('365_pharmacist_rates_v1', JSON.stringify(data));
  }

  return {
    STORAGE_KEYS,
    getData,
    saveData,
    getCurrentUser,
    setCurrentUser,
    logoutUser,
    validatePasswordComplexity,
    changePassword,
    resetPassword,
    updateStaffPermissions,
    getEmployees,
    saveEmployees,
    getWorklogs,
    saveWorklogs,
    getEmergencyContacts,
    saveEmergencyContacts,
    getPharmacySettlement,
    savePharmacySettlement,
    getBuildingRental,
    saveBuildingRental,
    getSchedule,
    saveSchedule,
    getNotices,
    saveNotices,
    getLeaveRequests,
    saveLeaveRequests,
    getDiscountPurchases,
    saveDiscountPurchases,
    getPaystubs,
    savePaystubs,
    getOvertimeAdjustments,
    saveOvertimeAdjustments,
    getPharmacistRates,
    savePharmacistRates,
    generateScheduleForMonth,
    pushToCloud,
    pullFromCloud,
    getSheetUrl,
    setSheetUrl
  };
})();
