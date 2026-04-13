import { useState, useEffect } from 'react';
import {  Paper,
} from '@mui/material';


import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const TherapistAssessments = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [data, setData] = useState({ assessments: [], standardScales: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScale, setSelectedScale] = useState(null);
  const [newAssessment, setNewAssessment] = useState({
    patientName: '',
    scaleName: '',
    scaleId: '',
    category: '',
    score: 0,
    maxScore: 0,
    notes: '',
  });

  useEffect(() => {
    loadAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAssessments = async () => {
    try {
      const result = await therapistService.getAssessments();
      setData(result || { assessments: [], standardScales: [], stats: {} });
      setLoading(false);
    } catch (error) {
      logger.error('Error loading assessments:', error);
      setLoading(false);
      showSnackbar('حدث خطأ في تحميل التقييمات', 'error');
    }
  };

  const handleCreateAssessment = async () => {
    try {
      await therapistService.createAssessment(newAssessment);
      showSnackbar('تم حفظ التقييم بنجاح', 'success');
      setDialogOpen(false);
      setNewAssessment({
        patientName: '',
        scaleName: '',
        scaleId: '',
        category: '',
        score: 0,
        maxScore: 0,
        notes: '',
      });
      loadAssessments();
    } catch (error) {
      showSnackbar('حدث خطأ في حفظ التقييم', 'error');
    }
  };

  const handleDeleteAssessment = async assessmentId => {
    try {
      await therapistService.deleteAssessment(assessmentId);
      showSnackbar('تم حذف التقييم', 'success');
      loadAssessments();
    } catch (error) {
      showSnackbar('حدث خطأ في حذف التقييم', 'error');
    }
  };

  const openScaleDialog = scale => {
    setSelectedScale(scale);
    setNewAssessment({
      ...newAssessment,
      scaleName: scale.name,
      scaleId: scale.id,
      category: scale.category,
      maxScore: scale.maxScore,
    });
    setDialogOpen(true);
  };

  const { stats = {}, standardScales = [], assessments = [] } = data;

  const getCategoryLabel = cat => {
    const map = {
      physical: 'جسدي',
      functional: 'وظيفي',
      pain: 'ألم',
      motor: 'حركي',
      behavioral: 'سلوكي',
      diagnostic: 'تشخيصي',
      disability: 'إعاقة',
      sensory: 'حسي',
    };
    return map[cat] || cat;
  };

  const getCategoryColor = cat => {
    const map = {
      physical: 'primary',
      functional: 'success',
      pain: 'error',
      motor: 'info',
      behavioral: 'warning',
      diagnostic: 'secondary',
      disability: 'default',
      sensory: 'info',
    };
    return map[cat] || 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل التقييمات...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.warning, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              التقييمات والمقاييس
            </Typography>
            <Typography variant="body2">أدوات التقييم المعيارية وتتبع نتائج المرضى</Typography>
          </Box>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي التقييمات',
            value: stats.totalAssessments || 0,
            color: statusColors.info,
          },
          { label: 'هذا الشهر', value: stats.thisMonth || 0, color: statusColors.success },
          { label: 'هذا الأسبوع', value: stats.thisWeek || 0, color: statusColors.warning },
          {
            label: 'متوسط الدرجات',
            value: `${stats.averageScore || 0}%`,
            color: statusColors.purple,
          },
        ].map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: stat.color }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }}>
        <Tab label="المقاييس المعيارية" icon={<CategoryIcon />} iconPosition="start" />
        <Tab label="التقييمات المسجلة" icon={<ChartIcon />} iconPosition="start" />
      </Tabs>

      {/* المقاييس المعيارية */}
      {tabIndex === 0 && (
        <Grid container spacing={2}>
          {standardScales.map(scale => (
            <Grid item xs={12} sm={6} md={4} key={scale.id}>
              <Card
                sx={{
                  borderRadius: 2,
                  height: '100%',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.3s',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Chip
                      label={getCategoryLabel(scale.category)}
                      color={getCategoryColor(scale.category)}
                      size="small"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {scale.id}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                    {scale.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: neutralColors.textMuted, display: 'block', mb: 1 }}
                  >
                    {scale.nameEn}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, minHeight: 40 }}>
                    {scale.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 'auto',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        أقصى درجة: {scale.maxScore} • عناصر: {scale.items}
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => openScaleDialog(scale)}>
                      إجراء تقييم
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* التقييمات المسجلة */}
      {tabIndex === 1 && (
        <Box>
          {assessments.length > 0 ? (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: surfaceColors.paperAlt }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>المريض</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المقياس</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الدرجة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النسبة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell>{a.patientName}</TableCell>
                      <TableCell>{a.scaleName}</TableCell>
                      <TableCell>
                        <Chip
                          label={getCategoryLabel(a.category)}
                          color={getCategoryColor(a.category)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {a.score}/{a.maxScore}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${a.scorePercent}%`}
                          color={
                            a.scorePercent >= 70
                              ? 'success'
                              : a.scorePercent >= 40
                                ? 'warning'
                                : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(a.createdAt).toLocaleDateString('ar')}</TableCell>
                      <TableCell>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAssessment(a.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
              <AssessmentIcon sx={{ fontSize: 60, color: neutralColors.textMuted, mb: 2 }} />
              <Typography color="textSecondary">لا توجد تقييمات مسجلة</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                اختر مقياسًا من التبويب الأول لإجراء تقييم
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Dialog تقييم جديد */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إجراء تقييم جديد {selectedScale ? `- ${selectedScale.name}` : ''}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="اسم المريض"
            fullWidth
            value={newAssessment.patientName}
            onChange={e => setNewAssessment({ ...newAssessment, patientName: e.target.value })}
          />
          {selectedScale && (
            <Paper sx={{ p: 2, backgroundColor: surfaceColors.paperAlt }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {selectedScale.name}
              </Typography>
              <Typography variant="caption">{selectedScale.description}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                أقصى درجة: {selectedScale.maxScore} | عدد العناصر: {selectedScale.items}
              </Typography>
            </Paper>
          )}
          <TextField
            label="الدرجة"
            type="number"
            fullWidth
            value={newAssessment.score}
            onChange={e => setNewAssessment({ ...newAssessment, score: Number(e.target.value) })}
            inputProps={{ min: 0, max: newAssessment.maxScore }}
            helperText={`من 0 إلى ${newAssessment.maxScore}`}
          />
          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={3}
            value={newAssessment.notes}
            onChange={e => setNewAssessment({ ...newAssessment, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateAssessment}
            disabled={!newAssessment.patientName || newAssessment.score < 0}
          >
            حفظ التقييم
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistAssessments;
