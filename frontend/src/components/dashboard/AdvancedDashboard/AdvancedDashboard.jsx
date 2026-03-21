/**
 * 📊 Advanced Dashboard v3 — Orchestrator
 * لوحة التحكم التنفيذية المحسّنة مع شريط تنقل سريع بين الأقسام
 */
import { Box, useTheme } from '@mui/material';
import { SECTIONS } from '../dashboardConstants';
import { useAdvancedDashboard } from './useAdvancedDashboard';
import { gradients } from 'theme/palette';

const AdvancedDashboard = () => {
  const theme = useTheme();
  const {
    data, loading, error, lastUpdated, refreshing, showScrollTop,
    activeSection, refreshProgress, socketToast, dataSource,
    collapsedSections, searchQuery,
    kpis, charts, finance, clinical, hr, supplyChain, fleet, operations,
    kpiCards, mergedAlerts, visibleSections, socketConnected,
    refreshFlash, isOnline, relativeTime, sessionDuration,
    showShortcuts, setShowShortcuts,
    dispatch, fetchData, scrollToTop, isSectionVisible,
    dashboardRef, exportData,
  } = useAdvancedDashboard();

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardErrorBoundary>
      <DashboardGlobalStyles />

      <Box
        id="dashboard-content"
        ref={dashboardRef}
        role="main"
        aria-label="لوحة التحكم التنفيذية"
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          minHeight: '100vh',
          background: theme.palette.mode === 'dark'
            ? gradients.dashboardDark
            : gradients.dashboardLight,
        }}
      >
        {/* 1. WELCOME HEADER */}
        <WelcomeHeader
          finance={finance}
          alerts={mergedAlerts}
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          kpis={kpis}
          onExport={exportData}
          dataSource={dataSource}
          onMarkAllRead={() => {
            if (data?.alerts) {
              dispatch({ type: 'SET_DATA', data: { ...data, alerts: data.alerts.map(a => ({ ...a, read: true })) } });
            }
          }}
        />

        {/* SECTION NAV BAR */}
        <SectionNav
          activeSection={activeSection}
          collapsedSections={collapsedSections}
          onToggleAll={() => dispatch({ type: 'TOGGLE_ALL_SECTIONS', sectionIds: SECTIONS.map(s => s.id) })}
        />

        {/* SEARCH / FILTER BAR */}
        <DashboardSearchBar
          searchQuery={searchQuery}
          onSearchChange={(val) => dispatch({ type: 'SET_SEARCH', value: val })}
          visibleSections={visibleSections}
        />

        {/* STATUS BANNERS */}
        <DashboardStatusBanners
          isOnline={isOnline}
          refreshFlash={refreshFlash}
          refreshProgress={refreshProgress}
          refreshing={refreshing}
        />

        {/* 2. CORE KPI CARDS */}
        <KpiCardsGrid kpiCards={kpiCards} refreshing={refreshing} />

        {/* 3–10. DASHBOARD SECTIONS */}
        <DashboardSections
          isSectionVisible={isSectionVisible}
          collapsedSections={collapsedSections}
          dispatch={dispatch}
          finance={finance}
          charts={charts}
          clinical={clinical}
          hr={hr}
          kpis={kpis}
          supplyChain={supplyChain}
          fleet={fleet}
          operations={operations}
          data={data}
        />

        {/* FOOTER */}
        <DashboardFooter
          socketConnected={socketConnected}
          isOnline={isOnline}
          lastUpdated={lastUpdated}
          relativeTime={relativeTime}
          dataSource={dataSource}
          sessionDuration={sessionDuration}
        />

        {/* OVERLAYS */}
        <DashboardOverlays
          showScrollTop={showScrollTop}
          scrollToTop={scrollToTop}
          error={error}
          dispatch={dispatch}
          fetchData={fetchData}
          socketToast={socketToast}
          showShortcuts={showShortcuts}
          setShowShortcuts={setShowShortcuts}
        />
      </Box>
    </DashboardErrorBoundary>
  );
};

export default AdvancedDashboard;
