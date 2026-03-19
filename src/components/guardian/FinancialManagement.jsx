import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const FinancialManagement = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('financial.title')} />
      <CardContent>
        <Typography>{t('financial.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default FinancialManagement;
