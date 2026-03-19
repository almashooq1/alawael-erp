/**
 * خدمة نظام التعليم
 * Education System Service — Frontend API Client
 */
import api from './api';

const BASE = '/api';

// ══════════════════════════════════════════════════════════════
//  ACADEMIC YEAR  العام الدراسي
// ══════════════════════════════════════════════════════════════
export const academicYearService = {
  getAll: params => api.get(`${BASE}/academic-years`, { params }).then(r => r.data),
  getCurrent: () => api.get(`${BASE}/academic-years/current`).then(r => r.data),
  getById: id => api.get(`${BASE}/academic-years/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/academic-years`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/academic-years/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/academic-years/${id}`).then(r => r.data),
  setCurrent: id => api.patch(`${BASE}/academic-years/${id}/set-current`).then(r => r.data),
  addSemester: (id, data) =>
    api.post(`${BASE}/academic-years/${id}/semesters`, data).then(r => r.data),
  updateSemester: (yearId, semId, data) =>
    api.put(`${BASE}/academic-years/${yearId}/semesters/${semId}`, data).then(r => r.data),
  getStats: id => api.get(`${BASE}/academic-years/${id}/stats`).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  SUBJECTS  المواد الدراسية
// ══════════════════════════════════════════════════════════════
export const subjectService = {
  getAll: params => api.get(`${BASE}/subjects`, { params }).then(r => r.data),
  getByDepartment: dept => api.get(`${BASE}/subjects/department/${dept}`).then(r => r.data),
  getById: id => api.get(`${BASE}/subjects/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/subjects`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/subjects/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/subjects/${id}`).then(r => r.data),
  toggleActive: id => api.patch(`${BASE}/subjects/${id}/toggle-active`).then(r => r.data),
  getDepartments: () => api.get(`${BASE}/subjects/meta/departments`).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  TEACHERS  المعلمون
// ══════════════════════════════════════════════════════════════
export const teacherService = {
  getAll: params => api.get(`${BASE}/teachers`, { params }).then(r => r.data),
  getById: id => api.get(`${BASE}/teachers/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/teachers`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/teachers/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/teachers/${id}`).then(r => r.data),
  getWorkload: id => api.get(`${BASE}/teachers/${id}/workload`).then(r => r.data),
  getAvailable: params => api.get(`${BASE}/teachers/available/slot`, { params }).then(r => r.data),
  addRating: (id, data) => api.post(`${BASE}/teachers/${id}/ratings`, data).then(r => r.data),
  getBySpecialty: disability =>
    api.get(`${BASE}/teachers/specialty/${disability}`).then(r => r.data),
  getStats: () => api.get(`${BASE}/teachers/meta/stats`).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  CLASSROOMS  الفصول الدراسية
// ══════════════════════════════════════════════════════════════
export const classroomService = {
  getAll: params => api.get(`${BASE}/classrooms`, { params }).then(r => r.data),
  getAvailable: params => api.get(`${BASE}/classrooms/available`, { params }).then(r => r.data),
  getById: id => api.get(`${BASE}/classrooms/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/classrooms`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/classrooms/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/classrooms/${id}`).then(r => r.data),
  assignStudents: (id, studentIds) =>
    api.post(`${BASE}/classrooms/${id}/students`, { studentIds }).then(r => r.data),
  getStats: () => api.get(`${BASE}/classrooms/meta/stats`).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  CURRICULUM  المناهج الدراسية
// ══════════════════════════════════════════════════════════════
export const curriculumService = {
  getAll: params => api.get(`${BASE}/curriculum`, { params }).then(r => r.data),
  getById: id => api.get(`${BASE}/curriculum/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/curriculum`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/curriculum/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/curriculum/${id}`).then(r => r.data),
  addUnit: (id, data) => api.post(`${BASE}/curriculum/${id}/units`, data).then(r => r.data),
  updateUnit: (currId, unitId, data) =>
    api.put(`${BASE}/curriculum/${currId}/units/${unitId}`, data).then(r => r.data),
  addLesson: (currId, unitId, data) =>
    api.post(`${BASE}/curriculum/${currId}/units/${unitId}/lessons`, data).then(r => r.data),
  approve: id => api.patch(`${BASE}/curriculum/${id}/approve`).then(r => r.data),
  getProgress: id => api.get(`${BASE}/curriculum/${id}/progress`).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  TIMETABLE  الجدول الدراسي
// ══════════════════════════════════════════════════════════════
export const timetableService = {
  getAll: params => api.get(`${BASE}/timetable`, { params }).then(r => r.data),
  getById: id => api.get(`${BASE}/timetable/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/timetable`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/timetable/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/timetable/${id}`).then(r => r.data),
  addSlot: (id, data) => api.post(`${BASE}/timetable/${id}/slots`, data).then(r => r.data),
  updateSlot: (ttId, slotId, data) =>
    api.put(`${BASE}/timetable/${ttId}/slots/${slotId}`, data).then(r => r.data),
  deleteSlot: (ttId, slotId) =>
    api.delete(`${BASE}/timetable/${ttId}/slots/${slotId}`).then(r => r.data),
  addSubstitution: (id, data) =>
    api.post(`${BASE}/timetable/${id}/substitutions`, data).then(r => r.data),
  getTeacherTimetable: (teacherId, params) =>
    api.get(`${BASE}/timetable/teacher/${teacherId}`, { params }).then(r => r.data),
  publish: (id, data) => api.patch(`${BASE}/timetable/${id}/publish`, data).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  EXAMS  الاختبارات
// ══════════════════════════════════════════════════════════════
export const examService = {
  getAll: params => api.get(`${BASE}/exams`, { params }).then(r => r.data),
  getById: id => api.get(`${BASE}/exams/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/exams`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/exams/${id}`, data).then(r => r.data),
  delete: id => api.delete(`${BASE}/exams/${id}`).then(r => r.data),
  addQuestion: (id, data) => api.post(`${BASE}/exams/${id}/questions`, data).then(r => r.data),
  updateQuestion: (examId, qId, data) =>
    api.put(`${BASE}/exams/${examId}/questions/${qId}`, data).then(r => r.data),
  startExam: (id, studentId) =>
    api.post(`${BASE}/exams/${id}/start`, { studentId }).then(r => r.data),
  submitExam: (id, data) => api.post(`${BASE}/exams/${id}/submit`, data).then(r => r.data),
  getSubmissions: id => api.get(`${BASE}/exams/${id}/submissions`).then(r => r.data),
  gradeSubmission: (submissionId, data) =>
    api.put(`${BASE}/exams/submissions/${submissionId}/grade`, data).then(r => r.data),
  getStats: id => api.get(`${BASE}/exams/${id}/stats`).then(r => r.data),
};

// ══════════════════════════════════════════════════════════════
//  GRADEBOOK  سجل الدرجات
// ══════════════════════════════════════════════════════════════
export const gradebookService = {
  getAll: params => api.get(`${BASE}/gradebook`, { params }).then(r => r.data),
  getStudentGrades: (studentId, params) =>
    api.get(`${BASE}/gradebook/student/${studentId}`, { params }).then(r => r.data),
  getById: id => api.get(`${BASE}/gradebook/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/gradebook`, data).then(r => r.data),
  addEntry: (id, data) => api.post(`${BASE}/gradebook/${id}/entries`, data).then(r => r.data),
  updateEntry: (gbId, entryId, data) =>
    api.put(`${BASE}/gradebook/${gbId}/entries/${entryId}`, data).then(r => r.data),
  bulkAdd: grades => api.post(`${BASE}/gradebook/bulk`, { grades }).then(r => r.data),
  addComment: (id, data) => api.post(`${BASE}/gradebook/${id}/comments`, data).then(r => r.data),
  finalize: id => api.patch(`${BASE}/gradebook/${id}/finalize`).then(r => r.data),
  generateReport: data => api.post(`${BASE}/gradebook/reports/generate`, data).then(r => r.data),
  getReports: params => api.get(`${BASE}/gradebook/reports`, { params }).then(r => r.data),
  getClassStats: params => api.get(`${BASE}/gradebook/stats/class`, { params }).then(r => r.data),
};

// ── Default Export ───────────────────────────────────────────
const educationSystemService = {
  academicYear: academicYearService,
  subjects: subjectService,
  teachers: teacherService,
  classrooms: classroomService,
  curriculum: curriculumService,
  timetable: timetableService,
  exams: examService,
  gradebook: gradebookService,
};

export default educationSystemService;
