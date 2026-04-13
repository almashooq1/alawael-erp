/**
 * DDD Platform Sidebar — القائمة الجانبية لمنصة التأهيل الموحدة
 *
 * قائمة جانبية قابلة للطي مع تصنيفات المجالات
 * تستخدم DDD_NAV_ITEMS من DDDRoutes
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, Typography, Divider, Avatar,
  IconButton, Tooltip, Chip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  EventNote as EpisodeIcon,
  CalendarToday as SessionIcon,
  Assignment as AssessmentIcon,
  ListAlt as PlanIcon,
  TrackChanges as GoalIcon,
  Groups as GroupIcon,
  Videocam as TeleIcon,
  Vrpano as VrIcon,
  Psychology as BehaviorIcon,
  FamilyRestroom as FamilyIcon,
  School as ProgramIcon,
  AccountTree as WorkflowIcon,
  VerifiedUser as QualityIcon,
  AutoAwesome as AIIcon,
  BarChart as ReportIcon,
  Biotech as ResearchIcon,
  ModelTraining as TrainingIcon,
  ExpandLess, ExpandMore,
  ChevronRight as CollapseIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

/* ── Icon mapping ── */
const ICONS = {
  Dashboard: <DashboardIcon />,
  People: <PeopleIcon />,
  EventNote: <EpisodeIcon />,
  CalendarToday: <SessionIcon />,
  Assignment: <AssessmentIcon />,
  ListAlt: <PlanIcon />,
  TrackChanges: <GoalIcon />,
  Groups: <GroupIcon />,
  Videocam: <TeleIcon />,
  Vrpano: <VrIcon />,
  Psychology: <BehaviorIcon />,
  FamilyRestroom: <FamilyIcon />,
  School: <ProgramIcon />,
  AccountTree: <WorkflowIcon />,
  VerifiedUser: <QualityIcon />,
  AutoAwesome: <AIIcon />,
  BarChart: <ReportIcon />,
  Biotech: <ResearchIcon />,
  ModelTraining: <TrainingIcon />,
};

/* ── Navigation sections ── */
const NAV_SECTIONS = [
  {
    title: 'لوحة التحكم',
    titleEn: 'Dashboard',
    items: [
      { id: 'dashboard', title: 'نظرة عامة تنفيذية', path: '/platform/dashboard', icon: 'Dashboard' },
    ],
  },
  {
    title: 'إدارة المستفيدين',
    titleEn: 'Beneficiary Management',
    items: [
      { id: 'beneficiaries', title: 'المستفيدون', path: '/platform/beneficiaries', icon: 'People' },
      { id: 'episodes', title: 'حلقات الرعاية', path: '/platform/episodes', icon: 'EventNote' },
      { id: 'workflow', title: 'سير العمل', path: '/platform/workflow', icon: 'AccountTree' },
    ],
  },
  {
    title: 'الخدمات السريرية',
    titleEn: 'Clinical Services',
    items: [
      { id: 'sessions', title: 'الجلسات', path: '/platform/sessions', icon: 'CalendarToday' },
      { id: 'assessments', title: 'التقييمات', path: '/platform/assessments', icon: 'Assignment' },
      { id: 'care-plans', title: 'خطط الرعاية', path: '/platform/care-plans', icon: 'ListAlt' },
      { id: 'goals', title: 'الأهداف والمقاييس', path: '/platform/goals', icon: 'TrackChanges' },
    ],
  },
  {
    title: 'التأهيل المتخصص',
    titleEn: 'Specialized Rehab',
    items: [
      { id: 'group-therapy', title: 'العلاج الجماعي', path: '/platform/group-therapy', icon: 'Groups' },
      { id: 'tele-rehab', title: 'التأهيل عن بُعد', path: '/platform/tele-rehab', icon: 'Videocam' },
      { id: 'ar-vr', title: 'الواقع الافتراضي', path: '/platform/ar-vr', icon: 'Vrpano' },
      { id: 'behavior', title: 'إدارة السلوك', path: '/platform/behavior', icon: 'Psychology' },
    ],
  },
  {
    title: 'البرامج والتدريب',
    titleEn: 'Programs & Training',
    items: [
      { id: 'programs', title: 'البرامج', path: '/platform/programs', icon: 'School' },
      { id: 'field-training', title: 'التدريب الميداني', path: '/platform/field-training', icon: 'ModelTraining' },
      { id: 'research', title: 'البحث السريري', path: '/platform/research', icon: 'Biotech' },
    ],
  },
  {
    title: 'التواصل والعائلة',
    titleEn: 'Family & Communication',
    items: [
      { id: 'family', title: 'بوابة الأسرة', path: '/platform/family', icon: 'FamilyRestroom' },
    ],
  },
  {
    title: 'الجودة والذكاء',
    titleEn: 'Quality & Intelligence',
    items: [
      { id: 'quality', title: 'الجودة والامتثال', path: '/platform/quality', icon: 'VerifiedUser' },
      { id: 'ai-recommendations', title: 'التوصيات الذكية', path: '/platform/ai-recommendations', icon: 'AutoAwesome' },
      { id: 'reports', title: 'التقارير', path: '/platform/reports', icon: 'BarChart' },
    ],
  },
];

export default function DDDSidebar({ open = true, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedSections, setExpandedSections] = useState(
    NAV_SECTIONS.reduce((acc, s) => ({ ...acc, [s.titleEn]: true }), {})
  );

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
          <DashboardIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">منصة التأهيل</Typography>
          <Typography variant="caption" color="text.secondary">Unified Rehab Platform</Typography>
        </Box>
        {onToggle && (
          <IconButton size="small" onClick={onToggle}>
            <CollapseIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {NAV_SECTIONS.map((section) => (
          <React.Fragment key={section.titleEn}>
            {/* Section header */}
            <ListItemButton
              onClick={() => toggleSection(section.titleEn)}
              sx={{ py: 0.5, px: 2 }}
            >
              <ListItemText
                primary={section.title}
                primaryTypographyProps={{
                  variant: 'caption',
                  fontWeight: 'bold',
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: 11,
                }}
              />
              {expandedSections[section.titleEn] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>

            <Collapse in={expandedSections[section.titleEn]} timeout="auto">
              <List disablePadding>
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <ListItemButton
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile && onToggle) onToggle();
                      }}
                      sx={{
                        py: 0.75, px: 2, pl: 3,
                        bgcolor: active ? 'primary.light' : 'transparent',
                        color: active ? 'primary.contrastText' : 'text.primary',
                        borderRight: active ? 3 : 0,
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: active ? 'primary.light' : 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.contrastText' : 'action.active' }}>
                        {ICONS[item.icon] || <DashboardIcon />}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{ variant: 'body2', fontSize: 13 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          20 مجال DDD • 34 نموذج بيانات
        </Typography>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onToggle}
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderLeft: 1,
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
