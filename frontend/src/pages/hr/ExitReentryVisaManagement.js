import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  fetchVisaRequests,
  createVisaRequest,
  approveVisaRequest,
  issueVisaDoc,
  recordTravel,
  recordReturn,
  fetchExpiringVisas,
  fetchVisaStats,
} from '../../services/hr/employeeAffairsPhase3Service';

const statusColors = {
  مسودة: 'default',
  'قيد الموافقة': 'info',
  معتمد: 'primary',
  صادر: 'success',
  مستخدم: 'warning',
  منتهي: 'error',
  ملغي: 'error',
};
const visaTypes = ['خروج وعودة مفرد', 'خروج وعودة متعدد', 'خروج نهائي'];

export default function ExitReentryVisaManagement() {
  const [visas, setVisas] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [issueDialog, setIssueDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ status: '', visaType: '' });
  const [form, setForm] = useState({
    employeeId: '',
    visaType: 'خروج وعودة مفرد',
    destination: '',
    departureDate: '',
    returnDate: '',
    purpose: '',
  });
  const [approveForm, setApproveForm] = useState({ level: 'manager', approved: true, notes: '' });
  const [issueForm, setIssueForm] = useState({
    visaNumber: '',
    expiryDate: '',
    muqeemReference: '',
  });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, eRes, sRes] = await Promise.all([
        fetchVisaRequests(filter),
        fetchExpiringVisas(),
        fetchVisaStats(),
      ]);
      setVisas(vRes?.data?.visas || vRes?.visas || vRes || []);
      setExpiring(eRes?.data || eRes || []);
      setStats(sRes?.data || sRes || null);
    } catch {
      /* demo */
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      await createVisaRequest(form);
      setSnack('تم تقديم طلب التأشيرة');
      setOpenDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleApprove = async () => {
    try {
      await approveVisaRequest(selected._id, approveForm);
      setSnack('تم تحديث الموافقة');
      setApproveDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleIssue = async () => {
    try {
      await issueVisaDoc(selected._id, issueForm);
      setSnack('تم إصدار التأشيرة');
      setIssueDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleTravel = async v => {
    try {
      await recordTravel(v._id, { departureDate: new Date() });
      setSnack('تم تسجيل السفر');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleReturn = async v => {
    try {
      await recordReturn(v._id);
      setSnack('تم تسجيل العودة');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <VisaIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> تأشيرات الخروج والعودة
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 1 }}
          >
            طلب تأشيرة
          </Button>
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {snack && (
        <Alert severity="success" onClose={() => setSnack('')} sx={{ mb: 2 }}>
          {snack}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.total}
                </Typography>
                <Typography textAlign="center" color="text.secondary">
                  إجمالي التأشيرات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'صادر')?.count || 0}
                </Typography>
                <Typography textAlign="center">صادرة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'مستخدم')?.count || 0}
                </Typography>
                <Typography textAlign="center">مسافرون حالياً</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.totalFees?.toLocaleString()} ر.س
                </Typography>
                <Typography textAlign="center">إجمالي الرسوم</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="جميع التأشيرات" />
        <Tab label={`تنتهي قريباً (${expiring.length})`} />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          select
          size="small"
          label="الحالة"
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {Object.keys(statusColors).map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="نوع التأشيرة"
          value={filter.visaType}
          onChange={e => setFilter(f => ({ ...f, visaType: e.target.value }))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {visaTypes.map(t => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>رقم الطلب</TableCell>
                <TableCell>الموظف</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الوجهة</TableCell>
                <TableCell>تاريخ المغادرة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(visas) ? visas : []).map(v => (
                <TableRow key={v._id}>
                  <TableCell>{v.visaRequestNumber}</TableCell>
                  <TableCell>
                    {v.employeeId?.firstName} {v.employeeId?.lastName}
                  </TableCell>
                  <TableCell>{v.visaType}</TableCell>
                  <TableCell>{v.destination}</TableCell>
                  <TableCell>
                    {v.departureDate ? new Date(v.departureDate).toLocaleDateString('ar-SA') : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={v.status}
                      size="small"
                      color={statusColors[v.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {v.status === 'قيد الموافقة' && (
                      <Tooltip title="موافقة">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelected(v);
                            setApproveDialog(true);
                          }}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {v.status === 'معتمد' && (
                      <Tooltip title="إصدار">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setSelected(v);
                            setIssueDialog(true);
                          }}
                        >
                          <IssueIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {v.status === 'صادر' && (
                      <Tooltip title="تسجيل سفر">
                        <IconButton size="small" color="info" onClick={() => handleTravel(v)}>
                          <TravelIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {v.status === 'مستخدم' && (
                      <Tooltip title="تسجيل عودة">
                        <IconButton size="small" color="success" onClick={() => handleReturn(v)}>
                          <ReturnIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>رقم التأشيرة</TableCell>
                <TableCell>الموظف</TableCell>
                <TableCell>تاريخ الانتهاء</TableCell>
                <TableCell>الأيام المتبقية</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(expiring) ? expiring : []).map(v => {
                const days = Math.ceil((new Date(v.expiryDate) - Date.now()) / 86400000);
                return (
                  <TableRow key={v._id}>
                    <TableCell>{v.visaRequestNumber}</TableCell>
                    <TableCell>
                      {v.employeeId?.firstName} {v.employeeId?.lastName}
                    </TableCell>
                    <TableCell>{new Date(v.expiryDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${days} يوم`}
                        color={days < 7 ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>طلب تأشيرة خروج وعودة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم الموظف"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="نوع التأشيرة"
                value={form.visaType}
                onChange={e => setForm(f => ({ ...f, visaType: e.target.value }))}
              >
                {visaTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الوجهة"
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الغرض"
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ المغادرة"
                InputLabelProps={{ shrink: true }}
                value={form.departureDate}
                onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ العودة"
                InputLabelProps={{ shrink: true }}
                value={form.returnDate}
                onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            تقديم
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)}>
        <DialogTitle>موافقة على التأشيرة</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="مستوى الموافقة"
            value={approveForm.level}
            onChange={e => setApproveForm(f => ({ ...f, level: e.target.value }))}
            sx={{ mt: 2 }}
          >
            <MenuItem value="manager">المدير المباشر</MenuItem>
            <MenuItem value="hr">الموارد البشرية</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="ملاحظات"
            value={approveForm.notes}
            onChange={e => setApproveForm(f => ({ ...f, notes: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>إلغاء</Button>
          <Button
            color="error"
            onClick={() => {
              setApproveForm(f => ({ ...f, approved: false }));
              handleApprove();
            }}
          >
            رفض
          </Button>
          <Button variant="contained" onClick={handleApprove}>
            موافقة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Issue dialog */}
      <Dialog open={issueDialog} onClose={() => setIssueDialog(false)}>
        <DialogTitle>إصدار التأشيرة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="رقم التأشيرة"
            value={issueForm.visaNumber}
            onChange={e => setIssueForm(f => ({ ...f, visaNumber: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="date"
            label="تاريخ الانتهاء"
            InputLabelProps={{ shrink: true }}
            value={issueForm.expiryDate}
            onChange={e => setIssueForm(f => ({ ...f, expiryDate: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="مرجع مقيم"
            value={issueForm.muqeemReference}
            onChange={e => setIssueForm(f => ({ ...f, muqeemReference: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleIssue}>
            إصدار
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
