/**
 * chartHelpers — Recharts / Chart.js configuration presets.
 * أدوات تهيئة الرسوم البيانية
 */

/** Default color palette for charts */
export const CHART_COLORS = [
  '#667eea', // primary
  '#48bb78', // success
  '#ed8936', // warning
  '#fc5c65', // danger
  '#4ecdc4', // teal
  '#a78bfa', // purple
  '#f093fb', // pink
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#34d399', // emerald
];

/** Gradient color pairs for area charts */
export const CHART_GRADIENTS = {
  primary: ['#667eea', '#764ba2'],
  success: ['#48bb78', '#38a169'],
  warning: ['#ed8936', '#dd6b20'],
  danger: ['#fc5c65', '#eb3b5a'],
  info: ['#4ecdc4', '#44a3a0'],
  purple: ['#a78bfa', '#7c3aed'],
};

/**
 * Get color by index (cycles through palette).
 * @param {number} index
 * @returns {string}
 */
export const getChartColor = index => CHART_COLORS[index % CHART_COLORS.length];

/**
 * Common tooltip style for Arabic RTL context.
 * @param {object} [overrides]
 * @returns {object}
 */
export const tooltipStyle = (overrides = {}) => ({
  contentStyle: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    direction: 'rtl',
    fontFamily: 'Cairo, sans-serif',
    fontSize: 13,
    padding: '8px 12px',
    ...overrides,
  },
  labelStyle: { fontWeight: 600, marginBottom: 4 },
  cursor: { stroke: '#667eea', strokeWidth: 1, strokeDasharray: '4 4' },
});

/**
 * Format large numbers for axis labels (e.g., 1.2k, 3.5M).
 * @param {number} value
 * @returns {string}
 */
export const formatAxisNumber = value => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

/**
 * Format percentage value.
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
export const formatPercent = (value, decimals = 1) => {
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Format SAR currency for chart labels.
 * @param {number} value
 * @returns {string}
 */
export const formatChartCurrency = value => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ر.س`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K ر.س`;
  return `${value} ر.س`;
};

/**
 * Create Recharts bar chart config.
 * @param {Array<{ dataKey: string, name: string, color?: string }>} bars
 * @returns {Array}
 */
export const createBarConfig = bars =>
  bars.map((bar, i) => ({
    dataKey: bar.dataKey,
    name: bar.name,
    fill: bar.color || getChartColor(i),
    radius: [4, 4, 0, 0],
  }));

/**
 * Create Recharts line chart config.
 * @param {Array<{ dataKey: string, name: string, color?: string }>} lines
 * @returns {Array}
 */
export const createLineConfig = lines =>
  lines.map((line, i) => ({
    dataKey: line.dataKey,
    name: line.name,
    stroke: line.color || getChartColor(i),
    strokeWidth: 2,
    dot: { r: 3, strokeWidth: 2 },
    activeDot: { r: 5, strokeWidth: 2 },
  }));

/**
 * Create pie chart data with colors.
 * @param {Array<{ name: string, value: number }>} data
 * @returns {Array}
 */
export const createPieData = data => data.map((item, i) => ({ ...item, fill: getChartColor(i) }));

/**
 * Calculate percentage distribution.
 * @param {Array<{ name: string, value: number }>} data
 * @returns {Array<{ name: string, value: number, percent: number }>}
 */
export const calculatePercentages = data => {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  return data.map(d => ({
    ...d,
    percent: total > 0 ? Number(((d.value / total) * 100).toFixed(1)) : 0,
  }));
};

/** Common legend props for Arabic charts */
export const ARABIC_LEGEND_PROPS = {
  wrapperStyle: { direction: 'rtl', fontFamily: 'Cairo, sans-serif', fontSize: 12 },
  iconType: 'circle',
  iconSize: 8,
};

/** Common X-axis props */
export const X_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: { fill: '#718096', fontSize: 12, fontFamily: 'Cairo, sans-serif' },
};

/** Common Y-axis props */
export const Y_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: { fill: '#718096', fontSize: 12, fontFamily: 'Cairo, sans-serif' },
  width: 60,
};

/** Common CartesianGrid props */
export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: '#e2e8f0',
  vertical: false,
};

export default {
  CHART_COLORS,
  CHART_GRADIENTS,
  getChartColor,
  tooltipStyle,
  formatAxisNumber,
  formatPercent,
  formatChartCurrency,
  createBarConfig,
  createLineConfig,
  createPieData,
  calculatePercentages,
  ARABIC_LEGEND_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  GRID_PROPS,
};
