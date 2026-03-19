import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendIcon,
  DateRange as DateIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const FinancialReports = () => {
  const [reportType, setReportType] = useState('trial-balance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  const reportTypes = [
    { value: 'trial-balance', label: 'ميزان المراجعة' },
    { value: 'balance-sheet', label: 'الميزانية العمومية' },
    { value: 'income-statement', label: 'قائمة الدخل' },
    { value: 'cash-flow', label: 'قائمة التدفقات النقدية' },
    { value: 'general-ledger', label: 'دفتر الأستاذ العام' },
    { value: 'aged-receivables', label: 'أعمار الديون - المدينون' },
    { value: 'aged-payables', label: 'أعمار الديون - الدائنون' },
  ];

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      setError('يرجى تحديد تاريخ البداية والنهاية');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_URL}/api/accounting/reports/${reportType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate },
        }
      );
      
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل التقرير');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/accounting/reports/${reportType}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate },
          responseType: 'blob',
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportType}-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('فشل في تحميل PDF');
    }
  };

  const downloadExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/accounting/reports/${reportType}/excel`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate },
          responseType: 'blob',
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportType}-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('فشل في تحميل Excel');
    }
  };

  // Render Trial Balance
  const renderTrialBalance = () => {
    if (!reportData?.accounts) return null;

    const totalDebit = reportData.accounts.reduce((sum, acc) => sum + (acc.debit || 0), 0);
    const totalCredit = reportData.accounts.reduce((sum, acc) => sum + (acc.credit || 0), 0);

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          ميزان المراجعة
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>الحساب</strong></TableCell>
                <TableCell><strong>الكود</strong></TableCell>
                <TableCell align="right"><strong>مدين</strong></TableCell>
                <TableCell align="right"><strong>دائن</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.accounts.map((account) => (
                <TableRow key={account._id}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.code}</TableCell>
                  <TableCell align="right">
                    {account.debit > 0 ? account.debit.toLocaleString('ar-SA') : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {account.credit > 0 ? account.credit.toLocaleString('ar-SA') : '-'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>
                <TableCell colSpan={2}><strong>الإجمالي</strong></TableCell>
                <TableCell align="right"><strong>{totalDebit.toLocaleString('ar-SA')}</strong></TableCell>
                <TableCell align="right"><strong>{totalCredit.toLocaleString('ar-SA')}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Chart */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            الرسم البياني
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.accounts.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="code" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="debit" fill="#8884d8" name="مدين" />
              <Bar dataKey="credit" fill="#82ca9d" name="دائن" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    );
  };

  // Render Balance Sheet
  const renderBalanceSheet = () => {
    if (!reportData) return null;

    const pieData = [
      { name: 'الأصول', value: reportData.totalAssets || 0 },
      { name: 'الخصوم', value: reportData.totalLiabilities || 0 },
      { name: 'حقوق الملكية', value: reportData.totalEquity || 0 },
    ];

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          الميزانية العمومية
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي الأصول
                </Typography>
                <Typography variant="h4" color="primary">
                  {reportData.totalAssets?.toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي الخصوم
                </Typography>
                <Typography variant="h4" color="error">
                  {reportData.totalLiabilities?.toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي حقوق الملكية
                </Typography>
                <Typography variant="h4" color="success">
                  {reportData.totalEquity?.toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toLocaleString('ar-SA')}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    );
  };

  // Render Income Statement
  const renderIncomeStatement = () => {
    if (!reportData) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          قائمة الدخل
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography color="white" gutterBottom>
                  إجمالي الإيرادات
                </Typography>
                <Typography variant="h4" color="white">
                  {reportData.totalRevenue?.toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Typography color="white" gutterBottom>
                  إجمالي المصروفات
                </Typography>
                <Typography variant="h4" color="white">
                  {reportData.totalExpenses?.toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: reportData.netProfit >= 0 ? 'primary.main' : 'warning.main' }}>
              <CardContent>
                <Typography color="white" gutterBottom>
                  صافي الربح/الخسارة
                </Typography>
                <Typography variant="h4" color="white">
                  {reportData.netProfit?.toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                  })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                { name: 'الإيرادات', value: reportData.totalRevenue },
                { name: 'المصروفات', value: reportData.totalExpenses },
                { name: 'صافي الربح', value: reportData.netProfit },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name="المبلغ" />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ReportIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h5" fontWeight="bold">
            التقارير المالية
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>نوع التقرير</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="نوع التقرير"
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="من تاريخ"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="إلى تاريخ"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchReport}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'عرض'}
            </Button>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        {reportData && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={downloadPDF}
            >
              تحميل PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExcelIcon />}
              onClick={downloadExcel}
            >
              تحميل Excel
            </Button>
          </Box>
        )}

        {/* Report Content */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : reportData ? (
          <>
            {reportType === 'trial-balance' && renderTrialBalance()}
            {reportType === 'balance-sheet' && renderBalanceSheet()}
            {reportType === 'income-statement' && renderIncomeStatement()}
            {['cash-flow', 'general-ledger', 'aged-receivables', 'aged-payables'].includes(reportType) && (
              <Alert severity="info" sx={{ mt: 3 }}>
                عرض {reportTypes.find(t => t.value === reportType)?.label} قيد التطوير
              </Alert>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              اختر نوع التقرير والفترة الزمنية ثم اضغط "عرض"
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FinancialReports;
