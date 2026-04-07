/**
 * ProHeader — الهيدر الاحترافي (Tailwind)
 * Glassmorphism header: breadcrumbs, search, notifications, user menu
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
};
const getLabel = (seg) =>
  routeLabels[`/${seg}`] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ─── Mock notifications ─────────────────────────────────────────────────── */
const MOCK_NOTIFS = [
  { id: 1, type: 'success', title: 'تم قبول المستفيد', body: 'تم قبول طلب تسجيل أحمد المطيري بنجاح', time: 'منذ 5 دقائق', read: false },
  { id: 2, type: 'warning', title: 'موعد قريب', body: 'جلسة تأهيل السيد خالد العمري بعد ساعة', time: 'منذ 20 دقيقة', read: false },
  { id: 3, type: 'info', title: 'تقرير شهري جاهز', body: 'تم إنشاء تقرير إحصاءات مارس 2026', time: 'منذ ساعة', read: true },
  { id: 4, type: 'success', title: 'راتب شهر مارس', body: 'تمت معالجة مسير الرواتب لـ 48 موظف', time: 'منذ 3 ساعات', read: true },
];

const NOTIF_ICONS = {
  success: <CheckCircleOutlined sx={{ fontSize: 18 }} className="text-emerald-500" />,
  warning: <WarningAmberOutlined sx={{ fontSize: 18 }} className="text-amber-500" />,
  info: <InfoOutlined sx={{ fontSize: 18 }} className="text-sky-500" />,
};
const NOTIF_BG = { success: 'bg-emerald-50', warning: 'bg-amber-50', info: 'bg-sky-50' };
const NOTIF_RING = { success: 'border-emerald-500/20', warning: 'border-amber-500/20', info: 'border-sky-500/20' };

/* ─── Reusable header icon button ────────────────────────────────────────── */
function HBtn({ children, title, onClick, badge, className = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`relative w-[38px] h-[38px] rounded-[10px] flex items-center justify-center border-none cursor-pointer transition-all duration-200 bg-transparent text-slate-500 dark:text-white/60 hover:bg-green-600/[0.08] hover:text-green-700 dark:hover:bg-white/[0.08] dark:hover:text-white hover:-translate-y-px active:translate-y-0 ${className}`}
    >
      {children}
      {badge > 0 && (
        <span className="absolute top-[3px] right-[3px] min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[0.6rem] flex items-center justify-center font-bold shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#0F172A]">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ProHeader({ onToggleSidebar, sidebarCollapsed, themeMode: _themeMode, onToggleTheme }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth() || {};

  const isDark = theme.palette.mode === 'dark';
  const sb = theme.custom?.sidebar || {};
  const HEADER_HEIGHT = 64;

  // State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const searchRef = useRef(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Breadcrumbs
  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg, idx, arr) => ({
      label: getLabel(seg),
      path: '/' + arr.slice(0, idx + 1).join('/'),
      isLast: idx === arr.length - 1,
    }));

  // Handlers
  const handleMarkAllRead = useCallback(() => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
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
    try { await logout?.(); } catch (_) { /* ignore */ }
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
      className={`fixed top-0 z-[1100] transition-all duration-300 ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}
      style={{
        ...headerWidthStyle,
        height: HEADER_HEIGHT,
        background: isDark ? 'rgba(10,15,30,0.88)' : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px) saturate(200%)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(46,125,50,0.08)'}`,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)'
          : '0 1px 0 rgba(46,125,50,0.06), 0 4px 24px rgba(46,125,50,0.06)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
        style={{ background: 'linear-gradient(90deg, #1B5E20 0%, #4CAF50 50%, #66BB6A 100%)' }}
      />

      <div
        className="flex items-center h-full gap-1 px-3 md:px-6"
        style={{ paddingTop: 2 }}
      >
        {/* Mobile menu button */}
        {isMobile && (
          <HBtn title="القائمة" onClick={onToggleSidebar} className="ml-2">
            <MenuIcon sx={{ fontSize: 20 }} />
          </HBtn>
        )}

        {/* Breadcrumbs */}
        {!searchOpen && (
          <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              title="الرئيسية"
              className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center border-none cursor-pointer bg-transparent transition-all duration-200 ${
                crumbs.length === 0
                  ? 'text-green-700'
                  : isDark ? 'text-white/50' : 'text-slate-400'
              } hover:bg-green-600/[0.08] hover:text-green-700`}
            >
              <HomeIcon sx={{ fontSize: 16 }} />
            </button>

            {crumbs.map((crumb) => (
              <div key={crumb.path} className="flex items-center gap-1">
                <NavigateNext
                  sx={{ fontSize: 14 }}
                  className={`${isDark ? 'text-white/20' : 'text-slate-300'} -scale-x-100`}
                />
                {crumb.isLast ? (
                  <span
                    className={`text-[0.8125rem] font-semibold px-1.5 py-0.5 rounded-md max-w-[140px] truncate ${
                      isDark ? 'text-slate-100' : 'text-slate-800'
                    }`}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`text-[0.8125rem] font-normal px-1 py-0.5 rounded-md bg-transparent border-none cursor-pointer font-cairo max-w-[140px] truncate transition-all duration-150 ${
                      isDark ? 'text-white/45' : 'text-slate-400'
                    } hover:text-green-700 hover:bg-green-600/[0.06]`}
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}

            {crumbs.length === 0 && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-green-600/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-700" />
                <span className="text-green-700 font-semibold text-[0.8125rem]">لوحة القيادة</span>
              </div>
            )}
          </div>
        )}

        {/* Search bar (expanded) */}
        {searchOpen && (
          <div
            className={`flex-1 flex items-center gap-2 px-3 h-[42px] rounded-xl border-[1.5px] transition-all duration-200 ${
              isDark
                ? 'bg-green-700/10 border-green-600/40'
                : 'bg-green-50/50 border-green-500/35'
            }`}
            style={{ boxShadow: '0 0 0 4px rgba(46,125,50,0.08)' }}
          >
            <SearchIcon sx={{ fontSize: 18 }} className="text-green-700 flex-shrink-0" />
            <input
              autoFocus
              ref={searchRef}
              placeholder="ابحث في النظام... (اضغط ESC للإغلاق)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
              }}
              className={`flex-1 bg-transparent border-none outline-none text-sm p-0 font-cairo ${
                isDark ? 'text-slate-100' : 'text-slate-800'
              } placeholder:text-slate-400`}
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className={`p-1 rounded-md border-none cursor-pointer bg-transparent transition-colors ${
                isDark ? 'text-white/40' : 'text-slate-400'
              } hover:bg-green-600/10 hover:text-green-700`}
            >
              <CloseOutlined sx={{ fontSize: 15 }} />
            </button>
          </div>
        )}

        <div className="flex-grow" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Search trigger */}
          {!searchOpen && (
            <button
              onClick={() => setSearchOpen(true)}
              title="بحث (Ctrl+K)"
              className={`hidden sm:flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-[10px] h-9 border bg-transparent transition-all duration-200 font-cairo ${
                isDark
                  ? 'border-white/10 text-white/45'
                  : 'border-slate-200 text-slate-400'
              } hover:bg-green-600/[0.06] hover:border-green-600/30 hover:text-green-700`}
            >
              <SearchIcon sx={{ fontSize: 15 }} />
              <span className="hidden md:inline text-[0.8rem]">بحث...</span>
              <span
                className={`hidden lg:flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-mono border ${
                  isDark
                    ? 'bg-white/[0.08] border-white/10 text-white/40'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                ⌘K
              </span>
            </button>
          )}

          {/* Language toggle */}
          <HBtn title="تغيير اللغة" onClick={() => {}}>
            <LanguageOutlined sx={{ fontSize: 19 }} />
          </HBtn>

          {/* Theme toggle */}
          <HBtn
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            onClick={onToggleTheme}
          >
            {isDark ? (
              <LightModeOutlined sx={{ fontSize: 19 }} className="text-amber-400" />
            ) : (
              <DarkModeOutlined sx={{ fontSize: 19 }} />
            )}
          </HBtn>

          {/* Fullscreen */}
          <HBtn
            title={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            onClick={handleToggleFullscreen}
            className="hidden md:flex"
          >
            {fullscreen ? (
              <FullscreenExitOutlined sx={{ fontSize: 19 }} />
            ) : (
              <FullscreenOutlined sx={{ fontSize: 19 }} />
            )}
          </HBtn>

          {/* ── Notifications ──────────────────────────────────────────── */}
          <div className="relative" ref={notifRef}>
            <HBtn
              title="الإشعارات"
              onClick={() => setNotifOpen((v) => !v)}
              badge={unreadCount}
            >
              <NotificationsOutlined sx={{ fontSize: 19 }} />
            </HBtn>

            {notifOpen && (
              <div
                className={`absolute top-full mt-3 w-[370px] max-h-[500px] rounded-2xl border overflow-hidden flex flex-col z-50 ${
                  isDark
                    ? 'border-white/[0.08]'
                    : 'border-green-600/10'
                }`}
                style={{
                  insetInlineStart: 0,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  boxShadow: isDark
                    ? '0 20px 60px rgba(0,0,0,0.5)'
                    : '0 20px 60px rgba(46,125,50,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                {/* Header */}
                <div
                  className={`px-5 py-4 flex items-center justify-between border-b ${
                    isDark
                      ? 'border-white/[0.07]'
                      : 'border-green-600/[0.08]'
                  }`}
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(46,125,50,0.15) 0%, rgba(76,175,80,0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(46,125,50,0.06) 0%, rgba(76,175,80,0.04) 100%)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #1B5E20, #4CAF50)',
                        boxShadow: '0 4px 12px rgba(46,125,50,0.3)',
                      }}
                    >
                      <NotificationsOutlined sx={{ fontSize: 18 }} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm m-0">الإشعارات</p>
                      {unreadCount > 0 && (
                        <p className={`text-[0.7rem] m-0 ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                          {unreadCount} إشعار جديد
                        </p>
                      )}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs px-2.5 py-1 rounded-lg text-green-700 font-semibold bg-transparent border-none cursor-pointer hover:bg-green-600/[0.08] transition-colors font-cairo"
                    >
                      تحديد الكل
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="overflow-auto flex-1 py-2">
                  {notifs.map((n, idx) => (
                    <div
                      key={n.id}
                      onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                      className={`flex items-start gap-3 px-5 py-3 cursor-pointer relative transition-colors ${
                        !n.read
                          ? isDark ? 'bg-green-700/[0.06]' : 'bg-green-50/50'
                          : 'bg-transparent'
                      } hover:${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'} ${
                        idx < notifs.length - 1
                          ? isDark ? 'border-b border-white/[0.04]' : 'border-b border-slate-100'
                          : ''
                      }`}
                    >
                      {!n.read && (
                        <span
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-green-600"
                          style={{ boxShadow: '0 0 6px rgba(46,125,50,0.5)' }}
                        />
                      )}
                      <div
                        className={`w-[38px] h-[38px] rounded-full flex-shrink-0 flex items-center justify-center border-[1.5px] ${NOTIF_BG[n.type]} ${NOTIF_RING[n.type]}`}
                      >
                        {NOTIF_ICONS[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[0.84rem] leading-relaxed m-0 ${n.read ? 'font-normal' : 'font-semibold'}`}>
                          {n.title}
                        </p>
                        <p className={`text-xs mt-0.5 m-0 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                          {n.body}
                        </p>
                        <p className={`text-[0.68rem] mt-1 m-0 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className={`px-5 py-3 border-t ${isDark ? 'border-white/[0.07]' : 'border-slate-100'}`}>
                  <button
                    onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                    className={`w-full py-2 rounded-[10px] text-[0.8125rem] font-semibold border cursor-pointer bg-transparent transition-colors font-cairo ${
                      isDark
                        ? 'border-green-600/30 text-green-500 hover:border-green-500 hover:bg-green-600/[0.05]'
                        : 'border-green-600/25 text-green-700 hover:border-green-700 hover:bg-green-600/[0.05]'
                    }`}
                  >
                    عرض كل الإشعارات
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="w-px h-7 mx-1.5"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)'
                : 'linear-gradient(180deg, transparent, #E2E8F0, transparent)',
            }}
          />

          {/* ── User menu ──────────────────────────────────────────────── */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-2 py-1 rounded-xl border border-transparent bg-transparent cursor-pointer transition-all duration-200 ${
                isDark
                  ? 'hover:bg-white/[0.06] hover:border-white/10'
                  : 'hover:bg-green-600/[0.05] hover:border-green-600/15'
              }`}
            >
              <div
                className="w-[33px] h-[33px] rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white/90"
                style={{
                  background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 100%)',
                  boxShadow: '0 2px 8px rgba(46,125,50,0.4)',
                }}
              >
                {avatarLetter}
              </div>
              <div className="hidden md:block text-right min-w-0">
                <p
                  className={`text-[0.8125rem] font-semibold leading-tight max-w-[110px] truncate m-0 ${
                    isDark ? 'text-slate-100' : 'text-slate-800'
                  }`}
                >
                  {displayName}
                </p>
                <p className={`text-[0.7rem] leading-tight m-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  {displayRole}
                </p>
              </div>
              <KeyboardArrowDown
                sx={{ fontSize: 15 }}
                className={`hidden md:block transition-transform duration-200 ${
                  isDark ? 'text-white/35' : 'text-slate-300'
                } ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div
                className={`absolute top-full mt-3 w-[230px] rounded-2xl border overflow-hidden z-50 ${
                  isDark ? 'border-white/[0.08]' : 'border-green-600/10'
                }`}
                style={{
                  insetInlineStart: 0,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  boxShadow: isDark
                    ? '0 20px 60px rgba(0,0,0,0.5)'
                    : '0 20px 60px rgba(46,125,50,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                {/* User info header */}
                <div
                  className={`px-5 py-4 mb-1 flex items-center gap-3 border-b ${
                    isDark ? 'border-white/[0.07]' : 'border-green-600/[0.08]'
                  }`}
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(46,125,50,0.15) 0%, rgba(76,175,80,0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(46,125,50,0.06) 0%, rgba(76,175,80,0.04) 100%)',
                  }}
                >
                  <div
                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-bold border-2 border-white/90"
                    style={{
                      background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 100%)',
                      boxShadow: '0 4px 12px rgba(46,125,50,0.4)',
                    }}
                  >
                    {avatarLetter}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate m-0">{displayName}</p>
                    <span className="inline-block mt-0.5 px-2 py-px rounded text-[0.65rem] font-semibold bg-green-600/10 text-green-700 dark:text-green-400 border border-green-600/20">
                      {displayRole}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                  className={`w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-transparent border-none cursor-pointer font-cairo transition-colors ${
                    isDark ? 'text-white/70 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AccountCircleOutlined sx={{ fontSize: 17 }} className={isDark ? 'text-white/50' : 'text-slate-400'} />
                  الملف الشخصي
                </button>

                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                  className={`w-[calc(100%-8px)] mx-1 mb-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-transparent border-none cursor-pointer font-cairo transition-colors ${
                    isDark ? 'text-white/70 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <SettingsOutlined sx={{ fontSize: 17 }} className={isDark ? 'text-white/50' : 'text-slate-400'} />
                  الإعدادات
                </button>

                <div className={`mx-2 h-px ${isDark ? 'bg-white/[0.07]' : 'bg-slate-200'}`} />

                <button
                  onClick={handleLogout}
                  className="w-[calc(100%-8px)] mx-1 mt-1 mb-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-500 bg-transparent border-none cursor-pointer font-cairo transition-colors hover:bg-rose-500/[0.07]"
                >
                  <LogoutOutlined sx={{ fontSize: 17 }} />
                  <span className="font-semibold">تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
