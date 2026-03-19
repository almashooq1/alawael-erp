import React from 'react';
import { Card, CardContent, CardHeader, Switch, FormControlLabel, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const SettingsPanel = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
  });

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  return (
    <Card>
      <CardHeader title={t('settings.title')} />
      <CardContent>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={settings.emailNotifications}
                onChange={() => handleSettingChange('emailNotifications')}
              />
            }
            label={t('settings.emailNotifications')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.smsNotifications}
                onChange={() => handleSettingChange('smsNotifications')}
              />
            }
            label={t('settings.smsNotifications')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.pushNotifications}
                onChange={() => handleSettingChange('pushNotifications')}
              />
            }
            label={t('settings.pushNotifications')}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
