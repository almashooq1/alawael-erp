/**
 * 🚀 ProDashboardLayout — لوحة التحكم الاحترافية المتكاملة
 * Integrates all pro widgets into a unified professional dashboard experience
 */
import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  Box, Grid, Typography, Fab, Tooltip, useTheme, Chip, Stack,
  IconButton, Collapse, Paper, Zoom,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { gradients, brandColors, statusColors } from 'theme/palette';
import {
  NotificationCenter,
  AdvancedAnalyticsPanel,
  UserProductivityWidget,
  TaskManagerWidget,
  CalendarEventsWidget,
  DashboardCustomizer,
  DEFAULT_PREFERENCES,
} from '../pro';
import DashboardErrorBoundary from '../shared/DashboardErrorBoundary';

/* ─── Section Wrapper ─── */
const ProSection = ({ id, title, icon, children, collapsed, onToggle, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Box sx={{ mb: 2 }}>
      <Box
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', mb: 1, px: 1,
          '&:hover': { opacity: 0.85 },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            icon={icon}
            label={title}
            size="small"
            sx={{
              fontWeight: 700, fontSize: '0.75rem',
              background: `${brandColors.primaryStart}14`,
              color: brandColors.primaryStart,
              border: `1px solid ${brandColors.primaryStart}30`,
              '& .MuiChip-icon': { color: brandColors.primaryStart },
            }}
          />
        </Stack>
        <IconButton size="small">
          {collapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={!collapsed} unmountOnExit timeout={300}>
        {children}
      </Collapse>
    </Box>
  </motion.div>
);

/* ─── Main Component ─── */
const ProDashboardLayout = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Load preferences
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_preferences');
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = useCallback((sectionId) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const isWidgetVisible = useCallback(
    (widgetId) => preferences.visibleWidgets.includes(widgetId),
    [preferences.visibleWidgets],
  );

  const handleSavePreferences = useCallback((newPrefs) => {
    setPreferences(newPrefs);
  }, []);

  // Compute grid columns based on preference
  const gridCols = useMemo(() => {
    switch (preferences.columns) {
      case 1: return 12;
      case 3: return 4;
      default: return 6;
    }
  }, [preferences.columns]);

  const spacing = useMemo(() => {
    switch (preferences.layout) {
      case 'comfortable': return 3;
      case 'compact': return 1;
      default: return 2;
    }
  }, [preferences.layout]);

  return (
    <DashboardErrorBoundary>
      <Box
        sx={{
          p: { xs: 1, sm: 1.5, md: 2 },
          minHeight: '100vh',
          fontSize: preferences.fontSize,
        }}
      >
        {/* Pro Header Badge */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: gradients.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
                  الأدوات الاحترافية
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                  {preferences.visibleWidgets.length} أدوات مفعّلة
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="تخصيص لوحة التحكم" arrow>
              <Fab
                size="small"
                onClick={() => setCustomizerOpen(true)}
                sx={{
                  background: gradients.primary,
                  color: '#fff',
                  boxShadow: '0 4px 16px rgba(102,126,234,0.35)',
                  '&:hover': { background: gradients.primary, transform: 'scale(1.05)' },
                }}
              >
                <DashboardCustomizeIcon fontSize="small" />
              </Fab>
            </Tooltip>
          </Box>
        </motion.div>

        {/* Widgets Grid */}
        <Grid container spacing={spacing}>
          {/* Analytics Panel — Full Width */}
          <AnimatePresence>
            {isWidgetVisible('analytics') && (
              <Grid item xs={12}>
                <ProSection
                  id="analytics"
                  title="التحليلات المتقدمة"
                  collapsed={collapsedSections.analytics}
                  onToggle={() => toggleSection('analytics')}
                  delay={0.1}
                />
                {!collapsedSections.analytics && <AdvancedAnalyticsPanel />}
              </Grid>
            )}
          </AnimatePresence>

          {/* Notifications + Productivity (2-col) */}
          <AnimatePresence>
            {isWidgetVisible('notifications') && (
              <Grid item xs={12} md={gridCols}>
                <ProSection
                  id="notifications"
                  title="مركز الإشعارات"
                  collapsed={collapsedSections.notifications}
                  onToggle={() => toggleSection('notifications')}
                  delay={0.15}
                />
                {!collapsedSections.notifications && <NotificationCenter />}
              </Grid>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isWidgetVisible('productivity') && (
              <Grid item xs={12} md={gridCols}>
                <ProSection
                  id="productivity"
                  title="الإنتاجية"
                  collapsed={collapsedSections.productivity}
                  onToggle={() => toggleSection('productivity')}
                  delay={0.2}
                />
                {!collapsedSections.productivity && <UserProductivityWidget />}
              </Grid>
            )}
          </AnimatePresence>

          {/* Tasks + Calendar (2-col) */}
          <AnimatePresence>
            {isWidgetVisible('tasks') && (
              <Grid item xs={12} md={gridCols}>
                <ProSection
                  id="tasks"
                  title="مدير المهام"
                  collapsed={collapsedSections.tasks}
                  onToggle={() => toggleSection('tasks')}
                  delay={0.25}
                />
                {!collapsedSections.tasks && <TaskManagerWidget />}
              </Grid>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isWidgetVisible('calendar') && (
              <Grid item xs={12} md={gridCols}>
                <ProSection
                  id="calendar"
                  title="التقويم والأحداث"
                  collapsed={collapsedSections.calendar}
                  onToggle={() => toggleSection('calendar')}
                  delay={0.3}
                />
                {!collapsedSections.calendar && <CalendarEventsWidget />}
              </Grid>
            )}
          </AnimatePresence>
        </Grid>

        {/* Customizer Drawer */}
        <DashboardCustomizer
          open={customizerOpen}
          onClose={() => setCustomizerOpen(false)}
          preferences={preferences}
          onSave={handleSavePreferences}
        />
      </Box>
    </DashboardErrorBoundary>
  );
};

export default ProDashboardLayout;
