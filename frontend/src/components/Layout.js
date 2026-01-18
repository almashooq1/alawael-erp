import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  ListSubheader,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  AccountBalanceWallet as WalletIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  QueryStats as QueryStatsIcon,
  Shield as ShieldIcon,
  Science as ScienceIcon,
  Engineering as EngineeringIcon,
  Groups as GroupsIcon,
  SupportAgent as SupportAgentIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  Chat as ChatIcon,
  Archive as ArchiveIcon,
  School as SchoolIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import QuickSearch from './QuickSearch';
import NotificationsPopover from './NotificationsPopover';
import SmartNotificationPanel from './SmartNotificationPanel';
import BreadcrumbsNav from './BreadcrumbsNav';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: prop => prop !== 'open' })(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: prop => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const navGroups = [
  {
    label: 'التشغيل والقياس',
    items: [
      { text: 'الرئيسية', icon: <DashboardIcon />, path: '/home' },
      { text: 'لوحة التشغيل', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'التقارير والتحليلات', icon: <QueryStatsIcon />, path: '/reports' },
      { text: 'النشاط اللحظي', icon: <ReceiptIcon />, path: '/activity' },
    ],
  },
  {
    label: 'الأعمال والمالية',
    items: [
      { text: 'إدارة علاقات العملاء', icon: <GroupsIcon />, path: '/crm' },
      { text: 'المالية والمحاسبة', icon: <BusinessIcon />, path: '/finance' },
      { text: 'المشتريات والمخزون', icon: <WalletIcon />, path: '/procurement' },
      { text: 'الأرصدة والتسويات', icon: <WalletIcon />, path: '/balances' },
    ],
  },
  {
    label: 'الموارد والفرق',
    items: [
      { text: 'الموارد البشرية', icon: <GroupIcon />, path: '/hr' },
      { text: 'الحضور والإجازات', icon: <ReceiptIcon />, path: '/attendance' },
      { text: 'الرواتب', icon: <WalletIcon />, path: '/payroll' },
      { text: '🏢 الهيكل التنظيمي', icon: <BusinessIcon />, path: '/organization' },
    ],
  },
  {
    label: 'التعلم والرعاية',
    items: [
      { text: 'التعلم الإلكتروني', icon: <ScienceIcon />, path: '/elearning' },
      { text: 'النظام الشامل (الخطط)', icon: <SupportAgentIcon />, path: '/integrated-care' },
      { text: 'الجلسات والمواعيد', icon: <AccessTimeIcon />, path: '/sessions' },
      { text: 'إعادة التأهيل', icon: <SupportAgentIcon />, path: '/rehab' },
      { text: 'المساعد الذكي', icon: <SupportAgentIcon />, path: '/ai-assistant' },
    ],
  },
  {
    label: 'الاتصالات الإدارية',
    items: [
      { text: 'نظام الاتصالات', icon: <ChatIcon />, path: '/communications' },
      { text: 'إدارة المستندات', icon: <ChatIcon />, path: '/documents' },
      { text: '🤖 المنشئ الذكي (Enterprise)', icon: <EngineeringIcon />, path: '/smart-documents' },
      { text: '🗂️ نظام الأرشفة', icon: <ArchiveIcon />, path: '/archiving' },
    ],
  },
  {
    label: 'بوابة الطالب',
    items: [
      { text: 'لوحة المعلومات', icon: <DashboardIcon />, path: '/student-portal' },
      { text: 'الجدول الدراسي', icon: <AccessTimeIcon />, path: '/student-portal/schedule' },
      { text: 'الدرجات والتقييمات', icon: <QueryStatsIcon />, path: '/student-portal/grades' },
      { text: 'سجل الحضور', icon: <ReceiptIcon />, path: '/student-portal/attendance' },
      { text: 'الواجبات والمشاريع', icon: <ReceiptIcon />, path: '/student-portal/assignments' },
      { text: 'المكتبة الرقمية', icon: <ScienceIcon />, path: '/student-portal/library' },
      { text: 'الإعلانات', icon: <ChatIcon />, path: '/student-portal/announcements' },
      { text: 'الرسائل', icon: <ChatIcon />, path: '/student-portal/messages' },
    ],
  },
  {
    label: 'بوابة المعالجين والموظفين',
    items: [
      { text: 'لوحة المعلومات', icon: <DashboardIcon />, path: '/therapist-portal' },
      { text: 'إدارة المرضى', icon: <GroupIcon />, path: '/therapist-portal/patients' },
      { text: 'جدول المواعيد', icon: <AccessTimeIcon />, path: '/therapist-portal/schedule' },
      { text: 'تقارير الجلسات', icon: <ReceiptIcon />, path: '/therapist-portal/sessions' },
      { text: 'إدارة الحالات', icon: <SupportAgentIcon />, path: '/therapist-portal/cases' },
      { text: 'المستندات والملفات', icon: <ScienceIcon />, path: '/therapist-portal/documents' },
      { text: 'الإحصائيات والتقارير', icon: <QueryStatsIcon />, path: '/therapist-portal/reports' },
      { text: 'الرسائل والتواصل', icon: <ChatIcon />, path: '/therapist-portal/messages' },
    ],
  },
  {
    label: 'بوابة الإدارة والتحكم',
    items: [
      { text: 'لوحة المعلومات', icon: <DashboardIcon />, path: '/admin-portal' },
      { text: '🎨 لوحة التحكم المتقدمة', icon: <DashboardIcon />, path: '/admin-portal/enhanced' },
      { text: '📊 التقارير المتقدمة', icon: <QueryStatsIcon />, path: '/admin-portal/advanced-reports' },
      { text: 'إدارة المستخدمين', icon: <GroupIcon />, path: '/admin-portal/users' },
      { text: 'إعدادات النظام', icon: <EngineeringIcon />, path: '/admin-portal/settings' },
      { text: 'التقارير والتحليلات', icon: <QueryStatsIcon />, path: '/admin-portal/reports' },
      { text: 'سجلات التدقيق', icon: <ShieldIcon />, path: '/admin-portal/audit-logs' },
      { text: 'إدارة العيادات', icon: <BusinessIcon />, path: '/admin-portal/clinics' },
      { text: 'المدفوعات والفواتير', icon: <WalletIcon />, path: '/admin-portal/payments' },
      { text: 'إدارة الإشعارات', icon: <ChatIcon />, path: '/admin-portal/notifications' },
    ],
  },
  {
    label: '🎯 إدارة المستفيدين',
    items: [
      { text: '🎨 لوحة المستفيدين', icon: <GroupsIcon />, path: '/beneficiaries' },
      { text: '📊 جدول المستفيدين المتقدم', icon: <GroupsIcon />, path: '/beneficiaries/table' },
    ],
  },
  {
    label: 'بوابة الآباء والأولياء',
    items: [
      { text: 'لوحة المعلومات', icon: <DashboardIcon />, path: '/parent-portal' },
      { text: 'تتبع التقدم', icon: <QueryStatsIcon />, path: '/parent-portal/children-progress' },
      { text: 'تقارير الحضور', icon: <ReceiptIcon />, path: '/parent-portal/attendance-reports' },
      { text: 'التواصل مع المعالجين', icon: <ChatIcon />, path: '/parent-portal/therapist-communications' },
      { text: 'الدفعات والفواتير', icon: <WalletIcon />, path: '/parent-portal/payments-history' },
      { text: 'المستندات والتقارير', icon: <ScienceIcon />, path: '/parent-portal/documents-reports' },
      { text: 'جدولة الجلسات', icon: <AccessTimeIcon />, path: '/parent-portal/appointments-scheduling' },
      { text: 'الرسائل والإشعارات', icon: <ChatIcon />, path: '/parent-portal/messages' },
    ],
  },
  {
    label: 'الأمن والتشغيل',
    items: [
      { text: 'الأمن والحماية', icon: <ShieldIcon />, path: '/security' },
      { text: 'المراقبة والكاميرات', icon: <ShieldIcon />, path: '/surveillance' },
      { text: 'الصيانة والتشغيل', icon: <EngineeringIcon />, path: '/maintenance' },
    ],
  },
  {
    label: 'اجتماعي وحسابي',
    items: [
      { text: 'المجموعات', icon: <GroupsIcon />, path: '/groups' },
      { text: 'الأصدقاء', icon: <GroupsIcon />, path: '/friends' },
      { text: 'الملف الشخصي', icon: <ProfileIcon />, path: '/profile' },
    ],
  },
];

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = React.useState(!isMobile);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = path => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = path => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>

          {/* شعار واسم النظام - Logo and System Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <Box
              component="img"
              src="/logo.svg"
              alt="مركز الأوائل"
              sx={{
                width: 40,
                height: 40,
                mr: 1.5,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
              }}
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                مركز الأوائل للتأهيل
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', lineHeight: 1 }}>
                نظام إدارة التأهيل المتكامل
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
            <QuickSearch />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Add an expense">
              <IconButton color="inherit" onClick={() => navigate('/expenses/new')} sx={{ mr: 1 }}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <SmartNotificationPanel userId={currentUser?._id} />
            <NotificationsPopover />
            <Tooltip title="Profile">
              <IconButton color="inherit" onClick={() => navigate('/profile')}>
                <ProfileIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBarStyled>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
        {/* شعار المركز في القائمة الجانبية - Logo in Sidebar */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
          }}
        >
          <IconButton
            onClick={handleDrawerClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
          >
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>

          <Box
            component="img"
            src="/logo.svg"
            alt="مركز الأوائل"
            sx={{
              width: 100,
              height: 100,
              mb: 2,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
            }}
          />
          <Typography variant="caption" sx={{ opacity: 0.9, textAlign: 'center' }}>
            Al-Awael Rehabilitation Center
          </Typography>
        </Box>

        <Divider />

        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 1 }}>{currentUser?.name?.charAt(0) || 'U'}</Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {currentUser?.name || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {currentUser?.email || ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DrawerHeader>
        <Divider />
        {navGroups.map(group => (
          <List
            key={group.label}
            subheader={
              <ListSubheader component="div" disableSticky sx={{ bgcolor: 'transparent', color: 'text.secondary', fontWeight: 600 }}>
                {group.label}
              </ListSubheader>
            }
          >
            {group.items.map(item => (
              <ListItem
                button
                key={item.text}
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.action.selected,
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            <Divider sx={{ my: 0.5 }} />
          </List>
        ))}
        <Divider />
        <List>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>

      <Main open={open}>
        <DrawerHeader />
        <Box sx={{ mt: 2 }}>
          <BreadcrumbsNav />
          <Outlet />
        </Box>
      </Main>
    </Box>
  );
};

export default Layout;
