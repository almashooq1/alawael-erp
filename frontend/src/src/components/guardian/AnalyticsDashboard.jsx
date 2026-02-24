import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const AnalyticsDashboard = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('analytics.title')} />
      <CardContent>
        <Typography>{t('analytics.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDashboard;
