/**
 * CompensationStructureManagement — Constants & Demo Data
 */
import {
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  MonetizationOn as MoneyIcon,
  LocalAtm as AllowanceIcon,
  BeachAccess as LeaveIcon,
  Business as StructureIcon,
} from '@mui/icons-material';

export const DEMO_STRUCTURES = [
  {
    _id: 's1',
    name: 'هيكل الموظفين العام',
    description: 'الهيكل التعويضي الأساسي لجميع موظفي المركز',
    effectiveDate: '2026-01-01',
    isActive: true,
    applicableTo: {
      scope: 'all',
      departments: [],
      roles: [],
      salaryRange: { min: 3000, max: 50000 },
    },
    fixedAllowances: [
      { name: 'السكن', amount: 1500 },
      { name: 'النقل', amount: 700 },
      { name: 'الوجبات', amount: 300 },
    ],
    incentiveStructure: {
      performance: { percentage: 10, minScore: 80 },
      attendance: { amount: 200, baselinePercentage: 95 },
      safety: { amount: 150 },
      loyalty: { percentage: 5, yearsRequired: 3 },
      project: { amount: 500 },
      seasonal: { amount: 500, months: [12] },
    },
    mandatoryDeductions: {
      incomeTax: { brackets: [] },
      socialSecurity: { percentage: 9, maxAmount: 4500 },
      healthInsurance: { percentage: 2, amount: 100 },
      GOSI: { percentage: 9, maxAmount: 4500, minAmount: 400 },
    },
    paidLeave: { annualDays: 30, accruedPerMonth: 2.5 },
  },
  {
    _id: 's2',
    name: 'هيكل الإدارة العليا',
    description: 'للمدراء ورؤساء الأقسام',
    effectiveDate: '2026-01-01',
    isActive: true,
    applicableTo: {
      scope: 'role',
      departments: [],
      roles: ['مدير', 'رئيس قسم'],
      salaryRange: { min: 15000, max: 80000 },
    },
    fixedAllowances: [
      { name: 'السكن', amount: 5000 },
      { name: 'النقل', amount: 2000 },
      { name: 'الوجبات', amount: 500 },
      { name: 'الهاتف', amount: 300 },
    ],
    incentiveStructure: {
      performance: { percentage: 15, minScore: 75 },
      attendance: { amount: 300, baselinePercentage: 90 },
      safety: { amount: 200 },
      loyalty: { percentage: 8, yearsRequired: 5 },
      project: { amount: 1000 },
      seasonal: { amount: 1000, months: [12] },
    },
    mandatoryDeductions: {
      incomeTax: { brackets: [] },
      socialSecurity: { percentage: 9, maxAmount: 4500 },
      healthInsurance: { percentage: 2, amount: 200 },
      GOSI: { percentage: 9, maxAmount: 4500, minAmount: 400 },
    },
    paidLeave: { annualDays: 30, accruedPerMonth: 2.5 },
  },
  {
    _id: 's3',
    name: 'هيكل المتعاقدين',
    description: 'الهيكل التعويضي للموظفين بعقود مؤقتة',
    effectiveDate: '2026-03-01',
    isActive: false,
    applicableTo: {
      scope: 'custom',
      departments: [],
      roles: [],
      salaryRange: { min: 3000, max: 20000 },
    },
    fixedAllowances: [
      { name: 'السكن', amount: 800 },
      { name: 'النقل', amount: 400 },
    ],
    incentiveStructure: {
      performance: { percentage: 5, minScore: 85 },
      attendance: { amount: 100, baselinePercentage: 98 },
      safety: { amount: 75 },
      loyalty: { percentage: 0, yearsRequired: 0 },
      project: { amount: 200 },
      seasonal: { amount: 200, months: [12] },
    },
    mandatoryDeductions: {
      incomeTax: { brackets: [] },
      socialSecurity: { percentage: 9, maxAmount: 4500 },
      healthInsurance: { percentage: 2, amount: 50 },
      GOSI: { percentage: 9, maxAmount: 4500, minAmount: 270 },
    },
    paidLeave: { annualDays: 21, accruedPerMonth: 1.75 },
  },
];

export const SCOPE_LABELS = {
  all: 'الكل',
  department: 'حسب القسم',
  role: 'حسب الدور',
  position: 'حسب الوظيفة',
  custom: 'مخصص',
};

export const INITIAL_FORM = {
  name: '',
  description: '',
  effectiveDate: new Date().toISOString().split('T')[0],
  isActive: true,
  applicableTo: { scope: 'all', departments: [], roles: [], salaryRange: { min: 0, max: 999999 } },
  fixedAllowances: [
    { name: 'السكن', amount: 600 },
    { name: 'النقل', amount: 200 },
    { name: 'الوجبات', amount: 150 },
  ],
  incentiveStructure: {
    performance: { percentage: 10, minScore: 80 },
    attendance: { amount: 50, baselinePercentage: 100 },
    safety: { amount: 75 },
    loyalty: { percentage: 5, yearsRequired: 5 },
    project: { amount: 100 },
    seasonal: { amount: 200, months: [12] },
  },
  mandatoryDeductions: {
    incomeTax: { brackets: [] },
    socialSecurity: { percentage: 6, maxAmount: 1000 },
    healthInsurance: { percentage: 2, amount: 50 },
    GOSI: { percentage: 3, maxAmount: 2000, minAmount: 100 },
  },
  paidLeave: { annualDays: 30, accruedPerMonth: 2.5 },
};

export const FORM_SECTIONS = [
  'المعلومات الأساسية',
  'المزايا الثابتة',
  'الحوافز',
  'الخصومات والإجازات',
];

/* Re-export icons so sub-components can share them */
export const ICONS = {
  ActiveIcon,
  InactiveIcon,
  MoneyIcon,
  AllowanceIcon,
  LeaveIcon,
  StructureIcon,
};
