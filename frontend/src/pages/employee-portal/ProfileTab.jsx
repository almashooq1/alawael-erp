/**
 * ProfileTab — بوابة الموظف: تبويب الملف الشخصي
 */
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as DeptIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { statusColors } from '../../theme/palette';
import { fmt } from './employeePortalData';

export default function ProfileTab({
  profile,
  leaveStats,
  requests,
  payrollSummary,
  documents,
  deptColor: _deptColor,
}) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PersonIcon color="primary" /> المعلومات الشخصية
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {[
                { icon: <BadgeIcon />, label: 'رقم الموظف', val: profile.empId },
                { icon: <DeptIcon />, label: 'القسم', val: profile.department },
                { icon: <WorkIcon />, label: 'المسمى الوظيفي', val: profile.position },
                { icon: <CalendarIcon />, label: 'تاريخ الانضمام', val: profile.joinDate },
                { icon: <PersonIcon />, label: 'الجنسية', val: profile.nationality || 'سعودي' },
                {
                  icon: <PersonIcon />,
                  label: 'الحالة الاجتماعية',
                  val: profile.maritalStatus || '-',
                },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ color: 'text.secondary', display: 'flex' }}>{f.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {f.label}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {f.val}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PhoneIcon color="primary" /> معلومات التواصل والبنك
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {[
                { icon: <EmailIcon />, label: 'البريد الإلكتروني', val: profile.email },
                { icon: <PhoneIcon />, label: 'رقم الجوال', val: profile.phone },
                { icon: <PersonIcon />, label: 'المدير المباشر', val: profile.manager },
                { icon: <DeptIcon />, label: 'المدينة', val: profile.city || 'الرياض' },
                { icon: <BankIcon />, label: 'البنك', val: profile.bankName || '-' },
                { icon: <BankIcon />, label: 'IBAN', val: profile.iban || '-' },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ color: 'text.secondary', display: 'flex' }}>{f.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {f.label}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ direction: f.label === 'IBAN' ? 'ltr' : 'rtl' }}
                      >
                        {f.val}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Grid container spacing={2}>
          {[
            {
              label: 'رصيد الإجازة المتبقي',
              val: `${leaveStats.totalRemaining} يوم`,
              color: statusColors.info,
            },
            {
              label: 'طلبات معلقة',
              val: leaveStats.pendingCount + requests.filter(r => r.status === 'pending').length,
              color: statusColors.warning,
            },
            {
              label: 'آخر راتب صافي',
              val: payrollSummary ? `${fmt(payrollSummary.latest.net)} ر.س` : '-',
              color: statusColors.success,
            },
            { label: 'مستندات', val: documents.length, color: statusColors.purple },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card
                sx={{ borderRadius: 3, borderTop: `4px solid ${s.color}`, textAlign: 'center' }}
              >
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                    {s.val}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );
}
