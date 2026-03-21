/**
 * Student Complaints & Suggestions Page
 * صفحة الشكاوى والمقترحات للطالب
 */

import { useState, useEffect, useCallback } from 'react';




import { gradients } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from 'services/api';

const typeConfig = {
  شكوى: {
    icon: <ComplaintIcon />,
    color: '#e74c3c',
    gradient: gradients.error || 'linear-gradient(135deg, #e74c3c, #c0392b)',
  },
  مقترح: {
    icon: <SuggestionIcon />,
    color: '#f39c12',
    gradient: gradients.warning || 'linear-gradient(135deg, #f39c12, #e67e22)',
  },
  استفسار: {
    icon: <InquiryIcon />,
    color: '#3498db',
    gradient: gradients.info || 'linear-gradient(135deg, #3498db, #2980b9)',
  },
  ملاحظة: {
    icon: <FeedbackIcon />,
    color: '#2ecc71',
    gradient: gradients.success || 'linear-gradient(135deg, #2ecc71, #27ae60)',
  },
};

const statusColors = {
  جديدة: 'info',
  'قيد المراجعة': 'warning',
  'قيد المعالجة': 'warning',
  'تم الحل': 'success',
  مغلقة: 'default',
  مرفوضة: 'error',
};

const categories = ['أكاديمي', 'إداري', 'مرافق', 'نقل', 'تغذية', 'تقنية', 'سلوكي', 'صحي', 'أخرى'];

const StudentComplaints = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [complaints, setComplaints] = useState([]);
  const [_stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [_ratingDialog, setRatingDialog] = useState(null);
  const [formData, setFormData] = useState({
    type: 'شكوى',
    category: '',
    subject: '',
    description: '',
    priority: 'متوسط',
    isAnonymous: false,
  });

  const mockComplaints = [
    {
      _id: '1',
      type: 'شكوى',
      category: 'مرافق',
      subject: 'تكييف الفصل لا يعمل',
      description: 'التكييف في الفصل 3 متعطل منذ يومين',
      priority: 'عالي',
      status: 'قيد المعالجة',
      referenceNumber: 'CMP-202603-ABC123',
      createdAt: '2026-03-14T10:00:00Z',
      responses: [
        {
          responderName: 'أحمد الصيانة',
          message: 'تم استلام الطلب وسيتم الإصلاح غداً',
          createdAt: '2026-03-14T14:00:00Z',
        },
      ],
    },
    {
      _id: '2',
      type: 'مقترح',
      category: 'أكاديمي',
      subject: 'إضافة حصة رياضية',
      description: 'اقترح إضافة حصة رياضية إضافية يوم الأربعاء',
      priority: 'متوسط',
      status: 'قيد المراجعة',
      referenceNumber: 'SUG-202603-DEF456',
      createdAt: '2026-03-12T09:00:00Z',
      responses: [],
    },
    {
      _id: '3',
      type: 'استفسار',
      category: 'إداري',
      subject: 'موعد الاختبارات النهائية',
      description: 'متى تبدأ فترة الاختبارات النهائية؟',
      priority: 'منخفض',
      status: 'تم الحل',
      referenceNumber: 'INQ-202603-GHI789',
      createdAt: '2026-03-10T08:00:00Z',
      responses: [
        {
          responderName: 'الشؤون الأكاديمية',
          message: 'تبدأ الاختبارات النهائية في 15 أبريل',
          createdAt: '2026-03-10T11:00:00Z',
        },
      ],
      rating: 5,
    },
    {
      _id: '4',
      type: 'ملاحظة',
      category: 'تغذية',
      subject: 'تحسين وجبة الغداء',
      description: 'اقترح تنويع وجبات الغداء وإضافة فواكه طازجة',
      priority: 'منخفض',
      status: 'جديدة',
      referenceNumber: 'CMP-202603-JKL012',
      createdAt: '2026-03-15T12:00:00Z',
      responses: [],
    },
  ];

  const mockStats = { جديدة: 1, 'قيد المراجعة': 1, 'قيد المعالجة': 1, 'تم الحل': 1 };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student-complaints/${userId}`).catch(() => null);
      if (res?.data?.success) {
        setComplaints(res.data.data);
        setStats(res.data.stats || {});
      } else {
        setComplaints(mockComplaints);
        setStats(mockStats);
      }
    } catch {
      setComplaints(mockComplaints);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!formData.subject || !formData.description || !formData.category) {
      showSnackbar('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }
    try {
      const res = await api.post(`/student-complaints/${userId}`, formData).catch(() => null);
      if (res?.data?.success) {
        showSnackbar(res.data.message, 'success');
        loadData();
      } else {
        showSnackbar(`تم إرسال ${formData.type} بنجاح (وضع تجريبي)`, 'success');
        setComplaints(prev => [
          {
            ...formData,
            _id: Date.now(),
            referenceNumber: `NEW-${Date.now()}`,
            status: 'جديدة',
            createdAt: new Date().toISOString(),
            responses: [],
          },
          ...prev,
        ]);
      }
      setOpenDialog(false);
      setFormData({
        type: 'شكوى',
        category: '',
        subject: '',
        description: '',
        priority: 'متوسط',
        isAnonymous: false,
      });
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const filteredComplaints =
    tab === 0
      ? complaints
      : tab === 1
        ? complaints.filter(c => ['جديدة', 'قيد المراجعة', 'قيد المعالجة'].includes(c.status))
        : complaints.filter(c => ['تم الحل', 'مغلقة'].includes(c.status));

  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 4, mb: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              📬 الشكاوى والمقترحات
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              شاركنا رأيك لتحسين تجربتك
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إرسال جديد
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(typeConfig).map(([type, config]) => (
          <Grid item xs={6} sm={3} key={type}>
            <Card sx={{ background: config.gradient, color: 'white', borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                {config.icon}
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {complaints.filter(c => c.type === type).length}
                </Typography>
                <Typography variant="body2">{type}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <MuiBadge badgeContent={complaints.length} color="primary">
                الكل
              </MuiBadge>
            }
          />
          <Tab
            label={
              <MuiBadge
                badgeContent={
                  complaints.filter(c => !['تم الحل', 'مغلقة'].includes(c.status)).length
                }
                color="warning"
              >
                نشطة
              </MuiBadge>
            }
          />
          <Tab
            label={
              <MuiBadge
                badgeContent={
                  complaints.filter(c => ['تم الحل', 'مغلقة'].includes(c.status)).length
                }
                color="success"
              >
                محلولة
              </MuiBadge>
            }
          />
        </Tabs>
      </Paper>

      {/* Complaints List */}
      <Stack spacing={2}>
        {filteredComplaints.map(complaint => (
          <Fade in key={complaint._id}>
            <Card
              sx={{
                borderRadius: 2,
                borderRight: 4,
                borderColor: typeConfig[complaint.type]?.color || '#999',
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
              }}
              onClick={() => setSelectedComplaint(complaint)}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      sx={{ bgcolor: typeConfig[complaint.type]?.color, width: 36, height: 36 }}
                    >
                      {typeConfig[complaint.type]?.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {complaint.subject}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {complaint.referenceNumber} •{' '}
                        {new Date(complaint.createdAt).toLocaleDateString('ar-SA')}
                      </Typography>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={complaint.type}
                      size="small"
                      sx={{ bgcolor: typeConfig[complaint.type]?.color, color: 'white' }}
                    />
                    <Chip
                      label={complaint.status}
                      size="small"
                      color={statusColors[complaint.status]}
                    />
                    <Chip label={complaint.priority} size="small" variant="outlined" />
                  </Stack>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {complaint.description}
                </Typography>
                {complaint.responses?.length > 0 && (
                  <Alert severity="info" sx={{ borderRadius: 1 }}>
                    <Typography variant="caption">
                      آخر رد: {complaint.responses[complaint.responses.length - 1].message}
                    </Typography>
                  </Alert>
                )}
                {complaint.status === 'تم الحل' && !complaint.rating && (
                  <Button
                    size="small"
                    startIcon={<StarIcon />}
                    onClick={e => {
                      e.stopPropagation();
                      setRatingDialog(complaint);
                    }}
                    sx={{ mt: 1 }}
                  >
                    قيّم الخدمة
                  </Button>
                )}
                {complaint.rating && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating value={complaint.rating} readOnly size="small" />
                    <Typography variant="caption">تقييمك</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        ))}
        {filteredComplaints.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <FeedbackIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              لا توجد شكاوى أو مقترحات
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              أرسل أول شكوى/مقترح
            </Button>
          </Paper>
        )}
      </Stack>

      {/* New Complaint Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          📝 إرسال {formData.type} جديد
          <IconButton onClick={() => setOpenDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="النوع"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              fullWidth
            >
              {['شكوى', 'مقترح', 'استفسار', 'ملاحظة'].map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="التصنيف *"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              {categories.map(c => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الموضوع *"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              fullWidth
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              label="الوصف التفصيلي *"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={4}
              inputProps={{ maxLength: 2000 }}
              helperText={`${formData.description.length}/2000`}
            />
            <TextField
              select
              label="الأولوية"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
              fullWidth
            >
              {['عالي', 'متوسط', 'منخفض'].map(p => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={handleSubmit}>
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedComplaint && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {typeConfig[selectedComplaint.type]?.icon}
                {selectedComplaint.subject}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={selectedComplaint.referenceNumber} variant="outlined" />
                  <Chip
                    label={selectedComplaint.type}
                    sx={{ bgcolor: typeConfig[selectedComplaint.type]?.color, color: 'white' }}
                  />
                  <Chip
                    label={selectedComplaint.status}
                    color={statusColors[selectedComplaint.status]}
                  />
                  <Chip label={`الأولوية: ${selectedComplaint.priority}`} variant="outlined" />
                  <Chip label={selectedComplaint.category} variant="outlined" />
                </Box>
                <Typography variant="body1">{selectedComplaint.description}</Typography>
                <Divider />
                <Typography variant="h6">
                  💬 الردود ({selectedComplaint.responses?.length || 0})
                </Typography>
                <List>
                  {selectedComplaint.responses?.map((r, i) => (
                    <ListItem key={i} alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {r.responderName?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={r.responderName}
                        secondary={
                          <>
                            {r.message}
                            <br />
                            <Typography variant="caption">
                              {new Date(r.createdAt).toLocaleString('ar-SA')}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                  {(!selectedComplaint.responses || selectedComplaint.responses.length === 0) && (
                    <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                      لا توجد ردود بعد
                    </Typography>
                  )}
                </List>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedComplaint(null)}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default StudentComplaints;
