import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const BeneficiaryManagement = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('beneficiaries.title')} />
      <CardContent>
        <Typography>{t('beneficiaries.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryManagement;
