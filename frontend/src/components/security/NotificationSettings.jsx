import React, { useEffect, useState } from 'react';
import { Box, Typography, Switch, FormControlLabel, Paper, Button, TextField } from '@mui/material';
// import { sendSecurityEmailAlert } from '../communications/EmailPanel'; // For real integration

const NotificationSettings = () => {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [inApp, setInApp] = useState(true);
  const [securityEmail, setSecurityEmail] = useState(true);
  const [securitySms, setSecuritySms] = useState(true);

  const [whatsapp, setWhatsapp] = useState(localStorage.getItem('securityWhatsappEnabled') !== '0');
  const [whatsappNumber, setWhatsappNumber] = useState(localStorage.getItem('securityWhatsappNumber') || '');
  const [whatsappNumberError, setWhatsappNumberError] = useState('');
  const [emailTemplate, setEmailTemplate] = useState(localStorage.getItem('securityEmailTemplate') || 'تنبيه أمني: تم تغيير صلاحيات الدور: {role} بواسطة المدير.');
  const [smsTemplate, setSmsTemplate] = useState(localStorage.getItem('securitySmsTemplate') || 'تنبيه أمني: تم تغيير صلاحيات الدور: {role} بواسطة المدير.');
  // Multiple WhatsApp templates by event type
  const defaultWhatsappTemplates = {
    roleChange: 'تنبيه واتساب: تم تغيير صلاحيات الدور: {role} بواسطة المدير.',
    userLock: 'تنبيه واتساب: تم قفل حساب المستخدم: {user} بواسطة المدير.',
    permissionUpdate: 'تنبيه واتساب: تم تحديث صلاحيات المستخدم: {user} في الدور: {role}.',
  };
  const [whatsappTemplates, setWhatsappTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('securityWhatsappTemplates')) || defaultWhatsappTemplates;
    } catch {
      return defaultWhatsappTemplates;
    }
  });

  // In real app, fetch and save preferences from backend
  useEffect(() => {
    setEmailTemplate(localStorage.getItem('securityEmailTemplate') || 'تنبيه أمني: تم تغيير صلاحيات الدور: {role} بواسطة المدير.');
    setSmsTemplate(localStorage.getItem('securitySmsTemplate') || 'تنبيه أمني: تم تغيير صلاحيات الدور: {role} بواسطة المدير.');
    setWhatsapp(localStorage.getItem('securityWhatsappEnabled') !== '0');
    try {
      setWhatsappTemplates(JSON.parse(localStorage.getItem('securityWhatsappTemplates')) || defaultWhatsappTemplates);
    } catch {
      setWhatsappTemplates(defaultWhatsappTemplates);
    }
    setWhatsappNumber(localStorage.getItem('securityWhatsappNumber') || '');
  }, []);

  const handleSave = () => {
    // Validate WhatsApp number if enabled
    if (whatsapp) {
      // Accepts numbers like 9665xxxxxxx or +9665xxxxxxx
      const regex = /^\+?\d{10,15}$/;
      if (!regex.test(whatsappNumber)) {
        setWhatsappNumberError('يرجى إدخال رقم واتساب بصيغة دولية صحيحة (مثال: 9665xxxxxxx)');
        return;
      }
    }
    setWhatsappNumberError('');
    // Save preferences (mock)
    localStorage.setItem('securityEmailEnabled', securityEmail ? '1' : '0');
    localStorage.setItem('securitySmsEnabled', securitySms ? '1' : '0');
    localStorage.setItem('securityWhatsappEnabled', whatsapp ? '1' : '0');
    localStorage.setItem('securityEmailTemplate', emailTemplate);
    localStorage.setItem('securitySmsTemplate', smsTemplate);
    localStorage.setItem('securityWhatsappTemplates', JSON.stringify(whatsappTemplates));
    localStorage.setItem('securityWhatsappNumber', whatsappNumber);
    alert('تم حفظ إعدادات التنبيهات (محاكاة)');
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h6" mb={2}>إعدادات التنبيهات</Typography>
      <FormControlLabel
        control={<Switch checked={email} onChange={e => setEmail(e.target.checked)} />}
        label="تنبيهات البريد الإلكتروني"
      />
      <FormControlLabel
        control={<Switch checked={sms} onChange={e => setSms(e.target.checked)} />}
        label="تنبيهات الرسائل النصية (SMS)"
      />
      <FormControlLabel
        control={<Switch checked={inApp} onChange={e => setInApp(e.target.checked)} />}
        label="تنبيهات داخل النظام"
      />
      <FormControlLabel
        control={<Switch checked={securityEmail} onChange={e => setSecurityEmail(e.target.checked)} />}
        label="إرسال تنبيهات الأمان الحرجة للبريد الإلكتروني"
      />
      <FormControlLabel
        control={<Switch checked={securitySms} onChange={e => setSecuritySms(e.target.checked)} />}
        label="إرسال تنبيهات الأمان الحرجة عبر SMS"
      />
      <FormControlLabel
        control={<Switch checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} />}
        label="إرسال تنبيهات الأمان الحرجة عبر واتساب"
      />
      <TextField
        label="نص رسالة البريد عند تنبيه أمني"
        value={emailTemplate}
        onChange={e => setEmailTemplate(e.target.value)}
        fullWidth
        margin="dense"
        helperText="استخدم {role} لوضع اسم الدور في الرسالة"
      />
      <TextField
        label="نص رسالة SMS عند تنبيه أمني"
        value={smsTemplate}
        onChange={e => setSmsTemplate(e.target.value)}
        fullWidth
        margin="dense"
        helperText="استخدم {role} لوضع اسم الدور في الرسالة"
      />
      <TextField
        label="رقم واتساب لاستقبال التنبيهات (مثال: 9665xxxxxxx)"
        value={whatsappNumber}
        onChange={e => setWhatsappNumber(e.target.value)}
        fullWidth
        margin="dense"
        helperText={whatsappNumberError || 'أدخل رقم واتساب بصيغة دولية.'}
        error={!!whatsappNumberError}
        type="tel"
      />
      <Typography variant="subtitle2" mt={2}>قوالب رسائل واتساب حسب نوع الحدث الأمني:</Typography>
      <TextField
        label="تغيير صلاحيات الدور"
        value={whatsappTemplates.roleChange}
        onChange={e => setWhatsappTemplates(t => ({ ...t, roleChange: e.target.value }))}
        fullWidth
        margin="dense"
        helperText="استخدم {role} لوضع اسم الدور في الرسالة"
      />
      <TextField
        label="قفل حساب مستخدم"
        value={whatsappTemplates.userLock}
        onChange={e => setWhatsappTemplates(t => ({ ...t, userLock: e.target.value }))}
        fullWidth
        margin="dense"
        helperText="استخدم {user} لوضع اسم المستخدم في الرسالة"
      />
      <TextField
        label="تحديث صلاحيات مستخدم"
        value={whatsappTemplates.permissionUpdate}
        onChange={e => setWhatsappTemplates(t => ({ ...t, permissionUpdate: e.target.value }))}
        fullWidth
        margin="dense"
        helperText="استخدم {user} و{role} في الرسالة"
      />
      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleSave}>حفظ</Button>
      </Box>
    </Paper>
  );
};

export default NotificationSettings;
