/**
 * SidebarBrand — شعار القائمة الجانبية (Enhanced)
 * Animated brand icon with glass effect + shimmer
 */
import {
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

export default function SidebarBrand({ collapsed, onToggleCollapse }) {
  return (
    <div
      className={`flex items-center h-[72px] flex-shrink-0 relative overflow-hidden transition-all duration-300 ${
        collapsed ? 'justify-center px-3' : 'justify-between px-5'
      }`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/30 via-transparent to-transparent" />
      
      {/* Bottom border gradient */}
      <div className="absolute bottom-0 left-[8%] w-[84%] h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer bg-[length:200%_100%]" />

      {/* Logo + Text */}
      <div
        className="flex items-center gap-3.5 overflow-hidden min-w-0 relative z-10"
        style={{ flex: collapsed ? 0 : 1 }}
      >
        {/* Brand Icon — enhanced with glow + inner gradient */}
        <div className="relative group">
          <div
            className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-white/15 transition-transform duration-300 group-hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, #1B5E20 0%, #2e7d32 50%, #43A047 100%)',
              boxShadow:
                '0 4px 24px rgba(46,125,50,0.5), 0 0 40px rgba(46,125,50,0.15), inset 0 1px 1px rgba(255,255,255,0.2)',
            }}
          >
            {/* Glass overlay top half */}
            <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[14px] bg-gradient-to-b from-white/20 to-transparent" />
            <span
              className="text-white font-black text-[1.15rem] relative z-10 font-cairo drop-shadow-md"
              style={{ letterSpacing: '-0.5px' }}
            >
              أ
            </span>
          </div>
          {/* Glow ring on hover */}
          <div className="absolute -inset-1 rounded-[18px] bg-green-500/0 group-hover:bg-green-500/10 transition-all duration-500 blur-sm" />
        </div>

        {/* Title — hidden when collapsed with smooth transition */}
        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-400 ease-smooth ${
            collapsed ? 'opacity-0 max-w-0 scale-95' : 'opacity-100 max-w-[180px] scale-100'
          }`}
        >
          <p className="text-white font-extrabold text-[0.95rem] leading-tight font-cairo m-0 drop-shadow-sm">
            مراكز الأوائل
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-[6px] w-[6px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-emerald-400" />
            </span>
            <span className="text-white/35 text-[0.65rem] font-medium tracking-wider uppercase">
              نظام إدارة متكامل
            </span>
          </div>
        </div>
      </div>

      {/* Collapse Toggle — glass button */}
      <button
        onClick={onToggleCollapse}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        className={`flex-shrink-0 w-[32px] h-[32px] rounded-[10px] flex items-center justify-center text-white/30 bg-white/[0.04] border border-white/[0.06] cursor-pointer relative z-10 transition-all duration-200 hover:text-white hover:bg-white/[0.1] hover:border-green-500/30 hover:shadow-glow-green-sm active:scale-95 ${
          collapsed ? 'absolute left-1/2 -translate-x-1/2 bottom-3' : ''
        }`}
      >
        {collapsed ? (
          <MenuIcon sx={{ fontSize: 16 }} />
        ) : (
          <MenuOpenIcon sx={{ fontSize: 16 }} />
        )}
      </button>
    </div>
  );
}
