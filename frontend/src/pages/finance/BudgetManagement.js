import { useState, useEffect } from 'react';
import budgetManagementService from '../../services/budgetManagement.service';
import {
  Paper,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, surfaceColors } from '../../theme/palette';

const demoBudgets = [
  {
    _id: 'b1',
    name: 'ميزانية تشغيل المركز',
    department: 'الإدارة العامة',
    totalAmount: 5000000,
    allocated: 4200000,
    spent: 3100000,
    year: 2026,
    status: 'active',
  },
  {
    _id: 'b2',
    name: 'ميزانية الموارد البشرية',
    department: 'الموارد البشرية',
    totalAmount: 2000000,
    allocated: 1800000,
    spent: 1500000,
    year: 2026,
    status: 'active',
  },
  {
    _id: 'b3',
    name: 'ميزانية المعدات الطبية',
    department: 'الشؤون الطبية',
    totalAmount: 3000000,
    allocated: 2500000,
    spent: 2800000,
    year: 2026,
    status: 'over_budget',
  },
  {
    _id: 'b4',
    name: 'ميزانية تقنية المعلومات',
    department: 'تقنية المعلومات',
    totalAmount: 1500000,
    allocated: 1500000,
    spent: 900000,
    year: 2026,
    status: 'active',
  },
  {
    _id: 'b5',
    name: 'ميزانية الصيانة',
    department: 'الخدمات العامة',
    totalAmount: 800000,
    allocated: 700000,
    spent: 650000,
    year: 2026,
    status: 'active',
  },
  {
    _id: 'b6',
    name: 'ميزانية التسويق',
    department: 'التسويق',
    totalAmount: 500000,
    allocated: 500000,
    spent: 120000,
    year: 2026,
    status: 'active',
  },
];

const statusMap = {
  active: { label: 'نشطة', color: 'success' },
  over_budget: { label: 'تجاوز', color: 'error' },
  draft: { label: 'مسودة', color: 'default' },
  closed: { label: 'مغلقة', color: 'info' },
};
const fmt = n => n.toLocaleString('ar-SA');

export default function BudgetManagement() {
  const [budgets, setBudgets] = useState([]);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', totalAmount: '', year: 2026 });
  const showSnackbar = useSnackbar();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await budgetManagementService.getAll();
        setBudgets(res.data || []);
      } catch {
        setBudgets(demoBudgets);
      }
    };
    loadData();
  }, []);

  const statuses = ['all', 'active', 'over_budget'];
  const filtered = tab === 0 ? budgets : budgets.filter(b => b.status === statuses[tab]);

  const totals = {
    budget: budgets.reduce((s, b) => s + b.totalAmount, 0),
    allocated: budgets.reduce((s, b) => s + b.allocated, 0),
    spent: budgets.reduce((s, b) => s + b.spent, 0),
  };
  totals.remaining = totals.budget - totals.spent;
  totals.utilization = totals.budget > 0 ? Math.round((totals.spent / totals.budget) * 100) : 0;

  const handleCreate = async () => {
    if (!form.name || !form.totalAmount) {
      showSnackbar('اسم الميزانية والمبلغ مطلوبان', 'warning');
      return;
    }
    const payload = { ...form, totalAmount: +form.totalAmount };
    try {
      const res = await budgetManagementService.create(payload);
      setBudgets(prev => [
        ...prev,
        res.data || {
          ...payload,
          _id: Date.now().toString(),
          allocated: 0,
          spent: 0,
          status: 'draft',
        },
      ]);
      showSnackbar('تم إنشاء الميزانية بنجاح', 'success');
    } catch {
      setBudgets(prev => [
        ...prev,
        { ...payload, _id: Date.now().toString(), allocated: 0, spent: 0, status: 'draft' },
      ]);
      showSnackbar('تم إنشاء الميزانية محلياً - لم يتصل بالخادم', 'warning');
    }
    setDialogOpen(false);
    setForm({ name: '', department: '', totalAmount: '', year: 2026 });
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BudgetIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة الميزانية
            </Typography>
            <Typography variant="body2">تخطيط ومتابعة الميزانية والمصروفات</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          ميزانية جديدة
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الميزانيات',
            val: `${fmt(totals.budget)} ر.س`,
            color: statusColors.primaryBlue,
            icon: <BudgetIcon />,
          },
          {
            label: 'المصروف الفعلي',
            val: `${fmt(totals.spent)} ر.س`,
            color: statusColors.warningDark,
            icon: <TrendDownIcon />,
          },
          {
            label: 'المتبقي',
            val: `${fmt(totals.remaining)} ر.س`,
            color: totals.remaining >= 0 ? statusColors.successDark : statusColors.errorDark,
            icon: <TrendUpIcon />,
          },
          {
            label: 'نسبة الاستخدام',
            val: `${totals.utilization}%`,
            color: totals.utilization > 90 ? statusColors.errorDark : statusColors.primaryBlue,
            icon: <ReportIcon />,
          },
        ].map(s => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ borderRight: `4px solid ${s.color}` }}>
              <CardContent
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {s.val}
                  </Typography>
                </Box>
                <Box sx={{ color: s.color }}>{s.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`الكل (${budgets.length})`} />
          <Tab label="نشطة" />
          <Tab label="تجاوز الميزانية" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
              <TableCell>الميزانية</TableCell>
              <TableCell>القسم</TableCell>
              <TableCell>المبلغ الإجمالي</TableCell>
              <TableCell>المخصص</TableCell>
              <TableCell>المصروف</TableCell>
              <TableCell>الاستخدام</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(budget => {
              const util =
                budget.totalAmount > 0 ? Math.round((budget.spent / budget.totalAmount) * 100) : 0;
              const variance = budget.allocated - budget.spent;
              return (
                <TableRow key={budget._id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{budget.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      سنة {budget.year}
                    </Typography>
                  </TableCell>
                  <TableCell>{budget.department}</TableCell>
                  <TableCell>{fmt(budget.totalAmount)} ر.س</TableCell>
                  <TableCell>{fmt(budget.allocated)} ر.س</TableCell>
                  <TableCell>{fmt(budget.spent)} ر.س</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(util, 100)}
                        color={util > 100 ? 'error' : util > 80 ? 'warning' : 'primary'}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" fontWeight="bold">
                        {util}%
                      </Typography>
                    </Box>
                    {variance < 0 && (
                      <Typography variant="caption" color="error">
                        تجاوز: {fmt(Math.abs(variance))} ر.س
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusMap[budget.status]?.label}
                      size="small"
                      color={statusMap[budget.status]?.color}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ميزانية جديدة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="اسم الميزانية"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="القسم"
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ الإجمالي (ر.س)"
                value={form.totalAmount}
                onChange={e => setForm({ ...form, totalAmount: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="السنة"
                value={form.year}
                onChange={e => setForm({ ...form, year: +e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
