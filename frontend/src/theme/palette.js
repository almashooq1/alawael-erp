/**
 * Centralized color palette – single source of truth for brand colors & gradients.
 *
 * Import these constants instead of hard‑coding hex values or gradient strings.
 * The MUI theme (educationTheme.js) also consumes these constants.
 *
 * Usage:
 *   import { gradients, brandColors, statusColors } from 'theme/palette';
 *   <Box sx={{ background: gradients.primary }} />
 *   <Chip sx={{ color: statusColors.success }} />
 */

// ──────────────────────────────────────────────
//  Brand gradients (135deg, from → to)
// ──────────────────────────────────────────────
import { Box, Chip } from '@mui/material';
export const gradients = {
  /** Main brand gradient – purple‑blue → purple */
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

  /** Success / green → teal */
  success: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',

  /** Warning / pink → coral */
  warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',

  /** Info / sky‑blue → cyan */
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',

  /** Accent / pink → yellow */
  accent: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',

  /** Ocean / teal → deep‑blue */
  ocean: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',

  /** Orange glow */
  orange: 'linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)',

  /** Fire / yellow-orange → red */
  fire: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',

  /** MUI‑green status gradient */
  greenStatus: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',

  /** MUI‑orange status gradient */
  orangeStatus: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',

  /** MUI‑red status gradient */
  redStatus: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',

  /** Info deep — blue 500 → blue 700 */
  infoDeep: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',

  /** Subtle light background */
  subtle: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',

  /** Success surface — light green for summary cards */
  successSurface: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',

  /** Assessment interpretation gradients */
  assessmentBlue: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
  assessmentGreen: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
  assessmentOrange: 'linear-gradient(135deg, #ed6c02 0%, #ff9800 100%)',
  assessmentPurple: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',

  /** Dark blue header — navy gradient */
  blueDark: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
  /** Indigo header — MUI indigo 500 → 900 */
  indigo: 'linear-gradient(135deg, #3f51b5 0%, #1a237e 100%)',
  /** Reversed brand gradient — purple → blue (hover state) */
  primaryReversed: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
  /** Settings card — lavender → deep indigo */
  settings: 'linear-gradient(135deg, #a8c0ff, #3f2b96)',

  /** Dashboard dark mode — navy → deep navy (180deg) */
  dashboardDark: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
  /** Dashboard light mode — blue tint → light slate (180deg) */
  dashboardLight: 'linear-gradient(180deg, #f8f9fc 0%, #eef1f6 100%)',
  /** Warning / coral — orange → coral-pink */
  warningCoral: 'linear-gradient(135deg, #FF9800 0%, #F5576C 100%)',
};

// ──────────────────────────────────────────────
//  Brand hex colors (non‑gradient singles)
// ──────────────────────────────────────────────
export const brandColors = {
  primaryStart: '#667eea',
  primaryEnd: '#764ba2',
  accentPink: '#f093fb',
  accentCoral: '#f5576c',
  accentSky: '#4facfe',
  accentCyan: '#00f2fe',
  accentGreen: '#43e97b',
  accentTeal: '#38f9d7',
  accentRose: '#fa709a',
  accentAmber: '#f5af19',
  /** Ocean / teal #43cea2 */
  ocean: '#43cea2',
  /** Orange glow #ffb347 */
  orangeGlow: '#ffb347',
  /** Lavender / soft blue #a8c0ff */
  lavender: '#a8c0ff',
  /** Teal green — CTA / accent #11998e */
  tealGreen: '#11998e',
  /** Golden yellow — progress bar / highlight #ffcc33 */
  goldenYellow: '#ffcc33',
};

// ──────────────────────────────────────────────
//  Semantic status colors (MUI defaults)
// ──────────────────────────────────────────────
export const statusColors = {
  success: '#4caf50',
  successDark: '#388e3c',
  warning: '#ff9800',
  warningDark: '#f57c00',
  error: '#f44336',
  info: '#2196f3',
  purple: '#9c27b0',
  purpleDark: '#7b1fa2',
  primaryBlue: '#1976d2',
  pink: '#e91e63',
  errorDark: '#d32f2f',
  warningDarker: '#ed6c02',
  successDeep: '#2e7d32',
  /** Cyan 500 */
  cyan: '#00bcd4',
  /** Warning amber / yellow #fbc02d */
  warningAmber: '#fbc02d',
  /** Teal 800 — dark teal for finance icons */
  tealDark: '#00796b',
  /** Star / favourite amber #ffb300 */
  starAmber: '#ffb300',
  /** Indigo 500 — compensation / structure accent */
  indigo: '#3f51b5',
  /** Blue 300 — light icon accent */
  blueLight: '#64b5f6',
  /** Light Blue 700 — department accent */
  lightBlue: '#0288d1',
  /** Light Green 800 — department / nature accent */
  limeGreen: '#558b2f',
  /** Cyan 800 — dark cyan department accent */
  cyanDark: '#00838f',
  /** Pink 700 — dark pink department accent */
  pinkDark: '#c2185b',
  /** Green 600 — mid‑green for gradient stops */
  successMid: '#45a049' /** Teal 500 — therapy / session-type accent */,
  teal: '#009688',
  /** Deep Orange 500 — category / alert accent */
  deepOrange: '#ff5722',
  /** Red 800 — deep error / critical status */
  errorDeep: '#c62828',
  /** Green 800 — dark green status text */
  greenDark: '#166534',
  /** Blue 800 — dark blue status text */
  blueDark: '#1e40af',
  /** Red 800 — dark red status text */
  redDark: '#991b1b',
  /** Amber 800 — dark amber / yellow status text */
  yellowDark: '#92400e',
  /** Red 400 — soft error / light red accent */
  errorSoft: '#ef5350',
  /** Red 600 — mid red (Tailwind red-600) */
  redMid: '#dc2626',
  /** Orange 600 — mid orange (Tailwind orange-600) */
  orangeMid: '#ea580c',
  /** Teal 700 — mid teal (Tailwind teal-700) */
  tealMid: '#0f766e',
};

// ──────────────────────────────────────────────
//  Chart color sequences — use for recharts Cell
//  arrays, pie/bar colors, etc.
// ──────────────────────────────────────────────
export const chartColors = {
  /** General‑purpose 8‑color sequence used by most charts */
  main: ['#667eea', '#43e97b', '#4facfe', '#f093fb', '#ffb347', '#fa709a', '#43cea2', '#f5af19'],

  /** HR weekly attendance bar colors */
  hr: ['#667eea', '#43e97b', '#4facfe', '#f093fb', '#ffb347', '#fa709a', '#43cea2'],

  /** Expense categories pie colors */
  expense: ['#667eea', '#43e97b', '#4facfe', '#f093fb', '#ffb347', '#fa709a', '#43cea2', '#f5af19'],

  /** Violet 600 — chart line / bar accent */
  violet: '#7c3aed',
  /** Emerald 600 — chart line / bar accent */
  emerald: '#059669',

  /**
   * MUI‑derived 10‑color category palette used by module dashboards
   * (Sessions, Operations, Fleet, Quality, Contracts, Beneficiaries, Students).
   */
  category: [
    '#1976d2', // Blue 700
    '#9c27b0', // Purple 500
    '#2e7d32', // Green 800
    '#ed6c02', // Orange 800
    '#0288d1', // Light Blue 700
    '#795548', // Brown 500
    '#e91e63', // Pink 500
    '#ff5722', // Deep Orange 500
    '#00bcd4', // Cyan 500
    '#d32f2f', // Red 700
  ],

  /** Recharts-default 6-color pie/bar palette (analytics dashboards) */
  analytics: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'],

  /* ── Named chart singles (for individual bar / line strokes) ── */
  /** Recharts purple #8884d8 */
  purple: '#8884d8',
  /** Recharts green #82ca9d */
  green: '#82ca9d',
  /** Warm amber #ffc658 */
  amber: '#ffc658',
  /** Blue-gray 700 #455a64 */
  blueGray: '#455a64',
  /** Teal light #14b8a6 (system‑usage bars) */
  tealLight: '#14b8a6',
  /** Warm amber #f59e0b (weekly‑alerts bars) */
  warmAmber: '#f59e0b',
};

// ──────────────────────────────────────────────
//  Leave‑type colors (HR / Employee Portal)
// ──────────────────────────────────────────────
export const leaveColors = {
  annual: '#2196f3', // Blue — سنوية
  sick: '#f44336', // Red — مرضية
  emergency: '#ff9800', // Orange — طارئة
  hajj: '#9c27b0', // Purple — حج
  maternity: '#e91e63', // Pink — أمومة
  unpaid: '#607d8b', // Blue Gray — بدون راتب
  bereavement: '#795548', // Brown — عزاء
  study: '#00bcd4', // Cyan — دراسية
};

// ──────────────────────────────────────────────
//  Neutral colors for fallback / inactive states
// ──────────────────────────────────────────────
export const neutralColors = {
  /** Gray 500 — suspended, inactive */
  inactive: '#9e9e9e',
  /** Blue Gray 500 — default / "other" fallback */
  fallback: '#607d8b',
  /** Gray 600 — secondary text */
  textSecondary: '#666666',
  /** Gray 400 — muted / placeholder text */
  textMuted: '#999999',
  /** Gray 600 — disabled text */
  textDisabled: '#757575',
  /** Gray 300 — light placeholder / empty state */
  placeholder: '#cccccc',
  /** Dark text #333333 */
  textDark: '#333333',
  /** Gray 400 — inactive / disabled borders */
  borderInactive: '#bdbdbd',
  /** Brown 500 — department accent */
  brown: '#795548',
  /** Brown 700 — dark brown department accent */
  brownDark: '#5d4037',
  /** Dark navy — sidebar / header accent */
  navyDark: '#2c3e50',
  /** Slate 300 — scrollbar track / thumb */
  scrollbar: '#CBD5E1',
  /** Slate 400 — scrollbar hover */
  scrollbarHover: '#94A3B8',
};

// ──────────────────────────────────────────────
//  Severity scale (disability levels)
// ──────────────────────────────────────────────
export const severityColors = {
  mild: '#43e97b',
  moderate: '#f7971e',
  severe: '#f44336',
  profound: '#9c27b0',
};

// ──────────────────────────────────────────────
//  Assessment interpretation scale (MUI‑derived)
//  Used by assessmentService for 4‑level scales
// ──────────────────────────────────────────────
export const assessmentColors = {
  severe: '#d32f2f', // Red 700
  moderate: '#ed6c02', // Orange 800
  mild: '#0288d1', // Light Blue 700
  normal: '#2e7d32', // Green 800
};

// ──────────────────────────────────────────────
//  Scale-card accent colours   (per-scale identity)
//  Used by assessmentService/scales.js  &  tests.js
// ──────────────────────────────────────────────
export const scaleAccentColors = {
  sensoryProfile: '#7b1fa2', // Purple 700  — Sensory Profile
  cognitive: '#00695c', // Teal 800    — Cognitive Skills
  developmental: '#e65100', // Orange 900  — Developmental Integration
  language: '#1565c0', // Blue 800    — Language Skills Test
  sensoryIntegration: '#6a1b9a', // Purple 800  — Sensory Integration Test
  // ── New scale accent colours ──
  emotionalWellbeing: '#c62828', // Red 800     — Emotional Well-being
  communityParticipation: '#00838f', // Cyan 800    — Community Participation
  vocationalRehab: '#33691e', // Light Green 900 — Vocational Rehabilitation
  familySupport: '#4e342e', // Brown 800   — Family Support
  assistiveTech: '#37474f', // Blue Grey 800 — Assistive Technology
  functionalIndependence: '#1a237e', // Indigo 900  — Functional Independence (FIM)
  behavioralAssessment: '#880e4f', // Pink 900    — Behavioral Assessment
  fineMotor: '#0d47a1', // Blue 900    — Fine Motor Skills Test
  educationalPerformance: '#004d40', // Teal 900    — Educational Performance Test
  visualPerceptual: '#4a148c', // Purple 900  — Visual Perceptual Test
  behavioralFunctional: '#b71c1c', // Red 900     — Behavioral Functional Test
  vocationalAptitude: '#1b5e20', // Green 900   — Vocational Aptitude Test
  // ── Phase 5 new scale accent colours ──
  painAssessment: '#d84315', // Deep Orange 800 — Pain Assessment
  speechLanguageDetailed: '#283593', // Indigo 800  — Speech & Language Detailed
  earlyChildhoodDev: '#f57f17', // Yellow 900   — Early Childhood Development
  specialEducationNeeds: '#2e7d32', // Green 800   — Special Education Needs
  assistiveTechEffectiveness: '#455a64', // Blue Grey 700 — AT Effectiveness
  caregiverBurden: '#6d4c41', // Brown 700   — Caregiver Burden
  socialIntegrationReadiness: '#00897b', // Teal 600    — Social Integration Readiness
};

// ──────────────────────────────────────────────
//  5‑step progress gradient (0 → 100 %)
// ──────────────────────────────────────────────
export const progressColors = [
  '#f44336', // 0‑20 %  — danger
  '#ff9800', // 20‑40 % — warning
  '#ffc107', // 40‑60 % — amber
  '#8bc34a', // 60‑80 % — light green
  '#4caf50', // 80‑100 % — success
];

// ──────────────────────────────────────────────
//  Neutral / surface colors (light & dark mode)
// ──────────────────────────────────────────────
export const surfaceColors = {
  lightGray: '#f5f5f5',
  divider: '#e0e0e0',
  background: '#f3f4f6',
  softGray: '#f0f0f0',
  errorLight: '#ffebee',
  infoLight: '#e3f2fd',
  warningLight: '#fff3e0',
  successLight: '#e8f5e9',
  purpleLight: '#f3e5f5',
  pinkLight: '#fce4ec',
  /** Brand-tinted very light blue-purple surface */
  brandTint: '#f8f9ff',
  /** Brand-tinted hover state */
  brandTintHover: '#f0f2ff',
  /** Light border/separator */
  borderLight: '#dddddd',
  /** Subtle border/separator */
  borderSubtle: '#eeeeee',
  /** Near-white alternative paper */
  paperAlt: '#f9f9f9',
  /** Page-level background — slate 50 */
  pageBackground: '#f5f7fa',
  /** Near-white background — MUI default bg */
  backgroundLight: '#fafafa',
  /** Amber 50 — lighter warning surface */
  warningLighter: '#fff8e1',
  /** Warm orange-50 tint — warning card surface */
  warningTint: '#fff9f0',
  /** Blue-50 tint — info card surface */
  infoTint: '#f0f7ff',
  /** Green-50 tint — success card surface */
  successTint: '#f0fff4',
  /** Pink-50 tint — pink card surface */
  pinkTint: '#fff0f6',
  /** Near-white gray — lightest surface (#f9fafb) */
  backgroundLighter: '#f9fafb',
  /** Light blue tint — brand stat card surface */
  brandTintLight: '#f0f4ff',
  /** Light purple tint — stat card surface */
  purpleTint: '#f5f0ff',
  /** Rose tint — stat card surface */
  roseTint: '#fff0f5',
  /** Light green tint — stat card surface */
  greenTint: '#f0fff5',
  /** Green 100 — green status card surface */
  greenSurface: '#dcfce7',
  /** Blue 100 — blue status card surface */
  blueSurface: '#dbeafe',
  /** Red 100 — red status card surface */
  redSurface: '#fee2e2',
  /** Amber 100 — yellow status card surface */
  yellowSurface: '#fef3c7',
  /** Near-white gray — lightest paper (#f8f9fa) */
  paperSoft: '#f8f9fa',
};

export const surfaceColorsDark = {
  lightGray: '#1e1e1e',
  divider: '#424242',
  background: '#121212',
  softGray: '#2c2c2c',
  /** Dark navy paper (dialog / fullscreen) */
  paper: '#1a1a2e',
};

// ──────────────────────────────────────────────
//  Rank / podium colors (top-performer badges)
// ──────────────────────────────────────────────
export const rankColors = {
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
};

/** Returns the appropriate surface palette for the given theme mode */
export const getSurfaceColors = (mode = 'light') =>
  mode === 'dark' ? surfaceColorsDark : surfaceColors;
