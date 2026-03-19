import React from 'react';
import { Card, CardContent, CardHeader, Box, Typography, TextField, Button } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const MessageCenter = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <Card>
        <CardHeader title={t('messages.title')} />
        <CardContent>
          <Typography>{t('messages.subtitle')}</Typography>
          <TextField fullWidth label={t('messages.compose')} multiline rows={4} />
          <Button variant="contained" color="primary" style={{ marginTop: 10 }}>
            {t('actions.send')}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MessageCenter;
