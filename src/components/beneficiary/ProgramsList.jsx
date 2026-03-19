import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const ProgramsList = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('programs.title')} />
      <CardContent>
        <Typography>{t('programs.subtitle')}</Typography>
      </CardContent>
    </Card>
  );
};

export default ProgramsList;
