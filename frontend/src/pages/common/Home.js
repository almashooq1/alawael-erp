/**
 * Home — الصفحة الرئيسية (Tailwind)
 * Dashboard home with KPIs, quick alerts, module grid
 */
import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/icons-material';
import moduleMocks from 'data/moduleMocks';
import { useRealTimeKPIs } from 'contexts/SocketContext';
import { dashboardAPI } from 'services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ─── Module groups ──────────────────────────────────────────────────────── */
const moduleGroups = [
  {
    title: 'التشغيل والقياس',
    accent: 'green',
    items: [
      { title: 'لوحة التشغيل', path: '/dashboard', icon: <AccountTreeIcon sx={{ fontSize: 20 }} /> },
      { title: 'التقارير والتحليلات', path: '/reports', icon: <QueryStatsIcon sx={{ fontSize: 20 }} /> },
      { title: 'النشاط اللحظي', path: '/activity', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الأعمال والمالية',
    accent: 'amber',
    items: [
      { title: 'إدارة علاقات العملاء', path: '/crm', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
      { title: 'المالية والمحاسبة', path: '/finance', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
      { title: 'المشتريات والمخزون', path: '/procurement', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الموارد والفرق',
    accent: 'green',
    items: [
      { title: 'الموارد البشرية', path: '/hr', icon: <GroupsIcon sx={{ fontSize: 20 }} /> },
      { title: 'الحضور والإجازات', path: '/attendance', icon: <AccessTimeIcon sx={{ fontSize: 20 }} /> },
      { title: 'الرواتب', path: '/payroll', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'التعلم والرعاية',
    accent: 'amber',
    items: [
      { title: 'التعلم الإلكتروني', path: '/elearning', icon: <ScienceIcon sx={{ fontSize: 20 }} /> },
      { title: 'الجلسات والمواعيد', path: '/sessions', icon: <AccessTimeIcon sx={{ fontSize: 20 }} /> },
      { title: 'إعادة التأهيل والعلاج', path: '/rehab', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الأمن والتشغيل',
    accent: 'green',
    items: [
      { title: 'الأمن والحماية', path: '/security', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'المراقبة والكاميرات', path: '/surveillance', icon: <ShieldIcon sx={{ fontSize: 20 }} /> },
      { title: 'الصيانة والتشغيل', path: '/operations', icon: <SupportAgentIcon sx={{ fontSize: 20 }} /> },
    ],
  },
  {
    title: 'الميزات المؤسسية الاحترافية',
    accent: 'amber',
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
    title: 'الميزات المؤسسية المتقدمة',
    accent: 'green',
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
    title: 'الحلول المؤسسية الفائقة',
    accent: 'amber',
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

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KPICard({ kpi, navigate }) {
  const toneColor =
    kpi.tone === 'error'
      ? 'text-red-500'
      : kpi.tone === 'warning'
      ? 'text-amber-500'
      : 'text-emerald-500';

  const toneBg =
    kpi.tone === 'error'
      ? 'bg-red-500/10'
      : kpi.tone === 'warning'
      ? 'bg-amber-500/10'
      : 'bg-green-600/10';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-60"
        style={{ background: 'linear-gradient(90deg, #1B5E20, #4CAF50, #66BB6A)' }}
      />

      {/* Icon */}
      <div
        className={`absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-white ${toneBg}`}
        style={{ background: 'linear-gradient(135deg, #1B5E20, #2e7d32)' }}
      >
        {kpi.icon}
      </div>

      <div className="pt-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">
          {kpi.label}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-slate-800">{kpi.value}</span>
        </div>
        <p className={`text-sm mt-1 font-medium ${toneColor}`}>{kpi.trend}</p>
        {kpi.path && (
          <button
            onClick={() => navigate(kpi.path)}
            className="mt-3 text-green-700 text-sm font-semibold bg-transparent border-none cursor-pointer flex items-center gap-1 hover:gap-2 transition-all duration-200 font-cairo p-0"
          >
            فتح
            <ArrowForwardIcon sx={{ fontSize: 14 }} className="-scale-x-100" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Alert Card ─────────────────────────────────────────────────────────── */
function AlertCard({ alert, navigate }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors group">
      <div>
        <p className="text-sm font-semibold text-slate-800 m-0">{alert.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 m-0">{alert.status}</p>
      </div>
      <div className="flex items-center gap-2">
        {alert.amount && (
          <span className="px-2 py-0.5 text-xs font-semibold border border-green-600/20 text-green-700 rounded-full bg-green-50">
            {alert.amount}
          </span>
        )}
        <button
          onClick={() => navigate(alert.path)}
          className="w-8 h-8 rounded-lg bg-green-50 text-green-700 border-none cursor-pointer flex items-center justify-center hover:bg-green-100 transition-colors"
        >
          <ArrowForwardIcon sx={{ fontSize: 16 }} className="-scale-x-100" />
        </button>
      </div>
    </div>
  );
}

/* ─── Module Group Card ──────────────────────────────────────────────────── */
function ModuleGroupCard({ group, navigate }) {
  const isGreen = group.accent === 'green';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${
            isGreen
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {group.title}
        </span>
        <div className="space-y-2">
          {group.items.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border cursor-pointer font-cairo transition-all duration-200 ${
                isGreen
                  ? 'border-green-100 text-green-800 bg-green-50/50 hover:bg-green-100/70 hover:border-green-200'
                  : 'border-amber-100 text-amber-800 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={isGreen ? 'text-green-600' : 'text-amber-600'}>
                  {item.icon}
                </span>
                {item.title}
              </span>
              <ArrowForwardIcon sx={{ fontSize: 16 }} className="-scale-x-100 opacity-40" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
const Home = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [error, setError] = useState(null);

  const { kpis: reportsKPIs } = useRealTimeKPIs('reports');
  const { kpis: financeKPIs } = useRealTimeKPIs('finance');
  const { kpis: hrKPIs } = useRealTimeKPIs('hr');
  const { kpis: securityKPIs } = useRealTimeKPIs('security');

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
      if (realtimeKPIs?.length > 0) {
        return { ...realtimeKPIs[0], icon, path: mockKPI.path };
      }
      return { ...mockKPI, icon, path: mockKPI.path };
    };
    return [
      getKPI(moduleMocks.reports.kpis[0], reportsKPIs, <QueryStatsIcon sx={{ fontSize: 22 }} className="text-white" />),
      getKPI(moduleMocks.finance.kpis[0], financeKPIs, <TrendingUpIcon sx={{ fontSize: 22 }} className="text-white" />),
      getKPI(moduleMocks.hr.kpis[0], hrKPIs, <AccessTimeIcon sx={{ fontSize: 22 }} className="text-white" />),
      getKPI(moduleMocks.security.kpis[0], securityKPIs, <ShieldIcon sx={{ fontSize: 22 }} className="text-white" />),
    ];
  }, [reportsKPIs, financeKPIs, hrKPIs, securityKPIs]);

  const alerts = useMemo(
    () => [
      { ...moduleMocks.security.items[0], path: '/security' },
      { ...moduleMocks.finance.items[1], path: '/finance' },
      { ...moduleMocks.rehab.items[2], path: '/rehab' },
      { ...moduleMocks.crm.items[0], path: '/crm' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 50%, #388E3C 100%)' }}
      >
        <div
          className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)' }}
        />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <HomeIcon sx={{ fontSize: 30 }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0">الصفحة الرئيسية</h1>
            <p className="text-white/80 text-sm mt-1 m-0">
              مرحباً بك في نظام مراكز الأوائل للرعاية النهارية
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <ErrorOutlineIcon sx={{ fontSize: 20 }} />
          {error} - يتم استخدام البيانات التجريبية
        </div>
      )}

      {/* Quick Control Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 mb-3">
          تحكم موحّد
        </span>
        <h2 className="text-2xl font-bold text-slate-800 mb-2 mt-0">
          كل الأنظمة في لوحة واحدة
        </h2>
        <p className="text-slate-500 text-sm max-w-2xl mb-4">
          تنقّل سريع بين التشغيل، الأعمال، الموارد، التعلم، والأمن. استخدم الروابط السريعة أدناه
          للوصول إلى كل نظام أو ابدأ من التقارير الموحدة.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white border-none cursor-pointer flex items-center gap-2 transition-all duration-200 hover:shadow-lg font-cairo"
            style={{ background: 'linear-gradient(135deg, #1B5E20, #2e7d32)' }}
          >
            التقارير الذكية
            <ArrowForwardIcon sx={{ fontSize: 16 }} className="-scale-x-100" />
          </button>
          <button
            onClick={() => navigate('/crm')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-transparent border-2 border-amber-300 cursor-pointer transition-all duration-200 hover:bg-amber-50 font-cairo"
          >
            افتح CRM
          </button>
          <button
            onClick={() => navigate('/security')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-green-700 bg-transparent border-2 border-green-300 cursor-pointer transition-all duration-200 hover:bg-green-50 font-cairo"
          >
            مركز الأمان
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 m-0">مؤشرات الأداء الرئيسية</h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* Quick Alerts */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 m-0">تنبيهات سريعة</h3>
            <p className="text-sm text-slate-500 mt-1 m-0">
              مزيج من الأمن، المالية، والرعاية لمراجعة عاجلة.
            </p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-sm font-semibold text-green-700 bg-transparent border-none cursor-pointer flex items-center gap-1 hover:gap-2 transition-all duration-200 font-cairo self-start"
          >
            عرض التفاصيل
            <ArrowForwardIcon sx={{ fontSize: 14 }} className="-scale-x-100" />
          </button>
        </div>
        <div className="h-px bg-slate-100 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert, idx) => (
            <AlertCard key={`${alert.title}-${idx}`} alert={alert} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* Module Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 m-0">الأنظمة المتاحة</h3>
            <p className="text-sm text-slate-500 mt-1 m-0">
              اختر النظام للوصول السريع إلى أهم الصفحات والإجراءات.
            </p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-sm font-semibold text-green-700 bg-transparent border-none cursor-pointer flex items-center gap-1 hover:gap-2 transition-all duration-200 font-cairo self-start"
          >
            عرض التقارير الموحدة
            <ArrowForwardIcon sx={{ fontSize: 14 }} className="-scale-x-100" />
          </button>
        </div>
        <div className="h-px bg-slate-100 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleGroups.map((group) => (
            <ModuleGroupCard key={group.title} group={group} navigate={navigate} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
