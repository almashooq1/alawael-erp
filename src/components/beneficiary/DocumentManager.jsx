import React from 'react';
import { Card, CardContent, CardHeader, Typography, List, ListItem } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const DocumentManager = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('documents.title')} />
      <CardContent>
        <Typography>{t('documents.subtitle')}</Typography>
        <List>
          <ListItem>{t('documents.noDocuments')}</ListItem>
        </List>
      </CardContent>
    </Card>
  );
};

export default DocumentManager;
