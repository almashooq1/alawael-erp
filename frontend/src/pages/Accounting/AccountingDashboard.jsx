/**
 * ===================================================================
 * ACCOUNTING DASHBOARD - لوحة معلومات المحاسبة
 * ===================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Receipt,
  AttachMoney
} from '@mui/icons-material';
import axios from 'axios';

const AccountingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        '/api/accounting/analytics/dashboard',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
            endDate: new Date().toISOString()
          }
        }
      );

      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {trend && (
              <Typography
                variant="caption"
                color={trend > 0 ? 'success.main' : 'error.main'}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: '50%',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ fontSize: 40, color: `${color}.main` }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        لوحة معلومات المحاسبة
      </Typography>

      <Grid container spacing={3}>
        {/* إجمالي الإيرادات */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الإيرادات"
            value={`${dashboardData?.totalRevenue?.toLocaleString('ar-SA') || 0} ر.س`}
            icon={TrendingUp}
            color="success"
            trend={dashboardData?.revenueTrend}
          />
        </Grid>

        {/* إجمالي المصروفات */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي المصروفات"
            value={`${dashboardData?.totalExpenses?.toLocaleString('ar-SA') || 0} ر.س`}
            icon={Receipt}
            color="error"
            trend={dashboardData?.expensesTrend}
          />
        </Grid>

        {/* صافي الربح */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="صافي الربح"
            value={`${dashboardData?.netProfit?.toLocaleString('ar-SA') || 0} ر.س`}
            icon={AttachMoney}
            color={dashboardData?.netProfit >= 0 ? 'success' : 'error'}
            trend={dashboardData?.profitTrend}
          />
        </Grid>

        {/* الرصيد النقدي */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الرصيد النقدي"
            value={`${dashboardData?.cashBalance?.toLocaleString('ar-SA') || 0} ر.س`}
            icon={AccountBalance}
            color="info"
          />
        </Grid>

        {/* المدينون */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                المدينون (مستحقات)
              </Typography>
              <Typography variant="h5">
                {dashboardData?.accountsReceivable?.toLocaleString('ar-SA') || 0} ر.س
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {dashboardData?.overdueReceivables || 0} فاتورة متأخرة
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* الدائنون */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الدائنون (مستحقات)
              </Typography>
              <Typography variant="h5">
                {dashboardData?.accountsPayable?.toLocaleArray('ar-SA') || 0} ر.س
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {dashboardData?.overduePayables || 0} فاتورة متأخرة
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* الضريبة المستحقة */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                ضريبة القيمة المضافة
              </Typography>
              <Typography variant="h5">
                {dashboardData?.vatPayable?.toLocaleString('ar-SA') || 0} ر.س
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {dashboardData?.vatStatus === 'payable' ? 'مستحقة' : 'مستردة'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* الفواتير */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الفواتير
              </Typography>
              <Typography variant="h5">
                {dashboardData?.totalInvoices || 0}
              </Typography>
              <Typography variant="caption" color="success.main">
                {dashboardData?.paidInvoices || 0} مدفوعة
              </Typography>
              {' / '}
              <Typography variant="caption" color="warning.main">
                {dashboardData?.pendingInvoices || 0} معلقة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الإحصائيات الإضافية */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* أحدث القيود */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                أحدث القيود المحاسبية
              </Typography>
              {dashboardData?.recentEntries?.length > 0 ? (
                dashboardData.recentEntries.map((entry, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <Box>
                      <Typography variant="body2">{entry.reference}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {entry.description}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {new Date(entry.date).toLocaleDateString('ar-SA')}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography color="textSecondary">لا توجد قيود</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* أحدث الفواتير */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                أحدث الفواتير
              </Typography>
              {dashboardData?.recentInvoices?.length > 0 ? (
                dashboardData.recentInvoices.map((invoice, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <Box>
                      <Typography variant="body2">{invoice.invoiceNumber}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {invoice.customerName}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="body2">
                        {invoice.total.toLocaleString('ar-SA')} ر.س
                      </Typography>
                      <Typography
                        variant="caption"
                        color={
                          invoice.status === 'paid'
                            ? 'success.main'
                            : invoice.status === 'overdue'
                            ? 'error.main'
                            : 'warning.main'
                        }
                      >
                        {invoice.status === 'paid' ? 'مدفوعة' : 
                         invoice.status === 'overdue' ? 'متأخرة' : 'معلقة'}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography color="textSecondary">لا توجد فواتير</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountingDashboard;
