/**
 * EmployeePortal constants and demo data
 * بيانات تجريبية وثوابت بوابة الموظف
 */

import { leaveColors } from '../../theme/palette';
import PendingIcon from '@mui/icons-material/Pending';
import MoneyIcon from '@mui/icons-material/Money';
import { CalendarIcon } from 'utils/iconAliases';

/* ─── Leave Types ─── */
export const LEAVE_TYPES = {
  annual: {
    label: 'سنوية',
    color: leaveColors.annual,
    icon: <CalendarIcon fontSize="small" />,
    maxDays: 30,
  },
  sick: {
    label: 'مرضية',
    color: leaveColors.sick,
    icon: <MedicalIcon fontSize="small" />,
    maxDays: 15,
  },
  emergency: {
    label: 'طارئة',
    color: leaveColors.emergency,
    icon: <EmergencyIcon fontSize="small" />,
    maxDays: 5,
  },
  hajj: { label: 'حج', color: leaveColors.hajj, icon: <HajjIcon fontSize="small" />, maxDays: 15 },
  maternity: {
    label: 'أمومة',
    color: leaveColors.maternity,
    icon: <MaternityIcon fontSize="small" />,
    maxDays: 70,
  },
  unpaid: {
    label: 'بدون راتب',
    color: leaveColors.unpaid,
    icon: <UnpaidIcon fontSize="small" />,
    maxDays: 30,
  },
  bereavement: {
    label: 'عزاء',
    color: leaveColors.bereavement,
    icon: <BereavementIcon fontSize="small" />,
    maxDays: 5,
  },
  study: {
    label: 'دراسية',
    color: leaveColors.study,
    icon: <StudyIcon fontSize="small" />,
    maxDays: 10,
  },
};

/* ─── Status Map ─── */
export const STATUS_MAP = {
  approved: { label: 'مقبول', color: 'success', icon: <ApprovedIcon fontSize="small" /> },
  pending: { label: 'قيد المراجعة', color: 'warning', icon: <PendingIcon fontSize="small" /> },
  rejected: { label: 'مرفوض', color: 'error', icon: <RejectedIcon fontSize="small" /> },
  completed: { label: 'مكتمل', color: 'success', icon: <ApprovedIcon fontSize="small" /> },
};

/* ─── Request Types ─── */
export const REQUEST_TYPES = {
  salary_certificate: { label: 'تعريف بالراتب', icon: <MoneyIcon fontSize="small" /> },
  equipment: { label: 'طلب معدات', icon: <EquipIcon fontSize="small" /> },
  transfer: { label: 'طلب نقل', icon: <TransferIcon fontSize="small" /> },
  training: { label: 'طلب تدريب', icon: <StudyIcon fontSize="small" /> },
  certificate: { label: 'شهادة خبرة', icon: <CertIcon fontSize="small" /> },
  vacation_advance: { label: 'سلفة إجازة', icon: <CalendarIcon fontSize="small" /> },
};

/* ─── Helpers ─── */
export const fmt = n => (n || 0).toLocaleString('ar-SA');

/* ─── Demo Profile (aligned with hrService DEMO_EMPLOYEES EMP-2501) ─── */
export const demoProfile = {
  name: 'أحمد محمد',
  empId: 'EMP-2501',
  department: 'تقنية المعلومات',
  position: 'مطور برمجيات',
  email: 'ahmed@alawael.sa',
  phone: '0551234567',
  joinDate: '2024-01-15',
  manager: 'منى القحطاني',
  gender: 'ذكر',
  nationality: 'سعودي',
  idNumber: '1098765432',
  maritalStatus: 'متزوج',
  contractType: 'دائم',
  city: 'الرياض',
  address: 'حي النزهة، شارع الملك فهد',
  bankName: 'البنك الأهلي السعودي',
  iban: 'SA44200000012345****',
};

/* ─── Demo Leave Balances ─── */
export const demoBalances = {
  annual: { total: 30, used: 12, remaining: 18 },
  sick: { total: 15, used: 3, remaining: 12 },
  emergency: { total: 5, used: 1, remaining: 4 },
  hajj: { total: 15, used: 0, remaining: 15 },
  maternity: { total: 0, used: 0, remaining: 0 },
  unpaid: { total: 30, used: 0, remaining: 30 },
  bereavement: { total: 5, used: 0, remaining: 5 },
  study: { total: 10, used: 2, remaining: 8 },
};

/* ─── Demo Leave History ─── */
export const demoLeaveHistory = [
  {
    _id: 'l1',
    type: 'annual',
    startDate: '2026-01-05',
    endDate: '2026-01-12',
    days: 8,
    reason: 'إجازة عائلية',
    status: 'approved',
  },
  {
    _id: 'l2',
    type: 'sick',
    startDate: '2026-02-10',
    endDate: '2026-02-12',
    days: 3,
    reason: 'مراجعة طبية',
    status: 'approved',
  },
  {
    _id: 'l3',
    type: 'emergency',
    startDate: '2026-03-01',
    endDate: '2026-03-01',
    days: 1,
    reason: 'ظرف طارئ',
    status: 'approved',
  },
  {
    _id: 'l4',
    type: 'annual',
    startDate: '2026-04-10',
    endDate: '2026-04-13',
    days: 4,
    reason: 'سفر',
    status: 'pending',
  },
  {
    _id: 'l5',
    type: 'study',
    startDate: '2026-04-20',
    endDate: '2026-04-21',
    days: 2,
    reason: 'اختبار شهادة مهنية',
    status: 'approved',
  },
];

/* ─── Demo Payslips ─── */
export const demoPayslips = [
  {
    _id: 'ps1',
    month: 'يناير 2026',
    basic: 12000,
    housing: 3000,
    transport: 1000,
    gosi: 960,
    deductions: 500,
    net: 14540,
  },
  {
    _id: 'ps2',
    month: 'فبراير 2026',
    basic: 12000,
    housing: 3000,
    transport: 1000,
    gosi: 960,
    deductions: 300,
    net: 14740,
  },
  {
    _id: 'ps3',
    month: 'مارس 2026',
    basic: 12000,
    housing: 3000,
    transport: 1000,
    gosi: 960,
    deductions: 800,
    net: 14240,
  },
];

/* ─── Demo Documents ─── */
export const demoDocuments = [
  { _id: 'd1', name: 'عقد العمل', type: 'contract', uploadDate: '2024-01-15', size: '2.1 MB' },
  {
    _id: 'd2',
    name: 'شهادة تعريف بالراتب',
    type: 'certificate',
    uploadDate: '2026-02-01',
    size: '450 KB',
  },
  {
    _id: 'd3',
    name: 'تقييم الأداء 2025',
    type: 'evaluation',
    uploadDate: '2026-01-15',
    size: '1.8 MB',
  },
  {
    _id: 'd4',
    name: 'شهادة تدريبية - AWS',
    type: 'training',
    uploadDate: '2025-11-20',
    size: '3.2 MB',
  },
  {
    _id: 'd5',
    name: 'تأمين طبي',
    type: 'insurance',
    uploadDate: '2024-01-15',
    size: '890 KB',
  },
];

/* ─── Demo Requests ─── */
export const demoRequests = [
  {
    _id: 'req1',
    type: 'salary_certificate',
    description: 'مطلوبة لتقديم على تمويل عقاري',
    status: 'completed',
    createdAt: '2026-02-01',
  },
  {
    _id: 'req2',
    type: 'equipment',
    description: 'شاشة إضافية 27 بوصة',
    status: 'approved',
    createdAt: '2026-02-15',
  },
  {
    _id: 'req3',
    type: 'training',
    description: 'دورة AWS Solutions Architect',
    status: 'pending',
    createdAt: '2026-02-28',
  },
  {
    _id: 'req4',
    type: 'certificate',
    description: 'شهادة خبرة لتقديمها لجهة حكومية',
    status: 'pending',
    createdAt: '2026-03-01',
  },
];
