import React, { useState, useEffect } from 'react';
import contractsService from '../../services/contracts.service';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as ContractIcon,
  AutorenewOutlined as RenewIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors } from '../../theme/palette';
import ConfirmDialog, { useConfirmDialog } from '../../components/common/ConfirmDialog';

const demoData = [
  {
    _id: 'c1',
    contractNumber: 'CON-2026-001',
    title: 'عقد صيانة المبنى الرئيسي',
    type: 'maintenance',
    vendor: 'شركة الصيانة المتكاملة',
    value: 150000,
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  },
  {
    _id: 'c2',
    contractNumber: 'CON-2026-002',
    title: 'عقد توريد أجهزة تأهيلية',
    type: 'procurement',
    vendor: 'مؤسسة الأجهزة الطبية',
    value: 320000,
    status: 'pending_approval',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
  },
  {
    _id: 'c3',
    contractNumber: 'CON-2026-003',
    title: 'عقد خدمات تقنية المعلومات',
    type: 'service',
    vendor: 'شركة التقنية',
    value: 96000,
    status: 'active',
    startDate: '2026-01-15',
    endDate: '2026-07-14',
  },
  {
    _id: 'c4',
    contractNumber: 'CON-2025-018',
    title: 'عقد تأمين طبي',
    type: 'insurance',
    vendor: 'شركة التأمين الوطنية',
    value: 280000,
    status: 'expiring_soon',
    startDate: '2025-04-01',
    endDate: '2026-03-31',
  },
];

const demoStats = {
  total: 24,
  active: 15,
  expiringSoon: 3,
  expired: 2,
  pending: 4,
  totalValue: 2850000,
};

const statusMap = {
  active: { label: 'ساري', color: 'success' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'warning' },
  expiring_soon: { label: 'ينتهي قريباً', color: 'error' },
  expired: { label: 'منتهي', color: 'default' },
  draft: { label: 'مسودة', color: 'info' },
};
const typeMap = {
  maintenance: 'صيانة',
  procurement: 'توريد',
  service: 'خدمات',
  insurance: 'تأمين',
  lease: 'إيجار',
};

export default function ContractsManagement() {
  const [confirmState, showConfirm] = useConfirmDialog();
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(demoStats);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'service',
    vendor: '',
    value: '',
    startDate: '',
    endDate: '',
  });
  const showSnackbar = useSnackbar();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await contractsService.getAll();
        setContracts(res.data || []);
        const statsRes = await contractsService.getStats();
        setStats(statsRes.data || demoStats);
      } catch {
        setContracts(demoData);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!form.title) {
      showSnackbar('العنوان مطلوب', 'warning');
      return;
    }
    try {
      const res = await contractsService.create(form);
      setContracts(prev => [
        ...prev,
        res.data || {
          ...form,
          _id: Date.now().toString(),
          contractNumber: `CON-${Date.now()}`,
          status: 'draft',
        },
      ]);
      showSnackbar('تم إنشاء العقد بنجاح', 'success');
    } catch {
      setContracts(prev => [
        ...prev,
        {
          ...form,
          _id: Date.now().toString(),
          contractNumber: `CON-${Date.now()}`,
          status: 'draft',
        },
      ]);
      showSnackbar('تم إنشاء العقد محلياً - لم يتصل بالخادم', 'warning');
    }
    setDialogOpen(false);
    setForm({ title: '', type: 'service', vendor: '', value: '', startDate: '', endDate: '' });
  };

  const handleDelete = id => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا العقد؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await contractsService.delete(id);
          setContracts(prev => prev.filter(c => c._id !== id));
          showSnackbar('تم حذف العقد', 'success');
        } catch {
          setContracts(prev => prev.filter(c => c._id !== id));
          showSnackbar('تم الحذف محلياً - لم يتصل بالخادم', 'warning');
        }
      },
    });
  };

  const filtered =
    tab === 0
      ? contracts
      : tab === 1
        ? contracts.filter(c => c.status === 'active')
        : tab === 2
          ? contracts.filter(c => c.status === 'expiring_soon')
          : contracts.filter(c => c.status === 'pending_approval');

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ContractIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة العقود
            </Typography>
            <Typography variant="body2">تتبع وإدارة العقود والاتفاقيات</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          عقد جديد
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي العقود', value: stats.total, color: statusColors.primaryBlue },
          { label: 'عقود سارية', value: stats.active, color: statusColors.successDeep },
          { label: 'تنتهي قريباً', value: stats.expiringSoon, color: statusColors.warningDarker },
          {
            label: 'إجمالي القيمة',
            value: `${(stats.totalValue / 1000000).toFixed(1)}M ر.س`,
            color: statusColors.purple,
          },
        ].map(s => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: s.color, fontWeight: 'bold' }}>
                  {s.value}
                </Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="الكل" />
          <Tab label="ساري" />
          <Tab label="ينتهي قريباً" />
          <Tab label="بانتظار الاعتماد" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم العقد</TableCell>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>المورد</TableCell>
              <TableCell>القيمة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>تاريخ الانتهاء</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c._id}>
                <TableCell>{c.contractNumber}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{typeMap[c.type] || c.type}</TableCell>
                <TableCell>{c.vendor}</TableCell>
                <TableCell>{Number(c.value).toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <Chip
                    label={statusMap[c.status]?.label || c.status}
                    color={statusMap[c.status]?.color || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{c.endDate}</TableCell>
                <TableCell>
                  <Tooltip title="تجديد">
                    <IconButton aria-label="إجراء" size="small" color="primary">
                      <RenewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton aria-label="تعديل" size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton
                      aria-label="حذف"
                      size="small"
                      color="error"
                      onClick={() => handleDelete(c._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>عقد جديد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="عنوان العقد"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="النوع"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            sx={{ mb: 2 }}
          >
            {Object.entries(typeMap).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="المورد / الجهة"
            value={form.vendor}
            onChange={e => setForm({ ...form, vendor: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="القيمة (ر.س)"
            type="number"
            value={form.value}
            onChange={e => setForm({ ...form, value: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ البداية"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ النهاية"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...confirmState} />
    </Box>
  );
}
