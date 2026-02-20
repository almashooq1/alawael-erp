import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Table, TableHead, TableRow, TableCell, TableBody, Chip, Divider, CircularProgress } from '@mui/material';



function NotificationTemplatesAdmin() {
  // Minimal working state for table rendering only
  const [templates] = useState([]);
  const [loading] = useState(false);
  const [error] = useState(null);

  // Render
  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight={600}>إدارة قوالب الإشعارات</Typography>
          {/* <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>قالب جديد</Button> */}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {error && <Box color="error.main" mb={2}>{error}</Box>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الموضوع</TableCell>
              <TableCell>القنوات</TableCell>
              <TableCell>المتغيرات</TableCell>
              <TableCell>نشط</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7}><Box textAlign="center"><CircularProgress size={24} /></Box></TableCell></TableRow>
            ) : templates.map(t => (
              <TableRow key={t._id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>
                  {t.channels.map(c => <Chip key={c} label={
                    c === 'slack' ? 'Slack'
                    : c === 'teams' ? 'Teams'
                    : c === 'telegram' ? 'Telegram'
                    : c === 'inApp' ? 'داخل النظام'
                    : c === 'email' ? 'بريد إلكتروني'
                    : c === 'sms' ? 'رسالة نصية'
                    : c === 'whatsapp' ? 'واتساب'
                    : c === 'push' ? 'إشعار جوال'
                    : c
                  } size="small" sx={{ mr: 0.5 }} />)}
                </TableCell>
                <TableCell>{(t.variables || []).join(', ')}</TableCell>
                <TableCell>{t.isActive ? 'نعم' : 'لا'}</TableCell>
                <TableCell>
                  {/* Actions removed for now to resolve undefined handler errors */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Dialogs and modals would go here, omitted for brevity */}
      </CardContent>
    </Card>
  );
}

export default NotificationTemplatesAdmin;
