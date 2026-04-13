/**
 * ProSidebar — القائمة الجانبية (Enhanced)
 * Premium dark sidebar with noise texture, ambient glow, mobile drawer
 */
import { SIDEBAR_WIDTH } from './sidebarConstants';
import useSidebarNav from './useSidebarNav';

const ProSidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const nav = useSidebarNav({ collapsed, onClose });

  const sidebarContent = (
    <div
      className="h-full flex flex-col text-white overflow-hidden transition-all duration-300 relative"
      style={{ width: nav.width }}
    >
      {/* Base background */}
      <div className="absolute inset-0 bg-gradient-navy" />

      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />

      {/* Ambient green glow at top */}
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full pointer-events-none opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #4CAF50, transparent 70%)' }}
      />

      {/* Ambient glow at bottom */}
      <div
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #2e7d32, transparent 70%)' }}
      />

      {/* Content (relative z so above bg layers) */}
      <div className="relative z-10 flex flex-col h-full">
        <SidebarBrand
          collapsed={collapsed}
          isMobile={nav.isMobile}
          onToggleCollapse={onToggleCollapse}
        />

        <SidebarSearch
          collapsed={collapsed}
          isMobile={nav.isMobile}
          searchQuery={nav.searchQuery}
          onSearchChange={nav.setSearchQuery}
          onClear={() => nav.setSearchQuery('')}
        />

        <SidebarNavList items={nav.searchFilteredNav} collapsed={collapsed} />

        <SidebarUserFooter collapsed={collapsed} isMobile={nav.isMobile} />
      </div>
    </div>
  );

  // ── Mobile: animated overlay drawer ──
  if (nav.isMobile) {
    return (
      <>
        {/* Backdrop with blur */}
        {open && (
          <div
            className="fixed inset-0 z-[1200] transition-all duration-300 animate-fade-in"
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
          />
        )}
        {/* Drawer */}
        <div
          className={`fixed top-0 h-full z-[1250] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            width: SIDEBAR_WIDTH,
            insetInlineStart: 0,
            boxShadow: open ? '-8px 0 30px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // ── Desktop: fixed, with edge shadow ──
  return (
    <nav
      className="flex-shrink-0 relative transition-all duration-300"
      style={{ width: nav.width, minWidth: nav.width, zIndex: 1201 }}
    >
      <div
        className="fixed top-0 h-screen overflow-hidden transition-all duration-300"
        style={{
          width: nav.width,
          insetInlineStart: 0,
          boxShadow: '4px 0 30px rgba(0,0,0,0.2), 1px 0 0 rgba(46,125,50,0.1)',
        }}
      >
        {sidebarContent}
      </div>
    </nav>
  );
};

export default ProSidebar;
