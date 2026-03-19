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

  const sidebarContent = (
    <Box
      sx={{
        width: nav.width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: nav.theme.custom?.sidebar?.background || nav.theme.palette.background.paper,
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
        isMobile={nav.isMobile}
        expandedItems={nav.expandedItems}
        isActive={nav.isActive}
        onToggleExpand={nav.handleToggleExpand}
        onNavigate={nav.handleNavigate}
        onToggleCollapse={onToggleCollapse}
        theme={nav.theme}
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
        flexShrink: 0,
        transition: nav.theme.custom?.transition?.medium || 'all 0.3s ease',
      }}
    >
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          '& .MuiDrawer-paper': {
            width: nav.width,
            border: 'none',
            position: 'relative',
            height: '100vh',
            transition: nav.theme.custom?.transition?.medium || 'all 0.3s ease',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {sidebarContent}
      </Drawer>
    </Box>
  );
};

export default ProSidebar;
