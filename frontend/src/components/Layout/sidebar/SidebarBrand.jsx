/**
 * SidebarBrand — شعار القائمة الجانبية (Tailwind)
 * Brand icon + system name + collapse toggle
 */
import {
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

export default function SidebarBrand({ collapsed, onToggleCollapse }) {
  return (
    <div
      className={`flex items-center h-[68px] flex-shrink-0 relative overflow-hidden border-b border-white/5 transition-all duration-300 ${
        collapsed ? 'justify-center px-3' : 'justify-between px-5'
      }`}
      style={{
        background:
          'linear-gradient(135deg, rgba(21,87,36,0.35) 0%, rgba(10,22,40,0.1) 60%, transparent 100%)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-[5%] w-[90%] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(46,125,50,0.6) 40%, rgba(76,175,80,0.6) 60%, transparent 100%)',
        }}
      />

      {/* Logo + Text */}
      <div
        className="flex items-center gap-3 overflow-hidden min-w-0"
        style={{ flex: collapsed ? 0 : 1 }}
      >
        {/* Brand Icon */}
        <div
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(145deg, #1B5E20 0%, #2e7d32 60%, #388E3C 100%)',
            boxShadow:
              '0 4px 20px rgba(46,125,50,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[48%] rounded-t-xl"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)',
            }}
          />
          <span
            className="text-white font-black text-lg relative z-10 font-cairo"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)', letterSpacing: '-1px' }}
          >
            أ
          </span>
        </div>

        {/* Title — hidden when collapsed */}
        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
            collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[160px]'
          }`}
        >
          <p
            className="text-white font-bold text-base leading-tight font-cairo m-0"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}
          >
            مراكز الأوائل
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-[5px] h-[5px] rounded-full bg-emerald-500 flex-shrink-0 animate-pulse"
              style={{ boxShadow: '0 0 5px rgba(16,185,129,0.7)' }}
            />
            <span className="text-white/40 text-[0.67rem] tracking-wide">
              نظام إدارة متكامل
            </span>
          </div>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        className={`flex-shrink-0 w-[30px] h-[30px] rounded-lg border border-white/[0.06] flex items-center justify-center text-white/35 bg-transparent cursor-pointer hover:text-white/90 hover:bg-green-800/30 hover:border-green-600/40 transition-all duration-200 ${
          collapsed ? 'absolute left-1/2 -translate-x-1/2' : ''
        }`}
      >
        {collapsed ? (
          <MenuIcon sx={{ fontSize: 17 }} />
        ) : (
          <MenuOpenIcon sx={{ fontSize: 17 }} />
        )}
      </button>
    </div>
  );
}
