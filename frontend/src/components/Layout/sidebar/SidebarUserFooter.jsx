/**
 * SidebarUserFooter — تذييل المستخدم (Enhanced)
 * Glass card avatar + animated online badge + floating menu
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


import { useAuth } from 'contexts/AuthContext';

export default function SidebarUserFooter({ collapsed }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth() || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = currentUser?.name || currentUser?.username || 'مدير النظام';
  const displayRole = currentUser?.role || 'مدير';
  const displayEmail = currentUser?.email || '';
  const avatarLetter = displayName.charAt(0) || 'م';

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try { await logout?.(); } catch (_) { /* ignore */ }
    navigate('/login');
  };

  return (
    <>
      {/* Separator gradient */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-green-500/25 to-transparent" />

      <div
        className={`flex items-center min-h-[68px] transition-all duration-300 ${
          collapsed ? 'justify-center p-3 gap-0' : 'justify-start p-4 gap-3'
        }`}
        style={{ background: 'linear-gradient(135deg, rgba(10,22,40,0.5) 0%, rgba(13,27,42,0.7) 100%)' }}
      >
        {/* Avatar with animated ring */}
        <div className="relative flex-shrink-0 group" title={collapsed ? `${displayName} — ${displayRole}` : undefined}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white/10 transition-all duration-300 group-hover:scale-105 group-hover:border-green-500/40"
            style={{
              background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 60%, #43A047 100%)',
              boxShadow: '0 4px 16px rgba(46,125,50,0.4)',
            }}
          >
            {avatarLetter}
          </div>
          {/* Animated online indicator */}
          <span className="absolute bottom-0 left-0">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-40 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-navy-900"
              style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
            />
          </span>
        </div>

        {/* User info */}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 font-semibold text-[0.82rem] leading-tight truncate m-0">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="badge-green text-[0.6rem]">{displayRole}</span>
              </div>
            </div>

            {/* Options button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title="خيارات"
                className={`flex-shrink-0 w-8 h-8 rounded-[10px] border border-white/[0.06] flex items-center justify-center bg-white/[0.03] cursor-pointer transition-all duration-200 hover:bg-white/[0.08] hover:border-green-500/30 hover:text-white active:scale-95 ${
                  menuOpen ? 'text-white bg-white/[0.08] border-green-500/30' : 'text-white/30'
                }`}
              >
                {menuOpen ? (
                  <KeyboardArrowUp sx={{ fontSize: 16 }} />
                ) : (
                  <MoreIcon sx={{ fontSize: 15 }} />
                )}
              </button>

              {/* Floating menu */}
              {menuOpen && (
                <div
                  className="absolute bottom-full mb-3 left-0 w-[220px] rounded-2xl border border-white/[0.08] overflow-hidden z-[9999] animate-scale-in origin-bottom-left"
                  style={{
                    backgroundColor: '#0C1829',
                    boxShadow: '0 -12px 48px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* User header in menu */}
                  <div className="px-4 py-3.5 flex items-center gap-3 bg-gradient-to-r from-green-900/20 via-green-800/10 to-transparent border-b border-white/[0.06]">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #1B5E20, #2e7d32)',
                        boxShadow: '0 2px 10px rgba(46,125,50,0.35)',
                      }}
                    >
                      {avatarLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8rem] font-bold text-white truncate m-0">{displayName}</p>
                      {displayEmail && (
                        <p className="text-[0.65rem] text-white/30 mt-0.5 truncate m-0">{displayEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.8rem] text-white/60 bg-transparent border-none cursor-pointer font-cairo hover:bg-white/[0.06] hover:text-white transition-all duration-150"
                    >
                      <AccountCircleOutlined sx={{ fontSize: 17 }} className="text-white/40" />
                      الملف الشخصي
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.8rem] text-white/60 bg-transparent border-none cursor-pointer font-cairo hover:bg-white/[0.06] hover:text-white transition-all duration-150"
                    >
                      <SettingsOutlined sx={{ fontSize: 17 }} className="text-white/40" />
                      الإعدادات
                    </button>
                  </div>

                  <div className="mx-3 h-px bg-white/[0.06]" />

                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.8rem] text-rose-400 bg-transparent border-none cursor-pointer font-cairo hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-150"
                    >
                      <LogoutOutlined sx={{ fontSize: 17 }} />
                      <span className="font-semibold">تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
