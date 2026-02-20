/**
 * مكون نظام التقييم المتعدد الأبعاد
 * Performance Evaluation Component
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Button,
  Typography,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  FormControlLabel,
  Checkbox,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  BarChart,
  PieChart,
  LineChart
} from '@mui/material';
import {
  Star,
  ThumbUp,
  ThumbDown,
  TrendingUp,
  Comment,
  Send,
  Check,
  Edit,
  PictureAsPdf,
  MoreVert
} from '@mui/icons-material';
import axios from 'axios';

const PerformanceEvaluation = ({ employeeId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({
    scores: [],
    comments: '',
    strengths: [],
    areasForImprovement: [],
    recommendations: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const evaluationCriteria = [
    { id: 1, name: 'المهارات التقنية', category: 'technical_skills' },
    { id: 2, name: 'المهارات اللينة', category: 'soft_skills' },
    { id: 3, name: 'القيادة', category: 'leadership' },
    { id: 4, name: 'العمل الجماعي', category: 'teamwork' },
    { id: 5, name: 'التواصل', category: 'communication' },
    { id: 6, name: 'الإنتاجية', category: 'productivity' },
    { id: 7, name: 'جودة العمل', category: 'quality' },
    { id: 8, name: 'الموثوقية', category: 'reliability' },
    { id: 9, name: 'الابتكار', category: 'innovation' },
    { id: 10, name: 'خدمة العملاء', category: 'customer_service' }
  ];

  useEffect(() => {
    loadEvaluation();
  }, [employeeId]);

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/performance/${employeeId}`);
      setEvaluation(response.data.data);
    } catch (error) {
      setError('خطأ في تحميل بيانات التقييم');
    } finally {
      setLoading(false);
    }
  };

  const openEvaluationDialog = (type) => {
    setDialogType(type);
    setFormData({
      scores: Array(evaluationCriteria.length).fill(0),
      comments: '',
      strengths: [],
      areasForImprovement: [],
      recommendations: ''
    });
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setDialogType('');
  };

  const handleSubmitEvaluation = async () => {
    try {
      const endpoint = `/api/performance/${evaluation._id}/${dialogType}-evaluation`;
      const payload = {
        ...formData,
        score: formData.scores.reduce((a, b) => a + b, 0) / formData.scores.length
      };

      await axios.post(endpoint, payload);
      setSuccess('تم إرسال التقييم بنجاح');
      loadEvaluation();
      closeDialog();
    } catch (error) {
      setError('خطأ في إرسال التقييم');
    }
  };

  const renderScoreCard = (title, score, maxScore = 5) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Chip
            label={`${score.toFixed(1)}/${maxScore}`}
            color={score >= 4 ? 'success' : score >= 3 ? 'warning' : 'error'}
            size="small"
          />
        </Box>
        <LinearProgress variant="determinate" value={(score / maxScore) * 100} sx={{ mb: 1 }} />
        <Rating value={score} max={maxScore} readOnly precision={0.5} />
      </CardContent>
    </Card>
  );

  const renderManagementEvaluation = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">تقييم الإدارة</Typography>
        <Button
          variant="contained"
          startIcon={<Star />}
          onClick={() => openEvaluationDialog('management')}
        >
          إضافة تقييم
        </Button>
      </Box>

      {evaluation?.evaluations?.managementEvaluation ? (
        <>
          {renderScoreCard('النتيجة الإجمالية', evaluation.evaluations.managementEvaluation.score)}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                نقاط القوة
              </Typography>
              <Box sx={{ mb: 2 }}>
                {evaluation.evaluations.managementEvaluation.strengths?.map((strength, idx) => (
                  <Chip key={idx} label={strength} sx={{ m: 0.5 }} color="success" variant="outlined" />
                ))}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                مجالات التحسين
              </Typography>
              <Box sx={{ mb: 2 }}>
                {evaluation.evaluations.managementEvaluation.areasForImprovement?.map((area, idx) => (
                  <Chip key={idx} label={area} sx={{ m: 0.5 }} color="warning" variant="outlined" />
                ))}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                التعليقات
              </Typography>
              <Typography paragraph>
                {evaluation.evaluations.managementEvaluation.comments}
              </Typography>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="info">لم يتم تقييم الموظف من قبل الإدارة بعد</Alert>
      )}
    </Box>
  );

  const renderPeerEvaluations = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          تقييمات الزملاء ({evaluation?.evaluations?.peerEvaluations?.length || 0})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Star />}
          onClick={() => openEvaluationDialog('peer')}
        >
          إضافة تقييم
        </Button>
      </Box>

      {evaluation?.evaluations?.peerEvaluations && evaluation.evaluations.peerEvaluations.length > 0 ? (
        evaluation.evaluations.peerEvaluations.map((evalItem, idx) => (
          <Card key={idx} sx={{ mb: 2 }}>
            <CardContent>
              {renderScoreCard(`الزميل ${idx + 1}`, evalItem.score)}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" paragraph>
                {evalItem.comments}
              </Typography>
            </CardContent>
          </Card>
        ))
      ) : (
        <Alert severity="info">لم يتم إضافة تقييمات من الزملاء بعد</Alert>
      )}
    </Box>
  );

  const renderSummary = () => (
    <Box>
      {evaluation?.summary ? (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  النتيجة النهائية
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={(evaluation.summary.overallScore / 5) * 100}
                      size={80}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {evaluation.summary.overallScore?.toFixed(1)}/5
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Chip
                      label={evaluation.summary.overallRating}
                      color={
                        evaluation.summary.overallRating === 'ممتاز' ? 'success' :
                        evaluation.summary.overallRating === 'جيد جداً' ? 'info' :
                        evaluation.summary.overallRating === 'جيد' ? 'primary' :
                        evaluation.summary.overallRating === 'مقبول' ? 'warning' :
                        'error'
                      }
                      size="medium"
                      variant="filled"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الملخص التنفيذي
              </Typography>
              <Typography paragraph>
                {evaluation.summary.executiveSummary}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الإنجازات الرئيسية
              </Typography>
              <List>
                {evaluation.summary.keyAchievements?.map((achievement, idx) => (
                  <ListItem key={idx} disableGutters>
                    <ListItemIcon>
                      <Check color="success" />
                    </ListItemIcon>
                    <ListItemText primary={achievement} />
                  </ListItem>
                ))}
              </List>

              {evaluation.summary.promotionRecommended && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  يوصى بترقية هذا الموظف
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="info">لم يتم إكمال التقييم بعد</Alert>
      )}
    </Box>
  );

  const renderEvaluationDialog = () => (
    <Dialog open={openDialog} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        {dialogType === 'management' ? 'تقييم من الإدارة' :
         dialogType === 'peer' ? 'تقييم من الزملاء' :
         'تقييم من المستفيدين'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            قييم معايير الأداء (1-5)
          </Typography>
          {evaluationCriteria.map((criterion, idx) => (
            <Box key={criterion.id}>
              <Typography variant="body2">{criterion.name}</Typography>
              <Rating
                value={formData.scores[idx] || 0}
                onChange={(e, value) => {
                  const newScores = [...formData.scores];
                  newScores[idx] = value;
                  setFormData({ ...formData, scores: newScores });
                }}
              />
            </Box>
          ))}

          <TextField
            label="نقاط القوة (مفصول بفواصل)"
            multiline
            rows={2}
            fullWidth
            value={formData.strengths.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              strengths: e.target.value.split(',').map(s => s.trim())
            })}
          />

          <TextField
            label="مجالات التحسين (مفصول بفواصل)"
            multiline
            rows={2}
            fullWidth
            value={formData.areasForImprovement.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              areasForImprovement: e.target.value.split(',').map(s => s.trim())
            })}
          />

          <TextField
            label="التعليقات والملاحظات"
            multiline
            rows={3}
            fullWidth
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          />

          <TextField
            label="التوصيات"
            multiline
            rows={2}
            fullWidth
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>إلغاء</Button>
        <Button onClick={handleSubmitEvaluation} variant="contained" color="primary">
          إرسال التقييم
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star />
            نظام التقييم المتعدد الأبعاد
          </Typography>

          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            <Tab label="تقييم الإدارة" />
            <Tab label="تقييمات الزملاء" />
            <Tab label="الملخص والنتائج" />
          </Tabs>

          {tabValue === 0 && renderManagementEvaluation()}
          {tabValue === 1 && renderPeerEvaluations()}
          {tabValue === 2 && renderSummary()}

          {renderEvaluationDialog()}
        </>
      )}
    </Container>
  );
};

export default PerformanceEvaluation;
