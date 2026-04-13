/**
 * ProHeader — الهيدر الاحترافي (Enhanced)
 * Premium glassmorphism header with animated dropdowns, micro-interactions
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  NotificationsOutlined,
  DarkModeOutlined,
  LightModeOutlined,
  LanguageOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  KeyboardArrowDown,
  AccountCircleOutlined,
  SettingsOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  WarningAmberOutlined,
  InfoOutlined,
  NavigateNext,
  Home as HomeIcon,
  CloseOutlined,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';

/* ─── Breadcrumb map ─────────────────────────────────────────────────────── */
const routeLabels = {
  '/': 'الرئيسية',
  '/dashboard': 'لوحة القيادة',
  '/beneficiaries': 'المستفيدون',
  '/hr': 'الموارد البشرية',
  '/finance': 'المالية',
  '/rehab': 'التأهيل',
  '/documents': 'الوثائق',
  '/reports': 'التقارير',
  '/settings': 'الإعدادات',
  '/admin': 'إدارة النظام',
  '/crm': 'إدارة العلاقات',
  '/security': 'الأمن',
  '/attendance': 'الحضور',
  '/payroll': 'الرواتب',
  '/elearning': 'التعلم',
  '/profile': 'الملف الشخصي',
};
const getLabel = (seg) =>
  routeLabels[`/${seg}`] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ─── Notifications ──────────────────────────────────────────────────────── */
const MOCK_NOTIFS = [
  { id: 1, type: 'success', title: 'تم قبول المستفيد', body: 'تم قبول طلب تسجيل أحمد المطيري بنجاح', time: 'منذ 5 دقائق', read: false },
  { id: 2, type: 'warning', title: 'موعد قريب', body: 'جلسة تأهيل السيد خالد العمري بعد ساعة', time: 'منذ 20 دقيقة', read: false },
  { id: 3, type: 'info', title: 'تقرير شهري جاهز', body: 'تم إنشاء تقرير إحصاءات مارس 2026', time: 'منذ ساعة', read: true },
  { id: 4, type: 'success', title: 'راتب شهر مارس', body: 'تمت معالجة مسير الرواتب لـ 48 موظف', time: 'منذ 3 ساعات', read: true },
];

const notifMeta = {
  success: { icon: <CheckCircleOutlined sx={{ fontSize: 17 }} />, iconCls: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'border-emerald-200' },
  warning: { icon: <WarningAmberOutlined sx={{ fontSize: 17 }} />, iconCls: 'text-amber-500', bg: 'bg-amber-50', ring: 'border-amber-200' },
  info: { icon: <InfoOutlined sx={{ fontSize: 17 }} />, iconCls: 'text-sky-500', bg: 'bg-sky-50', ring: 'border-sky-200' },
};

/* ─── Icon button ────────────────────────────────────────────────────────── */
function HBtn({ children, title, onClick, badge, active, className = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center border border-transparent cursor-pointer transition-all duration-200 ${
        active
          ? 'bg-green-600/10 text-green-700 border-green-500/20'
          : 'bg-transparent text-slate-400 dark:text-white/50 hover:bg-green-600/[0.06] hover:text-green-700 dark:hover:bg-white/[0.06] dark:hover:text-white hover:border-green-500/10'
      } hover:-translate-y-px active:translate-y-0 active:scale-95 ${className}`}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white animate-bounce-in"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            boxShadow: '0 2px 8px rgba(239,68,68,0.4), 0 0 0 2px white',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function ProHeader({ onToggleSidebar, sidebarCollapsed, themeMode: _themeMode, onToggleTheme }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth() || {};

  const isDark = theme.palette.mode === 'dark';
  const sb = theme.custom?.sidebar || {};
  const HEADER_HEIGHT = 64;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg, idx, arr) => ({
      label: getLabel(seg),
      path: '/' + arr.slice(0, idx + 1).join('/'),
      isLast: idx === arr.length - 1,
    }));

  const handleMarkAllRead = useCallback(() => {
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false);
    try { await logout?.(); } catch (_) { /* */ }
    navigate('/login');
  }, [logout, navigate]);

  const displayName = currentUser?.name || currentUser?.username || 'مدير النظام';
  const displayRole = currentUser?.role || 'مدير';
  const avatarLetter = displayName.charAt(0) || 'م';

  const headerWidthStyle = isMobile
    ? { width: '100%' }
    : { width: `calc(100% - ${sidebarCollapsed ? (sb.collapsedWidth || 72) : (sb.width || 280)}px)` };

  return (
    <header
      className={`fixed top-0 z-[1100] transition-all duration-300 ${isDark ? 'text-white' : 'text-slate-900'}`}
      style={{
        ...headerWidthStyle,
        height: HEADER_HEIGHT,
        background: isDark ? 'rgba(11,17,32,0.85)' : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.03), 0 4px 30px rgba(0,0,0,0.25)'
          : '0 1px 0 rgba(46,125,50,0.04), 0 4px 30px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, #1B5E20 0%, #2e7d32 30%, #4CAF50 50%, #66BB6A 70%, #4CAF50 100%)',
        opacity: 0.8,
      }} />

      <div className="flex items-center h-full gap-1 px-3 md:px-5" style={{ paddingTop: 2 }}>
        {/* Mobile menu */}
        {isMobile && (
          <HBtn title="القائمة" onClick={onToggleSidebar} className="ml-1">
            <MenuIcon sx={{ fontSize: 20 }} />
          </HBtn>
        )}

        {/* Breadcrumbs */}
        {!searchOpen && (
          <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              title="الرئيسية"
              className={`w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer bg-transparent transition-all duration-200 ${
                crumbs.length === 0 ? 'text-green-700' : isDark ? 'text-white/40' : 'text-slate-400'
              } hover:bg-green-600/[0.06] hover:text-green-700`}
            >
              <HomeIcon sx={{ fontSize: 17 }} />
            </button>

            {crumbs.map((crumb) => (
              <div key={crumb.path} className="flex items-center gap-1">
                <NavigateNext sx={{ fontSize: 14 }} className={`${isDark ? 'text-white/15' : 'text-slate-200'} -scale-x-100`} />
                {crumb.isLast ? (
                  <span className={`text-[0.8125rem] font-semibold px-2 py-1 rounded-lg max-w-[150px] truncate ${isDark ? 'text-white bg-white/[0.05]' : 'text-slate-800 bg-slate-50'}`}>
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`text-[0.8125rem] px-1.5 py-0.5 rounded-md bg-transparent border-none cursor-pointer font-cairo max-w-[130px] truncate transition-all duration-150 ${isDark ? 'text-white/35' : 'text-slate-400'} hover:text-green-700 hover:bg-green-600/[0.05]`}
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}

            {crumbs.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                background: isDark ? 'rgba(46,125,50,0.08)' : 'rgba(46,125,50,0.06)',
                border: `1px solid ${isDark ? 'rgba(46,125,50,0.15)' : 'rgba(46,125,50,0.1)'}`,
              }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse-soft" />
                <span className="text-green-700 dark:text-green-400 font-semibold text-[0.8rem]">لوحة القيادة</span>
              </div>
            )}
          </div>
        )}

        {/* Expanded search bar */}
        {searchOpen && (
          <div className={`flex-1 flex items-center gap-2.5 px-4 h-[42px] rounded-xl border-[1.5px] transition-all duration-200 ${
            isDark ? 'bg-green-700/8 border-green-600/30' : 'bg-green-50/40 border-green-500/25'
          }`} style={{ boxShadow: '0 0 0 4px rgba(46,125,50,0.06)' }}>
            <SearchIcon sx={{ fontSize: 17 }} className="text-green-600 flex-shrink-0" />
            <input
              autoFocus
              placeholder="ابحث في النظام... (ESC للإغلاق)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
              className={`flex-1 bg-transparent border-none outline-none text-sm p-0 font-cairo ${isDark ? 'text-white' : 'text-slate-800'} placeholder:text-slate-400`}
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className={`p-1 rounded-lg border-none cursor-pointer bg-transparent ${isDark ? 'text-white/30' : 'text-slate-400'} hover:bg-green-600/10 hover:text-green-700 transition-all`}>
              <CloseOutlined sx={{ fontSize: 14 }} />
            </button>
          </div>
        )}

        <div className="flex-grow" />

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {/* Search trigger */}
          {!searchOpen && (
            <button
              onClick={() => setSearchOpen(true)}
              title="بحث (Ctrl+K)"
              className={`hidden sm:flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl h-9 border bg-transparent transition-all duration-200 font-cairo ${
                isDark ? 'border-white/8 text-white/40' : 'border-slate-200 text-slate-400'
              } hover:bg-green-600/[0.05] hover:border-green-500/25 hover:text-green-700`}
            >
              <SearchIcon sx={{ fontSize: 15 }} />
              <span className="hidden md:inline text-[0.8rem]">بحث...</span>
              <span className={`hidden lg:flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-mono border ${
                isDark ? 'bg-white/5 border-white/8 text-white/30' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>⌘K</span>
            </button>
          )}

          <HBtn title="تغيير اللغة" onClick={() => {}}>
            <LanguageOutlined sx={{ fontSize: 18 }} />
          </HBtn>

          <HBtn title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'} onClick={onToggleTheme}>
            {isDark ? <LightModeOutlined sx={{ fontSize: 18 }} className="text-amber-400" /> : <DarkModeOutlined sx={{ fontSize: 18 }} />}
          </HBtn>

          <HBtn title={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'} onClick={handleToggleFullscreen} className="hidden md:flex">
            {fullscreen ? <FullscreenExitOutlined sx={{ fontSize: 18 }} /> : <FullscreenOutlined sx={{ fontSize: 18 }} />}
          </HBtn>

          {/* ── Notifications ── */}
          <div className="relative" ref={notifRef}>
            <HBtn title="الإشعارات" onClick={() => setNotifOpen((v) => !v)} badge={unreadCount} active={notifOpen}>
              <NotificationsOutlined sx={{ fontSize: 18 }} />
            </HBtn>

            {notifOpen && (
              <div
                className={`absolute top-full mt-2.5 w-[380px] max-h-[520px] rounded-2xl border overflow-hidden flex flex-col z-50 animate-scale-in origin-top ${
                  isDark ? 'border-white/[0.06]' : 'border-slate-200'
                }`}
                style={{
                  insetInlineStart: 0,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.5)' : '0 24px 80px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header */}
                <div className={`px-5 py-4 flex items-center justify-between border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}
                  style={{ background: isDark ? 'linear-gradient(135deg, rgba(46,125,50,0.1), transparent)' : 'linear-gradient(135deg, rgba(46,125,50,0.04), transparent)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #1B5E20, #4CAF50)', boxShadow: '0 4px 14px rgba(46,125,50,0.3)' }}>
                      <NotificationsOutlined sx={{ fontSize: 17 }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm m-0">الإشعارات</p>
                      {unreadCount > 0 && <p className={`text-[0.7rem] m-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{unreadCount} إشعار جديد</p>}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs px-2.5 py-1 rounded-lg text-green-600 font-semibold bg-transparent border-none cursor-pointer hover:bg-green-600/[0.06] transition-colors font-cairo">
                      تحديد الكل مقروء
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="overflow-auto flex-1 scrollbar-thin">
                  {notifs.map((n, idx) => {
                    const meta = notifMeta[n.type] || notifMeta.info;
                    return (
                      <div
                        key={n.id}
                        onClick={() => setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                        className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer relative transition-all duration-200 ${
                          !n.read ? (isDark ? 'bg-green-700/[0.04]' : 'bg-green-50/40') : 'bg-transparent'
                        } ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'} ${
                          idx < notifs.length - 1 ? (isDark ? 'border-b border-white/[0.04]' : 'border-b border-slate-100') : ''
                        }`}
                      >
                        {!n.read && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-glow-green-sm" />
                        )}
                        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center border ${meta.bg} ${meta.ring} ${meta.iconCls}`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[0.84rem] leading-relaxed m-0 ${n.read ? 'font-normal' : 'font-semibold'}`}>{n.title}</p>
                          <p className={`text-xs mt-0.5 m-0 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{n.body}</p>
                          <p className={`text-[0.68rem] mt-1 m-0 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>{n.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className={`px-4 py-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <button
                    onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                    className="btn-outline-green w-full justify-center py-2 text-[0.8rem]"
                  >
                    عرض كل الإشعارات
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-1.5" style={{
            background: isDark
              ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent)'
              : 'linear-gradient(180deg, transparent, #E2E8F0, transparent)',
          }} />

          {/* ── User Menu ── */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border border-transparent bg-transparent cursor-pointer transition-all duration-200 ${
                userMenuOpen
                  ? isDark ? 'bg-white/[0.06] border-white/10' : 'bg-green-50/50 border-green-500/15'
                  : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-sm font-bold transition-transform duration-200 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 100%)',
                    boxShadow: '0 2px 10px rgba(46,125,50,0.35)',
                    border: '2px solid rgba(255,255,255,0.9)',
                  }}
                >
                  {avatarLetter}
                </div>
                <span className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-500 border-[1.5px] border-white dark:border-navy-900" />
              </div>
              <div className="hidden md:block text-right min-w-0">
                <p className={`text-[0.8125rem] font-semibold leading-tight max-w-[100px] truncate m-0 ${isDark ? 'text-white' : 'text-slate-800'}`}>{displayName}</p>
                <p className={`text-[0.68rem] leading-tight m-0 ${isDark ? 'text-white/35' : 'text-slate-400'}`}>{displayRole}</p>
              </div>
              <KeyboardArrowDown sx={{ fontSize: 15 }} className={`hidden md:block transition-transform duration-200 ${isDark ? 'text-white/25' : 'text-slate-300'} ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div
                className={`absolute top-full mt-2.5 w-[240px] rounded-2xl border overflow-hidden z-50 animate-scale-in origin-top ${
                  isDark ? 'border-white/[0.06]' : 'border-slate-200'
                }`}
                style={{
                  insetInlineStart: 0,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.5)' : '0 24px 80px rgba(0,0,0,0.08)',
                }}
              >
                {/* User info */}
                <div className={`px-5 py-4 flex items-center gap-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}
                  style={{ background: isDark ? 'linear-gradient(135deg, rgba(46,125,50,0.1), transparent)' : 'linear-gradient(135deg, rgba(46,125,50,0.04), transparent)' }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, #1B5E20, #2e7d32)', boxShadow: '0 4px 14px rgba(46,125,50,0.35)', border: '2px solid rgba(255,255,255,0.9)' }}
                  >{avatarLetter}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate m-0">{displayName}</p>
                    <span className="badge-green mt-1 text-[0.6rem]">{displayRole}</span>
                  </div>
                </div>

                <div className="p-1.5">
                  <button onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm bg-transparent border-none cursor-pointer font-cairo transition-all duration-150 ${isDark ? 'text-white/60 hover:bg-white/[0.05] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <AccountCircleOutlined sx={{ fontSize: 17 }} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                    الملف الشخصي
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm bg-transparent border-none cursor-pointer font-cairo transition-all duration-150 ${isDark ? 'text-white/60 hover:bg-white/[0.05] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <SettingsOutlined sx={{ fontSize: 17 }} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                    الإعدادات
                  </button>
                </div>

                <div className={`mx-3 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`} />

                <div className="p-1.5">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-rose-500 bg-transparent border-none cursor-pointer font-cairo transition-all duration-150 hover:bg-rose-500/[0.06]"
                  >
                    <LogoutOutlined sx={{ fontSize: 17 }} />
                    <span className="font-semibold">تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
