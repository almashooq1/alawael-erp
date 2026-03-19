/**
 * employeeManagement.constants.js — Constants, config, validation & helpers
 * الثوابت والتهيئة والتحقق
 */
import {
  CheckCircle as ActiveIcon,
  PersonOff as InactiveIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  ContactPhone as ContactIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { statusColors } from '../../theme/palette';

export const DEPARTMENTS = [
  'تقنية المعلومات',
  'الموارد البشرية',
  'المالية',
  'التعليم',
  'العلاج الطبيعي',
  'العلاج الوظيفي',
  'علاج النطق',
  'الإدارة',
  'الخدمات المساندة',
  'التأهيل',
  'الإشراف',
  'التمريض',
];

export const STATUS_MAP = {
  active: { label: 'نشط', color: 'success', icon: <ActiveIcon fontSize="small" /> },
  on_leave: { label: 'في إجازة', color: 'warning', icon: <InactiveIcon fontSize="small" /> },
  inactive: { label: 'غير نشط', color: 'default', icon: <InactiveIcon fontSize="small" /> },
  terminated: { label: 'منتهي', color: 'error', icon: <InactiveIcon fontSize="small" /> },
};

export const CONTRACT_TYPES = [
  { value: 'permanent', label: 'دائم' },
  { value: 'contract', label: 'عقد محدد المدة' },
  { value: 'part_time', label: 'دوام جزئي' },
  { value: 'intern', label: 'متدرب' },
  { value: 'temporary', label: 'مؤقت' },
];

export const GENDERS = [
  { value: 'male', label: 'ذكر', icon: <MaleIcon /> },
  { value: 'female', label: 'أنثى', icon: <FemaleIcon /> },
];

export const MARITAL_STATUS = [
  { value: 'single', label: 'أعزب/عزباء' },
  { value: 'married', label: 'متزوج/ة' },
  { value: 'divorced', label: 'مطلق/ة' },
  { value: 'widowed', label: 'أرمل/ة' },
];

export const NATIONALITIES = [
  'سعودي',
  'مصري',
  'أردني',
  'سوداني',
  'يمني',
  'سوري',
  'فلسطيني',
  'باكستاني',
  'هندي',
  'فلبيني',
  'بنغلاديشي',
  'أخرى',
];

export const BANKS = [
  'البنك الأهلي السعودي',
  'بنك الراجحي',
  'البنك السعودي الفرنسي',
  'بنك الإنماء',
  'بنك الرياض',
  'بنك البلاد',
  'بنك الجزيرة',
  'البنك السعودي البريطاني',
  'البنك العربي الوطني',
  'أخرى',
];

export const POSITIONS_BY_DEPT = {
  'تقنية المعلومات': ['مطور برمجيات', 'مدير تقنية', 'محلل نظم', 'فني دعم', 'مهندس شبكات'],
  'الموارد البشرية': ['مدير الموارد البشرية', 'أخصائي توظيف', 'أخصائي شؤون موظفين', 'مسؤول رواتب'],
  المالية: ['محاسب', 'مدير مالي', 'مراجع مالي', 'أمين صندوق'],
  التعليم: ['معلم', 'أخصائي مناهج', 'مشرف تعليمي', 'مساعد معلم'],
  'العلاج الطبيعي': ['أخصائي علاج طبيعي', 'فني علاج طبيعي', 'استشاري'],
  'العلاج الوظيفي': ['أخصائي علاج وظيفي', 'فني علاج وظيفي', 'استشاري'],
  'علاج النطق': ['أخصائي نطق', 'فني نطق', 'استشاري نطق'],
  الإدارة: ['مدير إداري', 'سكرتير', 'مساعد إداري', 'موظف استقبال'],
  'الخدمات المساندة': ['فني صيانة', 'سائق', 'حارس أمن', 'عامل نظافة'],
  التأهيل: ['أخصائي تأهيل', 'مشرف تأهيل', 'فني تأهيل'],
  الإشراف: ['مشرف عام', 'مشرف قسم', 'منسق'],
  التمريض: ['ممرض', 'ممرض رئيسي', 'مساعد تمريض'],
};

export const STEPS = [
  { label: 'البيانات الشخصية', icon: <PersonIcon /> },
  { label: 'البيانات الوظيفية', icon: <WorkIcon /> },
  { label: 'معلومات التواصل', icon: <ContactIcon /> },
  { label: 'البيانات المالية', icon: <BankIcon /> },
];

export const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  nationality: 'سعودي',
  idNumber: '',
  maritalStatus: '',
  employeeNumber: '',
  department: '',
  position: '',
  status: 'active',
  joinDate: '',
  contractType: 'permanent',
  contractEndDate: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
  basicSalary: '',
  housingAllowance: '',
  transportAllowance: '',
  otherAllowance: '',
  bankName: '',
  iban: '',
};

/** Stats card definitions */
export const STAT_CARDS = stats => [
  { label: 'إجمالي الموظفين', value: stats.total, color: statusColors.primaryBlue },
  { label: 'نشط', value: stats.active, color: statusColors.success },
  { label: 'في إجازة', value: stats.onLeave, color: statusColors.warning },
  { label: 'غير نشط / منتهي', value: stats.inactive, color: statusColors.error },
  { label: 'الأقسام', value: stats.depts, color: statusColors.purple },
];

/* ─── Validation ─── */
export const validateStep = (step, frm) => {
  const err = {};
  if (step === 0) {
    if (!frm.firstName.trim()) err.firstName = 'الاسم الأول مطلوب';
    if (!frm.lastName.trim()) err.lastName = 'الاسم الأخير مطلوب';
    if (!frm.gender) err.gender = 'الجنس مطلوب';
    if (!frm.nationality) err.nationality = 'الجنسية مطلوبة';
    if (frm.idNumber && !/^\d{10}$/.test(frm.idNumber))
      err.idNumber = 'رقم الهوية يجب أن يكون 10 أرقام';
  }
  if (step === 1) {
    if (!frm.department) err.department = 'القسم مطلوب';
    if (!frm.position.trim()) err.position = 'المنصب مطلوب';
    if (!frm.joinDate) err.joinDate = 'تاريخ التعيين مطلوب';
    if (frm.contractType !== 'permanent' && !frm.contractEndDate)
      err.contractEndDate = 'تاريخ انتهاء العقد مطلوب للعقود المحددة';
  }
  if (step === 2) {
    if (!frm.phone.trim()) err.phone = 'رقم الهاتف مطلوب';
    else if (!/^05\d{8}$/.test(frm.phone.replace(/\s/g, '')))
      err.phone = 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    if (frm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(frm.email))
      err.email = 'البريد الإلكتروني غير صالح';
    if (frm.emergencyPhone && !/^05\d{8}$/.test(frm.emergencyPhone.replace(/\s/g, '')))
      err.emergencyPhone = 'رقم هاتف الطوارئ غير صالح';
  }
  if (step === 3) {
    if (!frm.basicSalary || +frm.basicSalary <= 0) err.basicSalary = 'الراتب الأساسي مطلوب';
    if (frm.iban && !/^SA\d{22}$/.test(frm.iban.replace(/\s/g, '')))
      err.iban = 'IBAN يجب أن يبدأ بـ SA ويتكون من 24 حرف';
  }
  return err;
};

export const generateEmpNumber = () => {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EMP-${year}${rand}`;
};
