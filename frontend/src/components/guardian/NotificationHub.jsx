import React from 'react';
import { Card, CardContent, CardHeader, Typography, List, ListItem, ListItemText } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const NotificationHub = () => {
  const { t } = useTranslation();
  const [notifications] = React.useState([
    { id: 1, title: 'Payment due', message: 'Your payment is due soon' },
    { id: 2, title: 'New grade', message: 'New grades have been posted' },
  ]);

  return (
    <Card>
      <CardHeader title={t('notifications.title')} />
      <CardContent>
        <List>
          {notifications.map((notif) => (
            <ListItem key={notif.id}>
              <ListItemText primary={notif.title} secondary={notif.message} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default NotificationHub;
