/**
 * Custom hook for sidebar navigation state and logic.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '../../../contexts/AuthContext';
import getNavigationItems from './sidebarNavConfig';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './sidebarConstants';

const useSidebarNav = ({ collapsed, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  const [expandedItems, setExpandedItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const userRole = currentUser?.role || 'guest';
  const isAdmin = ['admin', 'super_admin', 'administrator'].includes(userRole);

  // Filter navigation items by role
  // Admins and super_admins see everything; other roles see only permitted items
  const filteredNav = useMemo(() => {
    const items = getNavigationItems();
    // Admin/super_admin bypass — show all items
    if (isAdmin) return items;

    const filtered = items.filter(item => {
      if (item.type === 'divider') return true;
      if (item.roles && item.roles.includes('*')) return true;
      if (item.roles && item.roles.includes(userRole)) return true;
      return false;
    });

    // Fallback: if filtering results in no navigable items, show all
    const hasNavItems = filtered.some(item => item.type !== 'divider');
    if (!hasNavItems) return items;

    return filtered;
  }, [userRole, isAdmin]);

  // Search filter
  const searchFilteredNav = useMemo(() => {
    if (!searchQuery.trim()) return filteredNav;
    const q = searchQuery.toLowerCase();
    return filteredNav.filter(item => {
      if (item.type === 'divider') return false;
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.children) {
        return item.children.some(c => c.label.toLowerCase().includes(q));
      }
      return false;
    });
  }, [filteredNav, searchQuery]);

  // Auto-expand active parent
  useEffect(() => {
    const items = getNavigationItems();
    items.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(c => location.pathname.startsWith(c.path));
        if (isChildActive) {
          setExpandedItems(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname]);

  const isActive = useCallback(
    path => {
      if (!path) return false;
      if (path === '/dashboard')
        return location.pathname === '/dashboard' || location.pathname === '/';
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  const handleNavigate = path => {
    navigate(path);
    if (isMobile) onClose?.();
  };

  const handleToggleExpand = id => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const width = collapsed && !isMobile ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return {
    theme,
    isMobile,
    currentUser,
    expandedItems,
    searchQuery,
    setSearchQuery,
    searchFilteredNav,
    isActive,
    handleNavigate,
    handleToggleExpand,
    width,
  };
};

export default useSidebarNav;
