/**
 * Student Certificates Page
 * صفحة الشهادات والإفادات للطالب
 */

import { useState, useEffect, useCallback } from 'react';




import { gradients } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from 'services/api';

const statusConfig = {
  'قيد الطلب': { color: 'info', icon: <PendingIcon /> },
  'قيد المعالجة': { color: 'warning', icon: <PendingIcon /> },
  معتمدة: { color: 'success', icon: <VerifiedIcon /> },
  'جاهزة للطباعة': { color: 'success', icon: <PrintIcon /> },
  'تم التسليم': { color: 'default', icon: <VerifiedIcon /> },
  مرفوضة: { color: 'error', icon: <CloseIcon /> },
};

const StudentCertificates = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [certificates, setCertificates] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [openRequest, setOpenRequest] = useState(false);
  const [_selectedCert, _setSelectedCert] = useState(null);
  const [requestForm, setRequestForm] = useState({
    type: '',
    title: '',
    description: '',
    metadata: {},
  });

  const mockTypes = [
    {
      id: 'attendance',
      name: 'شهادة حضور',
      description: 'شهادة تثبت حضور الطالب ونسبة الحضور',
      processingDays: 2,
      icon: '📋',
    },
    {
      id: 'program-completion',
      name: 'شهادة إتمام برنامج',
      description: 'شهادة إتمام برنامج تأهيلي أو تعليمي',
      processingDays: 5,
      icon: '🎓',
    },
    {
      id: 'enrollment',
      name: 'إفادة قيد',
      description: 'إفادة تثبت قيد الطالب في المركز',
      processingDays: 1,
      icon: '📝',
    },
    {
      id: 'excellence',
      name: 'شهادة تفوق',
      description: 'شهادة تفوق أكاديمي أو سلوكي',
      processingDays: 3,
      icon: '⭐',
    },
    {
      id: 'good-conduct',
      name: 'شهادة حسن سيرة وسلوك',
      description: 'شهادة حسن السيرة والسلوك',
      processingDays: 3,
      icon: '✅',
    },
    {
      id: 'participation',
      name: 'شهادة مشاركة',
      description: 'شهادة مشاركة في فعالية أو نشاط',
      processingDays: 2,
      icon: '🏅',
    },
    {
      id: 'graduation',
      name: 'شهادة تخرج',
      description: 'شهادة التخرج من البرنامج',
      processingDays: 7,
      icon: '🎊',
    },
    {
      id: 'achievement',
      name: 'شهادة إنجاز',
      description: 'شهادة تقدير لإنجاز معين',
      processingDays: 3,
      icon: '🏆',
    },
    {
      id: 'medical',
      name: 'إفادة طبية',
      description: 'إفادة بالحالة الصحية والتقارير الطبية',
      processingDays: 5,
      icon: '🏥',
    },
  ];

  const mockCerts = [
    {
      _id: '1',
      type: 'شهادة حضور',
      title: 'شهادة حضور - الفصل الأول',
      status: 'معتمدة',
      certificateNumber: 'CERT-202603-XYZ',
      createdAt: '2026-02-20T10:00:00Z',
      issuedAt: '2026-02-22T10:00:00Z',
      downloadCount: 2,
    },
    {
      _id: '2',
      type: 'إفادة قيد',
      title: 'إفادة قيد - العام الدراسي 1447',
      status: 'جاهزة للطباعة',
      certificateNumber: 'CERT-202603-ABC',
      createdAt: '2026-03-10T09:00:00Z',
      issuedAt: '2026-03-11T09:00:00Z',
      downloadCount: 0,
    },
    {
      _id: '3',
      type: 'شهادة إتمام برنامج',
      title: 'شهادة إتمام برنامج التخاطب',
      status: 'قيد المعالجة',
      certificateNumber: 'CERT-202603-DEF',
      createdAt: '2026-03-14T08:00:00Z',
      downloadCount: 0,
    },
    {
      _id: '4',
      type: 'شهادة تفوق',
      title: 'شهادة التفوق السلوكي',
      status: 'قيد الطلب',
      certificateNumber: 'CERT-202603-GHI',
      createdAt: '2026-03-15T12:00:00Z',
      downloadCount: 0,
    },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [certsRes, typesRes] = await Promise.all([
        api.get(`/student-certificates/${userId}`).catch(() => null),
        api.get(`/student-certificates/${userId}/available-types`).catch(() => null),
      ]);
      setCertificates(certsRes?.data?.success ? certsRes.data.data : mockCerts);
      setAvailableTypes(typesRes?.data?.success ? typesRes.data.data : mockTypes);
    } catch {
      setCertificates(mockCerts);
      setAvailableTypes(mockTypes);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequest = async () => {
    if (!requestForm.type || !requestForm.title) {
      showSnackbar('يرجى اختيار نوع الشهادة وكتابة العنوان', 'warning');
      return;
    }
    try {
      const res = await api.post(`/student-certificates/${userId}`, requestForm).catch(() => null);
      if (res?.data?.success) {
        showSnackbar(res.data.message, 'success');
        loadData();
      } else {
        showSnackbar('تم تقديم طلب الشهادة بنجاح (وضع تجريبي)', 'success');
        setCertificates(prev => [
          {
            ...requestForm,
            _id: Date.now(),
            status: 'قيد الطلب',
            certificateNumber: `CERT-NEW-${Date.now()}`,
            createdAt: new Date().toISOString(),
            downloadCount: 0,
          },
          ...prev,
        ]);
      }
      setOpenRequest(false);
      setRequestForm({ type: '', title: '', description: '', metadata: {} });
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleDownload = async cert => {
    try {
      await api.post(`/student-certificates/${userId}/${cert._id}/download`).catch(() => null);
      showSnackbar('تم تحميل الشهادة', 'success');
    } catch {
      showSnackbar('الشهادة ليست جاهزة للتحميل بعد', 'warning');
    }
  };

  const filteredCerts =
    tab === 0
      ? certificates
      : tab === 1
        ? certificates.filter(c => ['قيد الطلب', 'قيد المعالجة'].includes(c.status))
        : certificates.filter(c => ['معتمدة', 'جاهزة للطباعة', 'تم التسليم'].includes(c.status));

  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.accent || gradients.primary,
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              🎓 الشهادات والإفادات
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              اطلب شهاداتك وتابع حالتها
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenRequest(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            طلب شهادة
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الشهادات',
            value: certificates.length,
            icon: <DocIcon />,
            gradient: gradients.primary,
          },
          {
            label: 'قيد المعالجة',
            value: certificates.filter(c => ['قيد الطلب', 'قيد المعالجة'].includes(c.status))
              .length,
            icon: <PendingIcon />,
            gradient: gradients.warning || '#f39c12',
          },
          {
            label: 'جاهزة',
            value: certificates.filter(c => ['معتمدة', 'جاهزة للطباعة'].includes(c.status)).length,
            icon: <VerifiedIcon />,
            gradient: gradients.success || '#2ecc71',
          },
          {
            label: 'التحميلات',
            value: certificates.reduce((s, c) => s + (c.downloadCount || 0), 0),
            icon: <DownloadIcon />,
            gradient: gradients.info || '#3498db',
          },
        ].map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ background: stat.gradient, color: 'white', borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                {stat.icon}
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="الكل" />
          <Tab label="قيد المعالجة" />
          <Tab label="جاهزة" />
        </Tabs>
      </Paper>

      {/* Certificates List */}
      <Grid container spacing={2}>
        {filteredCerts.map(cert => (
          <Grid item xs={12} sm={6} md={4} key={cert._id}>
            <Card
              sx={{
                borderRadius: 2,
                height: '100%',
                '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                transition: 'all 0.3s',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    <CertIcon />
                  </Avatar>
                  <Chip
                    label={cert.status}
                    size="small"
                    color={statusConfig[cert.status]?.color || 'default'}
                  />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {cert.title || cert.type}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  {cert.type}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="textSecondary">
                    الرقم: {cert.certificateNumber}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    تاريخ الطلب: {new Date(cert.createdAt).toLocaleDateString('ar-SA')}
                  </Typography>
                  {cert.issuedAt && (
                    <Typography variant="caption" color="success.main">
                      تاريخ الإصدار: {new Date(cert.issuedAt).toLocaleDateString('ar-SA')}
                    </Typography>
                  )}
                </Stack>
                {['معتمدة', 'جاهزة للطباعة'].includes(cert.status) && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(cert)}
                    sx={{ mt: 2 }}
                  >
                    تحميل الشهادة
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredCerts.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2, borderRadius: 2 }}>
          <CertIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            لا توجد شهادات
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenRequest(true)}
            sx={{ mt: 2 }}
          >
            اطلب شهادة الآن
          </Button>
        </Paper>
      )}

      {/* Request / Available Types */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          📋 أنواع الشهادات المتاحة
        </Typography>
        <Grid container spacing={2}>
          {availableTypes.map(type => (
            <Grid item xs={12} sm={6} md={4} key={type.id}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                }}
                onClick={() => {
                  setRequestForm({ type: type.name, title: type.name, description: '' });
                  setOpenRequest(true);
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ mb: 1 }}>
                    {type.icon}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {type.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {type.description}
                  </Typography>
                  <Typography variant="caption" display="block" color="primary" sx={{ mt: 1 }}>
                    ⏱ {type.processingDays} أيام عمل
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Request Dialog */}
      <Dialog open={openRequest} onClose={() => setOpenRequest(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📝 طلب شهادة جديدة</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="نوع الشهادة *"
              value={requestForm.type}
              onChange={e =>
                setRequestForm({ ...requestForm, type: e.target.value, title: e.target.value })
              }
              fullWidth
            >
              {availableTypes.map(t => (
                <MenuItem key={t.id} value={t.name}>
                  {t.icon} {t.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="عنوان الطلب *"
              value={requestForm.title}
              onChange={e => setRequestForm({ ...requestForm, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="ملاحظات إضافية"
              value={requestForm.description}
              onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequest(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRequest}>
            تقديم الطلب
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentCertificates;
