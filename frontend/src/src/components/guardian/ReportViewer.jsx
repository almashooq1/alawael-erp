import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const ReportViewer = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('reports.title')} />
      <CardContent>
        <Typography>{t('reports.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default ReportViewer;
