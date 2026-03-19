import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Breadcrumbs,
  Link,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as AccountIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  TrendingUp as RevenueIcon,
  TrendingDown as ExpenseIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import AccountingDashboard from './AccountingDashboard';
import AccountsList from './AccountsList';
import JournalEntries from './JournalEntries';
import FinancialReports from './FinancialReports';
import Invoices from './Invoices';
import Payments from './Payments';
import Expenses from './Expenses';
import Settings from './Settings';

const AccountingMain = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // القوائم الرئيسية
  const tabs = [
    { label: 'لوحة المعلومات', icon: <DashboardIcon />, component: <AccountingDashboard /> },
    { label: 'دليل الحسابات', icon: <AccountIcon />, component: <AccountsList /> },
    { label: 'قيود اليومية', icon: <ReportIcon />, component: <JournalEntries /> },
    { label: 'الفواتير', icon: <InvoiceIcon />, component: <Invoices /> },
    { label: 'المدفوعات', icon: <PaymentIcon />, component: <Payments /> },
    { label: 'المصروفات', icon: <ExpenseIcon />, component: <Expenses /> },
    { label: 'التقارير المالية', icon: <ReportIcon />, component: <FinancialReports /> },
    { label: 'الإعدادات', icon: <SettingsIcon />, component: <Settings /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            الرئيسية
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <AccountIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            النظام المحاسبي
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                💼 النظام المحاسبي الاحترافي
              </Typography>
              <Typography variant="body1">
                نظام محاسبي متكامل لإدارة الحسابات، الفواتير، المدفوعات، والتقارير المالية
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Chip
                  label="41 حساب"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip
                  label="ضريبة 15%"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip
                  label="7 تقارير"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '0.95rem',
                fontWeight: 500,
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                sx={{
                  '&.Mui-selected': {
                    color: 'primary.main',
                    fontWeight: 'bold',
                  },
                }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Content Area */}
        <Box sx={{ mt: 3 }}>
          {tabs[activeTab].component}
        </Box>

        {/* Footer Info */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 2,
            bgcolor: 'info.light',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: 'info.main',
              color: 'white',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            💡
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="bold" color="info.dark">
              نصيحة: استخدم لوحة المعلومات لمتابعة الوضع المالي لحظياً
            </Typography>
            <Typography variant="caption" color="text.secondary">
              يتم تحديث البيانات تلقائياً كل 30 ثانية
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AccountingMain;
