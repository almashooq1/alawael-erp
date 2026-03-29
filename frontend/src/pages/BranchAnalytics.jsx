/**
 * BranchAnalytics.jsx
 * صفحة التحليلات الذكية للفرع — Phase 2
 *
 * Sections:
 *  1. Performance Score History (SVG sparkline)
 *  2. Trend Charts per metric (SVG polyline)
 *  3. 7-Day Forecast (SVG bar + line overlay)
 *  4. Anomaly Detection Panel
 *  5. AI Recommendations
 *  6. Target vs Actual comparison
 */

import React, { useState, useMemo } from 'react';
import {
  useBranchAnalytics,
  useBranchKPIs,
  useBranchTargets,
} from '../hooks/useBranchData';

// ─── SVG Chart Primitives ──────────────────────────────────────────────────────

/**
 * Inline SVG line chart — no external deps
 */
function LineChart({ data = [], color = '#3B82F6', height = 80, width = 300, label = '' }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>لا توجد بيانات كافية</span>
      </div>
    );
  }

  const values = data.map(d => (typeof d === 'object' ? d.value ?? d.y : d));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const pad = 8;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * chartW;
      const y = pad + chartH - ((v - minVal) / range) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints =
    `${pad},${pad + chartH} ` + points + ` ${pad + chartW},${pad + chartH}`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(r => (
        <line
          key={r}
          x1={pad}
          y1={pad + chartH * r}
          x2={pad + chartW}
          y2={pad + chartH * r}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      ))}
      {/* Area fill */}
      <polygon points={areaPoints} fill={`url(#grad-${label})`} />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {values.length > 0 && (() => {
        const lastX = pad + chartW;
        const lastY = pad + chartH - ((values[values.length - 1] - minVal) / range) * chartH;
        return (
          <circle cx={lastX} cy={lastY} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        );
      })()}
    </svg>
  );
}

/**
 * Bar chart for forecast
 */
function ForecastBar({ data = [], color = '#6366F1', height = 120, width = 320 }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.predicted ?? d.value ?? 0);
  const maxVal = Math.max(...values) || 1;
  const barW = Math.floor((width - 20) / values.length) - 4;
  const pad = 10;
  const chartH = height - 28;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {values.map((v, i) => {
        const barH = Math.max(4, (v / maxVal) * chartH);
        const x = pad + i * (barW + 4);
        const y = pad + chartH - barH;
        const label = data[i].date_str || data[i].label || `يوم ${i + 1}`;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill={color}
              opacity={0.75 + (i / values.length) * 0.25}
            />
            <text
              x={x + barW / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#6B7280"
            >
              {label.slice(-5)}
            </text>
            <text
              x={x + barW / 2}
              y={y - 3}
              textAnchor="middle"
              fontSize="9"
              fill={color}
              fontWeight="600"
            >
              {Math.round(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Radial Score Gauge ────────────────────────────────────────────────────────
function ScoreGauge({ score = 0, grade = 'N/A', size = 120 }) {
  const r = (size / 2) * 0.78;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (score / 100);
  const gap = circumference - filled;

  const gradeColor = {
    'A+': '#10B981', A: '#22C55E', 'B+': '#84CC16',
    B: '#EAB308', C: '#F97316', D: '#EF4444', F: '#991B1B',
  };
  const color = gradeColor[grade] || '#6B7280';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${filled} ${gap}`}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill={color}
        style={{ transform: `rotate(90deg) translate(0, -${size}px)` }}
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────
function RecommendationCard({ rec }) {
  const priorityStyle = {
    critical: { bg: '#FEF2F2', border: '#FCA5A5', badge: '#EF4444', text: 'عاجل جداً' },
    high:     { bg: '#FFF7ED', border: '#FED7AA', badge: '#F97316', text: 'عاجل' },
    medium:   { bg: '#FFFBEB', border: '#FDE68A', badge: '#EAB308', text: 'متوسط' },
    low:      { bg: '#F0FDF4', border: '#BBF7D0', badge: '#22C55E', text: 'منخفض' },
  };
  const s = priorityStyle[rec.priority] || priorityStyle.low;

  const categoryIcon = {
    revenue: '💰', sessions: '📋', attendance: '👥',
    satisfaction: '⭐', transport: '🚌', staff: '👨‍⚕️',
  };

  return (
    <div
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 10,
        direction: 'rtl',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{categoryIcon[rec.category] || '📌'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1F2937' }}>
              {rec.title_ar || rec.title}
            </span>
            <span
              style={{
                backgroundColor: s.badge,
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
              }}
            >
              {s.text}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 6px' }}>
            {rec.message_ar || rec.message}
          </p>
          {rec.action_ar && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                color: '#374151',
                fontWeight: 600,
              }}
            >
              <span>✅</span>
              <span>{rec.action_ar}</span>
            </div>
          )}
          {rec.expected_impact && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              التأثير المتوقع: <strong>{rec.expected_impact}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Anomaly Row ──────────────────────────────────────────────────────────────
function AnomalyRow({ anomaly }) {
  const severityColor = anomaly.z_score > 3 ? '#EF4444' : anomaly.z_score > 2 ? '#F97316' : '#EAB308';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: 8,
        backgroundColor: '#FEF3C7',
        marginBottom: 6,
        direction: 'rtl',
        fontSize: 13,
      }}
    >
      <div>
        <span style={{ fontWeight: 600, color: '#92400E' }}>{anomaly.metric}</span>
        <span style={{ color: '#78350F', marginRight: 8 }}>
          القيمة: {anomaly.value?.toFixed(1)} (المعتاد: {anomaly.mean?.toFixed(1)} ± {anomaly.std?.toFixed(1)})
        </span>
      </div>
      <span
        style={{
          color: severityColor,
          fontWeight: 700,
          fontSize: 12,
          backgroundColor: '#FEF2F2',
          padding: '2px 8px',
          borderRadius: 10,
        }}
      >
        Z={anomaly.z_score?.toFixed(2)}
      </span>
    </div>
  );
}

// ─── KPI Target Bar ───────────────────────────────────────────────────────────
function TargetBar({ label, value, target, unit, color = '#3B82F6' }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const barColor = pct >= 90 ? '#10B981' : pct >= 70 ? '#3B82F6' : pct >= 50 ? '#F97316' : '#EF4444';

  return (
    <div style={{ marginBottom: 12, direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          {value} / {target} {unit}
        </span>
      </div>
      <div style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: barColor,
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: barColor, fontWeight: 700, marginTop: 2 }}>
        {pct.toFixed(1)}% من الهدف
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ title, icon, children, style = {} }) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        border: '1px solid #F3F4F6',
        marginBottom: 20,
        direction: 'rtl',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Metric Selector ──────────────────────────────────────────────────────────
const METRIC_OPTIONS = [
  { value: 'sessions_count', label_ar: 'الجلسات' },
  { value: 'patients_count', label_ar: 'المرضى' },
  { value: 'monthly_revenue', label_ar: 'الإيراد' },
  { value: 'session_completion_rate', label_ar: 'إتمام الجلسات' },
  { value: 'attendance_rate', label_ar: 'الحضور' },
  { value: 'satisfaction_score', label_ar: 'رضا المرضى' },
  { value: 'staff_utilization', label_ar: 'استغلال الموظفين' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function BranchAnalytics({ branchCode }) {
  const [selectedMetric, setSelectedMetric] = useState('sessions_count');
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [forecastDays] = useState(7);
  const [activeTab, setActiveTab] = useState('trends'); // trends | forecast | anomalies | recommendations | targets

  // Hooks
  const {
    trends,
    anomalies,
    forecast,
    recommendations,
    loading: analyticsLoading,
    error: analyticsError,
  } = useBranchAnalytics(branchCode, {
    days: analyticsDays,
    forecastMetric: selectedMetric,
    forecastDays,
  });

  const { kpis, loading: kpisLoading } = useBranchKPIs(branchCode);
  const { targets, loading: targetsLoading } = useBranchTargets(
    branchCode,
    new Date().getFullYear(),
    new Date().getMonth() + 1
  );

  // Derive performance score history from trends
  const scoreHistory = useMemo(() => {
    if (!trends || !trends.session_completion_rate?.history) return [];
    return trends.session_completion_rate.history.map((h, i) => ({
      date: h.date,
      value: Math.round(
        (((trends.session_completion_rate?.history[i]?.value ?? 70) / 100) * 25) +
        (((trends.attendance_rate?.history[i]?.value ?? 70) / 100) * 20) +
        (((trends.staff_utilization?.history[i]?.value ?? 60) / 100) * 10)
      ),
    }));
  }, [trends]);

  // Derive chart data for selected metric
  const metricHistory = useMemo(() => {
    if (!trends || !selectedMetric) return [];
    return trends[selectedMetric]?.history || [];
  }, [trends, selectedMetric]);

  const metricTrend = useMemo(() => {
    return trends?.[selectedMetric] || null;
  }, [trends, selectedMetric]);

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  if (analyticsError) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#EF4444', direction: 'rtl' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h3>خطأ في تحميل البيانات</h3>
        <p style={{ color: '#6B7280' }}>{analyticsError}</p>
      </div>
    );
  }

  const loading = analyticsLoading || kpisLoading;

  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'trends', label: 'الاتجاهات', icon: '📈' },
    { id: 'forecast', label: 'التوقعات', icon: '🔮' },
    { id: 'anomalies', label: 'الشذوذات', icon: '⚡' },
    { id: 'recommendations', label: 'التوصيات', icon: '🤖' },
    { id: 'targets', label: 'الأهداف', icon: '🎯' },
  ];

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
        backgroundColor: '#F9FAFB',
        minHeight: '100vh',
        padding: '24px 20px',
        direction: 'rtl',
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>
              📊 التحليلات الذكية
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 14 }}>
              فرع: <strong style={{ color: '#3B82F6' }}>{branchCode}</strong> — تحليل شامل بالذكاء الاصطناعي
            </p>
          </div>

          {/* Days selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>نطاق التحليل:</span>
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setAnalyticsDays(d)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: analyticsDays === d ? 700 : 400,
                  backgroundColor: analyticsDays === d ? '#3B82F6' : '#E5E7EB',
                  color: analyticsDays === d ? '#fff' : '#374151',
                  transition: 'all 0.2s',
                }}
              >
                {d}د
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Performance Score Overview ─── */}
      {!loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 24,
            backgroundColor: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
            borderRadius: 16,
            padding: '22px 26px',
            marginBottom: 24,
            alignItems: 'center',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <ScoreGauge
                score={metricTrend?.last_value ? Math.min(100, Math.round(metricTrend.last_value)) : 0}
                grade="B+"
                size={100}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#6366F1',
                  pointerEvents: 'none',
                }}
              >
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>درجة الأداء الكلية</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>
                {trends?.[selectedMetric]?.last_value?.toFixed(0) ?? '—'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{selectedMetric.replace(/_/g, ' ')}</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 14,
            }}
          >
            {METRIC_OPTIONS.slice(0, 4).map(m => {
              const t = trends?.[m.value];
              return (
                <div
                  key={m.value}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    border: selectedMetric === m.value ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedMetric(m.value)}
                >
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{m.label_ar}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                    {t?.last_value?.toFixed(1) ?? '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: t?.direction === 'up' ? '#86EFAC' : t?.direction === 'down' ? '#FCA5A5' : '#FDE68A',
                    }}
                  >
                    {t?.direction === 'up' ? '↑' : t?.direction === 'down' ? '↓' : '→'}
                    {t?.slope ? ` ${t.slope > 0 ? '+' : ''}${t.slope.toFixed(2)}/يوم` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tab Navigation ─── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 6,
          marginBottom: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1 1 auto',
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              backgroundColor: activeTab === tab.id ? '#3B82F6' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#6B7280',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Loading Spinner ─── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #E5E7EB',
              borderTop: '4px solid #3B82F6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#6B7280', fontSize: 15 }}>جارٍ تحليل البيانات بالذكاء الاصطناعي...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: TRENDS
      ════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'trends' && (
        <div>
          {/* Metric selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.value}
                onClick={() => setSelectedMetric(m.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '2px solid',
                  borderColor: selectedMetric === m.value ? '#3B82F6' : '#E5E7EB',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: selectedMetric === m.value ? 700 : 400,
                  backgroundColor: selectedMetric === m.value ? '#EFF6FF' : '#fff',
                  color: selectedMetric === m.value ? '#1D4ED8' : '#6B7280',
                  transition: 'all 0.2s',
                }}
              >
                {m.label_ar}
              </button>
            ))}
          </div>

          {/* Main trend card */}
          <Card title={`اتجاه: ${METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label_ar}`} icon="📈">
            {metricTrend ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                  {[
                    { label: 'آخر قيمة', value: metricTrend.last_value?.toFixed(2), color: '#3B82F6' },
                    { label: 'المتوسط', value: metricTrend.avg?.toFixed(2), color: '#8B5CF6' },
                    { label: 'الميل/يوم', value: metricTrend.slope?.toFixed(3), color: metricTrend.slope >= 0 ? '#10B981' : '#EF4444' },
                    { label: 'دقة النموذج R²', value: metricTrend.r2?.toFixed(3), color: '#F59E0B' },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{stat.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value ?? '—'}</div>
                    </div>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <LineChart
                    data={metricHistory}
                    color="#3B82F6"
                    height={140}
                    width={Math.max(400, metricHistory.length * 12)}
                    label={selectedMetric}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      backgroundColor:
                        metricTrend.direction === 'up'
                          ? '#D1FAE5'
                          : metricTrend.direction === 'down'
                          ? '#FEE2E2'
                          : '#FEF3C7',
                      color:
                        metricTrend.direction === 'up'
                          ? '#065F46'
                          : metricTrend.direction === 'down'
                          ? '#991B1B'
                          : '#92400E',
                      fontWeight: 700,
                    }}
                  >
                    {metricTrend.direction === 'up' ? '↑ تحسن' : metricTrend.direction === 'down' ? '↓ تراجع' : '→ مستقر'}
                  </span>
                  <span style={{ color: '#6B7280' }}>خلال آخر {analyticsDays} يوم</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 30 }}>
                لا توجد بيانات اتجاه لهذا المقياس
              </div>
            )}
          </Card>

          {/* All metrics mini charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {METRIC_OPTIONS.filter(m => m.value !== selectedMetric).map(m => {
              const t = trends?.[m.value];
              if (!t) return null;
              return (
                <div
                  key={m.value}
                  onClick={() => setSelectedMetric(m.value)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: '14px 16px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    border: '1px solid #F3F4F6',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{m.label_ar}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color:
                          t.direction === 'up' ? '#10B981' : t.direction === 'down' ? '#EF4444' : '#EAB308',
                        fontWeight: 700,
                      }}
                    >
                      {t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'}{' '}
                      {t.last_value?.toFixed(1)}
                    </span>
                  </div>
                  <LineChart
                    data={t.history || []}
                    color={t.direction === 'up' ? '#10B981' : t.direction === 'down' ? '#EF4444' : '#6366F1'}
                    height={60}
                    width={260}
                    label={m.value}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: FORECAST
      ════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'forecast' && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.value}
                onClick={() => setSelectedMetric(m.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '2px solid',
                  borderColor: selectedMetric === m.value ? '#6366F1' : '#E5E7EB',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: selectedMetric === m.value ? 700 : 400,
                  backgroundColor: selectedMetric === m.value ? '#EEF2FF' : '#fff',
                  color: selectedMetric === m.value ? '#4338CA' : '#6B7280',
                }}
              >
                {m.label_ar}
              </button>
            ))}
          </div>

          <Card title={`توقعات 7 أيام — ${METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label_ar}`} icon="🔮">
            {forecast ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#EEF2FF', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>متوسط التوقع</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#4338CA' }}>
                      {forecast.predictions
                        ? (forecast.predictions.reduce((s, p) => s + (p.predicted ?? 0), 0) / forecast.predictions.length).toFixed(1)
                        : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>أعلى قيمة متوقعة</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#065F46' }}>
                      {forecast.predictions
                        ? Math.max(...forecast.predictions.map(p => p.predicted ?? 0)).toFixed(1)
                        : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#FFF7ED', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>الاتجاه المتوقع</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#92400E' }}>
                      {forecast.trend === 'increasing' ? '↑ ارتفاع' : forecast.trend === 'decreasing' ? '↓ انخفاض' : '→ ثبات'}
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <ForecastBar
                    data={forecast.predictions || []}
                    color="#6366F1"
                    height={160}
                    width={Math.max(380, (forecast.predictions?.length ?? 7) * 48)}
                  />
                </div>

                {forecast.model_quality && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '10px 14px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#6B7280',
                      display: 'flex',
                      gap: 20,
                    }}
                  >
                    <span>دقة النموذج: <strong style={{ color: '#374151' }}>{(forecast.model_quality?.r2 * 100)?.toFixed(1)}%</strong></span>
                    <span>بيانات التدريب: <strong style={{ color: '#374151' }}>{forecast.training_days} يوم</strong></span>
                    <span>المقياس: <strong style={{ color: '#374151' }}>{forecast.metric}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                <div style={{ fontSize: 36 }}>🔮</div>
                <p>لا تتوفر بيانات كافية للتوقع</p>
                <p style={{ fontSize: 12 }}>يتطلب النموذج 14 يوم على الأقل من البيانات</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: ANOMALIES
      ════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'anomalies' && (
        <Card title="كشف الشذوذات والانحرافات" icon="⚡">
          {anomalies && anomalies.length > 0 ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#92400E',
                }}
              >
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span>
                  تم رصد <strong>{anomalies.length} شذوذ</strong> في آخر 14 يوم.
                  يُعدّ Z &gt; 2 تحذيراً، و Z &gt; 3 حالة حرجة.
                </span>
              </div>
              {anomalies.map((a, i) => (
                <AnomalyRow key={i} anomaly={a} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ color: '#065F46', margin: 0 }}>لم يُرصد أي شذوذ</h3>
              <p style={{ color: '#6B7280', fontSize: 14 }}>جميع المقاييس ضمن النطاق الطبيعي خلال آخر 14 يوم</p>
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: RECOMMENDATIONS
      ════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'recommendations' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              borderRadius: 12,
              marginBottom: 20,
              color: '#fff',
            }}
          >
            <span style={{ fontSize: 28 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>توصيات الذكاء الاصطناعي</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {recommendations?.length ?? 0} توصية مخصصة بناءً على تحليل بيانات آخر 14 يوم
              </div>
            </div>
          </div>

          {recommendations && recommendations.length > 0 ? (
            recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌟</div>
              <h3 style={{ color: '#065F46' }}>أداء ممتاز!</h3>
              <p style={{ color: '#6B7280' }}>لا توجد توصيات تحسين في الوقت الحالي</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: TARGETS
      ════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'targets' && (
        <div>
          <Card title="الأهداف الشهرية مقابل الفعلي" icon="🎯">
            {targets && kpis ? (
              <div>
                {[
                  {
                    label: 'الإيراد الشهري',
                    value: kpis.revenue_target?.value ?? 0,
                    target: (targets.kpis?.monthly_revenue?.value) ?? 300000,
                    unit: 'SAR',
                  },
                  {
                    label: 'عدد المرضى',
                    value: kpis.new_patients?.value ?? 0,
                    target: targets.kpis?.patients_count?.value ?? 100,
                    unit: 'مريض',
                  },
                  {
                    label: 'معدل إتمام الجلسات',
                    value: kpis.session_completion?.value ?? 0,
                    target: targets.kpis?.session_completion_rate?.value ?? 95,
                    unit: '%',
                  },
                  {
                    label: 'رضا المرضى',
                    value: kpis.patient_satisfaction?.value ?? 0,
                    target: targets.kpis?.satisfaction_score?.value ?? 4.8,
                    unit: '/5',
                  },
                  {
                    label: 'حضور الموظفين',
                    value: kpis.staff_attendance?.value ?? 0,
                    target: targets.kpis?.attendance_rate?.value ?? 98,
                    unit: '%',
                  },
                  {
                    label: 'نسبة السعودة',
                    value: kpis.saudization?.value ?? 0,
                    target: targets.kpis?.saudization?.value ?? 70,
                    unit: '%',
                  },
                ].map(kpi => (
                  <TargetBar key={kpi.label} {...kpi} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>
                <p>لم يتم تعيين الأهداف بعد لهذا الشهر</p>
                <p style={{ fontSize: 12 }}>
                  استخدم POST /{branchCode}/targets لإضافة أهداف الشهر
                </p>
              </div>
            )}
          </Card>

          {/* HQ KPI benchmarks */}
          <Card title="مقارنة مع متوسط الشبكة" icon="🏆">
            {kpis ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                {Object.entries(kpis).map(([key, stat]) => {
                  if (!stat || typeof stat !== 'object') return null;
                  const diff = (stat.value ?? 0) - (stat.hq_avg ?? 0);
                  return (
                    <div
                      key={key}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: diff >= 0 ? '#F0FDF4' : '#FEF2F2',
                        borderRadius: 10,
                        border: `1px solid ${diff >= 0 ? '#BBF7D0' : '#FECACA'}`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: diff >= 0 ? '#065F46' : '#991B1B' }}>
                        {stat.value}
                        <span style={{ fontSize: 11, fontWeight: 400 }}> {stat.unit}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        HQ: {stat.hq_avg}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: diff >= 0 ? '#10B981' : '#EF4444' }}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>لا توجد بيانات KPI</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
