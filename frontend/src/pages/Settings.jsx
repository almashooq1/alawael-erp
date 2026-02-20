import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import NotificationChannelsSettings from '../components/NotificationChannelsSettings';
import NotificationPreferencesPanel from '../components/NotificationPreferencesPanel';
import NotificationAnalyticsPanel from '../components/NotificationAnalyticsPanel';
import ScheduleNotificationPanel from '../components/notifications/ScheduleNotificationPanel';
import IntegrationPanel from '../components/IntegrationPanel';
import PerformanceEvaluationPanel from '../components/PerformanceEvaluationPanel';
import AiNotificationPanel from '../components/AiNotificationPanel';
import ApprovalRequestsPanel from '../components/ApprovalRequestsPanel';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Grid,
  Button,
  Alert
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  Language,
  Notifications,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  toggleTheme,
  setLanguage,
  updateNotificationSettings,
  updatePreferences,
  resetSettings
} from '../store/slices/settingsSlice';

const Settings = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const settings = useSelector(state => state.settings);

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleLanguageChange = (event) => {
    dispatch(setLanguage(event.target.value));
  };

  const handleNotificationToggle = (key) => (event) => {
    dispatch(updateNotificationSettings({
      [key]: event.target.checked
    }));
  };

  const handlePreferenceToggle = (key) => (event) => {
    dispatch(updatePreferences({
      [key]: event.target.checked
    }));
  };

  const handleResetSettings = () => {
    if (window.confirm(t('settings.confirmReset') || 'Reset all settings to default?')) {
      dispatch(resetSettings());
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 1, fontSize: 32 }} />
        <Typography variant="h4">{t('settings.title')}</Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Changes are saved automatically
      </Alert>

      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('settings.appearance')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Theme Toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {settings.theme === 'light' ? <Brightness7 /> : <Brightness4 />}
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.theme === 'dark'}
                      onChange={handleThemeToggle}
                      color="primary"
                    />
                  }
                  label={
                    settings.theme === 'light'
                      ? t('settings.lightMode')
                      : t('settings.darkMode')
                  }
                  sx={{ ml: 2, flex: 1 }}
                />
              </Box>

              {/* Language Selection */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Language />
                <FormControl fullWidth sx={{ ml: 2 }}>
                  <InputLabel>{t('settings.language')}</InputLabel>
                  <Select
                    value={settings.language}
                    onChange={handleLanguageChange}
                    label={t('settings.language')}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="ar">العربية (Arabic)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Compact Mode */}
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.preferences.compactMode}
                    onChange={handlePreferenceToggle('compactMode')}
                    color="primary"
                  />
                }
                label="Compact Mode"
              />

              {/* Animations */}
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.preferences.animationsEnabled}
                    onChange={handlePreferenceToggle('animationsEnabled')}
                    color="primary"
                  />
                }
                label="Enable Animations"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings & Scheduling */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Notifications /> {t('settings.notifications')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.enabled}
                    onChange={handleNotificationToggle('enabled')}
                    color="primary"
                  />
                }
                label="Enable Notifications"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.sound}
                    onChange={handleNotificationToggle('sound')}
                    color="primary"
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Sound Notifications"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.desktop}
                    onChange={handleNotificationToggle('desktop')}
                    color="primary"
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Desktop Notifications"
              />
            </CardContent>
          </Card>
          {/* إعدادات قنوات التنبيه الذكية */}
          <NotificationChannelsSettings />
          {/* لوحة تفضيلات الإشعارات الشخصية */}
          <NotificationPreferencesPanel />
          {/* لوحة تحليلات الإشعارات */}
          <NotificationAnalyticsPanel />
          {/* جدولة الإشعارات والتذكيرات */}
          <Box sx={{ mt: 3 }}>
            <ScheduleNotificationPanel userId={null} />
          </Box>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Current Theme:
                  </Typography>
                  <Typography variant="body1">
                    {settings.theme === 'dark' ? 'Dark' : 'Light'}
                  </Typography>
                </Grid>

                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Language:
                  </Typography>
                  <Typography variant="body1">
                    {settings.language === 'ar' ? 'العربية' : 'English'}
                  </Typography>
                </Grid>

                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Direction:
                  </Typography>
                  <Typography variant="body1">
                    {settings.direction.toUpperCase()}
                  </Typography>
                </Grid>

                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Notifications:
                  </Typography>
                  <Typography variant="body1">
                    {settings.notifications.enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleResetSettings}
                  style={touchButtonStyle}
                >
                  Reset All Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* إعدادات الشعار والألوان المؤسسية */}
      <Box sx={{ mt: 6 }}>
        <OrgBrandingSettings />
      </Box>
    </Box>
  );
};

export default Settings;
