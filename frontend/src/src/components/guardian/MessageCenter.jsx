import React from 'react';
import { Card, CardContent, CardHeader, Typography, TextField, Button, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const MessageCenter = () => {
  const { t } = useTranslation();
  const [message, setMessage] = React.useState('');

  const handleSend = () => {
    console.log('Message sent:', message);
    setMessage('');
  };

  return (
    <Card>
      <CardHeader title={t('messages.title')} />
      <CardContent>
        <Box mb={2}>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('messages.compose')}
          />
        </Box>
        <Button variant="contained" color="primary" onClick={handleSend}>
          {t('messages.send')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MessageCenter;
