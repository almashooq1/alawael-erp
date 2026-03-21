/**
 * 🎨 DashboardCustomizer — أداة تخصيص لوحة التحكم
 * Professional dashboard layout customizer with drag-and-drop widget management
 */
import { useState, useCallback } from 'react';
import { useTheme,
} from '@mui/material';
import { gradients, brandColors } from 'theme/palette';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Slider,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import CloseIcon from '@mui/icons-material/Close';
import GridViewIcon from '@mui/icons-material/GridView';
import PaletteIcon from '@mui/icons-material/Palette';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SettingsIcon from '@mui/icons-material/Settings';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';

const WIDGETS = [
  { id: 'kpi', label: 'بطاقات KPI', icon: <SpeedIcon />, defaultVisible: true, description: 'مؤشرات الأداء الرئيسية' },
  { id: 'analytics', label: 'التحليلات المتقدمة', icon: <AnalyticsIcon />, defaultVisible: true, description: 'رسوم بيانية وتحليلات شاملة' },
  { id: 'notifications', label: 'مركز الإشعارات', icon: <NotificationsActiveIcon />, defaultVisible: true, description: 'إشعارات وتنبيهات النظام' },
  { id: 'tasks', label: 'مدير المهام', icon: <TaskAltIcon />, defaultVisible: true, description: 'إدارة المهام والمشاريع' },
  { id: 'calendar', label: 'التقويم والأحداث', icon: <CalendarMonthIcon />, defaultVisible: true, description: 'تقويم وجدول المواعيد' },
  { id: 'productivity', label: 'الإنتاجية', icon: <PersonIcon />, defaultVisible: true, description: 'متابعة الإنتاجية الشخصية' },
  { id: 'finance', label: 'الملخص المالي', icon: <BarChartIcon />, defaultVisible: true, description: 'الإيرادات والمصروفات' },
  { id: 'security', label: 'الأمان', icon: <SecurityIcon />, defaultVisible: false, description: 'تنبيهات أمنية ومراقبة' },
];

const COLOR_THEMES = [
  { id: 'default', label: 'الافتراضي', primary: '#667eea', secondary: '#764ba2' },
  { id: 'ocean', label: 'المحيط', primary: '#0093E9', secondary: '#80D0C7' },
  { id: 'sunset', label: 'الغروب', primary: '#FA8BFF', secondary: '#2BD2FF' },
  { id: 'forest', label: 'الغابة', primary: '#11998e', secondary: '#38ef7d' },
  { id: 'royal', label: 'الملكي', primary: '#4A00E0', secondary: '#8E2DE2' },
  { id: 'fire', label: 'النار', primary: '#f12711', secondary: '#f5af19' },
];

const LAYOUT_OPTIONS = [
  { id: 'comfortable', label: 'مريح', icon: <ViewStreamIcon />, spacing: 3 },
  { id: 'default', label: 'افتراضي', icon: <ViewModuleIcon />, spacing: 2 },
  { id: 'compact', label: 'مضغوط', icon: <ViewCompactIcon />, spacing: 1 },
];

const DEFAULT_PREFERENCES = {
  visibleWidgets: WIDGETS.filter(w => w.defaultVisible).map(w => w.id),
  widgetOrder: WIDGETS.map(w => w.id),
  colorTheme: 'default',
  layout: 'default',
  fontSize: 14,
  animationsEnabled: true,
  autoRefresh: true,
  refreshInterval: 60,
  compactMode: false,
  showWelcome: true,
  showFooter: true,
  columns: 2,
};

const DashboardCustomizer = ({ open, onClose, preferences, onSave }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [prefs, setPrefs] = useState(preferences || DEFAULT_PREFERENCES);

  const handleWidgetToggle = useCallback((widgetId) => {
    setPrefs(prev => {
      const visible = prev.visibleWidgets.includes(widgetId)
        ? prev.visibleWidgets.filter(id => id !== widgetId)
        : [...prev.visibleWidgets, widgetId];
      return { ...prev, visibleWidgets: visible };
    });
  }, []);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem('dashboard_preferences', JSON.stringify(prefs));
    } catch { /* ignore */ }
    if (onSave) onSave(prefs);
    onClose();
  }, [prefs, onSave, onClose]);

  const handleReset = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
  }, []);

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380 },
          borderRadius: { xs: 0, sm: '0 16px 16px 0' },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ background: gradients.primary, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DashboardCustomizeIcon sx={{ color: '#fff', fontSize: 24 }} />
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                تخصيص لوحة التحكم
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>
                تحكم في مظهر وتخطيط لوحة التحكم
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
        {/* Widgets Section */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GridViewIcon fontSize="small" /> الويدجات المرئية
        </Typography>
        <List dense sx={{ mb: 2 }}>
          {WIDGETS.map(widget => {
            const isVisible = prefs.visibleWidgets.includes(widget.id);
            return (
              <motion.div key={widget.id} layout whileHover={{ x: 3 }}>
                <ListItem
                  sx={{
                    borderRadius: 2, mb: 0.5,
                    border: '1px solid',
                    borderColor: isVisible
                      ? isDark ? 'rgba(102,126,234,0.2)' : 'rgba(102,126,234,0.15)'
                      : 'transparent',
                    bgcolor: isVisible
                      ? isDark ? 'rgba(102,126,234,0.05)' : 'rgba(102,126,234,0.03)'
                      : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar sx={{
                      width: 28, height: 28,
                      bgcolor: isVisible ? `${brandColors.primaryStart}15` : 'rgba(0,0,0,0.05)',
                      color: isVisible ? brandColors.primaryStart : 'text.disabled',
                      '& svg': { fontSize: 14 },
                    }}>
                      {widget.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{widget.label}</Typography>}
                    secondary={<Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>{widget.description}</Typography>}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      size="small"
                      checked={isVisible}
                      onChange={() => handleWidgetToggle(widget.id)}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </motion.div>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Color Theme */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon fontSize="small" /> نظام الألوان
        </Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {COLOR_THEMES.map(ct => (
            <Grid item xs={4} key={ct.id}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Box
                  onClick={() => setPrefs(prev => ({ ...prev, colorTheme: ct.id }))}
                  sx={{
                    p: 1, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                    border: '2px solid',
                    borderColor: prefs.colorTheme === ct.id ? ct.primary : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{
                    height: 30, borderRadius: 1.5, mb: 0.5,
                    background: `linear-gradient(135deg, ${ct.primary}, ${ct.secondary})`,
                  }} />
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>{ct.label}</Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Layout */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewModuleIcon fontSize="small" /> التخطيط
        </Typography>
        <ToggleButtonGroup
          value={prefs.layout}
          exclusive
          onChange={(_, v) => v && setPrefs(prev => ({ ...prev, layout: v }))}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          {LAYOUT_OPTIONS.map(opt => (
            <ToggleButton key={opt.id} value={opt.id} sx={{ fontSize: '0.75rem', textTransform: 'none' }}>
              {opt.icon}
              <Box sx={{ ml: 0.5 }}>{opt.label}</Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Columns */}
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          عدد الأعمدة: {prefs.columns}
        </Typography>
        <Slider
          value={prefs.columns}
          onChange={(_, v) => setPrefs(prev => ({ ...prev, columns: v }))}
          min={1} max={3} step={1}
          marks={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
          ]}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Typography */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextFieldsIcon fontSize="small" /> حجم الخط
        </Typography>
        <Slider
          value={prefs.fontSize}
          onChange={(_, v) => setPrefs(prev => ({ ...prev, fontSize: v }))}
          min={12} max={18} step={1}
          marks={[
            { value: 12, label: 'صغير' },
            { value: 14, label: 'عادي' },
            { value: 16, label: 'كبير' },
            { value: 18, label: 'أكبر' },
          ]}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Toggle Settings */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon fontSize="small" /> إعدادات عامة
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FormControlLabel
            control={<Switch size="small" checked={prefs.animationsEnabled} onChange={e => setPrefs(prev => ({ ...prev, animationsEnabled: e.target.checked }))} />}
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>تأثيرات الحركة</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={prefs.autoRefresh} onChange={e => setPrefs(prev => ({ ...prev, autoRefresh: e.target.checked }))} />}
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>التحديث التلقائي</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={prefs.compactMode} onChange={e => setPrefs(prev => ({ ...prev, compactMode: e.target.checked }))} />}
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>الوضع المضغوط</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={prefs.showWelcome} onChange={e => setPrefs(prev => ({ ...prev, showWelcome: e.target.checked }))} />}
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>عرض ترويسة الترحيب</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={prefs.showFooter} onChange={e => setPrefs(prev => ({ ...prev, showFooter: e.target.checked }))} />}
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>عرض شريط الحالة</Typography>}
          />
        </Box>

        {/* Refresh Interval */}
        {prefs.autoRefresh && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              فترة التحديث: {prefs.refreshInterval} ثانية
            </Typography>
            <Slider
              value={prefs.refreshInterval}
              onChange={(_, v) => setPrefs(prev => ({ ...prev, refreshInterval: v }))}
              min={15} max={300} step={15}
              marks={[
                { value: 15, label: '15ث' },
                { value: 60, label: '1د' },
                { value: 120, label: '2د' },
                { value: 300, label: '5د' },
              ]}
            />
          </Box>
        )}
      </Box>

      {/* Footer Actions */}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <Button
          fullWidth variant="outlined" size="small" startIcon={<RestoreIcon />}
          onClick={handleReset}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem' }}
        >
          استعادة الافتراضي
        </Button>
        <Button
          fullWidth variant="contained" size="small" startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', background: gradients.primary }}
        >
          حفظ التخصيص
        </Button>
      </Box>
    </Drawer>
  );
};

export { DEFAULT_PREFERENCES, WIDGETS };
export default DashboardCustomizer;
