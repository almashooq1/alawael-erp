import { useState, useEffect, useCallback } from 'react';

import { surfaceColors, neutralColors, brandColors } from 'theme/palette';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import FilterList from '@mui/icons-material/FilterList';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import Cancel from '@mui/icons-material/Cancel';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';

const API = process.env.REACT_APP_API_URL || '/api';

const statusLabels = {
  pending: 'قيد الانتظار',
  deposited: 'تم الإيداع',
  cleared: 'تمت المقاصة',
  bounced: 'مرتجع',
  cancelled: 'ملغي',
  expired: 'منتهي',
  on_hold: 'معلّق',
};

const statusColors = {
  pending: '#FF9800',
  deposited: '#2196F3',
  cleared: '#4CAF50',
  bounced: '#F44336',
  cancelled: '#9E9E9E',
  expired: '#795548',
  on_hold: '#607D8B',
};

const ChequeManagement = () => {
  const [cheques, setCheques] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [statusDialog, setStatusDialog] = useState({ open: false, id: null, status: '' });
  const [form, setForm] = useState({
    chequeNumber: '',
    type: 'issued',
    bankName: '',
    bankBranch: '',
    amount: 0,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    payee: '',
    drawer: '',
    description: '',
    notes: '',
  });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const type = activeTab === 0 ? '' : activeTab === 1 ? 'issued' : 'received';
      const params = type ? `?type=${type}` : '';
      const [chequeRes, statsRes] = await Promise.all([
        fetch(`${API}/finance/extended/cheques${params}`, { headers }),
        fetch(`${API}/finance/extended/cheques/statistics`, { headers }),
      ]);
      const chequeJson = await chequeRes.json();
      const statsJson = await statsRes.json();
      if (chequeJson.success) setCheques(chequeJson.data);
      if (statsJson.success) setStats(statsJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/extended/cheques`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        setForm({
          chequeNumber: '',
          type: 'issued',
          bankName: '',
          bankBranch: '',
          amount: 0,
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: '',
          payee: '',
          drawer: '',
          description: '',
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async () => {
    try {
      await fetch(`${API}/finance/extended/cheques/${statusDialog.id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusDialog.status,
          bounceReason: statusDialog.bounceReason,
        }),
      });
      setStatusDialog({ open: false, id: null, status: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    try {
      await fetch(`${API}/finance/extended/cheques/${id}`, { method: 'DELETE', headers });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            إدارة الشيكات
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Cheque Management - الشيكات الصادرة والواردة
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: brandColors.primary,
            borderRadius: 2,
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: brandColors.primaryDark },
          }}
        >
          إضافة شيك
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            {
              label: 'شيكات صادرة',
              value: stats.totalIssued,
              sub: formatCurrency(stats.issuedAmount),
              color: '#F44336',
              icon: <Receipt />,
            },
            {
              label: 'شيكات واردة',
              value: stats.totalReceived,
              sub: formatCurrency(stats.receivedAmount),
              color: '#4CAF50',
              icon: <AccountBalance />,
            },
            { label: 'قيد الانتظار', value: stats.pending, color: '#FF9800', icon: <FilterList /> },
            { label: 'تمت المقاصة', value: stats.cleared, color: '#4CAF50', icon: <CheckCircle /> },
            { label: 'مرتجع', value: stats.bounced, color: '#F44336', icon: <Warning /> },
            { label: 'متأخر', value: stats.overdue, color: '#D32F2F', icon: <Cancel /> },
          ].map((item, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                minWidth: 150,
                borderRadius: 2,
                border: `1px solid ${surfaceColors.border}`,
              }}
            >
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>
                  {item.value}
                </Typography>
                {item.sub && (
                  <Typography variant="caption" fontWeight={600}>
                    {item.sub}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="الكل" />
        <Tab label="صادرة" />
        <Tab label="واردة" />
      </Tabs>

      {/* Overdue Alert */}
      {stats?.overdue > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          يوجد {stats.overdue} شيك/شيكات متأخرة عن موعد الاستحقاق. يرجى المتابعة.
        </Alert>
      )}

      {/* Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم الشيك</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>البنك</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المستفيد/الساحب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الاستحقاق</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cheques.map((c, idx) => {
                const isOverdue = c.status === 'pending' && new Date(c.dueDate) < new Date();
                return (
                  <TableRow
                    key={c._id || idx}
                    hover
                    sx={{ bgcolor: isOverdue ? '#FFF3E0' : 'transparent' }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>{c.chequeNumber}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.type === 'issued' ? 'صادر' : 'وارد'}
                        sx={{
                          bgcolor: c.type === 'issued' ? '#F4433615' : '#4CAF5015',
                          color: c.type === 'issued' ? '#F44336' : '#4CAF50',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>{c.bankName}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: brandColors.primary }}>
                      {formatCurrency(c.amount)}
                    </TableCell>
                    <TableCell>{c.payee}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {new Date(c.dueDate).toLocaleDateString('ar-SA')}
                        </Typography>
                        {isOverdue && (
                          <Typography variant="caption" sx={{ color: '#F44336', fontWeight: 600 }}>
                            متأخر!
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabels[c.status] || c.status}
                        sx={{
                          bgcolor: `${statusColors[c.status] || '#9E9E9E'}15`,
                          color: statusColors[c.status] || '#9E9E9E',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{c.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="تغيير الحالة">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setStatusDialog({ open: true, id: c._id, status: c.status })
                            }
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(c._id)}
                            sx={{ color: '#F44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {cheques.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد شيكات مسجلة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة شيك جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="رقم الشيك"
                value={form.chequeNumber}
                onChange={e => setForm({ ...form, chequeNumber: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="النوع"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="issued">صادر</MenuItem>
                <MenuItem value="received">وارد</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="اسم البنك"
                value={form.bankName}
                onChange={e => setForm({ ...form, bankName: e.target.value })}
                fullWidth
              />
              <TextField
                label="الفرع"
                value={form.bankBranch}
                onChange={e => setForm({ ...form, bankBranch: e.target.value })}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="المبلغ"
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: +e.target.value })}
                fullWidth
              />
              <TextField
                label="تاريخ الإصدار"
                type="date"
                value={form.issueDate}
                onChange={e => setForm({ ...form, issueDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label="تاريخ الاستحقاق"
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={form.type === 'issued' ? 'المستفيد' : 'الساحب'}
              value={form.payee}
              onChange={e => setForm({ ...form, payee: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوصف"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              !form.chequeNumber || !form.bankName || !form.amount || !form.dueDate || !form.payee
            }
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, id: null, status: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تغيير حالة الشيك</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="الحالة الجديدة"
              value={statusDialog.status}
              onChange={e => setStatusDialog({ ...statusDialog, status: e.target.value })}
              fullWidth
            >
              {Object.entries(statusLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            {statusDialog.status === 'bounced' && (
              <TextField
                label="سبب الارتجاع"
                value={statusDialog.bounceReason || ''}
                onChange={e => setStatusDialog({ ...statusDialog, bounceReason: e.target.value })}
                fullWidth
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusDialog({ open: false, id: null, status: '' })}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleStatusChange}
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            تحديث
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ChequeManagement;
