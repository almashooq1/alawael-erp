/**
 * ProSidebar — القائمة الجانبية الاحترافية (Tailwind)
 * Mobile: overlay drawer from right | Desktop: fixed pinned sidebar
 */
import { SIDEBAR_WIDTH } from './sidebarConstants';
import useSidebarNav from './useSidebarNav';
import SidebarBrand from './SidebarBrand';
import SidebarSearch from './SidebarSearch';
import SidebarNavList from './SidebarNavList';
import SidebarUserFooter from './SidebarUserFooter';

const ProSidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const nav = useSidebarNav({ collapsed, onClose });

  const sidebarContent = (
    <div
      className="h-full flex flex-col text-white overflow-hidden transition-all duration-300"
      style={{
        width: nav.width,
        background: 'linear-gradient(180deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)',
      }}
    >
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
  );

  // ── Mobile: overlay drawer ──
  if (nav.isMobile) {
    return (
      <>
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-[1200] transition-opacity duration-300"
            onClick={onClose}
          />
        )}
        {/* Drawer from right (RTL) */}
        <div
          className={`fixed top-0 h-full z-[1250] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ width: SIDEBAR_WIDTH, insetInlineStart: 0 }}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // ── Desktop: fixed sidebar ──
  return (
    <nav
      className="flex-shrink-0 relative transition-all duration-300"
      style={{
        width: nav.width,
        minWidth: nav.width,
        zIndex: 1201,
      }}
    >
      <div
        className="fixed top-0 h-screen overflow-hidden transition-all duration-300"
        style={{
          width: nav.width,
          insetInlineStart: 0,
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {sidebarContent}
      </div>
    </nav>
  );
};

export default ProSidebar;
