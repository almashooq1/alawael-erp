/**
 * DDD Platform Sidebar — القائمة الجانبية لمنصة التأهيل الموحدة
 *
 * قائمة جانبية قابلة للطي مع تصنيفات المجالات
 * تستخدم DDD_NAV_ITEMS من DDDRoutes
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Avatar,
  IconButton,
  useMediaQuery,
  useTheme,
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
  ExpandLess,
  ExpandMore,
  ChevronRight as CollapseIcon,
  // Phase 29 – Workforce
  Analytics as AnalyticsIcon,
  Badge as BadgeIcon,
  Diversity3 as MentorshipIcon,
  Route as RouteIcon,
  // Phase 30 – Accreditation
  Verified as VerifiedIcon,
  FindInPage as FindInPageIcon,
  Rule as RuleIcon,
  CardMembership as LicenseIcon,
  // Phase 31 – Patient Engagement
  LocalHospital as PatientPortalIcon,
  MenuBook as MenuBookIcon,
  Monitor as MonitorIcon,
  Forum as ForumIcon,
  // Phase 32 – Interoperability
  IntegrationInstructions as IntegrationIcon,
  MarkEmailRead as MarkEmailReadIcon,
  SwapHoriz as SwapHorizIcon,
  Hub as HubIcon,
  // Phase 33 – Disaster Recovery
  Backup as BackupIcon,
  Shield as ShieldIcon,
  PowerSettingsNew as FailoverIcon,
  ReportProblem as IncidentIcon,
  // Phase 34 – Facility
  Build as BuildIcon,
  Thermostat as ThermostatIcon,
  MeetingRoom as MeetingRoomIcon,
  Inventory as InventoryIcon,
  // Phase 35 – Research
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  Article as ArticleIcon,
  // Phase 36 – Community
  VolunteerActivism as VolunteerIcon,
  Campaign as CampaignIcon,
  Favorite as FavoriteIcon,
  RecordVoiceOver as AdvocacyIcon,
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
  // Phase 29
  Analytics: <AnalyticsIcon />,
  Badge: <BadgeIcon />,
  Diversity3: <MentorshipIcon />,
  Route: <RouteIcon />,
  // Phase 30
  Verified: <VerifiedIcon />,
  FindInPage: <FindInPageIcon />,
  Rule: <RuleIcon />,
  CardMembership: <LicenseIcon />,
  // Phase 31
  LocalHospital: <PatientPortalIcon />,
  MenuBook: <MenuBookIcon />,
  Monitor: <MonitorIcon />,
  Forum: <ForumIcon />,
  // Phase 32
  IntegrationInstructions: <IntegrationIcon />,
  MarkEmailRead: <MarkEmailReadIcon />,
  SwapHoriz: <SwapHorizIcon />,
  Hub: <HubIcon />,
  // Phase 33
  Backup: <BackupIcon />,
  Shield: <ShieldIcon />,
  PowerSettingsNew: <FailoverIcon />,
  ReportProblem: <IncidentIcon />,
  // Phase 34
  Build: <BuildIcon />,
  Thermostat: <ThermostatIcon />,
  MeetingRoom: <MeetingRoomIcon />,
  Inventory: <InventoryIcon />,
  // Phase 35
  Science: <ScienceIcon />,
  TrendingUp: <TrendingUpIcon />,
  Article: <ArticleIcon />,
  // Phase 36
  VolunteerActivism: <VolunteerIcon />,
  Campaign: <CampaignIcon />,
  Favorite: <FavoriteIcon />,
  RecordVoiceOver: <AdvocacyIcon />,
};

/* ── Navigation sections ── */
const NAV_SECTIONS = [
  {
    title: 'لوحة التحكم',
    titleEn: 'Dashboard',
    items: [
      {
        id: 'dashboard',
        title: 'نظرة عامة تنفيذية',
        path: '/platform/dashboard',
        icon: 'Dashboard',
      },
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
      {
        id: 'group-therapy',
        title: 'العلاج الجماعي',
        path: '/platform/group-therapy',
        icon: 'Groups',
      },
      {
        id: 'tele-rehab',
        title: 'التأهيل عن بُعد',
        path: '/platform/tele-rehab',
        icon: 'Videocam',
      },
      { id: 'ar-vr', title: 'الواقع الافتراضي', path: '/platform/ar-vr', icon: 'Vrpano' },
      { id: 'behavior', title: 'إدارة السلوك', path: '/platform/behavior', icon: 'Psychology' },
    ],
  },
  {
    title: 'البرامج والتدريب',
    titleEn: 'Programs & Training',
    items: [
      { id: 'programs', title: 'البرامج', path: '/platform/programs', icon: 'School' },
      {
        id: 'field-training',
        title: 'التدريب الميداني',
        path: '/platform/field-training',
        icon: 'ModelTraining',
      },
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
      {
        id: 'ai-recommendations',
        title: 'التوصيات الذكية',
        path: '/platform/ai-recommendations',
        icon: 'AutoAwesome',
      },
      { id: 'reports', title: 'التقارير', path: '/platform/reports', icon: 'BarChart' },
    ],
  },
  // ── Phase 29: Workforce Development ──
  {
    title: 'تطوير القوى العاملة',
    titleEn: 'Workforce Development',
    items: [
      {
        id: 'workforce-analytics',
        title: 'تحليلات القوى العاملة',
        path: '/platform/workforce-analytics',
        icon: 'Analytics',
      },
      {
        id: 'credential-manager',
        title: 'إدارة الشهادات',
        path: '/platform/credential-manager',
        icon: 'Badge',
      },
      {
        id: 'mentorship-program',
        title: 'التوجيه والإرشاد',
        path: '/platform/mentorship-program',
        icon: 'Diversity3',
      },
      {
        id: 'career-pathway',
        title: 'المسارات المهنية',
        path: '/platform/career-pathway',
        icon: 'Route',
      },
    ],
  },
  // ── Phase 30: Accreditation & Compliance ──
  {
    title: 'الاعتماد والامتثال',
    titleEn: 'Accreditation & Compliance',
    items: [
      {
        id: 'accreditation-manager',
        title: 'الاعتماد المؤسسي',
        path: '/platform/accreditation-manager',
        icon: 'Verified',
      },
      {
        id: 'inspection-tracker',
        title: 'متابعة التفتيش',
        path: '/platform/inspection-tracker',
        icon: 'FindInPage',
      },
      {
        id: 'standards-compliance',
        title: 'الامتثال للمعايير',
        path: '/platform/standards-compliance',
        icon: 'Rule',
      },
      {
        id: 'licensure-manager',
        title: 'إدارة التراخيص',
        path: '/platform/licensure-manager',
        icon: 'CardMembership',
      },
    ],
  },
  // ── Phase 31: Patient Engagement ──
  {
    title: 'تفاعل المريض',
    titleEn: 'Patient Engagement',
    items: [
      {
        id: 'patient-portal',
        title: 'بوابة المريض',
        path: '/platform/patient-portal',
        icon: 'LocalHospital',
      },
      {
        id: 'health-education',
        title: 'التثقيف الصحي',
        path: '/platform/health-education',
        icon: 'MenuBook',
      },
      {
        id: 'remote-monitoring',
        title: 'المراقبة عن بُعد',
        path: '/platform/remote-monitoring',
        icon: 'Monitor',
      },
      {
        id: 'patient-community',
        title: 'مجتمع المرضى',
        path: '/platform/patient-community',
        icon: 'Forum',
      },
    ],
  },
  // ── Phase 32: Interoperability ──
  {
    title: 'التشغيل البيني',
    titleEn: 'Interoperability',
    items: [
      {
        id: 'fhir-integration',
        title: 'تكامل FHIR',
        path: '/platform/fhir-integration',
        icon: 'IntegrationInstructions',
      },
      {
        id: 'hl7-messaging',
        title: 'رسائل HL7',
        path: '/platform/hl7-messaging',
        icon: 'MarkEmailRead',
      },
      {
        id: 'data-exchange',
        title: 'تبادل البيانات',
        path: '/platform/data-exchange',
        icon: 'SwapHoriz',
      },
      {
        id: 'interoperability-hub',
        title: 'مركز التشغيل البيني',
        path: '/platform/interoperability-hub',
        icon: 'Hub',
      },
    ],
  },
  // ── Phase 33: Disaster Recovery ──
  {
    title: 'الاستمرارية والأمن',
    titleEn: 'Business Continuity',
    items: [
      {
        id: 'backup-manager',
        title: 'النسخ الاحتياطي',
        path: '/platform/backup-manager',
        icon: 'Backup',
      },
      {
        id: 'business-continuity',
        title: 'استمرارية الأعمال',
        path: '/platform/business-continuity',
        icon: 'Shield',
      },
      {
        id: 'system-failover',
        title: 'تجاوز الأعطال',
        path: '/platform/system-failover',
        icon: 'PowerSettingsNew',
      },
      {
        id: 'incident-response',
        title: 'الاستجابة للحوادث',
        path: '/platform/incident-response',
        icon: 'ReportProblem',
      },
    ],
  },
  // ── Phase 34: Facility & Assets ──
  {
    title: 'المنشآت والأصول',
    titleEn: 'Facility & Assets',
    items: [
      {
        id: 'equipment-lifecycle',
        title: 'دورة حياة المعدات',
        path: '/platform/equipment-lifecycle',
        icon: 'Build',
      },
      {
        id: 'environmental-monitoring',
        title: 'المراقبة البيئية',
        path: '/platform/environmental-monitoring',
        icon: 'Thermostat',
      },
      {
        id: 'space-management',
        title: 'إدارة المساحات',
        path: '/platform/space-management',
        icon: 'MeetingRoom',
      },
      {
        id: 'asset-tracking',
        title: 'تتبع الأصول',
        path: '/platform/asset-tracking',
        icon: 'Inventory',
      },
    ],
  },
  // ── Phase 35: Clinical Research ──
  {
    title: 'البحث والأدلة',
    titleEn: 'Clinical Research',
    items: [
      {
        id: 'clinical-research',
        title: 'البحث السريري',
        path: '/platform/clinical-research',
        icon: 'Science',
      },
      {
        id: 'clinical-trials',
        title: 'التجارب السريرية',
        path: '/platform/clinical-trials',
        icon: 'Biotech',
      },
      {
        id: 'outcome-research',
        title: 'بحوث النتائج',
        path: '/platform/outcome-research',
        icon: 'TrendingUp',
      },
      {
        id: 'publication-manager',
        title: 'المنشورات العلمية',
        path: '/platform/publication-manager',
        icon: 'Article',
      },
    ],
  },
  // ── Phase 36: Community Engagement ──
  {
    title: 'المجتمع والمشاركة',
    titleEn: 'Community Engagement',
    items: [
      {
        id: 'volunteer-management',
        title: 'إدارة المتطوعين',
        path: '/platform/volunteer-management',
        icon: 'VolunteerActivism',
      },
      {
        id: 'community-outreach',
        title: 'التواصل المجتمعي',
        path: '/platform/community-outreach',
        icon: 'Campaign',
      },
      {
        id: 'donor-relations',
        title: 'علاقات المانحين',
        path: '/platform/donor-relations',
        icon: 'Favorite',
      },
      {
        id: 'advocacy-program',
        title: 'برنامج المناصرة',
        path: '/platform/advocacy-program',
        icon: 'RecordVoiceOver',
      },
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

  const toggleSection = key => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = path => location.pathname === path || location.pathname.startsWith(path + '/');

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
          <DashboardIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            منصة التأهيل
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Unified Rehab Platform
          </Typography>
        </Box>
        {onToggle && (
          <IconButton size="small" onClick={onToggle}>
            <CollapseIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {NAV_SECTIONS.map(section => (
          <React.Fragment key={section.titleEn}>
            {/* Section header */}
            <ListItemButton onClick={() => toggleSection(section.titleEn)} sx={{ py: 0.5, px: 2 }}>
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
              {expandedSections[section.titleEn] ? (
                <ExpandLess fontSize="small" />
              ) : (
                <ExpandMore fontSize="small" />
              )}
            </ListItemButton>

            <Collapse in={expandedSections[section.titleEn]} timeout="auto">
              <List disablePadding>
                {section.items.map(item => {
                  const active = isActive(item.path);
                  return (
                    <ListItemButton
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile && onToggle) onToggle();
                      }}
                      sx={{
                        py: 0.75,
                        px: 2,
                        pl: 3,
                        bgcolor: active ? 'primary.light' : 'transparent',
                        color: active ? 'primary.contrastText' : 'text.primary',
                        borderRight: active ? 3 : 0,
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: active ? 'primary.light' : 'action.hover' },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: active ? 'primary.contrastText' : 'action.active',
                        }}
                      >
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
          52 مجال DDD • 42 نموذج بيانات
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
