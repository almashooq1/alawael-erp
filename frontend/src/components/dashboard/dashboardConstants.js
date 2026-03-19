/**
 * Dashboard Constants — shared config for dashboard navigation
 * ثوابت لوحة التحكم — إعدادات مشتركة للتنقل
 */

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import GroupsIcon from '@mui/icons-material/Groups';
import BuildIcon from '@mui/icons-material/Build';
import AppsIcon from '@mui/icons-material/Apps';
import BoltIcon from '@mui/icons-material/Bolt';
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { brandColors } from 'theme/palette';

/**
 * Dashboard Sections — ordered by user workflow priority:
 *  ① Quick actions → ② Activity overview → ③ Analytics →
 *  ④ Finance → ⑤ Clinical → ⑥ HR → ⑦ Operations →
 *  ⑧ Modules → ⑨ Pro Tools
 */
export const SECTIONS = [
  {
    id: 'quick',
    label: 'إجراءات سريعة',
    icon: <BoltIcon sx={{ fontSize: 16 }} />,
    color: brandColors.accentAmber,
  },
  {
    id: 'activity',
    label: 'النشاط',
    icon: <TimelineIcon sx={{ fontSize: 16 }} />,
    color: brandColors.lavender,
  },
  {
    id: 'charts',
    label: 'الرسوم البيانية',
    icon: <BarChartIcon sx={{ fontSize: 16 }} />,
    color: brandColors.primaryStart,
  },
  {
    id: 'finance',
    label: 'المالية',
    icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />,
    color: brandColors.ocean,
  },
  {
    id: 'clinical',
    label: 'السريرية',
    icon: <LocalHospitalIcon sx={{ fontSize: 16 }} />,
    color: brandColors.accentSky,
  },
  {
    id: 'hr',
    label: 'الموارد البشرية',
    icon: <GroupsIcon sx={{ fontSize: 16 }} />,
    color: brandColors.accentPink,
  },
  {
    id: 'operations',
    label: 'العمليات',
    icon: <BuildIcon sx={{ fontSize: 16 }} />,
    color: brandColors.orangeGlow,
  },
  {
    id: 'modules',
    label: 'الوحدات',
    icon: <AppsIcon sx={{ fontSize: 16 }} />,
    color: brandColors.accentRose,
  },
  {
    id: 'pro-tools',
    label: 'أدوات احترافية',
    icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />,
    color: brandColors.primaryStart,
  },
];

/** Section keywords for search / filter functionality */
export const SECTION_KEYWORDS = {
  finance: ['المالية', 'إيرادات', 'مصروفات', 'ميزانية', 'فواتير', 'finance', 'revenue', 'budget'],
  charts: ['رسوم', 'بيانية', 'تسجيل', 'نشاط', 'charts', 'graph', 'registration'],
  clinical: ['سريرية', 'طبية', 'علاج', 'مرضى', 'تأهيل', 'clinical', 'medical', 'patients'],
  hr: ['موارد', 'بشرية', 'موظفين', 'حضور', 'hr', 'staff', 'attendance'],
  operations: ['عمليات', 'لوجستية', 'أسطول', 'سلسلة', 'توريد', 'operations', 'fleet', 'supply'],
  modules: ['وحدات', 'نظام', 'modules', 'system'],
  quick: ['إجراءات', 'سريعة', 'quick', 'actions'],
  activity: ['نشاط', 'صحة', 'نظام', 'activity', 'health', 'system'],
  'pro-tools': [
    'احترافية',
    'أدوات',
    'تحليلات',
    'إشعارات',
    'مهام',
    'تقويم',
    'إنتاجية',
    'pro',
    'tools',
    'analytics',
    'tasks',
    'calendar',
  ],
};

/** Auto-refresh interval (60 seconds) */
export const REFRESH_INTERVAL = 60000;

/** localStorage cache key and TTL */
export const CACHE_KEY = 'alawael_dashboard_cache';
export const CACHE_TTL = 5 * 60 * 1000; // 5-minute stale threshold

export const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null; // stale
    return data;
  } catch {
    return null;
  }
};

export const writeCache = data => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* quota exceeded — ignore */
  }
};
