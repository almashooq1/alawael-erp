import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const AttendanceTracker = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('attendance.title')} />
      <CardContent>
        <Typography>{t('attendance.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default AttendanceTracker;
