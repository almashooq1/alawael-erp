/**
 * PremiumHub — مركز اللوحات البريميوم
 * صفحة رئيسية تعرض جميع لوحات الـ Glassmorphism كبطاقات متحركة
 *
 * Design: Premium Glassmorphism + Framer Motion
 * Gradient: #6366f1 → #8b5cf6 → #06b6d4
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardActionArea, Chip,
  useTheme, alpha, TextField, InputAdornment,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InventoryIcon from '@mui/icons-material/Inventory';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SecurityIcon from '@mui/icons-material/Security';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import BusinessIcon from '@mui/icons-material/Business';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import BiotechIcon from '@mui/icons-material/Biotech';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VerifiedIcon from '@mui/icons-material/Verified';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import HandshakeIcon from '@mui/icons-material/Handshake';
import EngineeringIcon from '@mui/icons-material/Engineering';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RadiologyIcon from '@mui/icons-material/Scanner';
import EmergencyIcon from '@mui/icons-material/LocalHospital';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CoronavirusIcon from '@mui/icons-material/Coronavirus';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import BuildIcon from '@mui/icons-material/Build';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import GavelIcon from '@mui/icons-material/Gavel';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import VideocamIcon from '@mui/icons-material/Videocam';
import ScienceIcon from '@mui/icons-material/Science';
import ShieldIcon from '@mui/icons-material/Shield';

// ─── Dashboard Cards Config ────────────────────────────────────────────────────
const PREMIUM_DASHBOARDS = [
  {
    id: 'ceo-pro',
    path: '/ceo-pro',
    title: 'لوحة الرئيس التنفيذي',
    subtitle: 'رؤية شاملة للأداء المؤسسي',
    icon: TrendingUpIcon,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    glow: 'rgba(99,102,241,0.4)',
    tags: ['إدارة عليا', 'KPIs', 'استراتيجي'],
    stats: [
      { label: 'الإيرادات', value: '٤.٢م' },
      { label: 'الموظفون', value: '٢٤٨' },
      { label: 'المشاريع', value: '٣٢' },
    ],
  },
  {
    id: 'hr-pro',
    path: '/hr-pro',
    title: 'الموارد البشرية المتقدمة',
    subtitle: 'تحليلات القوى العاملة والأداء',
    icon: PeopleIcon,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
    glow: 'rgba(34,197,94,0.4)',
    tags: ['الموظفون', 'الرواتب', 'الإجازات'],
    stats: [
      { label: 'موظف نشط', value: '٢٢٤' },
      { label: 'معدل الحضور', value: '٩٦٪' },
      { label: 'رضا الموظف', value: '٤.٨' },
    ],
  },
  {
    id: 'finance-pro',
    path: '/finance-pro',
    title: 'المالية والمحاسبة',
    subtitle: 'التقارير المالية والميزانيات',
    icon: AccountBalanceIcon,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    glow: 'rgba(34,197,94,0.35)',
    tags: ['المحاسبة', 'الميزانية', 'التدفق النقدي'],
    stats: [
      { label: 'الإيرادات', value: '٣.٨م' },
      { label: 'المصروفات', value: '٢.١م' },
      { label: 'الأرباح', value: '١.٧م' },
    ],
  },
  {
    id: 'patients-pro',
    path: '/patients-pro',
    title: 'إدارة المرضى',
    subtitle: 'ملفات المرضى والجلسات العلاجية',
    icon: LocalHospitalIcon,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    glow: 'rgba(6,182,212,0.4)',
    tags: ['المرضى', 'التأهيل', 'الجلسات'],
    stats: [
      { label: 'مريض نشط', value: '٥٤٢' },
      { label: 'جلسة هذا الشهر', value: '١٢٨٦' },
      { label: 'معدل التعافي', value: '٨٨٪' },
    ],
  },
  {
    id: 'schedule-pro',
    path: '/schedule-pro',
    title: 'الجدول والمواعيد',
    subtitle: 'إدارة المواعيد والجلسات',
    icon: CalendarMonthIcon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['المواعيد', 'التقويم', 'الجلسات'],
    stats: [
      { label: 'موعد اليوم', value: '٤٧' },
      { label: 'هذا الأسبوع', value: '٢٣١' },
      { label: 'الإلغاءات', value: '٣٪' },
    ],
  },
  {
    id: 'reports-pro',
    path: '/reports-pro',
    title: 'التقارير والذكاء',
    subtitle: 'تحليلات ذكية وتقارير متقدمة',
    icon: AssessmentIcon,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    glow: 'rgba(245,158,11,0.4)',
    tags: ['تقارير', 'AI', 'تحليلات'],
    stats: [
      { label: 'تقرير منشأ', value: '١٢٤' },
      { label: 'جدولي', value: '٣٦' },
      { label: 'تنبيه', value: '٨' },
    ],
  },
  {
    id: 'inventory-pro',
    path: '/inventory-pro',
    title: 'المخزون والتوريد',
    subtitle: 'مراقبة المخزون وسلسلة التوريد',
    icon: InventoryIcon,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    glow: 'rgba(16,185,129,0.4)',
    tags: ['المخزون', 'الموردون', 'الطلبيات'],
    stats: [
      { label: 'صنف مخزون', value: '٢٣٤' },
      { label: 'طلب مفتوح', value: '١٨' },
      { label: 'قيمة المخزون', value: '٦٢٠ك' },
    ],
  },
  {
    id: 'notifications-pro',
    path: '/notifications-pro',
    title: 'مركز الإشعارات',
    subtitle: 'إدارة الإشعارات والتنبيهات',
    icon: NotificationsActiveIcon,
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    glow: 'rgba(249,115,22,0.4)',
    tags: ['الإشعارات', 'التنبيهات', 'المراسلة'],
    stats: [
      { label: 'إشعار غير مقروء', value: '١٢' },
      { label: 'تنبيه حرج', value: '٣' },
      { label: 'أُرسل اليوم', value: '٨٦' },
    ],
  },
  {
    id: 'security-pro',
    path: '/security-pro',
    title: 'الأمان والحماية',
    subtitle: 'مراقبة أمن النظام والصلاحيات',
    icon: SecurityIcon,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    glow: 'rgba(99,102,241,0.4)',
    tags: ['الأمان', 'الصلاحيات', 'المراقبة'],
    stats: [
      { label: 'مستخدم نشط', value: '٧٤' },
      { label: 'محاولة دخول', value: '٢٣٤' },
      { label: 'تنبيه أمني', value: '٢' },
    ],
  },
  {
    id: 'analytics-pro',
    path: '/analytics-pro',
    title: 'التحليلات المتقدمة',
    subtitle: 'بيانات ذكية وتحليل عميق',
    icon: AnalyticsIcon,
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
    glow: 'rgba(14,165,233,0.4)',
    tags: ['BI', 'تحليل', 'توقعات'],
    stats: [
      { label: 'مؤشر أداء', value: '٤٨' },
      { label: 'دقة التوقع', value: '٩٣٪' },
      { label: 'تقرير BI', value: '١٥' },
    ],
  },
  {
    id: 'settings-pro',
    path: '/settings-pro',
    title: 'إعدادات النظام',
    subtitle: 'تكوين وإدارة النظام المتقدم',
    icon: SettingsIcon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['الإعدادات', 'التكوين', 'النسخ الاحتياطي'],
    stats: [
      { label: 'وحدة نظام', value: '٤٢' },
      { label: 'آخر نسخة احتياطية', value: 'أمس' },
      { label: 'وقت التشغيل', value: '٩٩.٩٪' },
    ],
  },
  {
    id: 'therapist-pro',
    path: '/therapist-pro',
    title: 'لوحة المعالج المتكاملة',
    subtitle: 'إدارة الجلسات والمرضى والتأهيل',
    icon: SupervisorAccountIcon,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
    glow: 'rgba(6,182,212,0.4)',
    tags: ['المعالج', 'الجلسات', 'التأهيل'],
    stats: [
      { label: 'مريض نشط', value: '٣٨' },
      { label: 'جلسة اليوم', value: '١٢' },
      { label: 'معدل الإنجاز', value: '٩٢٪' },
    ],
  },
  {
    id: 'kpi-pro',
    path: '/kpi-pro',
    title: 'مؤشرات الأداء الاستراتيجية',
    subtitle: 'تتبع الأهداف ومؤشرات النجاح',
    icon: SpeedIcon,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #6366f1 100%)',
    glow: 'rgba(245,158,11,0.4)',
    tags: ['KPIs', 'الأهداف', 'الأداء'],
    stats: [
      { label: 'مؤشر نشط', value: '٢٤' },
      { label: 'هدف مُنجز', value: '١٨' },
      { label: 'تحقق الأهداف', value: '٧٥٪' },
    ],
  },
  {
    id: 'rehab-pro',
    path: '/rehab-pro',
    title: 'لوحة التأهيل الشاملة',
    subtitle: 'متابعة شاملة لبرامج إعادة التأهيل والمرضى',
    icon: AccessibilityNewIcon,
    gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #6366f1 100%)',
    glow: 'rgba(16,185,129,0.4)',
    tags: ['التأهيل', 'المرضى', 'البرامج'],
    stats: [
      { label: 'مريض نشط', value: '٤٩٤' },
      { label: 'جلسة هذا الشهر', value: '٢٠٦٢' },
      { label: 'معدل التحسّن', value: '٨٤٪' },
    ],
  },
  {
    id: 'admin-executive',
    path: '/admin-executive',
    title: 'لوحة الإدارة التنفيذية',
    subtitle: 'متابعة القرارات والعمليات الإدارية',
    icon: BusinessIcon,
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #dc2626 50%, #ea580c 100%)',
    glow: 'rgba(124,58,237,0.4)',
    tags: ['تنفيذية', 'القرارات', 'الأهداف'],
    stats: [
      { label: 'قرار صادر', value: '١٣٧' },
      { label: 'مشروع نشط', value: '٢٤' },
      { label: 'إنجاز الإجراءات', value: '٩٤٪' },
    ],
  },
  {
    id: 'pharmacy-pro',
    path: '/pharmacy-pro',
    title: 'لوحة الصيدلية والأدوية',
    subtitle: 'إدارة المخزون الدوائي والوصفات والتوريد',
    icon: LocalPharmacyIcon,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 50%, #10b981 100%)',
    glow: 'rgba(236,72,153,0.4)',
    tags: ['الأدوية', 'الوصفات', 'التوريد'],
    stats: [
      { label: 'صنف دوائي', value: '٣,٢٤٧' },
      { label: 'وصفة يومية', value: '١٨٧' },
      { label: 'دقة الصرف', value: '٩٤٪' },
    ],
  },
  {
    id: 'lab-pro',
    path: '/lab-pro',
    title: 'لوحة المختبرات والتحاليل',
    subtitle: 'إدارة التحاليل المخبرية والنتائج والجودة',
    icon: BiotechIcon,
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)',
    glow: 'rgba(14,165,233,0.4)',
    tags: ['التحاليل', 'المختبر', 'الجودة'],
    stats: [
      { label: 'تحليل اليوم', value: '٣٤٢' },
      { label: 'دقة النتائج', value: '٩٩.٢٪' },
      { label: 'متوسط الانتظار', value: '٤٥ د' },
    ],
  },
  {
    id: 'insurance-pro',
    path: '/insurance-pro',
    title: 'لوحة التأمين الصحي',
    subtitle: 'إدارة بوالص التأمين والمطالبات ومقدمي الخدمة',
    icon: HealthAndSafetyIcon,
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #f59e0b 100%)',
    glow: 'rgba(14,165,233,0.4)',
    tags: ['التأمين', 'المطالبات', 'البوالص'],
    stats: [
      { label: 'مؤمّن', value: '١,٢٤٨' },
      { label: 'مطالبة نشطة', value: '٣٨٧' },
      { label: 'نسبة الموافقة', value: '٨٧٪' },
    ],
  },
  {
    id: 'quality-pro',
    path: '/quality-pro',
    title: 'لوحة الجودة والامتثال',
    subtitle: 'إدارة معايير CBAHI والتدقيق والامتثال التنظيمي',
    icon: VerifiedIcon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['الجودة', 'CBAHI', 'التدقيق'],
    stats: [
      { label: 'نسبة الامتثال', value: '٩٤.٧٪' },
      { label: 'عملية تدقيق', value: '١٢٨' },
      { label: 'إجراء تصحيحي', value: '٤٧' },
    ],
  },
  {
    id: 'training-pro',
    path: '/training-pro',
    title: 'لوحة التدريب والتطوير',
    subtitle: 'إدارة البرامج التدريبية والتطوير المهني للموظفين',
    icon: ModelTrainingIcon,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
    glow: 'rgba(245,158,11,0.4)',
    tags: ['التدريب', 'التطوير', 'الشهادات'],
    stats: [
      { label: 'برنامج تدريبي', value: '٤٨' },
      { label: 'متدرب نشط', value: '٣٢٤' },
      { label: 'معدل الإنجاز', value: '٧٨٪' },
    ],
  },
  {
    id: 'crm-pro',
    path: '/crm-pro',
    title: 'لوحة علاقات العملاء',
    subtitle: 'متابعة العملاء والصفقات والفرص البيعية',
    icon: HandshakeIcon,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)',
    glow: 'rgba(99,102,241,0.4)',
    tags: ['العملاء', 'الصفقات', 'CRM'],
    stats: [
      { label: 'عميل', value: '١,٨٤٢' },
      { label: 'صفقة مفتوحة', value: '٨٧' },
      { label: 'معدل الاحتفاظ', value: '٩٢٪' },
    ],
  },
  {
    id: 'operations-pro',
    path: '/operations-pro',
    title: 'لوحة العمليات والتشغيل',
    subtitle: 'إدارة أوامر العمل والصيانة والمخزون والمرافق',
    icon: EngineeringIcon,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
    glow: 'rgba(239,68,68,0.4)',
    tags: ['العمليات', 'الصيانة', 'المخزون'],
    stats: [
      { label: 'أمر عمل نشط', value: '١٤٧' },
      { label: 'نسبة التشغيل', value: '٩٤٪' },
      { label: 'أصناف المخزون', value: '٢,٤٨٠' },
    ],
  },
  {
    id: 'nursing-pro',
    path: '/nursing-pro',
    title: 'لوحة التمريض والرعاية',
    subtitle: 'متابعة فريق التمريض وجولات الرعاية وعلامات المرضى الحيوية',
    icon: FavoriteIcon,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
    glow: 'rgba(236,72,153,0.4)',
    tags: ['التمريض', 'الرعاية', 'العلامات الحيوية'],
    stats: [
      { label: 'ممرض/ة نشط', value: '٨٦' },
      { label: 'مريض تحت الرعاية', value: '٣٤٨' },
      { label: 'رضا المرضى', value: '٩٥٪' },
    ],
  },
  {
    id: 'procurement-pro',
    path: '/procurement-pro',
    title: 'لوحة المشتريات والعقود',
    subtitle: 'إدارة طلبات الشراء والموردين والعقود والتوفير',
    icon: ShoppingCartIcon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #f59e0b 50%, #22c55e 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['المشتريات', 'الموردون', 'العقود'],
    stats: [
      { label: 'طلب شراء', value: '٢٤٧' },
      { label: 'عقد نشط', value: '٦٤' },
      { label: 'مورد', value: '١٨٦' },
    ],
  },
  {
    id: 'radiology-pro',
    path: '/radiology-pro',
    title: 'لوحة الأشعة والتصوير الطبي',
    subtitle: 'متابعة الفحوصات والتقارير وأداء الأجهزة',
    icon: RadiologyIcon,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
    glow: 'rgba(6,182,212,0.4)',
    tags: ['الأشعة', 'التصوير', 'التقارير'],
    stats: [
      { label: 'فحص اليوم', value: '١٢٤' },
      { label: 'تقرير جاهز', value: '٩٨' },
      { label: 'دقة التشخيص', value: '٩٦٪' },
    ],
  },
  {
    id: 'emergency-pro',
    path: '/emergency-pro',
    title: 'لوحة الطوارئ والإسعاف',
    subtitle: 'متابعة حية للحالات الطارئة والإسعاف والأسرّة',
    icon: EmergencyIcon,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #06b6d4 100%)',
    glow: 'rgba(239,68,68,0.4)',
    tags: ['الطوارئ', 'الإسعاف', 'الفرز'],
    stats: [
      { label: 'حالة اليوم', value: '٨٧' },
      { label: 'إسعاف نشط', value: '٦' },
      { label: 'متوسط الانتظار', value: '١٨ د' },
    ],
  },
  {
    id: 'risk-pro',
    path: '/risk-pro',
    title: 'لوحة إدارة المخاطر',
    subtitle: 'تحديد وتقييم ومتابعة المخاطر المؤسسية',
    icon: WarningAmberIcon,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)',
    glow: 'rgba(245,158,11,0.4)',
    tags: ['المخاطر', 'التقييم', 'التصحيحية'],
    stats: [
      { label: 'خطر نشط', value: '٣٤' },
      { label: 'خطر حرج', value: '٧' },
      { label: 'مؤشر المخاطر', value: '٧٢٪' },
    ],
  },
  {
    id: 'nutrition-pro',
    path: '/nutrition-pro',
    title: 'لوحة التغذية والمطبخ',
    subtitle: 'إدارة الوجبات والحمية والمخزون الغذائي',
    icon: RestaurantIcon,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%)',
    glow: 'rgba(34,197,94,0.4)',
    tags: ['التغذية', 'الوجبات', 'الحمية'],
    stats: [
      { label: 'وجبة يومية', value: '٨٤٧' },
      { label: 'حمية خاصة', value: '١٢٤' },
      { label: 'رضا المرضى', value: '٩٢٪' },
    ],
  },
  {
    id: 'infection-control-pro',
    path: '/infection-control-pro',
    title: 'لوحة مكافحة العدوى',
    subtitle: 'مراقبة العدوى والتعقيم ومعايير السلامة',
    icon: CoronavirusIcon,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #06b6d4 100%)',
    glow: 'rgba(239,68,68,0.4)',
    tags: ['العدوى', 'التعقيم', 'الامتثال'],
    stats: [
      { label: 'حالة نشطة', value: '١٢' },
      { label: 'نسبة الامتثال', value: '٩٤.٧٪' },
      { label: 'أيام بدون عدوى', value: '٤٧' },
    ],
  },
  {
    id: 'social-work-pro',
    path: '/social-work-pro',
    title: 'لوحة الخدمة الاجتماعية',
    subtitle: 'إدارة الحالات والإرشاد والدعم الأسري',
    icon: Diversity3Icon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['الإرشاد', 'الأسر', 'الحالات'],
    stats: [
      { label: 'حالة نشطة', value: '١٨٧' },
      { label: 'جلسة دعم', value: '٣٤٢' },
      { label: 'رضا الأسر', value: '٩١٪' },
    ],
  },
  {
    id: 'maintenance-pro',
    path: '/maintenance-pro',
    title: 'لوحة الصيانة والمرافق',
    subtitle: 'إدارة أوامر العمل والصيانة الوقائية والمباني',
    icon: BuildIcon,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #22c55e 50%, #06b6d4 100%)',
    glow: 'rgba(245,158,11,0.4)',
    tags: ['الصيانة', 'المرافق', 'أوامر العمل'],
    stats: [
      { label: 'أمر عمل نشط', value: '٦٧' },
      { label: 'نسبة الإنجاز', value: '٩١٪' },
      { label: 'صيانة وقائية', value: '٩٤٪' },
    ],
  },
  {
    id: 'blood-bank-pro',
    path: '/blood-bank-pro',
    title: 'لوحة بنك الدم',
    subtitle: 'إدارة التبرعات والمخزون ونقل الدم والتحاليل',
    icon: BloodtypeIcon,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #8b5cf6 100%)',
    glow: 'rgba(239,68,68,0.4)',
    tags: ['بنك الدم', 'التبرعات', 'النقل'],
    stats: [
      { label: 'وحدة متاحة', value: '٨٤٧' },
      { label: 'متبرع الشهر', value: '١٢٤' },
      { label: 'سلامة الدم', value: '٩٨٪' },
    ],
  },
  {
    id: 'medical-records-pro',
    path: '/medical-records-pro',
    title: 'لوحة السجلات الطبية',
    subtitle: 'إدارة الملفات الطبية والرقمنة والأرشفة والامتثال',
    icon: FolderSharedIcon,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #10b981 100%)',
    glow: 'rgba(6,182,212,0.4)',
    tags: ['السجلات', 'الرقمنة', 'الأرشفة'],
    stats: [
      { label: 'سجل فعّال', value: '٤,٨٤٢' },
      { label: 'نسبة الرقمنة', value: '٨٧٪' },
      { label: 'مستند اليوم', value: '١٨٧' },
    ],
  },
  {
    id: 'transport-pro',
    path: '/transport-pro',
    title: 'لوحة النقل والمواصلات',
    subtitle: 'إدارة الأسطول والرحلات والسائقين واستهلاك الوقود',
    icon: LocalShippingIcon,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #6366f1 100%)',
    glow: 'rgba(245,158,11,0.4)',
    tags: ['الأسطول', 'الرحلات', 'السائقون'],
    stats: [
      { label: 'مركبة نشطة', value: '٤٨' },
      { label: 'رحلة اليوم', value: '١٢٤' },
      { label: 'كفاءة الأسطول', value: '٩٢٪' },
    ],
  },
  {
    id: 'compliance-pro',
    path: '/compliance-pro',
    title: 'لوحة الامتثال التنظيمي',
    subtitle: 'متابعة المعايير والتدقيق والمخالفات والإجراءات التصحيحية',
    icon: GavelIcon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #22c55e 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['الامتثال', 'التدقيق', 'المعايير'],
    stats: [
      { label: 'نسبة الامتثال', value: '٩٤.٧٪' },
      { label: 'معيار مُطبّق', value: '٢٤٨' },
      { label: 'تدقيق مكتمل', value: '٣٨' },
    ],
  },
  {
    id: 'waste-management-pro',
    path: '/waste-management-pro',
    title: 'لوحة النفايات الطبية',
    subtitle: 'مراقبة النفايات والتخلص الآمن وإعادة التدوير والامتثال البيئي',
    icon: DeleteSweepIcon,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
    glow: 'rgba(239,68,68,0.4)',
    tags: ['النفايات', 'التدوير', 'البيئة'],
    stats: [
      { label: 'نفايات/شهر', value: '٢,٤٨٧ كجم' },
      { label: 'إعادة تدوير', value: '٣٤٪' },
      { label: 'الامتثال', value: '٩٦.٨٪' },
    ],
  },
  {
    id: 'telemedicine-pro',
    path: '/telemedicine-pro',
    title: 'لوحة الطب عن بُعد',
    subtitle: 'إدارة الاستشارات الافتراضية والجلسات عن بُعد ومتابعة الجودة',
    icon: VideocamIcon,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #22c55e 100%)',
    glow: 'rgba(99,102,241,0.4)',
    tags: ['عن بُعد', 'فيديو', 'استشارات'],
    stats: [
      { label: 'جلسة/شهر', value: '١,٢٤٨' },
      { label: 'مريض نشط', value: '٨٤٧' },
      { label: 'رضا المرضى', value: '٤.٧' },
    ],
  },
  {
    id: 'clinical-trials-pro',
    path: '/clinical-trials-pro',
    title: 'لوحة الأبحاث السريرية',
    subtitle: 'إدارة التجارب السريرية والمشاركين والمنشورات العلمية',
    icon: ScienceIcon,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
    glow: 'rgba(139,92,246,0.4)',
    tags: ['الأبحاث', 'التجارب', 'المنشورات'],
    stats: [
      { label: 'دراسة نشطة', value: '٢٤' },
      { label: 'مشارك', value: '١,٤٨٧' },
      { label: 'نسبة الإنجاز', value: '٧٢٪' },
    ],
  },
  {
    id: 'patient-safety-pro',
    path: '/patient-safety-pro',
    title: 'لوحة سلامة المرضى',
    subtitle: 'مراقبة الحوادث وأهداف السلامة ومؤشرات الأداء والإجراءات التصحيحية',
    icon: ShieldIcon,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #6366f1 100%)',
    glow: 'rgba(34,197,94,0.4)',
    tags: ['السلامة', 'الحوادث', 'الامتثال'],
    stats: [
      { label: 'أيام بدون حوادث', value: '٤٧' },
      { label: 'نسبة الامتثال', value: '٩٧.٢٪' },
      { label: 'بلاغات/شهر', value: '١٢' },
    ],
  },
];

// ─── Card Component ────────────────────────────────────────────────────────────
function PremiumCard({ dash, index, isDark }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const Icon = dash.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
          background: isDark
            ? 'rgba(15,23,42,0.7)'
            : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: hovered
            ? `0 20px 50px ${dash.glow}, 0 8px 24px rgba(0,0,0,0.12)`
            : isDark
              ? '0 4px 24px rgba(0,0,0,0.3)'
              : '0 4px 24px rgba(0,0,0,0.06)',
          transition: 'all 0.35s ease',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <CardActionArea
          onClick={() => navigate(dash.path)}
          sx={{ p: 0, '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0 } }}
        >
          {/* Top gradient bar */}
          <Box
            sx={{
              height: 4,
              background: dash.gradient,
              opacity: hovered ? 1 : 0.8,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Glow overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '60%',
              background: `radial-gradient(ellipse at 50% 0%, ${dash.glow.replace('0.4)', '0.08)')} 0%, transparent 70%)`,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ p: 2.5, pt: 2 }}>
            {/* Icon + Arrow row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              {/* Icon */}
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '16px',
                  background: hovered ? dash.gradient : alpha(dash.glow.replace('0.4)', '0.15)'), 0.9),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: hovered ? `0 8px 20px ${dash.glow}` : 'none',
                  transition: 'all 0.35s ease',
                  border: `1px solid ${hovered ? 'transparent' : dash.glow.replace('0.4)', '0.2)')}`,
                }}
              >
                <Icon
                  sx={{
                    fontSize: 24,
                    color: hovered ? '#FFFFFF' : dash.glow.replace('0.4)', '1)'),
                    transition: 'color 0.35s ease',
                  }}
                />
              </Box>

              {/* Arrow */}
              <motion.div
                animate={{ x: hovered ? -4 : 0, opacity: hovered ? 1 : 0.4 }}
                transition={{ duration: 0.25 }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    background: hovered ? dash.gradient : 'transparent',
                    border: `1px solid ${hovered ? 'transparent' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.35s ease',
                  }}
                >
                  <ArrowForwardIcon
                    sx={{
                      fontSize: 14,
                      color: hovered ? '#fff' : isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8',
                      transform: 'scaleX(-1)',
                      transition: 'color 0.35s ease',
                    }}
                  />
                </Box>
              </motion.div>
            </Box>

            {/* Title */}
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: isDark ? '#F1F5F9' : '#0F172A',
                mb: 0.5,
                lineHeight: 1.3,
              }}
            >
              {dash.title}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.78rem',
                color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
                mb: 2,
                lineHeight: 1.5,
              }}
            >
              {dash.subtitle}
            </Typography>

            {/* Stats row */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mb: 2,
                p: 1.25,
                borderRadius: '12px',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              {dash.stats.map((s, si) => (
                <Box
                  key={si}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    borderRight: si < dash.stats.length - 1
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`
                      : 'none',
                    borderLeft: 'none',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      background: dash.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      lineHeight: 1.2,
                      fontFamily: 'monospace',
                    }}
                  >
                    {s.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
                      mt: 0.25,
                      lineHeight: 1.2,
                    }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Tags */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {dash.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.04)',
                    color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                    '& .MuiChip-label': { px: 0.8 },
                    transition: 'all 0.25s',
                    ...(hovered && {
                      backgroundColor: alpha(dash.glow.replace('0.4)', '0.12)'), 0.9),
                      color: dash.glow.replace('0.4)', '1)'),
                      borderColor: dash.glow.replace('0.4)', '0.25)'),
                    }),
                  }}
                />
              ))}
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PremiumHub() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [search, setSearch] = useState('');

  const filtered = PREMIUM_DASHBOARDS.filter(
    (d) =>
      d.title.includes(search) ||
      d.subtitle.includes(search) ||
      d.tags.some((t) => t.includes(search))
  );

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative' }}>
      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Box
          sx={{
            position: 'relative',
            borderRadius: '28px',
            overflow: 'hidden',
            mb: 4,
            p: { xs: 3, md: 4.5 },
            background: isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.2) 50%, rgba(6,182,212,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.06) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Background animated gradient blobs */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {[
              { left: '-5%', top: '-10%', size: 300, color: 'rgba(99,102,241,0.15)' },
              { right: '-3%', bottom: '-15%', size: 250, color: 'rgba(139,92,246,0.12)' },
              { left: '40%', top: '20%', size: 200, color: 'rgba(6,182,212,0.1)' },
            ].map((blob, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: blob.left,
                  right: blob.right,
                  top: blob.top,
                  bottom: blob.bottom,
                  width: blob.size,
                  height: blob.size,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </Box>

          {/* Content */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 26, color: '#FFFFFF' }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.4rem', md: '1.8rem' },
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.2,
                  }}
                >
                  مركز اللوحات البريميوم
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B',
                    mt: 0.25,
                  }}
                >
                  {PREMIUM_DASHBOARDS.length} لوحة احترافية بتصميم Glassmorphism
                </Typography>
              </Box>
            </Box>

            {/* Stats chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
              {[
                { label: '١١ لوحة', color: '#6366f1' },
                { label: 'Glassmorphism', color: '#8b5cf6' },
                { label: 'RTL عربي', color: '#06b6d4' },
                { label: 'Dark / Light', color: '#10b981' },
                { label: 'Framer Motion', color: '#f59e0b' },
              ].map((c) => (
                <Chip
                  key={c.label}
                  icon={<StarIcon sx={{ fontSize: '12px !important', color: `${c.color} !important` }} />}
                  label={c.label}
                  size="small"
                  sx={{
                    height: 26,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: isDark
                      ? `${c.color}22`
                      : `${c.color}14`,
                    color: c.color,
                    border: `1px solid ${c.color}33`,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ))}
            </Box>

            {/* Search */}
            <TextField
              size="small"
              placeholder="ابحث في اللوحات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 380,
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(10px)',
                  fontSize: '0.875rem',
                  '& fieldset': {
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.2)',
                  },
                  '&:hover fieldset': { borderColor: '#6366f1' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
                },
              }}
            />
          </Box>
        </Box>
      </motion.div>

      {/* ── Grid of Cards ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {filtered.length > 0 ? (
          <Grid container spacing={2.5}>
            {filtered.map((dash, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={dash.id}>
                <PremiumCard dash={dash} index={i} isDark={isDark} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                borderRadius: '20px',
                border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.2)'}`,
              }}
            >
              <SearchIcon sx={{ fontSize: 48, color: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1', mb: 2 }} />
              <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', fontSize: '0.95rem' }}>
                لا توجد نتائج لـ «{search}»
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer Note ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Box
          sx={{
            mt: 5,
            p: 2.5,
            borderRadius: '16px',
            background: isDark
              ? 'rgba(99,102,241,0.08)'
              : 'rgba(99,102,241,0.04)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 20, color: '#6366f1', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
            جميع اللوحات مبنية بـ <strong style={{ color: '#6366f1' }}>React + MUI + Framer Motion</strong> مع تصميم{' '}
            <strong style={{ color: '#8b5cf6' }}>Glassmorphism</strong> ودعم كامل لـ RTL العربية والوضع الليلي
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
