/**
 * Centralized Color Palette — AlAwael ERP
 * نظام الألوان المركزي — نظام الأوائل
 *
 * Design Language: Premium Arabic ERP
 * Inspired by: Saudi Vision 2030 identity, modern SaaS products
 */

// ─── Brand Core ─────────────────────────────────────────────────────────────
export const brand = {
  50: '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1', // primary
  600: '#4F46E5', // primary dark
  700: '#4338CA',
  800: '#3730A3',
  900: '#312E81',
  950: '#1E1B4B',
};

// ─── Violet (secondary) ──────────────────────────────────────────────────────
export const violet = {
  50: '#F5F3FF',
  100: '#EDE9FE',
  200: '#DDD6FE',
  300: '#C4B5FD',
  400: '#A78BFA',
  500: '#8B5CF6', // secondary
  600: '#7C3AED',
  700: '#6D28D9',
  800: '#5B21B6',
  900: '#4C1D95',
};

// ─── Saudi Gold (accent) ─────────────────────────────────────────────────────
export const gold = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B', // accent
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
};

// ─── Emerald (success) ───────────────────────────────────────────────────────
export const emerald = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981', // success
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
};

// ─── Rose (error) ────────────────────────────────────────────────────────────
export const rose = {
  50: '#FFF1F2',
  100: '#FFE4E6',
  200: '#FECDD3',
  300: '#FDA4AF',
  400: '#FB7185',
  500: '#F43F5E', // error
  600: '#E11D48',
  700: '#BE123C',
  800: '#9F1239',
  900: '#881337',
};

// ─── Slate (neutrals) ────────────────────────────────────────────────────────
export const slate = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  850: '#172032',
  900: '#0F172A',
  950: '#080E1A',
};

// ─── Sky (info) ──────────────────────────────────────────────────────────────
export const sky = {
  50: '#F0F9FF',
  100: '#E0F2FE',
  200: '#BAE6FD',
  300: '#7DD3FC',
  400: '#38BDF8',
  500: '#0EA5E9', // info
  600: '#0284C7',
  700: '#0369A1',
  800: '#075985',
  900: '#0C4A6E',
};

// ─── Sidebar Background ───────────────────────────────────────────────────────
export const sidebarBg = {
  main: '#0A1628', // deep navy
  hover: '#0D1E38',
  active: '#102040',
  border: 'rgba(255,255,255,0.06)',
  text: 'rgba(255,255,255,0.85)',
  textMuted: 'rgba(255,255,255,0.45)',
  textActive: '#FFFFFF',
  icon: 'rgba(255,255,255,0.55)',
  iconActive: '#6366F1',
};

// ─── Gradients ───────────────────────────────────────────────────────────────
export const gradients = {
  // Brand
  primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  primaryRev: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
  brand: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',

  // Sidebar
  sidebar: 'linear-gradient(180deg, #0A1628 0%, #0D1E38 50%, #080E1A 100%)',
  sidebarTop: 'linear-gradient(135deg, #1E3A8A 0%, #0A1628 60%)',

  // Status
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  error: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
  info: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',

  // Saudi Gold
  gold: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  goldDark: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',

  // Header
  header: 'linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',

  // Cards
  cardBlue: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
  cardViolet: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
  cardGold: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
  cardGreen: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',

  // Hero / Login
  hero: 'linear-gradient(135deg, #1E40AF 0%, #1E1B4B 40%, #4C1D95 100%)',
  loginBg: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 35%, #312E81 70%, #4C1D95 100%)',

  // Legacy (kept for backwards compatibility)
  accent: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  ocean: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
  orange: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
  fire: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  greenStatus: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  orangeStatus: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  redStatus: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
  infoDeep: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
};

// ─── Brand Colors (named palette) ────────────────────────────────────────────
export const brandColors = {
  primary: brand[500],
  secondary: violet[500],
  accent: gold[500],
  success: emerald[500],
  warning: gold[500],
  error: rose[500],
  info: sky[500],

  // Saudi identity
  saudiGreen: '#007A3D',
  saudiGold: '#C8A951',

  // Surface
  bgLight: slate[50],
  bgMid: slate[100],
  surface: '#FFFFFF',
  border: slate[200],
  borderDark: slate[300],

  // Text
  textPrimary: slate[900],
  textSecondary: slate[500],
  textMuted: slate[400],
  textInverse: '#FFFFFF',
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
  sm: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)',
  md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.07)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.08)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.12)',
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',

  // Colored shadows
  primary: '0 4px 20px rgba(99,102,241,0.25)',
  success: '0 4px 20px rgba(16,185,129,0.25)',
  warning: '0 4px 20px rgba(245,158,11,0.25)',
  error: '0 4px 20px rgba(244,63,94,0.25)',

  // Glow effects
  glowPrimary: '0 0 20px rgba(99,102,241,0.3)',
  glowGold: '0 0 20px rgba(245,158,11,0.3)',

  // Card
  card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  cardHover: '0 8px 24px rgba(0,0,0,0.10)',
};

// ─── Surface Colors ──────────────────────────────────────────────────────────
export const surfaceColors = {
  // Base backgrounds
  background: '#FAFAFA',
  backgroundLighter: '#FFFFFF',
  card: '#FFFFFF',
  paper: '#FFFFFF',
  paperAlt: '#F8FAFC',
  tableHeader: '#F1F5F9',
  hover: '#F8FAFC',

  // Tints (very light, 6-10% opacity)
  brandTint: '#EEF2FF',
  brandTintLight: '#F5F7FF',
  purpleTint: '#F5F3FF',
  roseTint: '#FFF1F2',
  greenTint: '#ECFDF5',
  warningTint: '#FFFBEB',
  infoTint: '#F0F9FF',
  successTint: '#ECFDF5',
  pinkTint: '#FDF2F8',

  // Light state backgrounds (15-20% opacity)
  infoLight: '#DBEAFE',
  purpleLight: '#EDE9FE',
  successLight: '#D1FAE5',
  warningLight: '#FEF3C7',
  warningLighter: '#FFFBEB',
  pinkLight: '#FCE7F3',
  errorLight: '#FEE2E2',

  // Grays
  lightGray: '#F1F5F9',
  softGray: '#E2E8F0',

  // Borders
  border: '#E2E8F0',
  borderLight: '#EEF2FF',
  borderSubtle: '#F1F5F9',

  // Divider
  divider: '#E2E8F0',
};

// ─── Surface Colors Dark (dark mode) ─────────────────────────────────────────
export const surfaceColorsDark = {
  background: '#0F172A',
  backgroundLighter: '#1E293B',
  card: '#1E293B',
  paper: '#1E293B',
  paperAlt: '#0F172A',
  tableHeader: '#0F172A',
  hover: '#1E293B',
  border: '#334155',
  borderLight: '#1E293B',
  borderSubtle: '#334155',
  divider: '#334155',
};

// ─── Neutral Colors ───────────────────────────────────────────────────────────
export const neutralColors = {
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textDark: '#1E293B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  borderInactive: '#CBD5E1',
  bgLight: '#F8FAFC',
  bgMid: '#F1F5F9',
  white: '#FFFFFF',
  black: '#000000',
};

// ─── Status Colors ────────────────────────────────────────────────────────────
export const statusColors = {
  success: '#10B981',
  successDark: '#059669',
  error: '#EF4444',
  errorDark: '#DC2626',
  warning: '#F59E0B',
  warningDark: '#D97706',
  info: '#0EA5E9',
  infoDark: '#0284C7',
  primary: '#6366F1',
  primaryBlue: '#3B82F6',
  purple: '#7C3AED',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
};

// ─── Chart Colors ─────────────────────────────────────────────────────────────
// Supports both array access (chartColors[i]) and named palettes (chartColors.main, chartColors.hr)
const _chartColorsArray = [
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#0EA5E9',
  '#7C3AED',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#84CC16',
  '#06B6D4',
  '#8B5CF6',
];

export const chartColors = Object.assign([..._chartColorsArray], {
  // Named palettes used by dashboard components
  main: _chartColorsArray,
  category: _chartColorsArray,
  hr: ['#6366F1', '#10B981', '#F59E0B', '#0EA5E9', '#EC4899', '#14B8A6', '#F97316'],
  finance: ['#10B981', '#6366F1', '#F59E0B', '#0EA5E9', '#F43F5E'],
  expense: ['#F59E0B', '#6366F1', '#10B981', '#EC4899', '#F97316', '#0EA5E9', '#EF4444'],
  clinical: ['#0EA5E9', '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#F97316'],
  operations: ['#14B8A6', '#6366F1', '#F59E0B', '#EF4444', '#0EA5E9'],
  revenue: ['#10B981', '#059669', '#34D399', '#6EE7B7'],
});

// ─── Leave Colors ─────────────────────────────────────────────────────────────
export const leaveColors = {
  annual: '#6366F1',
  sick: '#EF4444',
  emergency: '#F97316',
  maternity: '#EC4899',
  unpaid: '#94A3B8',
  other: '#64748B',
};

// ─── Rank Colors ──────────────────────────────────────────────────────────────
export const rankColors = {
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#B45309',
};

// ─── Assessment Colors ────────────────────────────────────────────────────────
export const assessmentColors = {
  excellent: '#10B981',
  good: '#6366F1',
  average: '#F59E0B',
  poor: '#EF4444',
  pending: '#94A3B8',
};

// ─── Progress Colors ──────────────────────────────────────────────────────────
export const progressColors = {
  low: '#EF4444',
  medium: '#F59E0B',
  high: '#10B981',
  complete: '#6366F1',
  none: '#E2E8F0',
};

// ─── Scale Accent Colors (تدرج الألوان للمقاييس) ────────────────────────────
export const scaleAccentColors = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#0EA5E9',
  '#14B8A6',
  '#84CC16',
];

// ─── Severity Colors (مستويات الخطورة) ──────────────────────────────────────
export const severityColors = {
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
  info: '#0EA5E9',
  none: '#94A3B8',
};

// ─── Extended brandColors (backwards compat) ─────────────────────────────────
// Some files use brandColors.primaryStart, brandColors.accentGreen, etc.
Object.assign(brandColors, {
  primaryStart: '#6366F1',
  primaryEnd: '#7C3AED',
  accentGreen: '#10B981',
  accentSky: '#0EA5E9',
  accentCoral: '#F43F5E',
  accentOrange: '#F97316',
  accentPurple: '#7C3AED',
  accentPink: '#EC4899',
  accentRose: '#F43F5E', // alias for accentCoral
  accentTeal: '#14B8A6',
  goldenYellow: '#F59E0B',
  ocean: '#0EA5E9',
  primary: '#6366F1',
  secondary: '#7C3AED',
});

// ─── Extended gradients (backwards compat) ───────────────────────────────────
Object.assign(gradients, {
  primaryReversed: gradients.primaryRev,
});

export default {
  brand,
  violet,
  gold,
  emerald,
  rose,
  slate,
  sky,
  sidebarBg,
  gradients,
  brandColors,
  shadows,
  surfaceColors,
  surfaceColorsDark,
  neutralColors,
  statusColors,
  chartColors,
  leaveColors,
  rankColors,
  assessmentColors,
};
