/**
 * ICF Assessment Detail Page
 * صفحة تفاصيل تقييم ICF - عرض وتحليل
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Button,
  Typography,
  Grid,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  Recommend as RecommendIcon,
  PlaylistAdd as PlaylistAddIcon,
  SaveAlt as SaveAltIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ICFProgressChart } from '../../assessment/ICFEngine';
import { useICFAssessment } from '../../assessment/ICFEngine/hooks/useICFAssessment';
import { assessmentsService } from '../../services/icfAssessmentService';

export default function ICFAssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [recommendationsDialog, setRecommendationsDialog] = useState({ open: false, data: [] });
  const [generatingGoals, setGeneratingGoals] = useState(false);
  const [creatingCarePlan, setCreatingCarePlan] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [exportingDocument, setExportingDocument] = useState(false);

  useEffect(() => {
    // Mock data for now - will be replaced with actual API call
    const mockAssessment = {
      _id: id,
      beneficiary: { name: 'أحمد محمد العلي', age: 8 },
      assessor: { name: 'د. سارة الأحمد' },
      coreSetType: 'rehab',
      assessmentDate: new Date().toISOString(),
      overallScore: 2.3,
      domainScores: {
        bodyFunctions: 2.5,
        bodyStructures: 1.8,
        activitiesAndParticipation: 2.7,
        environmentalFactors: 1.2,
        personalFactors: 2.0,
      },
      scores: {
        b110: { performance: 2, capacity: 1 },
        b114: { performance: 3, capacity: 2 },
        b117: { performance: 1, capacity: 1 },
        d440: { performance: 3, capacity: 2 },
        d510: { performance: 2, capacity: 1 },
        e110: { performance: 0, capacity: 0, environmental: 2 },
      },
      status: 'completed',
      notes: 'ملاحظات التقييم',
      recommendations: [
        { priority: 'high', domain: 'bodyFunctions', recommendation: 'تدليك في الحركة' },
        {
          priority: 'medium',
          domain: 'activitiesAndParticipation',
          recommendation: 'تدريب على الحياة اليومية',
        },
      ],
    };

    setTimeout(() => {
      setAssessment(mockAssessment);
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const domainLabels = {
    bodyFunctions: 'وظائف الجسم',
    bodyStructures: 'أجزاء الجسم',
    activitiesAndParticipation: 'الأنشطة والمشاركة',
    environmentalFactors: 'العوامل البيئية',
    personalFactors: 'العوامل الشخصية',
  };

  const getScoreColor = score => {
    if (score <= 1) return 'success';
    if (score <= 2) return 'warning';
    return 'error';
  };

  const handleGenerateGoals = async () => {
    setGeneratingGoals(true);
    try {
      await assessmentsService.generateGoals(assessment._id);
      setSnackbar({ open: true, message: 'تم إنشاء الأهداف بنجاح', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'فشل إنشاء الأهداف', severity: 'error' });
    } finally {
      setGeneratingGoals(false);
    }
  };

  const handleCreateCarePlan = async () => {
    setCreatingCarePlan(true);
    try {
      await assessmentsService.createCarePlan(assessment._id);
      setSnackbar({ open: true, message: 'تم إنشاء خطة الرعاية بنجاح', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || 'فشل إنشاء خطة الرعاية',
        severity: 'error',
      });
    } finally {
      setCreatingCarePlan(false);
    }
  };

  const handleViewRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const data = await assessmentsService.getRecommendations(assessment._id);
      setRecommendationsDialog({ open: true, data: data?.recommendations || data || [] });
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'فشل تحميل التوصيات', severity: 'error' });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCloseRecommendations = () => {
    setRecommendationsDialog({ open: false, data: [] });
  };

  const handleExportToDocument = async () => {
    setExportingDocument(true);
    try {
      const data = await assessmentsService.exportToDocument(assessment._id);
      setSnackbar({
        open: true,
        message: data?.message || 'تم حفظ التقرير في الملفات الطبية',
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || 'فشل حفظ التقرير في الملفات الطبية',
        severity: 'error',
      });
    } finally {
      setExportingDocument(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/icf-assessments')}
            sx={{ color: 'text.secondary' }}
          >
            رجوع
          </Button>
          <Typography variant="h6" fontWeight={700}>
            تفاصيل تقييم ICF
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={generatingGoals ? <CircularProgress size={16} /> : <PlaylistAddIcon />}
            onClick={handleGenerateGoals}
            disabled={generatingGoals}
          >
            إنشاء الأهداف
          </Button>
          <Button
            variant="outlined"
            startIcon={creatingCarePlan ? <CircularProgress size={16} /> : <AssignmentIcon />}
            onClick={handleCreateCarePlan}
            disabled={creatingCarePlan}
          >
            إنشاء خطة الرعاية
          </Button>
          <Button
            variant="outlined"
            startIcon={loadingRecommendations ? <CircularProgress size={16} /> : <RecommendIcon />}
            onClick={handleViewRecommendations}
            disabled={loadingRecommendations}
          >
            عرض التوصيات
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/icf/edit/${id}`)}
          >
            تعديل
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            طباعة
          </Button>
          <Button
            variant="outlined"
            startIcon={exportingDocument ? <CircularProgress size={16} /> : <SaveAltIcon />}
            onClick={handleExportToDocument}
            disabled={exportingDocument}
          >
            حفظ في الملف الطبي
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Grid container spacing={3}>
          {/* Assessment Info */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                  معلومات التقييم
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      المستفيد
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {assessment.beneficiary?.name}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      العمر
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                    >{`${assessment.beneficiary?.age || '-'} سنة`}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      المقيّم
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {assessment.assessor?.name || '-'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      التاريخ
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(assessment.assessmentDate).toLocaleDateString('ar-SA')}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      الحالة
                    </Typography>
                    <Chip
                      label={assessment.status === 'completed' ? 'مكتمل' : 'مسودة'}
                      color={assessment.status === 'completed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Paper>
            </motion.div>
          </Grid>

          {/* Overall Score */}
          <Grid item xs={12} md={8}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                  النتائج
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Typography
                        variant="h3"
                        fontWeight={800}
                        color={getScoreColor(assessment.overallScore)}
                      >
                        {assessment.overallScore.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / 4.0
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      الدرجة الإجمالية
                    </Typography>
                  </Grid>
                  {Object.entries(assessment.domainScores).map(([domain, score]) => (
                    <Grid item xs={12} sm={6} key={domain}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {domainLabels[domain]}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color={getScoreColor(score)}>
                            {score.toFixed(1)}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </motion.div>
          </Grid>

          {/* Progress Chart */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                <ICFProgressChart data={[]} showTrend={false} showRadar={true} showBar={true} />
              </Paper>
            </motion.div>
          </Grid>

          {/* Recommendations */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  التوصيات
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  {assessment.recommendations?.map((rec, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Chip
                          label={rec.priority === 'high' ? 'أولوية عالية' : 'أولوية متوسطة'}
                          color={rec.priority === 'high' ? 'error' : 'warning'}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {domainLabels[rec.domain]}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{rec.recommendation}</Typography>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Box>

      {/* Recommendations Dialog */}
      <Dialog
        open={recommendationsDialog.open}
        onClose={handleCloseRecommendations}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>التوصيات المقترحة</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {recommendationsDialog.data.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                لا توجد توصيات متاحة.
              </Typography>
            )}
            {recommendationsDialog.data.map((rec, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip
                    label={
                      rec.priority === 'high'
                        ? 'أولوية عالية'
                        : rec.priority === 'medium'
                          ? 'أولوية متوسطة'
                          : 'أولوية منخفضة'
                    }
                    color={
                      rec.priority === 'high'
                        ? 'error'
                        : rec.priority === 'medium'
                          ? 'warning'
                          : 'default'
                    }
                    size="small"
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {domainLabels[rec.domain] || rec.domain}
                  </Typography>
                </Box>
                {rec.rationale && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {rec.rationale}
                  </Typography>
                )}
                <Typography variant="body2">{rec.recommendation || rec.title}</Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecommendations}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
