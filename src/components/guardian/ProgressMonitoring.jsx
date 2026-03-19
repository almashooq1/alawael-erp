import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const ProgressMonitoring = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('progress.title')} />
      <CardContent>
        <Typography>{t('progress.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default ProgressMonitoring;
