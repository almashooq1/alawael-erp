/**
 * Professional Sidebar Navigation — AlAwael ERP (Orchestrator)
 * قائمة جانبية احترافية مع تنقل متعدد المستويات
 *
 * Features:
 * - Collapsible sidebar with smooth animations
 * - Multi-level nested navigation
 * - Role-based menu filtering
 * - Active route highlighting with breadcrumb tracking
 * - Search/filter menu items
 * - Keyboard navigation support
 * - Responsive (overlay on mobile, pinned on desktop)
 */
import { Box, Drawer } from '@mui/material';
import { SIDEBAR_WIDTH } from './sidebarConstants';
import useSidebarNav from './useSidebarNav';
import SidebarBrand from './SidebarBrand';
import SidebarSearch from './SidebarSearch';
import SidebarNavList from './SidebarNavList';
import SidebarUserFooter from './SidebarUserFooter';

const ProSidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const nav = useSidebarNav({ collapsed, onClose });

  // Resolved sidebar background — use gradient if available, fallback to solid + paper
  const sidebarBg =
    nav.theme.custom?.sidebar?.backgroundGradient ||
    nav.theme.custom?.sidebar?.background ||
    '#0A1628';

  const sidebarContent = (
    <Box
      sx={{
        width: nav.width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: sidebarBg,
        color: '#FFFFFF',
        transition: nav.theme.custom?.transition?.medium || 'all 0.3s ease',
        overflow: 'hidden',
      }}
    >
      <SidebarBrand
        collapsed={collapsed}
        isMobile={nav.isMobile}
        onToggleCollapse={onToggleCollapse}
        theme={nav.theme}
      />

      <SidebarSearch
        collapsed={collapsed}
        isMobile={nav.isMobile}
        searchQuery={nav.searchQuery}
        onSearchChange={nav.setSearchQuery}
        onClear={() => nav.setSearchQuery('')}
        theme={nav.theme}
      />

      <SidebarNavList
        items={nav.searchFilteredNav}
        collapsed={collapsed}
      />

      <SidebarUserFooter
        collapsed={collapsed}
        isMobile={nav.isMobile}
        currentUser={nav.currentUser}
        onNavigate={nav.handleNavigate}
        theme={nav.theme}
      />
    </Box>
  );

  // Mobile: Temporary overlay drawer
  if (nav.isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' } }}
        ModalProps={{ keepMounted: true }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop: Permanent sidebar
  return (
    <Box
      component="nav"
      sx={{
        width: nav.width,
        minWidth: nav.width,
        flexShrink: 0,
        position: 'relative',
        zIndex: (nav.theme.zIndex?.drawer || 1200) + 1,
        transition: nav.theme.custom?.transition?.medium || 'all 0.3s ease',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          insetInlineStart: 0,
          width: nav.width,
          height: '100vh',
          overflowX: 'hidden',
          overflowY: 'hidden',
          transition: nav.theme.custom?.transition?.medium || 'all 0.3s ease',
        boxShadow: nav.theme.palette.mode === 'dark'
            ? '4px 0 24px rgba(0,0,0,0.4)'
            : '4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {sidebarContent}
      </Box>
    </Box>
  );
};

export default ProSidebar;
