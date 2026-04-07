/**
 * SidebarUserFooter — تذييل معلومات المستخدم (Tailwind)
 * Avatar + name/role + options menu (profile, settings, logout)
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SettingsOutlined,
  LogoutOutlined,
  MoreVert as MoreIcon,
  AccountCircleOutlined,
} from '@mui/icons-material';
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

  // Close menu on outside click
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
      {/* Gradient separator */}
      <div
        className="mx-4 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(46,125,50,0.35) 40%, rgba(76,175,80,0.35) 60%, transparent 100%)',
        }}
      />

      <div
        className={`flex items-center min-h-[64px] border-t border-white/[0.04] transition-all duration-300 ${
          collapsed ? 'justify-center p-3 gap-0' : 'justify-start p-4 gap-3'
        }`}
        style={{
          background:
            'linear-gradient(135deg, rgba(10,22,40,0.4) 0%, rgba(15,23,42,0.6) 100%)',
        }}
      >
        {/* Avatar */}
        <div
          className="relative flex-shrink-0"
          title={collapsed ? `${displayName} — ${displayRole}` : undefined}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white/10 transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 100%)',
              boxShadow: '0 2px 10px rgba(46,125,50,0.45)',
            }}
          >
            {avatarLetter}
          </div>
          {/* Online dot */}
          <span
            className="absolute bottom-[1px] left-[1px] w-[9px] h-[9px] rounded-full bg-emerald-500 border-[1.5px] border-[#0A1628]"
            style={{ boxShadow: '0 0 6px rgba(16,185,129,0.6)' }}
          />
        </div>

        {/* User info — hidden when collapsed */}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 font-semibold text-[0.8125rem] leading-tight truncate m-0">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-px rounded bg-green-700/[0.2] border border-green-600/25 text-green-300/90 text-[0.64rem] font-semibold tracking-wide inline-flex">
                  {displayRole}
                </span>
              </div>
            </div>

            {/* More options */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title="خيارات"
                className="flex-shrink-0 w-7 h-7 rounded-lg border border-white/[0.06] flex items-center justify-center text-white/35 bg-transparent cursor-pointer hover:text-white/85 hover:bg-green-800/20 hover:border-green-600/35 transition-all duration-200"
              >
                <MoreIcon sx={{ fontSize: 16 }} />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div
                  className="absolute bottom-full mb-2 left-0 w-[210px] rounded-[14px] border border-white/[0.09] overflow-hidden z-50 animate-fade-in"
                  style={{
                    backgroundColor: '#0D1E38',
                    boxShadow:
                      '0 -8px 32px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* User header */}
                  <div
                    className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-3"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(46,125,50,0.15) 0%, rgba(76,175,80,0.1) 100%)',
                    }}
                  >
                    <div
                      className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 100%)',
                        boxShadow: '0 2px 8px rgba(46,125,50,0.4)',
                      }}
                    >
                      {avatarLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] font-semibold text-white truncate m-0">
                        {displayName}
                      </p>
                      {displayEmail && (
                        <p className="text-[0.67rem] text-white/[0.38] mt-0.5 truncate m-0">
                          {displayEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[0.8125rem] text-white/70 bg-transparent border-none cursor-pointer font-cairo hover:bg-white/[0.06] hover:text-white transition-colors"
                    >
                      <AccountCircleOutlined sx={{ fontSize: 17 }} />
                      الملف الشخصي
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[0.8125rem] text-white/70 bg-transparent border-none cursor-pointer font-cairo hover:bg-white/[0.06] hover:text-white transition-colors"
                    >
                      <SettingsOutlined sx={{ fontSize: 17 }} />
                      الإعدادات
                    </button>
                  </div>

                  <div className="mx-1.5 h-px bg-white/[0.07]" />

                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[0.8125rem] text-rose-300 bg-transparent border-none cursor-pointer font-cairo hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
                    >
                      <LogoutOutlined sx={{ fontSize: 17 }} />
                      تسجيل الخروج
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
