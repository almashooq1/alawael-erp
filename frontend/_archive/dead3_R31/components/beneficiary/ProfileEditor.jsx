import React from 'react';
import { Card, CardContent, CardHeader, TextField, Button, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const ProfileEditor = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('profile.title')} />
      <CardContent>
        <Box className="form-group">
          <TextField fullWidth label={t('profile.firstName')} />
          <TextField fullWidth label={t('profile.lastName')} />
          <TextField fullWidth type="email" label={t('profile.email')} />
          <Button variant="contained" color="primary" style={{ marginTop: 10 }}>
            {t('actions.save')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfileEditor;
