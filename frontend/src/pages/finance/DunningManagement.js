 
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';




import { surfaceColors, neutralColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const channelMap = {
  email: { label: 'بريد إلكتروني', icon: <Email fontSize="small" />, color: '#2196F3' },
  sms: { label: 'رسالة نصية', icon: <Sms fontSize="small" />, color: '#4CAF50' },
  whatsapp: { label: 'واتساب', icon: <PhoneCallback fontSize="small" />, color: '#25D366' },
  phone: { label: 'هاتف', icon: <PhoneCallback fontSize="small" />, color: '#FF9800' },
  letter: { label: 'خطاب', icon: <Send fontSize="small" />, color: '#9C27B0' },
};
const responseMap = {
  no_response: { label: 'لا رد', color: '#9E9E9E' },
  acknowledged: { label: 'مقروء', color: '#2196F3' },
  disputed: { label: 'متنازع', color: '#F44336' },
  promised: { label: 'وعد بالسداد', color: '#FF9800' },
  paid: { label: 'مسدد', color: '#4CAF50' },
  partial_paid: { label: 'سداد جزئي', color: '#8BC34A' },
};

const DunningManagement = () => {
  const [tab, setTab] = useState(0);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [_profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendDialog, setSendDialog] = useState(false);
  const [_promiseDialog, setPromiseDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sendForm, setSendForm] = useState({ level: 1, channel: 'email' });
  const [promiseForm, _setPromiseForm] = useState({ promiseDate: '', promiseAmount: '', notes: '' });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, hRes, dRes, pRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/dunning/queue`, { headers }),
        fetch(`${API}/finance/enterprise/dunning/history`, { headers }),
        fetch(`${API}/finance/enterprise/dunning/dashboard`, { headers }),
        fetch(`${API}/finance/enterprise/dunning/profiles`, { headers }),
      ]);
      const qData = await qRes.json();
      const hData = await hRes.json();
      const dData = await dRes.json();
      const pData = await pRes.json();
      if (qData.success) setQueue(qData.data);
      if (hData.success) setHistory(hData.data);
      if (dData.success) setDashboard(dData.data);
      if (pData.success) setProfiles(pData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
   
  }, [fetchData]);

  const handleSendReminder = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/dunning/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: selectedItem.customerId,
          customerName: selectedItem.customerName,
          invoiceId: selectedItem.invoiceId,
          invoiceNumber: selectedItem.invoiceNumber,
          amountDue: selectedItem.balanceDue,
          level: sendForm.level,
          channel: sendForm.channel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const _handlePromise = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/dunning/${selectedItem._id}/promise`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(promiseForm),
      });
      const data = await res.json();
      if (data.success) {
        setPromiseDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <NotificationsActive sx={{ mr: 1, verticalAlign: 'middle' }} />
          إدارة التحصيل والمطالبات
        </Typography>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchData}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Dashboard Cards */}
      {dashboard && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'تذكيرات مرسلة',
              value: dashboard.totalSent,
              color: '#2196F3',
              icon: <Send />,
            },
            {
              label: 'وعود بالسداد',
              value: dashboard.promises,
              color: '#FF9800',
              icon: <Schedule />,
            },
            {
              label: 'تم التحصيل',
              value: dashboard.collections,
              color: '#4CAF50',
              icon: <TrendingUp />,
            },
            { label: 'تصعيد', value: dashboard.escalated, color: '#F44336', icon: <Gavel /> },
            { label: 'بدون رد', value: dashboard.noResponse, color: '#9E9E9E', icon: <Warning /> },
            {
              label: 'وعود مُنفذة',
              value: dashboard.promisesFulfilled,
              color: '#8BC34A',
              icon: <NotificationsActive />,
            },
          ].map((s, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab
          label={
            <Badge badgeContent={queue.length} color="error">
              قائمة التحصيل
            </Badge>
          }
        />
        <Tab label="سجل المطالبات" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'العميل',
                    'رقم الفاتورة',
                    'المبلغ المستحق',
                    'المسدد',
                    'المتبقي',
                    'أيام التأخير',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.map((q, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{
                      bgcolor:
                        q.daysOverdue > 90
                          ? '#F4433610'
                          : q.daysOverdue > 30
                            ? '#FF980010'
                            : 'transparent',
                    }}
                  >
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {q.customerName}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{q.invoiceNumber}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(q.amount)}</TableCell>
                    <TableCell sx={{ textAlign: 'right', color: '#4CAF50' }}>
                      {fmt(q.paidAmount)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#F44336' }}>
                      {fmt(q.balanceDue)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Chip
                        label={`${q.daysOverdue} يوم`}
                        size="small"
                        sx={{
                          bgcolor:
                            q.daysOverdue > 90
                              ? '#F4433620'
                              : q.daysOverdue > 30
                                ? '#FF980020'
                                : '#FF980010',
                          color: q.daysOverdue > 90 ? '#F44336' : '#FF9800',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Tooltip title="إرسال تذكير">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedItem(q);
                            setSendDialog(true);
                          }}
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {queue.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد فواتير متأخرة - ممتاز!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {['العميل', 'الفاتورة', 'المستوى', 'القناة', 'المبلغ', 'الرد', 'التاريخ'].map(
                    h => (
                      <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                        {h}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map(h => {
                  const ch = channelMap[h.channel] || channelMap.email;
                  const resp = responseMap[h.response] || responseMap.no_response;
                  return (
                    <TableRow key={h._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {h.customerName || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{h.invoiceNumber || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip label={`المستوى ${h.level}`} size="small" color="warning" />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          icon={ch.icon}
                          label={ch.label}
                          size="small"
                          sx={{ bgcolor: `${ch.color}20`, color: ch.color }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(h.amountDue)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={resp.label}
                          size="small"
                          sx={{ bgcolor: `${resp.color}20`, color: resp.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {h.sentAt ? new Date(h.sentAt).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا يوجد سجل مطالبات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Send Reminder Dialog */}
      <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إرسال تذكير سداد</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <Typography>
                <strong>العميل:</strong> {selectedItem.customerName}
              </Typography>
              <Typography>
                <strong>المبلغ المتبقي:</strong> {fmt(selectedItem.balanceDue)}
              </Typography>
              <Typography>
                <strong>أيام التأخير:</strong> {selectedItem.daysOverdue} يوم
              </Typography>
              <TextField
                label="مستوى التذكير"
                value={sendForm.level}
                onChange={e => setSendForm({ ...sendForm, level: parseInt(e.target.value) })}
                select
                fullWidth
              >
                <MenuItem value={1}>المستوى 1 - تذكير ودي</MenuItem>
                <MenuItem value={2}>المستوى 2 - تذكير رسمي</MenuItem>
                <MenuItem value={3}>المستوى 3 - إنذار</MenuItem>
                <MenuItem value={4}>المستوى 4 - تصعيد</MenuItem>
              </TextField>
              <TextField
                label="قناة الإرسال"
                value={sendForm.channel}
                onChange={e => setSendForm({ ...sendForm, channel: e.target.value })}
                select
                fullWidth
              >
                <MenuItem value="email">بريد إلكتروني</MenuItem>
                <MenuItem value="sms">رسالة نصية</MenuItem>
                <MenuItem value="whatsapp">واتساب</MenuItem>
                <MenuItem value="phone">هاتف</MenuItem>
                <MenuItem value="letter">خطاب رسمي</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Send />}
            onClick={handleSendReminder}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DunningManagement;
