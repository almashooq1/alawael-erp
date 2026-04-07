/**
 * Home — الصفحة الرئيسية (Enhanced Tailwind)
 * Premium dashboard with animated KPIs, glass cards, progress rings, module grid
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  AccountTree as AccountTreeIcon,
  Groups as GroupsIcon,
  AccessTime as AccessTimeIcon,
  Science as ScienceIcon,
  QueryStats as QueryStatsIcon,
  SupportAgent as SupportAgentIcon,
  ArrowForward as ArrowForwardIcon,
  Home as HomeIcon,
  ErrorOutline as ErrorOutlineIcon,
  CalendarMonth as CalendarIcon,
  Bolt as BoltIcon,
  AutoAwesome as SparkleIcon,
  KeyboardArrowLeft,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import moduleMocks from 'data/moduleMocks';
import { useRealTimeKPIs } from 'contexts/SocketContext';
import { dashboardAPI } from 'services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ─── Static Data ────────────────────────────────────────────────────────── */
const moduleGroups = [
  {
    title: 'التشغيل والقياس', accent: 'green', emoji: '⚡',
    items: [
      { title: 'لوحة التشغيل', path: '/dashboard', icon: <AccountTreeIcon sx={{ fontSize: 20 }} /> },
      { title: 'التقارير والتحليلات', path: '/reports', icon: <QueryStatsIcon sx={{ fontSize: 20 }} /> },
      { title: 'النشاط اللحظي', path: '/activity', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الأعمال والمالية', accent: 'amber', emoji: '💰',
    items: [
      { title: 'إدارة علاقات العملاء', path: '/crm', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
      { title: 'المالية والمحاسبة', path: '/finance', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
      { title: 'المشتريات والمخزون', path: '/procurement', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الموارد والفرق', accent: 'green', emoji: '👥',
    items: [
      { title: 'الموارد البشرية', path: '/hr', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
      { title: 'الحضور والإجازات', path: '/attendance', icon: <AccessTimeIcon sx={{ fontSize: 20 }} /> },
      { title: 'الرواتب', path: '/payroll', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'التعلم والرعاية', accent: 'amber', emoji: '📚',
    items: [
      { title: 'التعلم الإلكتروني', path: '/elearning', icon: <ScienceIcon sx={{ fontSize: 20 }} /> },
      { title: 'الجلسات والمواعيد', path: '/sessions', icon: <AccessTimeIcon sx={{ fontSize: 20 }} /> },
      { title: 'إعادة التأهيل والعلاج', path: '/rehab', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الأمن والتشغيل', accent: 'green', emoji: '🛡️',
    items: [
      { title: 'الأمن والحماية', path: '/security', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'المراقبة والكاميرات', path: '/surveillance', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'الصيانة والتشغيل', path: '/operations', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الميزات المؤسسية الاحترافية', accent: 'amber', emoji: '🏆',
    items: [
      { title: 'التدقيق والامتثال', path: '/audit-compliance', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'مولد التقارير', path: '/report-builder', icon: <QueryStatsIcon sx={{ fontSize: 20 }} /> },
      { title: 'التقويم الموحد', path: '/calendar-hub', icon: <AccessTimeIcon sx={{ fontSize: 20 }} /> },
      { title: 'CRM المتقدم', path: '/crm-pro', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
      { title: 'المستودعات الذكية', path: '/warehouse-intelligence', icon: <AccountTreeIcon sx={{ fontSize: 20 }} /> },
      { title: 'إدارة المشاريع', path: '/project-management', icon: <ScienceIcon sx={{ fontSize: 20 }} /> },
      { title: 'الاستيراد والتصدير', path: '/import-export', icon: <ScienceIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الميزات المؤسسية المتقدمة', accent: 'green', emoji: '🚀',
    items: [
      { title: 'التوظيف واستقطاب المواهب', path: '/talent-acquisition', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
      { title: 'إدارة المرافق والعقارات', path: '/facility-management', icon: <AccountTreeIcon sx={{ fontSize: 20 }} /> },
      { title: 'إدارة علاقات الموردين', path: '/vendor-management', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
      { title: 'خدمات تقنية المعلومات', path: '/itsm', icon: <ScienceIcon sx={{ fontSize: 20 }} /> },
      { title: 'السلامة والصحة المهنية', path: '/ehs-safety', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'التخطيط الاستراتيجي', path: '/strategic-planning', icon: <QueryStatsIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الحلول المؤسسية الفائقة', accent: 'amber', emoji: '✨',
    items: [
      { title: 'الشؤون القانونية', path: '/legal-management', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'الحوكمة المؤسسية', path: '/corporate-governance', icon: <AccountTreeIcon sx={{ fontSize: 20 }} /> },
      { title: 'استمرارية الأعمال', path: '/business-continuity', icon: <ScienceIcon sx={{ fontSize: 20 }} /> },
      { title: 'تجربة العملاء', path: '/customer-experience', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
      { title: 'الاستدامة والطاقة', path: '/sustainability', icon: <QueryStatsIcon sx={{ fontSize: 20 }} /> },
      { title: 'التحول الرقمي', path: '/digital-transformation', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
    ],
  },
];

const quickLinks = [
  { label: 'التقارير الذكية', path: '/reports', icon: <QueryStatsIcon sx={{ fontSize: 18 }} />, variant: 'primary' },
  { label: 'إدارة العلاقات', path: '/crm', icon: <GroupsIcon sx={{ fontSize: 18 }} />, variant: 'gold' },
  { label: 'مركز الأمان', path: '/security', icon: <ShieldIcon sx={{ fontSize: 18 }} />, variant: 'outline' },
  { label: 'الموارد البشرية', path: '/hr', icon: <GroupsIcon sx={{ fontSize: 18 }} />, variant: 'outline' },
];

/* ─── KPI Card with animated entrance ────────────────────────────────────── */
function KPICard({ kpi, navigate, index }) {
  const toneMap = {
    error: { text: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', ring: 'ring-rose-500/10' },
    warning: { text: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', ring: 'ring-amber-500/10' },
    success: { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', ring: 'ring-emerald-500/10' },
  };
  const tone = toneMap[kpi.tone] || toneMap.success;

  return (
    <div
      className="card-base rounded-2xl p-5 relative overflow-hidden group"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{
        background: 'linear-gradient(90deg, #1B5E20, #4CAF50, #66BB6A)',
        opacity: 0.5,
      }} />

      {/* Icon floating */}
      <div className="absolute top-4 left-4 w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-green"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 60%, #43A047 100%)', boxShadow: '0 4px 16px rgba(46,125,50,0.3)' }}
      >
        {kpi.icon}
      </div>

      <div className="pt-1">
        <p className="text-[0.7rem] text-slate-400 uppercase tracking-wider font-bold mb-3">{kpi.label}</p>
        <div className="flex items-end justify-between gap-2">
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{kpi.value}</span>
        </div>
        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${tone.bg} ${tone.text} ${tone.border} border`}>
          <TrendingUpIcon sx={{ fontSize: 13 }} />
          {kpi.trend}
        </div>
        {kpi.path && (
          <button
            onClick={() => navigate(kpi.path)}
            className="mt-3 flex items-center gap-1.5 text-green-700 text-xs font-bold bg-transparent border-none cursor-pointer p-0 font-cairo hover:gap-2.5 transition-all duration-200 group/link"
          >
            <span>التفاصيل</span>
            <KeyboardArrowLeft sx={{ fontSize: 15 }} className="transition-transform duration-200 group-hover/link:-translate-x-1" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Alert Card ─────────────────────────────────────────────────────────── */
function AlertCard({ alert, navigate, index }) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-green-50/30 hover:border-green-100 transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse-soft" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 m-0 truncate">{alert.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 m-0">{alert.status}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {alert.amount && (
          <span className="badge-green text-[0.65rem]">{alert.amount}</span>
        )}
        <button
          onClick={() => navigate(alert.path)}
          className="w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer transition-all duration-200 bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm active:scale-95"
        >
          <KeyboardArrowLeft sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

/* ─── Module Card (Enhanced) ─────────────────────────────────────────────── */
function ModuleGroupCard({ group, navigate, index }) {
  const isGreen = group.accent === 'green';
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? group.items : group.items.slice(0, 4);
  const hasMore = group.items.length > 4;

  return (
    <div
      className="card-base rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Card header */}
      <div className={`px-5 py-4 flex items-center justify-between ${
        isGreen ? 'bg-gradient-to-l from-green-50/80 to-transparent' : 'bg-gradient-to-l from-amber-50/80 to-transparent'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{group.emoji}</span>
          <div>
            <h4 className="text-sm font-bold text-slate-800 m-0">{group.title}</h4>
            <p className="text-[0.68rem] text-slate-400 mt-0.5 m-0">{group.items.length} نظام فرعي</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold ${
          isGreen ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {group.items.length}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 pb-4 pt-2 space-y-1.5">
        {displayItems.map((item) => (
          <button
            key={item.title}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[0.8125rem] font-medium border cursor-pointer font-cairo transition-all duration-200 group/item ${
              isGreen
                ? 'border-green-100/80 text-green-800 bg-green-50/40 hover:bg-green-100/60 hover:border-green-200 hover:shadow-sm'
                : 'border-amber-100/80 text-amber-800 bg-amber-50/40 hover:bg-amber-100/60 hover:border-amber-200 hover:shadow-sm'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className={`${isGreen ? 'text-green-600' : 'text-amber-600'} transition-transform duration-200 group-hover/item:scale-110`}>
                {item.icon}
              </span>
              {item.title}
            </span>
            <OpenInNewIcon sx={{ fontSize: 13 }} className="opacity-0 group-hover/item:opacity-40 transition-opacity duration-200" />
          </button>
        ))}

        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`w-full py-2 rounded-lg text-xs font-semibold border-none cursor-pointer font-cairo transition-all duration-200 ${
              isGreen ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'
            } bg-transparent`}
          >
            {expanded ? 'عرض أقل ▲' : `عرض الكل (${group.items.length}) ▼`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Time greeting ──────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  return 'مساء النور';
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
const Home = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { kpis: reportsKPIs } = useRealTimeKPIs('reports');
  const { kpis: financeKPIs } = useRealTimeKPIs('finance');
  const { kpis: hrKPIs } = useRealTimeKPIs('hr');
  const { kpis: securityKPIs } = useRealTimeKPIs('security');

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        await dashboardAPI.getSummary();
        setError(null);
      } catch (_err) {
        showSnackbar('حدث خطأ أثناء تحميل بيانات الصفحة الرئيسية', 'error');
        setError(null);
      }
    };
    fetchHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    const getKPI = (mockKPI, realtimeKPIs, icon) => {
      if (realtimeKPIs?.length > 0) return { ...realtimeKPIs[0], icon, path: mockKPI.path };
      return { ...mockKPI, icon, path: mockKPI.path };
    };
    return [
      getKPI(moduleMocks.reports.kpis[0], reportsKPIs, <QueryStatsIcon sx={{ fontSize: 22 }} className="text-white" />),
      getKPI(moduleMocks.finance.kpis[0], financeKPIs, <TrendingUpIcon sx={{ fontSize: 22 }} className="text-white" />),
      getKPI(moduleMocks.hr.kpis[0], hrKPIs, <AccessTimeIcon sx={{ fontSize: 22 }} className="text-white" />),
      getKPI(moduleMocks.security.kpis[0], securityKPIs, <ShieldIcon sx={{ fontSize: 22 }} className="text-white" />),
    ];
  }, [reportsKPIs, financeKPIs, hrKPIs, securityKPIs]);

  const alerts = useMemo(() => [
    { ...moduleMocks.security.items[0], path: '/security' },
    { ...moduleMocks.finance.items[1], path: '/finance' },
    { ...moduleMocks.rehab.items[2], path: '/rehab' },
    { ...moduleMocks.crm.items[0], path: '/crm' },
  ], []);

  const handleQuickLink = useCallback((path) => navigate(path), [navigate]);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">

      {/* ═══ Hero Banner ═══ */}
      <div className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0d3d12 0%, #1B5E20 30%, #2e7d32 60%, #388E3C 100%)',
      }}>
        {/* Decorative blobs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10 animate-blob"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 60%)' }} />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-10 animate-blob"
          style={{ background: 'radial-gradient(circle, rgba(102,187,106,0.5), transparent 60%)', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full opacity-[0.06] animate-float"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }} />

        {/* Noise overlay */}
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.12] backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner transition-transform duration-300 hover:scale-105">
                <HomeIcon sx={{ fontSize: 32 }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/50 text-sm">{getGreeting()} 👋</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold m-0 tracking-tight">
                  الصفحة الرئيسية
                </h1>
                <p className="text-white/60 text-sm mt-1 m-0">
                  نظام مراكز الأوائل للرعاية النهارية — لوحة التحكم الموحدة
                </p>
              </div>
            </div>

            {/* Date/Time card */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm">
              <CalendarIcon sx={{ fontSize: 20 }} className="text-white/50" />
              <div>
                <p className="text-white/90 text-sm font-bold m-0">
                  {currentTime.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-white/40 text-xs m-0 mt-px">
                  {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick action chips */}
          <div className="flex flex-wrap gap-2 mt-5">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleQuickLink(link.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer font-cairo transition-all duration-200 backdrop-blur-sm active:scale-95 ${
                  link.variant === 'primary'
                    ? 'bg-white text-green-800 border-white/90 hover:bg-white/90 shadow-lg shadow-black/10'
                    : link.variant === 'gold'
                    ? 'bg-amber-400/20 text-amber-100 border-amber-400/30 hover:bg-amber-400/30'
                    : 'bg-white/[0.08] text-white/80 border-white/15 hover:bg-white/15 hover:text-white'
                }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-in">
          <ErrorOutlineIcon sx={{ fontSize: 20 }} />
          <span>{error} — يتم استخدام البيانات التجريبية</span>
        </div>
      )}

      {/* ═══ KPI Section ═══ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{
              background: 'linear-gradient(135deg, #1B5E20, #2e7d32)',
              boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
            }}>
              <BoltIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">مؤشرات الأداء</h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">بيانات لحظية من جميع الأنظمة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[0.7rem] text-slate-400 font-medium">
              {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <KPICard key={kpi.label} kpi={kpi} navigate={navigate} index={idx} />
          ))}
        </div>
      </section>

      {/* ═══ Quick Alerts ═══ */}
      <section className="card-base rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
              <SparkleIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 m-0">تنبيهات سريعة</h3>
              <p className="text-xs text-slate-400 mt-0.5 m-0">الأمن، المالية، والرعاية</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 cursor-pointer flex items-center gap-1 hover:bg-green-100 transition-all duration-200 font-cairo self-start"
          >
            عرض الكل
            <KeyboardArrowLeft sx={{ fontSize: 14 }} />
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert, idx) => (
            <AlertCard key={`${alert.title}-${idx}`} alert={alert} navigate={navigate} index={idx} />
          ))}
        </div>
      </section>

      {/* ═══ Module Grid ═══ */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{
              background: 'linear-gradient(135deg, #1B5E20, #2e7d32)',
              boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
            }}>
              <AccountTreeIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">الأنظمة المتاحة</h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">{moduleGroups.reduce((t, g) => t + g.items.length, 0)} نظام فرعي في {moduleGroups.length} مجموعات</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {moduleGroups.map((group, idx) => (
            <ModuleGroupCard key={group.title} group={group} navigate={navigate} index={idx} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
