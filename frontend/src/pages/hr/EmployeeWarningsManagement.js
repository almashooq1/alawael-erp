import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  fetchWarnings,
  createWarning,
  issueWarning,
  acknowledgeWarning,
  appealWarning,
  fetchWarningStats,
} from '../../services/hr/employeeAffairsPhase3Service';

const statusColors = {
  مسودة: 'default',
  صدر: 'info',
  مُبلّغ: 'warning',
  'معترض عليه': 'secondary',
  نُفّذ: 'error',
  ملغي: 'default',
  مُعدّل: 'primary',
};
const levels = [
  'تنبيه شفهي',
  'إنذار كتابي أول',
  'إنذار كتابي ثاني',
  'إنذار نهائي',
  'خصم من الراتب',
  'إيقاف عن العمل',
  'فصل',
];
const violationTypes = [
  'تأخر متكرر',
  'غياب بدون إذن',
  'إهمال وظيفي',
  'سوء سلوك',
  'مخالفة أمن وسلامة',
  'إفشاء أسرار',
  'تزوير',
  'سرقة',
  'اعتداء',
  'رفض تنفيذ أوامر',
  'استخدام ممتلكات الشركة',
  'مخالفة سياسات',
  'تحرش',
  'أخرى',
];

export default function EmployeeWarningsManagement() {
  const [warnings, setWarnings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [appealDialog, setAppealDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ status: '', warningLevel: '', violationType: '' });
  const [form, setForm] = useState({
    employeeId: '',
    violationType: '',
    warningLevel: 'تنبيه شفهي',
    violationDate: '',
    description: '',
    location: '',
  });
  const [appealText, setAppealText] = useState('');
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([fetchWarnings(filter), fetchWarningStats()]);
      setWarnings(wRes?.data?.warnings || wRes?.warnings || wRes || []);
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
      await createWarning(form);
      setSnack('تم إنشاء الإنذار');
      setOpenDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleIssue = async w => {
    try {
      await issueWarning(w._id);
      setSnack('تم إصدار الإنذار');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleAck = async w => {
    try {
      await acknowledgeWarning(w._id, {});
      setSnack('تم تبليغ الموظف');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleAppeal = async () => {
    try {
      await appealWarning(selected._id, { text: appealText });
      setSnack('تم تقديم الاعتراض');
      setAppealDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} /> الإنذارات
          والمخالفات
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="warning"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 1 }}
          >
            إنذار جديد
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
                  إجمالي الإنذارات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {stats.byLevel?.slice(0, 3).map(l => (
            <Grid item xs={6} md={3} key={l._id}>
              <Card>
                <CardContent>
                  <Typography variant="h4" textAlign="center">
                    {l.count}
                  </Typography>
                  <Typography textAlign="center" color="text.secondary">
                    {l._id}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="الحالة"
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          sx={{ minWidth: 140 }}
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
          label="المستوى"
          value={filter.warningLevel}
          onChange={e => setFilter(f => ({ ...f, warningLevel: e.target.value }))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {levels.map(l => (
            <MenuItem key={l} value={l}>
              {l}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="نوع المخالفة"
          value={filter.violationType}
          onChange={e => setFilter(f => ({ ...f, violationType: e.target.value }))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {violationTypes.map(v => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>رقم الإنذار</TableCell>
              <TableCell>الموظف</TableCell>
              <TableCell>نوع المخالفة</TableCell>
              <TableCell>المستوى</TableCell>
              <TableCell>تاريخ المخالفة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(Array.isArray(warnings) ? warnings : []).map(w => (
              <TableRow key={w._id}>
                <TableCell>{w.warningNumber}</TableCell>
                <TableCell>
                  {w.employeeId?.firstName} {w.employeeId?.lastName}
                </TableCell>
                <TableCell>{w.violationType}</TableCell>
                <TableCell>
                  <Chip
                    label={w.warningLevel}
                    size="small"
                    color={
                      w.warningLevel?.includes('نهائي') || w.warningLevel?.includes('فصل')
                        ? 'error'
                        : 'warning'
                    }
                  />
                </TableCell>
                <TableCell>
                  {w.violationDate ? new Date(w.violationDate).toLocaleDateString('ar-SA') : '-'}
                </TableCell>
                <TableCell>
                  <Chip label={w.status} size="small" color={statusColors[w.status] || 'default'} />
                </TableCell>
                <TableCell>
                  {w.status === 'مسودة' && (
                    <Tooltip title="إصدار">
                      <IconButton size="small" color="primary" onClick={() => handleIssue(w)}>
                        <IssueIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {w.status === 'صدر' && (
                    <Tooltip title="تبليغ">
                      <IconButton size="small" color="warning" onClick={() => handleAck(w)}>
                        <AckIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {w.status === 'مُبلّغ' && (
                    <Tooltip title="اعتراض">
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => {
                          setSelected(w);
                          setAppealDialog(true);
                        }}
                      >
                        <AppealIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنذار جديد</DialogTitle>
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
                label="نوع المخالفة"
                value={form.violationType}
                onChange={e => setForm(f => ({ ...f, violationType: e.target.value }))}
              >
                {violationTypes.map(v => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="مستوى الإنذار"
                value={form.warningLevel}
                onChange={e => setForm(f => ({ ...f, warningLevel: e.target.value }))}
              >
                {levels.map(l => (
                  <MenuItem key={l} value={l}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ المخالفة"
                InputLabelProps={{ shrink: true }}
                value={form.violationDate}
                onChange={e => setForm(f => ({ ...f, violationDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="وصف المخالفة"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={appealDialog} onClose={() => setAppealDialog(false)}>
        <DialogTitle>تقديم اعتراض</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="نص الاعتراض"
            value={appealText}
            onChange={e => setAppealText(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppealDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAppeal}>
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
