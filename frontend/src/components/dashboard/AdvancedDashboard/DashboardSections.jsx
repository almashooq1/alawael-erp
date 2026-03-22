/**
 * DashboardSections — All 8 collapsible dashboard section blocks + Pro Tools
 */
import React, { lazy, Suspense } from 'react';
import { Grid, Collapse, Box, Typography, Chip, Stack } from '@mui/material';
import { RegistrationChart, ActivityChart, RoleDistributionChart, SessionStatusChart } from '../DashboardCharts';
import ActivityFeed from '../ActivityFeed';
import QuickActions from '../QuickActions';
import SystemHealth from '../SystemHealth';
import SectionErrorFallback from '../shared/SectionErrorFallback';
import { SectionDivider } from '../DashboardNavigation';
import { SectionSkeleton } from './dashboardReducer';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const FinanceOverview = lazy(() => import('../FinanceOverview'));
const ClinicalOverview = lazy(() => import('../ClinicalOverview'));
const HROverview = lazy(() => import('../HROverview'));
const ModulesSummary = lazy(() => import('../ModulesSummary'));
const OperationsOverview = lazy(() => import('../OperationsOverview'));

/* Pro Tools — lazy loaded */
const NotificationCenter = lazy(() => import('../pro/NotificationCenter'));
const AdvancedAnalyticsPanel = lazy(() => import('../pro/AdvancedAnalyticsPanel'));
const UserProductivityWidget = lazy(() => import('../pro/UserProductivityWidget'));
const TaskManagerWidget = lazy(() => import('../pro/TaskManagerWidget'));
const CalendarEventsWidget = lazy(() => import('../pro/CalendarEventsWidget'));

const DashboardSections = ({
  isSectionVisible, collapsedSections, dispatch,
  finance, charts, clinical, hr, kpis,
  supplyChain, fleet, operations, data,
}) => (
  <>
    {/* 3. FINANCE */}
    {isSectionVisible('finance') && (
    <SectionErrorFallback label="المالية" aria-labelledby="section-finance-heading">
      <SectionDivider label="💰 المالية والإيرادات" id="section-finance" collapsed={collapsedSections.finance} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'finance' })} />
      <Collapse in={!collapsedSections.finance} unmountOnExit>
        <Suspense fallback={<SectionSkeleton height={320} />}>
          <FinanceOverview finance={finance} charts={charts} delay={0.25} />
        </Suspense>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 4. CHARTS ROW */}
    {isSectionVisible('charts') && (
    <SectionErrorFallback label="الرسوم البيانية" aria-labelledby="section-charts-heading">
      <SectionDivider label="📈 الرسوم البيانية" id="section-charts" collapsed={collapsedSections.charts} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'charts' })} />
      <Collapse in={!collapsedSections.charts} unmountOnExit>
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} md={4}>
            <RegistrationChart data={charts.registrations} delay={0.35} />
          </Grid>
          <Grid item xs={12} md={4}>
            <ActivityChart data={charts.activity} delay={0.4} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <RoleDistributionChart data={charts.roleDistribution} delay={0.45} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <SessionStatusChart data={charts.sessionStatus} delay={0.5} />
          </Grid>
        </Grid>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 5. CLINICAL */}
    {isSectionVisible('clinical') && (
    <SectionErrorFallback label="السريرية" aria-labelledby="section-clinical-heading">
      <SectionDivider label="🏥 الخدمات السريرية والتأهيلية" id="section-clinical" collapsed={collapsedSections.clinical} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'clinical' })} />
      <Collapse in={!collapsedSections.clinical} unmountOnExit>
        <Suspense fallback={<SectionSkeleton height={280} />}>
          <ClinicalOverview clinical={clinical} charts={charts} delay={0.55} />
        </Suspense>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 6. HR */}
    {isSectionVisible('hr') && (
    <SectionErrorFallback label="الموارد البشرية" aria-labelledby="section-hr-heading">
      <SectionDivider label="👥 الموارد البشرية" id="section-hr" collapsed={collapsedSections.hr} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'hr' })} />
      <Collapse in={!collapsedSections.hr} unmountOnExit>
        <Suspense fallback={<SectionSkeleton height={300} />}>
          <HROverview hr={hr} kpis={kpis} delay={0.65} />
        </Suspense>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 7. OPERATIONS */}
    {isSectionVisible('operations') && (
    <SectionErrorFallback label="العمليات" aria-labelledby="section-operations-heading">
      <SectionDivider label="⚙️ العمليات والخدمات اللوجستية" id="section-operations" collapsed={collapsedSections.operations} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'operations' })} />
      <Collapse in={!collapsedSections.operations} unmountOnExit>
        <Suspense fallback={<SectionSkeleton height={340} />}>
          <OperationsOverview supplyChain={supplyChain} fleet={fleet} operations={operations} delay={0.75} />
        </Suspense>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 8. MODULES OVERVIEW */}
    {isSectionVisible('modules') && (
    <SectionErrorFallback label="الوحدات" aria-labelledby="section-modules-heading">
      <SectionDivider label="📦 وحدات النظام" id="section-modules" collapsed={collapsedSections.modules} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'modules' })} />
      <Collapse in={!collapsedSections.modules} unmountOnExit>
        <Suspense fallback={<SectionSkeleton height={260} />}>
          <ModulesSummary kpis={kpis} supplyChain={supplyChain} fleet={fleet} operations={operations} delay={0.85} />
        </Suspense>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 9. QUICK ACTIONS */}
    {isSectionVisible('quick') && (
    <SectionErrorFallback label="إجراءات سريعة" aria-labelledby="section-quick-heading">
      <SectionDivider label="⚡ إجراءات سريعة" id="section-quick" collapsed={collapsedSections.quick} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'quick' })} />
      <Collapse in={!collapsedSections.quick} unmountOnExit>
        <QuickActions />
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* 10. ACTIVITY + SYSTEM HEALTH */}
    {isSectionVisible('activity') && (
    <SectionErrorFallback label="النشاط" aria-labelledby="section-activity-heading">
      <SectionDivider label="📋 النشاط وصحة النظام" id="section-activity" collapsed={collapsedSections.activity} onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'activity' })} />
      <Collapse in={!collapsedSections.activity} unmountOnExit>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={8}>
            <ActivityFeed activities={data?.recentActivity} maxItems={10} />
          </Grid>
          <Grid item xs={12} md={4}>
            <SystemHealth system={data?.system} />
          </Grid>
        </Grid>
      </Collapse>
    </SectionErrorFallback>
    )}

    {/* ══════════════════════════════════════════════════════ */}
    {/* 11. PRO TOOLS — مركز الأدوات الاحترافية              */}
    {/* ══════════════════════════════════════════════════════ */}
    <SectionErrorFallback label="الأدوات الاحترافية">
      <SectionDivider
        label="🚀 الأدوات الاحترافية"
        id="section-pro-tools"
        collapsed={collapsedSections['pro-tools']}
        onToggle={() => dispatch({ type: 'TOGGLE_SECTION', id: 'pro-tools' })}
      />
      <Collapse in={!collapsedSections['pro-tools']} unmountOnExit>
        {/* Pro Analytics — Full Width */}
        <Suspense fallback={<SectionSkeleton height={340} />}>
          <Box sx={{ mb: 2 }}>
            <AdvancedAnalyticsPanel />
          </Box>
        </Suspense>

        {/* Notifications + Productivity */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Suspense fallback={<SectionSkeleton height={300} />}>
              <NotificationCenter />
            </Suspense>
          </Grid>
          <Grid item xs={12} md={6}>
            <Suspense fallback={<SectionSkeleton height={300} />}>
              <UserProductivityWidget />
            </Suspense>
          </Grid>
        </Grid>

        {/* Tasks + Calendar */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Suspense fallback={<SectionSkeleton height={300} />}>
              <TaskManagerWidget />
            </Suspense>
          </Grid>
          <Grid item xs={12} md={6}>
            <Suspense fallback={<SectionSkeleton height={300} />}>
              <CalendarEventsWidget />
            </Suspense>
          </Grid>
        </Grid>
      </Collapse>
    </SectionErrorFallback>
  </>
);

export default DashboardSections;
