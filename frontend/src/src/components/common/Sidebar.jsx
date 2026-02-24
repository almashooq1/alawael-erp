/**
 * Sidebar Component
 * القائمة الجانبية للملاحة
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  Typography,
} from '@material-ui/core';
import {
  Dashboard as DashboardIcon,
  School as ProgressIcon,
  Assessment as GradesIcon,
  EventDays as AttendanceIcon,
  Groups as ProgramIcon,
  Mail as MessageIcon,
  Description as DocumentIcon,
  Notifications as NotificationIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  People as BeneficiaryIcon,
  Payment as PaymentIcon,
  BarChart as AnalyticsIcon,
  Receipt as ReportIcon,
} from '@material-ui/icons';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, portal }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState({});

  const { portal: userPortal } = useSelector(state => state.auth);

  const menuItems = userPortal === 'beneficiary' ?
    [
      {
        id: 'dashboard',
        label: t('menu.dashboard'),
        icon: <DashboardIcon />,
        path: '/dashboard',
      },
      {
        id: 'academic',
        label: t('menu.academic'),
        icon: <ProgressIcon />,
        children: [
          { label: t('menu.progress'), path: '/progress' },
          { label: t('menu.grades'), path: '/grades' },
          { label: t('menu.attendance'), path: '/attendance' },
        ],
      },
      {
        id: 'programs',
        label: t('menu.programs'),
        icon: <ProgramIcon />,
        path: '/programs',
      },
      {
        id: 'communication',
        label: t('menu.communication'),
        icon: <MessageIcon />,
        children: [
          { label: t('menu.messages'), path: '/messages' },
          { label: t('menu.notifications'), path: '/notifications' },
        ],
      },
      {
        id: 'documents',
        label: t('menu.documents'),
        icon: <DocumentIcon />,
        path: '/documents',
      },
      {
        id: 'settings',
        label: t('menu.settings'),
        icon: <SettingsIcon />,
        path: '/settings',
      },
    ]
    :
    [
      {
        id: 'dashboard',
        label: t('menu.dashboard'),
        icon: <DashboardIcon />,
        path: '/dashboard',
      },
      {
        id: 'beneficiaries',
        label: t('menu.beneficiaries'),
        icon: <BeneficiaryIcon />,
        path: '/beneficiaries',
      },
      {
        id: 'monitoring',
        label: t('menu.monitoring'),
        icon: <ProgressIcon />,
        children: [
          { label: t('menu.progress'), path: '/monitoring/progress' },
          { label: t('menu.grades'), path: '/monitoring/grades' },
          { label: t('menu.attendance'), path: '/monitoring/attendance' },
          { label: t('menu.behavior'), path: '/monitoring/behavior' },
        ],
      },
      {
        id: 'financial',
        label: t('menu.financial'),
        icon: <PaymentIcon />,
        children: [
          { label: t('menu.payments'), path: '/financial/payments' },
          { label: t('menu.invoices'), path: '/financial/invoices' },
          { label: t('menu.installments'), path: '/financial/installments' },
          { label: t('menu.summary'), path: '/financial/summary' },
        ],
      },
      {
        id: 'reports',
        label: t('menu.reports'),
        icon: <ReportIcon />,
        path: '/reports',
      },
      {
        id: 'analytics',
        label: t('menu.analytics'),
        icon: <AnalyticsIcon />,
        path: '/analytics',
      },
      {
        id: 'communication',
        label: t('menu.communication'),
        icon: <MessageIcon />,
        children: [
          { label: t('menu.messages'), path: '/messages' },
          { label: t('menu.notifications'), path: '/notifications' },
        ],
      },
      {
        id: 'settings',
        label: t('menu.settings'),
        icon: <SettingsIcon />,
        path: '/settings',
      },
    ];

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleNavigate = (path) => {
    navigate(path);
    onClose?.();
  };

  const isActive = (path) => location.pathname === path;

  const renderMenuItem = (item, depth = 0) => {
    const isExpanded = expandedItems[item.id];
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem
          button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else {
              handleNavigate(item.path);
            }
          }}
          className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
          {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItem>

        {/* Submenu */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => (
                <ListItem
                  button
                  key={child.path}
                  onClick={() => handleNavigate(child.path)}
                  className={`sidebar-item submenu-item ${isActive(child.path) ? 'active' : ''}`}
                  style={{ paddingLeft: `${32 + depth * 16}px` }}
                >
                  <ListItemText primary={child.label} />
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      className="sidebar-drawer"
      variant="temporary"
    >
      <Box className="sidebar">
        {/* Logo Section */}
        <Box className="sidebar-header">
          <Typography variant="h6" className="sidebar-title">
            {t('app.name')}
          </Typography>
        </Box>

        <Divider />

        {/* Menu Items */}
        <List className="sidebar-menu">
          {menuItems.map(item => renderMenuItem(item))}
        </List>

        {/* Footer */}
        <Box className="sidebar-footer">
          <Typography variant="caption">
            {t('footer.copyright')}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
