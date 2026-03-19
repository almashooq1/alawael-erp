import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const NotificationPanel = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('notifications.title')} />
      <CardContent>
        <Typography>{t('notifications.noNotifications')}</Typography>
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;
