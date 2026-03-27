/**
 * HR Smart API — خدمات الذكاء الاصطناعي والتحليلات
 */
const API_BASE = '/api/hr-smart';

// ═══════ AI Endpoints ═══════

export async function fetchAttritionRisk(employeeId) {
  const res = await fetch(`${API_BASE}/ai/attrition-risk/${employeeId}`);
  if (!res.ok) throw new Error('فشل جلب تحليل مخاطر الاستقالة');
  return res.json();
}

export async function fetchTrainingSuggestions(employeeId) {
  const res = await fetch(`${API_BASE}/ai/training-suggestions/${employeeId}`);
  if (!res.ok) throw new Error('فشل جلب توصيات التدريب');
  return res.json();
}

export async function fetchAttendancePatterns(department) {
  const url = department
    ? `${API_BASE}/ai/attendance-patterns?department=${department}`
    : `${API_BASE}/ai/attendance-patterns`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('فشل جلب تحليل الحضور');
  return res.json();
}

export async function fetchSmartDashboard() {
  const res = await fetch(`${API_BASE}/ai/dashboard`);
  if (!res.ok) throw new Error('فشل جلب لوحة التحكم الذكية');
  return res.json();
}

export async function fetchPromotionRecommendations() {
  const res = await fetch(`${API_BASE}/ai/promotion-recommendations`);
  if (!res.ok) throw new Error('فشل جلب توصيات الترقية');
  return res.json();
}

export async function fetchWorkforceCost() {
  const res = await fetch(`${API_BASE}/ai/workforce-cost`);
  if (!res.ok) throw new Error('فشل جلب تحليل التكاليف');
  return res.json();
}

export async function fetchSkillGap(departmentId) {
  const res = await fetch(`${API_BASE}/ai/skill-gap/${departmentId}`);
  if (!res.ok) throw new Error('فشل جلب تحليل فجوة المهارات');
  return res.json();
}

// ═══════ Analytics ═══════

export async function fetchWorkforceReport() {
  const res = await fetch(`${API_BASE}/analytics/workforce`);
  if (!res.ok) throw new Error('فشل جلب تقرير القوى العاملة');
  return res.json();
}

export async function fetchLeaveReport(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/leaves?${qs}`);
  if (!res.ok) throw new Error('فشل جلب تقرير الإجازات');
  return res.json();
}

export async function fetchAttendanceReport(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/attendance?${qs}`);
  if (!res.ok) throw new Error('فشل جلب تقرير الحضور');
  return res.json();
}

export async function fetchPayrollReport(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/payroll?${qs}`);
  if (!res.ok) throw new Error('فشل جلب تقرير الرواتب');
  return res.json();
}

export async function fetchSaudizationReport() {
  const res = await fetch(`${API_BASE}/analytics/saudization`);
  if (!res.ok) throw new Error('فشل جلب تقرير السعودة');
  return res.json();
}

// ═══════ Onboarding ═══════

export async function fetchOnboardingDashboard() {
  const res = await fetch(`${API_BASE}/onboarding/dashboard`);
  if (!res.ok) throw new Error('فشل جلب لوحة تحكم التهيئة');
  return res.json();
}

export async function fetchOnboardingTemplates() {
  const res = await fetch(`${API_BASE}/onboarding/templates`);
  if (!res.ok) throw new Error('فشل جلب القوالب');
  return res.json();
}

export async function fetchOnboardingList(filters) {
  const qs = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/onboarding?${qs}`);
  if (!res.ok) throw new Error('فشل جلب قائمة التهيئة');
  return res.json();
}

export async function fetchOnboardingByEmployee(employeeId) {
  const res = await fetch(`${API_BASE}/onboarding/employee/${employeeId}`);
  if (!res.ok) throw new Error('فشل جلب بيانات التهيئة');
  return res.json();
}

export async function createOnboarding(data) {
  const res = await fetch(`${API_BASE}/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('فشل إنشاء عملية التهيئة');
  return res.json();
}

export async function updateOnboardingTask(onboardingId, taskId, data) {
  const res = await fetch(`${API_BASE}/onboarding/${onboardingId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('فشل تحديث المهمة');
  return res.json();
}

// ═══════ Documents ═══════

export async function fetchDocumentDashboard() {
  const res = await fetch(`${API_BASE}/documents/dashboard`);
  if (!res.ok) throw new Error('فشل جلب لوحة المستندات');
  return res.json();
}

export async function fetchExpiringDocuments(days = 30) {
  const res = await fetch(`${API_BASE}/documents/expiring?days=${days}`);
  if (!res.ok) throw new Error('فشل جلب المستندات المنتهية');
  return res.json();
}

export async function fetchEmployeeDocuments(employeeId) {
  const res = await fetch(`${API_BASE}/documents/employee/${employeeId}`);
  if (!res.ok) throw new Error('فشل جلب مستندات الموظف');
  return res.json();
}

export async function createDocument(data) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('فشل إنشاء المستند');
  return res.json();
}

export async function verifyDocument(documentId, notes) {
  const res = await fetch(`${API_BASE}/documents/${documentId}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('فشل التحقق من المستند');
  return res.json();
}
