/**
 * Clinical Sessions Management Page — صفحة إدارة الجلسات السريرية
 *
 * عرض تقويمي وقائمي للجلسات مع إمكانية الفلترة والإنشاء
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
} from '@mui/material';



import { sessionsAPI } from '../../services/ddd';

/* ── Session types ── */
const SESSION_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'individual', label: 'فردية', icon: <PersonIcon />, color: '#2196f3' },
  { value: 'group', label: 'جماعية', icon: <GroupIcon />, color: '#9c27b0' },
  { value: 'assessment', label: 'تقييم', icon: <CalendarIcon />, color: '#ff9800' },
  { value: 'telerehab', label: 'عن بُعد', icon: <VideoIcon />, color: '#00bcd4' },
  { value: 'family', label: 'أسرية', icon: <GroupIcon />, color: '#e91e63' },
  { value: 'consultation', label: 'استشارة', icon: <PersonIcon />, color: '#607d8b' },
];

const STATUS_CONFIG = {
  scheduled: { label: 'مجدولة', color: 'info', icon: <ScheduleIcon /> },
  in_progress: { label: 'جارية', color: 'warning', icon: <InProgressIcon /> },
  completed: { label: 'مكتملة', color: 'success', icon: <DoneIcon /> },
  cancelled: { label: 'ملغاة', color: 'error', icon: <CancelIcon /> },
  no_show: { label: 'لم يحضر', color: 'default', icon: <CancelIcon /> },
  rescheduled: { label: 'مُعاد جدولتها', color: 'secondary', icon: <ScheduleIcon /> },
};

/* ── Time slots for day view ── */
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 7; // 7 AM to 6 PM
  return `${h.toString().padStart(2, '0')}:00`;
});

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState(0); // 0: list, 1: day

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState(null);
  const perPage = 20;

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit: perPage,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { sessionType: typeFilter }),
        ...(view === 1 && dateFilter && { date: dateFilter }),
      };
      const res = await sessionsAPI.list(params);
      const data = res?.data;
      if (data?.data) {
        setSessions(data.data);
        setTotal(data.pagination?.total || data.total || data.data.length);
      } else if (Array.isArray(data)) {
        setSessions(data);
        setTotal(data.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, dateFilter, view]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  /* ── Stats ── */
  const stats = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: sessions.filter(s => s.status === key).length,
  }));

  const pageCount = Math.ceil(total / perPage);

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">الجلسات السريرية</Typography>
          <Typography variant="body2" color="text.secondary">{total} جلسة</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />}>جلسة جديدة</Button>
          <IconButton onClick={loadSessions}><RefreshIcon /></IconButton>
        </Stack>
      </Box>

      {/* ── Quick Stats ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map(s => (
          <Grid item xs={6} sm={4} md={2} key={s.key}>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                borderColor: statusFilter === s.key ? 'primary.main' : 'divider',
                borderWidth: statusFilter === s.key ? 2 : 1,
              }}
              onClick={() => { setStatusFilter(statusFilter === s.key ? '' : s.key); setPage(1); }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1, '&:last-child': { pb: 1 } }}>
                {s.icon}
                <Typography variant="caption" display="block">{s.label}</Typography>
                <Typography variant="h6" fontWeight="bold">{s.count}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── View Tabs + Filters ── */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<ListIcon />} iconPosition="start" label="عرض القائمة" />
          <Tab icon={<CalendarIcon />} iconPosition="start" label="عرض اليوم" />
        </Tabs>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small" placeholder="بحث..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الجلسة</InputLabel>
                <Select value={typeFilter} label="نوع الجلسة" onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                  {SESSION_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {view === 1 && (
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth size="small" type="date" label="التاريخ"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── List View ── */}
      {view === 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>المستفيد</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell>المدة</TableCell>
                <TableCell>الأخصائي</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">لا توجد جلسات</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s, i) => {
                  const st = STATUS_CONFIG[s.status] || { label: s.status || '-', color: 'default' };
                  const type = SESSION_TYPES.find(t => t.value === s.sessionType) || {};
                  return (
                    <TableRow
                      key={s._id || i} hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedSession(s)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12 }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Typography variant="body2">
                            {s.beneficiary?.name?.full || s.beneficiaryName || '-'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small" variant="outlined"
                          label={type.label || s.sessionType || s.type || '-'}
                          sx={{ borderColor: type.color }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString('ar-SA') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {s.scheduledDate ? new Date(s.scheduledDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{s.duration ? `${s.duration} د` : '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{s.therapist?.name || '-'}</Typography>
                      </TableCell>
                      <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                      <TableCell align="center">
                        <Tooltip title="التفاصيل">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedSession(s); }}>
                            <ScheduleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Day View ── */}
      {view === 1 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              {new Date(dateFilter).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            {TIME_SLOTS.map(slot => {
              const slotSessions = sessions.filter(s => {
                if (!s.scheduledDate) return false;
                const h = new Date(s.scheduledDate).getHours().toString().padStart(2, '0');
                return `${h}:00` === slot;
              });
              return (
                <Box key={slot} sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', minHeight: 48 }}>
                  <Box sx={{ width: 60, py: 1, px: 1, borderLeft: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">{slot}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5, px: 1 }}>
                    {slotSessions.map((s, i) => {
                      const type = SESSION_TYPES.find(t => t.value === s.sessionType) || {};
                      return (
                        <Chip
                          key={s._id || i}
                          size="small"
                          label={`${s.beneficiary?.name?.full || s.beneficiaryName || 'جلسة'} (${s.duration || 30}د)`}
                          sx={{ bgcolor: type.color || '#2196f3', color: '#fff', cursor: 'pointer' }}
                          onClick={() => setSelectedSession(s)}
                        />
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Pagination (list view only) ── */}
      {view === 0 && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
        </Box>
      )}

      {/* ── Session Detail Dialog ── */}
      <Dialog open={!!selectedSession} onClose={() => setSelectedSession(null)} maxWidth="sm" fullWidth>
        {selectedSession && (() => {
          const s = selectedSession;
          const st = STATUS_CONFIG[s.status] || { label: s.status || '-', color: 'default' };
          return (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">تفاصيل الجلسة</Typography>
                  <Chip label={st.label} color={st.color} />
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  {[
                    ['المستفيد', s.beneficiary?.name?.full || s.beneficiaryName || '-'],
                    ['نوع الجلسة', s.sessionType || s.type || '-'],
                    ['التاريخ', s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString('ar-SA') : '-'],
                    ['الوقت', s.scheduledDate ? new Date(s.scheduledDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'],
                    ['المدة', s.duration ? `${s.duration} دقيقة` : '-'],
                    ['الأخصائي', s.therapist?.name || '-'],
                    ['المكان', s.location || '-'],
                  ].map(([label, value], i) => (
                    <Grid item xs={6} key={i}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
                {s.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">ملاحظات</Typography>
                    <Typography variant="body2">{s.notes}</Typography>
                  </Box>
                )}
                {s.objectives && s.objectives.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">أهداف الجلسة</Typography>
                    <List dense>
                      {s.objectives.map((obj, i) => (
                        <ListItem key={i}>
                          <ListItemText primary={obj.description || obj} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedSession(null)}>إغلاق</Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setSelectedSession(null);
                    navigate(`/beneficiaries/${s.beneficiaryId || s.beneficiary?._id}`);
                  }}
                >
                  ملف المستفيد
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
