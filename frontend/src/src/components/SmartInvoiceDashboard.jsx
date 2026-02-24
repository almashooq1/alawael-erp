/**
 * ===================================================================
 * SMART INVOICE DASHBOARD - لوحة تحكم الفوترة الذكية
 * ===================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  CardHeader,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Send,
  Download,
  Print,
  AttachEmail,
  TrendingUp,
  Warning,
  CheckCircle,
  Clock,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import api from '../api/client';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SmartInvoiceDashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  useEffect(() => {
    loadInvoices();
    loadStatistics();
    loadOverdueInvoices();
  }, [filters]);

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/api/invoices?${params}`);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('خطأ في تحميل الفواتير:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get('/api/invoices/reports/statistics');
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  const loadOverdueInvoices = async () => {
    try {
      const response = await api.get('/api/invoices/reports/overdue');
      setOverdue(response.data.invoices || []);
    } catch (error) {
      console.error('خطأ في تحميل الفواتير المتأخرة:', error);
    }
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setOpenDialog(true);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setOpenDialog(true);
  };

  const handleSaveInvoice = async (invoiceData) => {
    try {
      if (selectedInvoice) {
        await api.put(`/api/invoices/${selectedInvoice._id}`, invoiceData);
      } else {
        await api.post('/api/invoices', invoiceData);
      }

      setOpenDialog(false);
      loadInvoices();
    } catch (error) {
      console.error('خطأ في حفظ الفاتورة:', error);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('هل تؤكد حذف هذه الفاتورة؟')) {
      try {
        await api.delete(`/api/invoices/${id}`);
        loadInvoices();
      } catch (error) {
        console.error('خطأ في حذف الفاتورة:', error);
      }
    }
  };

  const handleSendInvoice = async (id, email) => {
    try {
      await api.post(`/api/invoices/${id}/send`, { email });
      loadInvoices();
      alert('تم إرسال الفاتورة بنجاح');
    } catch (error) {
      console.error('خطأ في إرسال الفاتورة:', error);
    }
  };

  const handleExport = (format) => {
    window.location.href = `/api/invoices/export/${format}`;
  };

  // ============================================================================
  // RENDER STATUS BADGE
  // ============================================================================

  const renderStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'default', label: 'مسودة' },
      sent: { color: 'info', label: 'مرسلة' },
      viewed: { color: 'primary', label: 'مشاهدة' },
      paid: { color: 'success', label: 'مدفوعة' },
      partial: { color: 'warning', label: 'مدفوعة جزئياً' },
      overdue: { color: 'error', label: 'متأخرة' },
      cancelled: { color: 'error', label: 'ملغاة' },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // ============================================================================
  // RENDER INVOICE TABLE
  // ============================================================================

  const renderInvoicesTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>رقم الفاتورة</TableCell>
            <TableCell>العميل</TableCell>
            <TableCell align="right">المبلغ</TableCell>
            <TableCell align="right">المدفوع</TableCell>
            <TableCell>تاريخ الاستحقاق</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice._id}>
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>{invoice.customer.name}</TableCell>
              <TableCell align="right">{invoice.totalAmount.toFixed(2)} ر.س</TableCell>
              <TableCell align="right">{invoice.paidAmount.toFixed(2)} ر.س</TableCell>
              <TableCell>
                {new Date(invoice.dueDate).toLocaleDateString('ar-SA')}
              </TableCell>
              <TableCell>{renderStatusBadge(invoice.status)}</TableCell>
              <TableCell>
                <Tooltip title="تعديل">
                  <IconButton
                    size="small"
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteInvoice(invoice._id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="إرسال">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() =>
                      handleSendInvoice(invoice._id, invoice.customer.email)
                    }
                  >
                    <Send fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ============================================================================
  // RENDER STATISTICS CARDS
  // ============================================================================

  const renderStatisticsCards = () => (
    <Grid container spacing={2}>
      {statistics && (
        <>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>إجمالي الفواتير</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {statistics.totalInvoices}
                    </div>
                  </Box>
                  <TrendingUp color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>إجمالي المبالغ</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {statistics.totalAmount.toFixed(2)} ر.س
                    </div>
                  </Box>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>المدفوع</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {statistics.totalPaid.toFixed(2)} ر.س
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(statistics.collectionRate)}
                      style={{ marginTop: '0.5rem' }}
                    />
                  </Box>
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>متأخرة</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d32f2f' }}>
                      {overdue.length}
                    </div>
                  </Box>
                  <Warning color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  );

  // ============================================================================
  // RENDER FILTERS
  // ============================================================================

  const renderFilters = () => (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                label="الحالة"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="draft">مسودة</MenuItem>
                <MenuItem value="sent">مرسلة</MenuItem>
                <MenuItem value="paid">مدفوعة</MenuItem>
                <MenuItem value="partial">مدفوعة جزئياً</MenuItem>
                <MenuItem value="overdue">متأخرة</MenuItem>
                <MenuItem value="cancelled">ملغاة</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="البحث"
              placeholder="رقم الفاتورة أو العميل"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="من التاريخ"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters({ ...filters, dateFrom: e.target.value })
              }
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="إلى التاريخ"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value })
              }
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Container sx={{ py: 4 }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h1>لوحة تحكم الفوترة الذكية</h1>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleCreateInvoice}
            sx={{ mr: 1 }}
          >
            فاتورة جديدة
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('csv')}
            sx={{ mr: 1 }}
          >
            تصدير CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('json')}
          >
            تصدير JSON
          </Button>
        </Box>
      </Box>

      {/* ALERTS */}
      {overdue.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ لديك {overdue.length} فاتورة متأخرة. يرجى الاطلاع على التفاصيل أدناه.
        </Alert>
      )}

      {/* TABS */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
        >
          <Tab label="الفواتير" />
          <Tab label="الإحصائيات" />
          <Tab label="المتأخرة" />
        </Tabs>
      </Box>

      {/* TAB CONTENT */}
      {selectedTab === 0 && (
        <>
          {renderFilters()}
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            renderInvoicesTable()
          )}
        </>
      )}

      {selectedTab === 1 && (
        <>
          {renderStatisticsCards()}
          {statistics && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="توزيع الفواتير حسب الحالة" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'مدفوعة', value: invoices.filter(i => i.status === 'paid').length },
                            { name: 'معلقة', value: invoices.filter(i => ['draft', 'sent', 'partial'].includes(i.status)).length },
                            { name: 'متأخرة', value: overdue.length },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#4caf50" />
                          <Cell fill="#ff9800" />
                          <Cell fill="#f44336" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {selectedTab === 2 && (
        <>
          <Alert severity="error">الفواتير المتأخرة</Alert>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>رقم الفاتورة</TableCell>
                  <TableCell>العميل</TableCell>
                  <TableCell align="right">المبلغ</TableCell>
                  <TableCell>تاريخ الاستحقاق</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overdue.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customer.name}</TableCell>
                    <TableCell align="right">{invoice.totalAmount} ر.س</TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={() => handleSendInvoice(invoice._id, invoice.customer.email)}
                      >
                        إرسال تنبيه
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* CREATE/EDIT INVOICE DIALOG */}
      {openDialog && (
        <InvoiceForm
          open={openDialog}
          invoice={selectedInvoice}
          onClose={() => setOpenDialog(false)}
          onSave={handleSaveInvoice}
        />
      )}
    </Container>
  );
};

// ============================================================================
// INVOICE FORM COMPONENT
// ============================================================================

const InvoiceForm = ({ open, invoice, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    invoice || {
      customer: { name: '', email: '', phone: '' },
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    }
  );

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { description: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ p: 2 }}>
        <h2>{invoice ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}</h2>

        {/* CUSTOMER INFO */}
        <Box sx={{ mb: 2 }}>
          <h3>معلومات العميل</h3>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم العميل"
                value={formData.customer?.name || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer: { ...formData.customer, name: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.customer?.email || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer: { ...formData.customer, email: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الهاتف"
                value={formData.customer?.phone || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer: { ...formData.customer, phone: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="تاريخ الاستحقاق"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </Box>

        {/* INVOICE ITEMS */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <h3>بنود الفاتورة</h3>
            <Button
              variant="contained"
              size="small"
              onClick={handleAddItem}
            >
              إضافة بند
            </Button>
          </Box>

          {formData.items?.map((item, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="الوصف"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, 'description', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="الكمية"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', parseFloat(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="السعر"
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(index, 'unitPrice', parseFloat(e.target.value))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" height="100%">
                    <div>
                      {(item.quantity * item.unitPrice).toFixed(2)} ر.س
                    </div>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                      sx={{ ml: 2 }}
                    >
                      حذف
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Box>

        {/* NOTES */}
        <TextField
          fullWidth
          label="ملاحظات"
          multiline
          rows={3}
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          sx={{ mb: 2 }}
        />

        {/* BUTTONS */}
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Button onClick={onClose} variant="outlined">
            إلغاء
          </Button>
          <Button
            onClick={() => onSave(formData)}
            variant="contained"
            color="primary"
          >
            حفظ
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default SmartInvoiceDashboard;
