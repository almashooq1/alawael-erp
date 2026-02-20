/**
 * مكون تخطيط التعاقب الوظيفي
 * Succession Planning Component
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  ProgressBar,
  GaugeChart
} from '@mui/material';
import {
  TrendingUp,
  People,
  PersonAdd,
  Edit,
  Target,
  School,
  CheckCircle,
  WarningAmber,
  Info,
  Menu,
  TreeView,
  TreeItem
} from '@mui/icons-material';
import axios from 'axios';

const SuccessionPlanning = ({ positionId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSuccessionPlan();
  }, [positionId]);

  const loadSuccessionPlan = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/succession/${positionId}`);
      setPlan(response.data.data);
    } catch (error) {
      setError('خطأ في تحميل خطة التعاقب');
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = (type) => {
    setDialogType(type);
    setFormData({});
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setDialogType('');
    setFormData({});
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRiskLabel = (level) => {
    switch (level) {
      case 'critical':
        return 'حرج';
      case 'high':
        return 'مرتفع';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
      default:
        return 'غير محدد';
    }
  };

  const renderRiskAssessment = () => (
    <Box>
      <Card sx={{ mb: 2, backgroundColor: '#fff3e0' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmber color="warning" />
              تقييم المخاطر
            </Typography>
            <Chip
              label={getRiskLabel(plan?.riskLevel)}
              color={getRiskColor(plan?.riskLevel)}
              size="small"
            />
          </Box>

          <Typography paragraph>
            {plan?.riskAssessment}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                المنصب الحالي
              </Typography>
              <Typography variant="body2">
                {plan?.positionTitle}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                المسؤول الحالي: {plan?.currentHolder?.email}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                الجاهزية الإجمالية
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={plan?.overallReadiness * 100 || 0}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {(plan?.overallReadiness * 100 || 0).toFixed(0)}% من المرشحين جاهزون
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const renderSuccessors = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          مرشحو الخلافة ({plan?.successors?.length || 0})
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => openAddDialog('successor')}
        >
          إضافة مرشح
        </Button>
      </Box>

      {plan?.successors && plan.successors.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>المرشح</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الجاهزية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>نسبة الجاهزية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>نقاط القوة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plan.successors.map((successor, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {successor.candidateId?.email}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        successor.readinessLevel === 'ready_now' ? 'جاهز الآن' :
                        successor.readinessLevel === 'ready_1_year' ? 'جاهز خلال سنة' :
                        successor.readinessLevel === 'ready_3_years' ? 'جاهز خلال 3 سنوات' :
                        'تحت التطوير'
                      }
                      color={
                        successor.readinessLevel === 'ready_now' ? 'success' :
                        successor.readinessLevel === 'ready_1_year' ? 'info' :
                        successor.readinessLevel === 'ready_3_years' ? 'warning' :
                        'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={successor.readinessPercentage || 0}
                        sx={{ flex: 1, minWidth: '100px' }}
                      />
                      <Typography variant="body2">
                        {successor.readinessPercentage || 0}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {successor.keyStrengths?.slice(0, 2).map((strength, idx) => (
                        <Chip key={idx} label={strength} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedSuccessor(successor);
                        openAddDialog('developmentPlan');
                      }}
                    >
                      خطة تطوير
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">لم يتم إضافة مرشحي خلافة بعد</Alert>
      )}
    </Box>
  );

  const renderDevelopmentPrograms = () => (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          برامج التطوير والإعداد
        </Typography>

        {plan?.leadershipProgram && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    برنامج الإعداد القيادي
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {plan.leadershipProgram.programName}
                  </Typography>
                </Box>
                <Chip
                  label={plan.leadershipProgram.status}
                  color={plan.leadershipProgram.status === 'completed' ? 'success' : 'info'}
                  size="small"
                />
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                المقدم: {plan.leadershipProgram.provider}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                المدة: {new Date(plan.leadershipProgram.startDate).toLocaleDateString('ar-SA')} إلى {new Date(plan.leadershipProgram.endDate).toLocaleDateString('ar-SA')}
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الأهداف:
              </Typography>
              <List dense>
                {plan.leadershipProgram.objectives?.map((objective, idx) => (
                  <ListItem key={idx} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircle fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={objective} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {plan?.mentorshipProgram && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    برنامج التوجيه الفردي (Mentorship)
                  </Typography>
                </Box>
                <Chip
                  label={plan.mentorshipProgram.status}
                  color={plan.mentorshipProgram.status === 'completed' ? 'success' : 'info'}
                  size="small"
                />
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                المرشد: {plan.mentorshipProgram.mentorId?.email}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                بدء التاريخ: {new Date(plan.mentorshipProgram.startDate).toLocaleDateString('ar-SA')}
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                أهداف التوجيه:
              </Typography>
              <List dense>
                {plan.mentorshipProgram.objectives?.map((objective, idx) => (
                  <ListItem key={idx} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircle fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={objective} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outlined"
          startIcon={<School />}
          fullWidth
          onClick={() => openAddDialog('leadershipProgram')}
        >
          إضافة برنامج إعداد قيادي
        </Button>
      </Box>
    </Box>
  );

  const renderCompetencies = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
        الكفاءات المطلوبة للمنصب
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>الكفاءة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المستوى المطلوب</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الأهمية</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plan?.requiredCompetencies?.map((comp, idx) => (
              <TableRow key={idx}>
                <TableCell>{comp.competency}</TableCell>
                <TableCell>
                  <Chip
                    label={
                      comp.proficiencyLevel === 'expert' ? 'خبير' :
                      comp.proficiencyLevel === 'advanced' ? 'متقدم' :
                      comp.proficiencyLevel === 'intermediate' ? 'متوسط' :
                      'مبتدئ'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      comp.criticality === 'critical' ? 'حرج' :
                      comp.criticality === 'important' ? 'مهم' :
                      'مرغوب'
                    }
                    color={
                      comp.criticality === 'critical' ? 'error' :
                      comp.criticality === 'important' ? 'warning' :
                      'info'
                    }
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
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
            <TrendingUp />
            تخطيط التعاقب الوظيفي
          </Typography>

          {renderRiskAssessment()}

          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3, mt: 2 }}>
            <Tab label="مرشحو الخلافة" />
            <Tab label="برامج التطوير" />
            <Tab label="الكفاءات المطلوبة" />
          </Tabs>

          {tabValue === 0 && renderSuccessors()}
          {tabValue === 1 && renderDevelopmentPrograms()}
          {tabValue === 2 && renderCompetencies()}
        </>
      )}
    </Container>
  );
};

export default SuccessionPlanning;
