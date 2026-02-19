import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const PaymentProcessor = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('payments.title')} />
      <CardContent>
        <Typography>{t('payments.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default PaymentProcessor;
