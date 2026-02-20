import React, { useState, useCallback, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Typography,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useApi } from '../hooks/useApi';

export default function InternalAuditDashboard() {
  const { get, post, put, delete: deleteApi } = useApi();
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Annual Audit Plans
  const [auditPlans, setAuditPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  // Surprise Audits
  const [surpriseAudits, setSurpriseAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  // Non-Conformance Reports
  const [ncrList, setNcrList] = useState([]);
  const [selectedNCR, setSelectedNCR] = useState(null);
  const [ncrDialogOpen, setNcrDialogOpen] = useState(false);

  // Corrective/Preventive Actions
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  // Closure Follow-ups
  const [followUps, setFollowUps] = useState([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);

  // ==========================================
  // البيانات الأولية
  // ==========================================

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get('/internal-audits/internal-audit-dashboard');
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات التقرير:', error);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const fetchAuditPlans = useCallback(async () => {
    try {
      const response = await get('/internal-audits/audit-plans');
      if (response.success) {
        setAuditPlans(response.data);
      }
    } catch (error) {
      console.error('خطأ في جلب خطط التدقيق:', error);
    }
  }, [get]);

  const fetchSurpriseAudits = useCallback(async () => {
    try {
      const response = await get('/internal-audits/surprise-audits');
      if (response.success) {
        setSurpriseAudits(response.data);
      }
    } catch (error) {
      console.error('خطأ في جلب عمليات التدقيق:', error);
    }
  }, [get]);

  const fetchNCRs = useCallback(async () => {
    try {
      const response = await get('/internal-audits/non-conformance-reports');
      if (response.success) {
        setNcrList(response.data);
      }
    } catch (error) {
      console.error('خطأ في جلب التقارير:', error);
    }
  }, [get]);

  const fetchActions = useCallback(async () => {
    try {
      const response = await get('/internal-audits/corrective-preventive-actions');
      if (response.success) {
        setActions(response.data);
      }
    } catch (error) {
      console.error('خطأ في جلب الإجراءات:', error);
    }
  }, [get]);

  const fetchFollowUps = useCallback(async () => {
    try {
      const response = await get('/internal-audits/closure-followups');
      if (response.success) {
        setFollowUps(response.data);
      }
    } catch (error) {
      console.error('خطأ في جلب المتابعات:', error);
    }
  }, [get]);

  useEffect(() => {
    fetchDashboard();
    fetchAuditPlans();
    fetchSurpriseAudits();
    fetchNCRs();
    fetchActions();
    fetchFollowUps();
  }, []);

  // ==========================================
  // الوظائف المساعدة
  // ==========================================

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': 'error',
      'major': 'warning',
      'minor': 'info',
      '1-Critical': 'error',
      '2-High': 'warning',
      '3-Medium': 'info',
      '4-Low': 'success'
    };
    return colors[severity] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'default',
      'active': 'success',
      'completed': 'success',
      'open': 'error',
      'closed': 'success',
      'in-progress': 'info',
      'planned': 'info',
      'pending': 'warning'
    };
    return colors[status] || 'default';
  };

  // ==========================================
  // TAB 1: Overview
  // ==========================================

  const OverviewTab = () => (
    <Grid container spacing={3}>
      {loading ? (
        <Grid item xs={12}>
          <CircularProgress />
        </Grid>
      ) : dashboardData ? (
        <>
          {/* خطط التدقيق */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  خطط التدقيق
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">
                    {dashboardData.auditPlans.total}
                  </Typography>
                  <Chip
                    label={`نشطة: ${dashboardData.auditPlans.active}`}
                    color="primary"
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={dashboardData.auditPlans.completionRate}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* عمليات التدقيق المفاجئة */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  عمليات التدقيق المفاجئة
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">
                    {dashboardData.surpriseAudits.total}
                  </Typography>
                  <Chip
                    label={`مكتملة: ${dashboardData.surpriseAudits.completed}`}
                    color="success"
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={dashboardData.surpriseAudits.completionRate}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* تقارير عدم المطابقة */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  تقارير عدم المطابقة
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">
                    {dashboardData.nonConformances.total}
                  </Typography>
                  <Chip
                    label={`حرجة: ${dashboardData.nonConformances.critical}`}
                    color="error"
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100 - dashboardData.nonConformances.openRate}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* الإجراءات التصحيحية */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  الإجراءات التصحيحية
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">
                    {dashboardData.actions.total}
                  </Typography>
                  <Chip
                    label={`مكتملة: ${dashboardData.actions.completed}`}
                    color="success"
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={dashboardData.actions.completionRate}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* متابعات الإغلاق */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  متابعات الإغلاق
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">
                    {dashboardData.followUps.total}
                  </Typography>
                  <Chip
                    label={`مغلقة: ${dashboardData.followUps.closed}`}
                    color="success"
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={dashboardData.followUps.closureRate}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </>
      ) : null}
    </Grid>
  );

  // ==========================================
  // TAB 2: Annual Audit Plans
  // ==========================================

  const AuditPlansTab = () => (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Typography variant="h6">خطط التدقيق السنوية</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedPlan(null);
            setPlanDialogOpen(true);
          }}
        >
          خطة جديدة
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>معرف الخطة</TableCell>
              <TableCell>السنة</TableCell>
              <TableCell>العنوان</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الأقسام</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditPlans.map((plan) => (
              <TableRow key={plan._id}>
                <TableCell>{plan.planId}</TableCell>
                <TableCell>{plan.year}</TableCell>
                <TableCell>{plan.title}</TableCell>
                <TableCell>
                  <Chip
                    label={plan.status}
                    color={getStatusColor(plan.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{plan.departments?.length || 0}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setPlanDialogOpen(true);
                    }}
                  >
                    عرض
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ==========================================
  // TAB 3: Surprise Audits
  // ==========================================

  const SurpriseAuditsTab = () => (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Typography variant="h6">عمليات التدقيق المفاجئة</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedAudit(null);
            setAuditDialogOpen(true);
          }}
        >
          تدقيق جديد
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>معرف التدقيق</TableCell>
              <TableCell>القسم</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>النسبة المئوية</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {surpriseAudits.map((audit) => (
              <TableRow key={audit._id}>
                <TableCell>{audit.auditId}</TableCell>
                <TableCell>{audit.auditScope?.departmentName}</TableCell>
                <TableCell>
                  {new Date(audit.schedule?.actualStartDate).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={audit.status}
                    color={getStatusColor(audit.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <LinearProgress
                      variant="determinate"
                      value={audit.progressPercentage}
                      sx={{ width: 80, mr: 1 }}
                    />
                    {audit.progressPercentage}%
                  </Box>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedAudit(audit);
                      setAuditDialogOpen(true);
                    }}
                  >
                    عرض
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ==========================================
  // TAB 4: Non-Conformance Reports
  // ==========================================

  const NonConformanceTab = () => (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Typography variant="h6">تقارير عدم المطابقة</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedNCR(null);
            setNcrDialogOpen(true);
          }}
        >
          تقرير جديد
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>معرف التقرير</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>القسم المتأثر</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المالك</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ncrList.map((ncr) => (
              <TableRow key={ncr._id}>
                <TableCell>{ncr.ncrId}</TableCell>
                <TableCell>
                  <Chip
                    icon={
                      ncr.classification.category === 'critical' ? <ErrorIcon /> :
                      ncr.classification.category === 'major' ? <WarningIcon /> :
                      <CheckIcon />
                    }
                    label={ncr.classification.category}
                    color={getSeverityColor(ncr.classification.category)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{ncr.details?.affectedDepartment}</TableCell>
                <TableCell>
                  <Chip
                    label={ncr.status}
                    color={getStatusColor(ncr.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{ncr.ownership?.ownerName}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedNCR(ncr);
                      setNcrDialogOpen(true);
                    }}
                  >
                    عرض
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ==========================================
  // TAB 5: Corrective/Preventive Actions
  // ==========================================

  const ActionsTab = () => (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Typography variant="h6">الإجراءات التصحيحية والوقائية</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedAction(null);
            setActionDialogOpen(true);
          }}
        >
          إجراء جديد
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>معرف الإجراء</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التقدم</TableCell>
              <TableCell>تاريخ الانتهاء المستهدف</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actions.map((action) => (
              <TableRow key={action._id}>
                <TableCell>{action.actionId}</TableCell>
                <TableCell>
                  <Chip
                    label={action.type === 'corrective' ? 'تصحيحي' : 'وقائي'}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={action.implementation?.status}
                    color={getStatusColor(action.implementation?.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <LinearProgress
                      variant="determinate"
                      value={action.implementation?.progressPercentage || 0}
                      sx={{ width: 80, mr: 1 }}
                    />
                    {action.implementation?.progressPercentage || 0}%
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(action.implementation?.targetCompletionDate).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedAction(action);
                      setActionDialogOpen(true);
                    }}
                  >
                    عرض
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ==========================================
  // TAB 6: Closure Follow-ups
  // ==========================================

  const FollowUpTab = () => (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between">
        <Typography variant="h6">متابعات الإغلاق</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedFollowUp(null);
            setFollowUpDialogOpen(true);
          }}
        >
          متابعة جديدة
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>معرف المتابعة</TableCell>
              <TableCell>المرتبطة بـ</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>تاريخ آخر تحديث</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {followUps.map((followUp) => (
              <TableRow key={followUp._id}>
                <TableCell>{followUp.followUpId}</TableCell>
                <TableCell>{followUp.linkedTo?.type}</TableCell>
                <TableCell>
                  <Chip
                    label={followUp.statusOverall}
                    color={getStatusColor(followUp.statusOverall)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(followUp.lastModifiedDate).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedFollowUp(followUp);
                      setFollowUpDialogOpen(true);
                    }}
                  >
                    عرض
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Card>
        <CardHeader
          title="نظام التدقيق الداخلي"
          subtitle="إدارة خطط التدقيق والعمليات والتقارير والإجراءات التصحيحية"
        />
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="نظرة عامة" />
            <Tab label="خطط التدقيق السنوية" />
            <Tab label="عمليات التدقيق المفاجئة" />
            <Tab label="تقارير عدم المطابقة" />
            <Tab label="الإجراءات التصحيحية" />
            <Tab label="متابعات الإغلاق" />
          </Tabs>

          <Box sx={{ pt: 3 }}>
            {activeTab === 0 && <OverviewTab />}
            {activeTab === 1 && <AuditPlansTab />}
            {activeTab === 2 && <SurpriseAuditsTab />}
            {activeTab === 3 && <NonConformanceTab />}
            {activeTab === 4 && <ActionsTab />}
            {activeTab === 5 && <FollowUpTab />}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
