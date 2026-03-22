/**
 * Rehab Center Licenses Dashboard - لوحة تحكم تراخيص مراكز ذوي الإعاقة
 * الصفحة الرئيسية الشاملة لإدارة جميع التراخيص والرخص والسجلات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent, Paper, Tabs, Tab,
  Button, Chip, LinearProgress, Alert, IconButton, Tooltip, TextField,
  MenuItem, Select, FormControl, InputLabel, InputAdornment, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Divider, AvatarGroup, Avatar, Stack, CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon, Refresh as RefreshIcon, Search as SearchIcon,
  Notifications as AlertIcon, Warning as WarningIcon, CheckCircle,
  Cancel as CancelIcon, Edit as EditIcon, Delete as DeleteIcon,
  Visibility as ViewIcon, AutorenewOutlined as RenewIcon,
  Assessment as StatsIcon, FileDownload as ExportIcon,
  FilterList as FilterIcon, CalendarMonth as CalendarIcon,
  Business as BusinessIcon, LocalPolice as GovIcon,
  LocationCity as MunicipalIcon, Receipt as CommercialIcon,
  People as EmploymentIcon, School as ProfessionalIcon,
  Shield as InsuranceIcon, Star as QualityIcon,
  Computer as TechIcon, ExpandMore as ExpandIcon,
  NotificationsActive as AlertActiveIcon, Description as DocIcon,
  TrendingUp as TrendIcon, AccessTime as TimeIcon,
  ErrorOutline as ErrorIcon, Info as InfoIcon,
  Gavel as PenaltyIcon, Security as RiskIcon,
  Archive as ArchiveIcon, Checklist as ChecklistIcon,
  AccountTree as WorkflowIcon, PersonOutline as DelegateIcon,
  LocationOn as BranchIcon, BarChart as ChartIcon,
  AssignmentTurnedIn as ComplianceIcon, FolderSpecial as AnnualIcon,
  ContentCopy as DuplicateIcon, DateRange as ForecastIcon,
  NotificationsNone as NotifPrefIcon, Unarchive as UnarchiveIcon,
  Link as LinkIcon, GppBad as ViolationIcon,
  TaskAlt as TaskIcon, Comment as CommentIcon,
  AccountBalance as BudgetIcon, HealthAndSafety as HealthIcon,
  Speed as KpiIcon, EventNote as EventIcon,
  ContactPhone as ContactIcon, Upload as ImportIcon,
  FileCopy as CloneIcon, Favorite as HeartIcon,
  PlaylistAddCheck as ChecklistDoneIcon, MonetizationOn as ExpenseIcon,
  // Round 4 icons
  CompareArrows as CompareIcon, Bookmark as BookmarkIcon,
  ConfirmationNumber as TicketIcon, AutoFixHigh as AutomationIcon,
  Summarize as SummaryIcon, Analytics as AnalyticsIcon,
  History as HistoryIcon, Inventory as TemplateIcon,
  Visibility as WatchIcon, SupportAgent as SupportIcon,
  Timer as SlaIcon, TrendingDown as PredictIcon,
  FactCheck as VersionIcon, Verified as VerifiedIcon,
  // Round 5 icons
  NotificationsActive as ScheduleNotifIcon,
  ThumbUp as SurveyIcon, Draw as SignatureIcon,
  Groups as MeetingIcon, IntegrationInstructions as IntegrationIcon,
  School as TrainingIcon, Dashboard as WidgetIcon,
  BuildCircle as RemediationIcon, Store as VendorIcon,
  Feedback as ComplaintIcon,
} from '@mui/icons-material';
import rehabLicenseService from '../../services/rehabLicense.service';

// ==================== ثوابت ====================
const CATEGORY_CONFIG = {
  government_license: { label: 'تراخيص حكومية', icon: <GovIcon />, color: '#1976d2' },
  municipal_permit: { label: 'رخص بلدية', icon: <MunicipalIcon />, color: '#9c27b0' },
  commercial_record: { label: 'سجلات تجارية', icon: <CommercialIcon />, color: '#ed6c02' },
  employment_cert: { label: 'شهادات عمل', icon: <EmploymentIcon />, color: '#2e7d32' },
  professional_license: { label: 'تراخيص مهنية', icon: <ProfessionalIcon />, color: '#0288d1' },
  insurance_guarantee: { label: 'تأمين وضمانات', icon: <InsuranceIcon />, color: '#d32f2f' },
  quality_accreditation: { label: 'جودة واعتماد', icon: <QualityIcon />, color: '#f9a825' },
  tech_permit: { label: 'تراخيص تقنية', icon: <TechIcon />, color: '#7b1fa2' },
  other: { label: 'أخرى', icon: <DocIcon />, color: '#757575' },
};

const STATUS_CONFIG = {
  active: { label: 'ساري', color: 'success' },
  expired: { label: 'منتهي', color: 'error' },
  expiring_soon: { label: 'قريب الانتهاء', color: 'warning' },
  pending_renewal: { label: 'بانتظار التجديد', color: 'info' },
  under_review: { label: 'قيد المراجعة', color: 'default' },
  suspended: { label: 'موقوف', color: 'error' },
  revoked: { label: 'ملغي', color: 'error' },
  pending_issuance: { label: 'بانتظار الإصدار', color: 'info' },
  draft: { label: 'مسودة', color: 'default' },
};

const PRIORITY_CONFIG = {
  low: { label: 'منخفضة', color: '#4caf50' },
  normal: { label: 'عادية', color: '#2196f3' },
  high: { label: 'عالية', color: '#ff9800' },
  critical: { label: 'حرجة', color: '#f44336' },
};

// ==================== مكون البطاقة الإحصائية ====================
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color }}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: `${color}20`, color }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ==================== الصفحة الرئيسية ====================
const RehabCenterLicenses = () => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [alerts, setAlerts] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState({ types: [], categories: [] });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [renewDialog, setRenewDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [delegationDialog, setDelegationDialog] = useState(null);
  const [requirementDialog, setRequirementDialog] = useState(null);
  const [conditionDialog, setConditionDialog] = useState(null);
  const [penaltyDialog, setPenaltyDialog] = useState(null);
  const [branchDialog, setBranchDialog] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(null);

  // New feature state
  const [pendingPenalties, setPendingPenalties] = useState([]);
  const [highRiskLicenses, setHighRiskLicenses] = useState([]);
  const [archivedLicenses, setArchivedLicenses] = useState([]);
  const [complianceReport, setComplianceReport] = useState(null);
  const [enhancedDashboard, setEnhancedDashboard] = useState(null);
  const [renewalForecast, setRenewalForecast] = useState([]);
  const [regionStats, setRegionStats] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  // Form state
  const [formData, setFormData] = useState({});

  // Round 3: New feature dialogs
  const [taskDialog, setTaskDialog] = useState(null);
  const [communicationDialog, setCommunicationDialog] = useState(null);
  const [calendarEventDialog, setCalendarEventDialog] = useState(null);
  const [commentDialog, setCommentDialog] = useState(null);
  const [documentChecklistDialog, setDocumentChecklistDialog] = useState(null);
  const [budgetDialog, setBudgetDialog] = useState(null);

  // Round 3: New feature data
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [taskStats, setTaskStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingComms, setPendingComms] = useState([]);
  const [docStats, setDocStats] = useState(null);
  const [budgetStats, setBudgetStats] = useState(null);
  const [lowHealthLicenses, setLowHealthLicenses] = useState([]);
  const [kpiDashboard, setKpiDashboard] = useState(null);

  // Round 4: Feature dialogs
  const [ticketDialog, setTicketDialog] = useState(null);
  const [templateDialog, setTemplateDialog] = useState(null);
  const [slaDialog, setSlaDialog] = useState(null);
  const [comparisonDialog, setComparisonDialog] = useState(false);
  const [changeLogDialog, setChangeLogDialog] = useState(null);
  const [docVersionDialog, setDocVersionDialog] = useState(null);
  const [automationDialog, setAutomationDialog] = useState(null);

  // Round 4: Feature data
  const [templates, setTemplates] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [slaStats, setSlaStats] = useState(null);
  const [slaBreached, setSlaBreached] = useState([]);
  const [openTickets, setOpenTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [executiveReport, setExecutiveReport] = useState(null);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState(null);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [changeLogData, setChangeLogData] = useState([]);

  // Round 5: Feature dialogs
  const [notificationDialog, setNotificationDialog] = useState(null);
  const [surveyDialog, setSurveyDialog] = useState(null);
  const [signatureDialog, setSignatureDialog] = useState(null);
  const [meetingDialog, setMeetingDialog] = useState(null);
  const [integrationDialog, setIntegrationDialog] = useState(null);
  const [trainingDialog, setTrainingDialog] = useState(null);
  const [vendorDialog, setVendorDialog] = useState(null);
  const [complaintDialog, setComplaintDialog] = useState(null);

  // Round 5: Feature data
  const [globalSatisfaction, setGlobalSatisfaction] = useState(null);
  const [globalMeetings, setGlobalMeetings] = useState([]);
  const [globalTraining, setGlobalTraining] = useState([]);
  const [globalVendorRatings, setGlobalVendorRatings] = useState([]);
  const [globalComplaints, setGlobalComplaints] = useState(null);

  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // ==================== Data fetching ====================
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getDashboard();
      setDashboard(res.data);
    } catch {
      // fallback
    }
  }, []);

  const fetchLicenses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterType) params.licenseType = filterType;
      if (filterPriority) params.priority = filterPriority;

      const res = await rehabLicenseService.getAll(params);
      setLicenses(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch {
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterCategory, filterType, filterPriority]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getActiveAlerts();
      setAlerts(res.data || []);
    } catch {
      setAlerts([]);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getLicenseTypes();
      setLicenseTypes(res.data || { types: [], categories: [] });
    } catch {
      // use defaults
    }
  }, []);

  const fetchPenalties = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getPendingPenalties();
      setPendingPenalties(res.data || []);
    } catch { setPendingPenalties([]); }
  }, []);

  const fetchHighRisk = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getHighRiskLicenses(40);
      setHighRiskLicenses(res.data || []);
    } catch { setHighRiskLicenses([]); }
  }, []);

  const fetchArchived = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getArchived();
      setArchivedLicenses(res.data || []);
    } catch { setArchivedLicenses([]); }
  }, []);

  const fetchComplianceReport = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getComplianceReport();
      setComplianceReport(res.data || null);
    } catch { setComplianceReport(null); }
  }, []);

  const fetchEnhancedDashboard = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getEnhancedDashboard();
      setEnhancedDashboard(res.data || null);
    } catch { setEnhancedDashboard(null); }
  }, []);

  const fetchRenewalForecast = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getRenewalForecast(12);
      setRenewalForecast(res.data || []);
    } catch { setRenewalForecast([]); }
  }, []);

  const fetchRegionStats = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getRegionStatistics();
      setRegionStats(res.data || []);
    } catch { setRegionStats([]); }
  }, []);

  const fetchDuplicates = useCallback(async () => {
    try {
      const res = await rehabLicenseService.findDuplicates();
      setDuplicates(res.data || []);
    } catch { setDuplicates([]); }
  }, []);

  // ==================== Round 3: New fetch functions ====================
  const fetchOverdueTasks = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getOverdueTasks();
      setOverdueTasks(res.data || []);
    } catch { setOverdueTasks([]); }
  }, []);

  const fetchTaskStats = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getTaskStatistics();
      setTaskStats(res.data || null);
    } catch { setTaskStats(null); }
  }, []);

  const fetchUpcomingEvents = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getUpcomingEvents(30);
      setUpcomingEvents(res.data || []);
    } catch { setUpcomingEvents([]); }
  }, []);

  const fetchPendingComms = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getPendingCommunications();
      setPendingComms(res.data || []);
    } catch { setPendingComms([]); }
  }, []);

  const fetchDocStats = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getDocumentStatistics();
      setDocStats(res.data || null);
    } catch { setDocStats(null); }
  }, []);

  const fetchBudgetStats = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getBudgetStatistics();
      setBudgetStats(res.data || null);
    } catch { setBudgetStats(null); }
  }, []);

  const fetchLowHealth = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getLowHealthLicenses(60);
      setLowHealthLicenses(res.data || []);
    } catch { setLowHealthLicenses([]); }
  }, []);

  const fetchKPIDashboard = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getKPIDashboard();
      setKpiDashboard(res.data || null);
    } catch { setKpiDashboard(null); }
  }, []);

  // ==================== Round 4: Data fetching ====================
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getTemplates();
      setTemplates(res.data || []);
    } catch { setTemplates([]); }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getMyFavorites();
      setFavorites(res.data || []);
    } catch { setFavorites([]); }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getMyWatchlist();
      setWatchlist(res.data || []);
    } catch { setWatchlist([]); }
  }, []);

  const fetchSLAStats = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getSLAStatistics();
      setSlaStats(res.data || null);
    } catch { setSlaStats(null); }
  }, []);

  const fetchSLABreached = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getSLABreached();
      setSlaBreached(res.data || []);
    } catch { setSlaBreached([]); }
  }, []);

  const fetchOpenTickets = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getOpenTickets();
      setOpenTickets(res.data || []);
    } catch { setOpenTickets([]); }
  }, []);

  const fetchTicketStats = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getTicketStatistics();
      setTicketStats(res.data || null);
    } catch { setTicketStats(null); }
  }, []);

  const fetchExecutiveReport = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getExecutiveReport();
      setExecutiveReport(res.data || null);
    } catch { setExecutiveReport(null); }
  }, []);

  const fetchPredictiveAnalytics = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getPredictiveAnalytics();
      setPredictiveAnalytics(res.data || null);
    } catch { setPredictiveAnalytics(null); }
  }, []);

  const fetchExpiringDocs = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getExpiringDocuments();
      setExpiringDocs(res.data || []);
    } catch { setExpiringDocs([]); }
  }, []);

  // ==================== Round 5: Data fetching ====================
  const fetchGlobalSatisfaction = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getGlobalSatisfactionAnalytics();
      setGlobalSatisfaction(res.data || null);
    } catch { setGlobalSatisfaction(null); }
  }, []);

  const fetchGlobalMeetings = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getGlobalMeetingsCalendar();
      setGlobalMeetings(res.data || []);
    } catch { setGlobalMeetings([]); }
  }, []);

  const fetchGlobalTraining = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getGlobalTrainingStatus();
      setGlobalTraining(res.data || []);
    } catch { setGlobalTraining([]); }
  }, []);

  const fetchGlobalVendorRatings = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getGlobalVendorRatings();
      setGlobalVendorRatings(res.data || []);
    } catch { setGlobalVendorRatings([]); }
  }, []);

  const fetchGlobalComplaints = useCallback(async () => {
    try {
      const res = await rehabLicenseService.getGlobalComplaintAnalytics();
      setGlobalComplaints(res.data || null);
    } catch { setGlobalComplaints(null); }
  }, []);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchLicenses(), fetchAlerts(), fetchTypes()]);
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  // ==================== Handlers ====================
  const handleCreate = async () => {
    try {
      await rehabLicenseService.create(formData);
      showSnack('تم إنشاء الترخيص بنجاح');
      setCreateDialog(false);
      setFormData({});
      fetchLicenses();
      fetchDashboard();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleRenew = async () => {
    if (!renewDialog) return;
    try {
      await rehabLicenseService.renew(renewDialog._id, {
        newExpiryDate: formData.newExpiryDate,
        cost: formData.renewalCost,
        notes: formData.renewalNotes,
      });
      showSnack('تم تجديد الترخيص بنجاح');
      setRenewDialog(null);
      setFormData({});
      fetchLicenses();
      fetchDashboard();
      fetchAlerts();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ في التجديد', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await rehabLicenseService.delete(deleteDialog._id, 'حذف بواسطة المستخدم');
      showSnack('تم حذف الترخيص');
      setDeleteDialog(null);
      fetchLicenses();
      fetchDashboard();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleDismissAlert = async (licenseId, alertId) => {
    try {
      await rehabLicenseService.dismissAlert(licenseId, alertId);
      showSnack('تم تجاهل التنبيه');
      fetchAlerts();
    } catch {
      showSnack('حدث خطأ', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const res = await rehabLicenseService.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rehab-licenses-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showSnack('تم تصدير البيانات بنجاح');
    } catch {
      showSnack('حدث خطأ في التصدير', 'error');
    }
  };

  const handleRunAlertScan = async () => {
    try {
      const res = await rehabLicenseService.runAlertScan();
      showSnack(res.message || 'تم فحص التنبيهات');
      fetchAlerts();
      fetchDashboard();
    } catch {
      showSnack('حدث خطأ', 'error');
    }
  };

  // ==================== Handlers: New features ====================
  const handleSetDelegation = async () => {
    if (!delegationDialog) return;
    try {
      await rehabLicenseService.setDelegation(delegationDialog._id, formData);
      showSnack('تم إضافة التفويض بنجاح');
      setDelegationDialog(null);
      setFormData({});
      fetchLicenses();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddRequirement = async () => {
    if (!requirementDialog) return;
    try {
      await rehabLicenseService.addRequirement(requirementDialog._id, formData);
      showSnack('تم إضافة المتطلب بنجاح');
      setRequirementDialog(null);
      setFormData({});
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddCondition = async () => {
    if (!conditionDialog) return;
    try {
      await rehabLicenseService.addCondition(conditionDialog._id, formData);
      showSnack('تم إضافة الشرط بنجاح');
      setConditionDialog(null);
      setFormData({});
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddPenalty = async () => {
    if (!penaltyDialog) return;
    try {
      await rehabLicenseService.addPenalty(penaltyDialog._id, formData);
      showSnack('تم تسجيل الغرامة بنجاح');
      setPenaltyDialog(null);
      setFormData({});
      fetchPenalties();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddBranch = async () => {
    if (!branchDialog) return;
    try {
      await rehabLicenseService.addBranch(branchDialog._id, formData);
      showSnack('تم إضافة الفرع بنجاح');
      setBranchDialog(null);
      setFormData({});
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleArchive = async (licenseId) => {
    try {
      await rehabLicenseService.archive(licenseId, 'أرشفة بواسطة المستخدم');
      showSnack('تم أرشفة الترخيص');
      fetchLicenses();
      fetchArchived();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleUnarchive = async (licenseId) => {
    try {
      await rehabLicenseService.unarchive(licenseId);
      showSnack('تم استعادة الترخيص من الأرشيف');
      fetchLicenses();
      fetchArchived();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleCalculateAllRisks = async () => {
    try {
      const res = await rehabLicenseService.calculateAllRisks();
      showSnack(`تم تحديث ${res.data?.updated || 0} ترخيص`);
      fetchHighRisk();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleSetupApproval = async () => {
    if (!approvalDialog) return;
    try {
      const steps = (formData.approvalSteps || '').split('\n').filter(Boolean).map((s, i) => ({
        stepNumber: i + 1, approverName: s.trim(), approverRole: 'مراجع',
      }));
      await rehabLicenseService.setupApprovalWorkflow(approvalDialog._id, steps);
      showSnack('تم إعداد سير عمل الموافقات');
      setApprovalDialog(null);
      setFormData({});
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  // ==================== Round 3: New handlers ====================
  const handleAddTask = async () => {
    if (!taskDialog) return;
    try {
      await rehabLicenseService.addTask(taskDialog._id, formData);
      showSnack('تم إضافة المهمة بنجاح');
      setTaskDialog(null);
      setFormData({});
      fetchOverdueTasks();
      fetchTaskStats();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddCommunication = async () => {
    if (!communicationDialog) return;
    try {
      await rehabLicenseService.addCommunication(communicationDialog._id, formData);
      showSnack('تم تسجيل المراسلة بنجاح');
      setCommunicationDialog(null);
      setFormData({});
      fetchPendingComms();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddCalendarEvent = async () => {
    if (!calendarEventDialog) return;
    try {
      await rehabLicenseService.addCalendarEvent(calendarEventDialog._id, formData);
      showSnack('تم إضافة الحدث بنجاح');
      setCalendarEventDialog(null);
      setFormData({});
      fetchUpcomingEvents();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!commentDialog) return;
    try {
      await rehabLicenseService.addComment(commentDialog._id, formData);
      showSnack('تم إضافة التعليق بنجاح');
      setCommentDialog(null);
      setFormData({});
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddDocumentItem = async () => {
    if (!documentChecklistDialog) return;
    try {
      await rehabLicenseService.addDocumentChecklistItem(documentChecklistDialog._id, formData);
      showSnack('تم إضافة المستند للقائمة بنجاح');
      setDocumentChecklistDialog(null);
      setFormData({});
      fetchDocStats();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddExpense = async () => {
    if (!budgetDialog) return;
    try {
      await rehabLicenseService.addExpense(budgetDialog._id, formData);
      showSnack('تم تسجيل المصروف بنجاح');
      setBudgetDialog(null);
      setFormData({});
      fetchBudgetStats();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleCloneLicense = async (licenseId) => {
    try {
      await rehabLicenseService.cloneLicense(licenseId);
      showSnack('تم نسخ الترخيص بنجاح');
      fetchLicenses();
      fetchDashboard();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ في النسخ', 'error');
    }
  };

  const handleCalculateAllHealth = async () => {
    try {
      const res = await rehabLicenseService.calculateAllHealth();
      showSnack(`تم تحديث صحة ${res.data?.updated || 0} ترخيص`);
      fetchLowHealth();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  // ==================== Round 4: Handlers ====================
  const handleToggleFavorite = async (licenseId) => {
    try {
      const res = await rehabLicenseService.toggleFavorite(licenseId);
      showSnack(res.data?.isFavorite ? 'تم الإضافة للمفضلة' : 'تم الإزالة من المفضلة');
      fetchFavorites();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleToggleWatch = async (licenseId) => {
    try {
      const res = await rehabLicenseService.toggleWatch(licenseId);
      showSnack(res.data?.isWatching ? 'تم بدء المتابعة' : 'تم إيقاف المتابعة');
      fetchWatchlist();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateDialog) return;
    try {
      await rehabLicenseService.saveAsTemplate(templateDialog._id, formData);
      showSnack('تم حفظ القالب بنجاح');
      setTemplateDialog(null);
      setFormData({});
      fetchTemplates();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleCreateFromTemplate = async (templateId) => {
    try {
      await rehabLicenseService.createFromTemplate(templateId);
      showSnack('تم إنشاء ترخيص من القالب بنجاح');
      fetchLicenses();
      fetchDashboard();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleCompareLicenses = async () => {
    if (selectedForCompare.length < 2) {
      showSnack('يرجى اختيار ترخيصين على الأقل للمقارنة', 'warning');
      return;
    }
    try {
      const res = await rehabLicenseService.compareLicenses(selectedForCompare);
      setComparisonResult(res.data);
      setComparisonDialog(true);
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketDialog) return;
    try {
      await rehabLicenseService.createTicket(ticketDialog._id, formData);
      showSnack('تم إنشاء التذكرة بنجاح');
      setTicketDialog(null);
      setFormData({});
      fetchOpenTickets();
      fetchTicketStats();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleUpdateSLA = async () => {
    if (!slaDialog) return;
    try {
      await rehabLicenseService.updateSLA(slaDialog._id, formData);
      showSnack('تم تحديث إعدادات SLA بنجاح');
      setSlaDialog(null);
      setFormData({});
      fetchSLAStats();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleEvaluateAllSLA = async () => {
    try {
      const res = await rehabLicenseService.evaluateAllSLA();
      showSnack(`تم تقييم SLA لعدد ${res.data?.evaluated || 0} ترخيص`);
      fetchSLAStats();
      fetchSLABreached();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleGenerateAllSummaries = async () => {
    try {
      const res = await rehabLicenseService.generateAllExecutiveSummaries();
      showSnack(`تم إنشاء ${res.data?.generated || 0} ملخص تنفيذي`);
      fetchExecutiveReport();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddAutomationRule = async () => {
    if (!automationDialog) return;
    try {
      await rehabLicenseService.addAutomationRule(automationDialog._id, formData);
      showSnack('تم إضافة قاعدة الأتمتة بنجاح');
      setAutomationDialog(null);
      setFormData({});
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleAddDocumentVersion = async () => {
    if (!docVersionDialog) return;
    try {
      await rehabLicenseService.addDocumentVersion(docVersionDialog._id, formData);
      showSnack('تم إضافة إصدار المستند بنجاح');
      setDocVersionDialog(null);
      setFormData({});
      fetchExpiringDocs();
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const handleViewChangeLog = async (licenseId) => {
    try {
      const res = await rehabLicenseService.getChangeLog(licenseId);
      setChangeLogData(res.data || []);
      setChangeLogDialog({ _id: licenseId });
    } catch (err) {
      showSnack(err?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const toggleCompareSelection = (licenseId) => {
    setSelectedForCompare(prev =>
      prev.includes(licenseId)
        ? prev.filter(id => id !== licenseId)
        : prev.length < 5 ? [...prev, licenseId] : prev
    );
  };

  const getDaysColor = (days) => {
    if (days === null || days === undefined) return 'text.secondary';
    if (days < 0) return '#f44336';
    if (days <= 7) return '#f44336';
    if (days <= 30) return '#ff9800';
    if (days <= 60) return '#ed6c02';
    if (days <= 90) return '#2196f3';
    return '#4caf50';
  };

  // ==================== Round 5: Handlers ====================
  const handleAddNotification = async () => {
    if (!notificationDialog) return;
    try {
      await rehabLicenseService.addScheduledNotification(notificationDialog._id, formData);
      showSnack('تم إضافة الإشعار المجدول بنجاح');
      setNotificationDialog(null);
      setFormData({});
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddSurvey = async () => {
    if (!surveyDialog) return;
    try {
      await rehabLicenseService.addSatisfactionSurvey(surveyDialog._id, formData);
      showSnack('تم إضافة تقييم الرضا بنجاح');
      setSurveyDialog(null);
      setFormData({});
      fetchGlobalSatisfaction();
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddSignature = async () => {
    if (!signatureDialog) return;
    try {
      await rehabLicenseService.addDigitalSignature(signatureDialog._id, formData);
      showSnack('تم إضافة التوقيع الرقمي بنجاح');
      setSignatureDialog(null);
      setFormData({});
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddMeeting = async () => {
    if (!meetingDialog) return;
    try {
      await rehabLicenseService.addMeeting(meetingDialog._id, formData);
      showSnack('تم إضافة الاجتماع بنجاح');
      setMeetingDialog(null);
      setFormData({});
      fetchGlobalMeetings();
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddIntegration = async () => {
    if (!integrationDialog) return;
    try {
      await rehabLicenseService.addExternalIntegration(integrationDialog._id, formData);
      showSnack('تم إضافة الربط الخارجي بنجاح');
      setIntegrationDialog(null);
      setFormData({});
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddTraining = async () => {
    if (!trainingDialog) return;
    try {
      await rehabLicenseService.addTrainingRecord(trainingDialog._id, formData);
      showSnack('تم إضافة سجل التدريب بنجاح');
      setTrainingDialog(null);
      setFormData({});
      fetchGlobalTraining();
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddVendor = async () => {
    if (!vendorDialog) return;
    try {
      await rehabLicenseService.addVendor(vendorDialog._id, formData);
      showSnack('تم إضافة المورد بنجاح');
      setVendorDialog(null);
      setFormData({});
      fetchGlobalVendorRatings();
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleAddComplaint = async () => {
    if (!complaintDialog) return;
    try {
      await rehabLicenseService.addComplaint(complaintDialog._id, formData);
      showSnack('تم إضافة الشكوى/المقترح بنجاح');
      setComplaintDialog(null);
      setFormData({});
      fetchGlobalComplaints();
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const handleRunAutoRemediation = async () => {
    try {
      const res = await rehabLicenseService.runAutoRemediation();
      showSnack(`تم المسح التلقائي: ${res.data?.actionsCreated || 0} إجراءات جديدة`);
    } catch (err) { showSnack(err?.data?.message || 'حدث خطأ', 'error'); }
  };

  const stats = dashboard?.statistics?.summary || {};

  // ==================== Render ====================
  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #1a237e 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GovIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                نظام تراخيص مراكز تأهيل ذوي الإعاقة
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                إدارة شاملة لجميع التراخيص الحكومية والرخص البلدية والسجلات مع التنبيهات الذكية
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Badge badgeContent={alerts.filter(a => a.priority === 'critical').length} color="error">
              <Button variant="contained" color="warning" startIcon={<AlertActiveIcon />} onClick={() => setActiveTab(2)}>
                التنبيهات
              </Button>
            </Badge>
            <Button variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} startIcon={<ExportIcon />} onClick={handleExport}>
              تصدير
            </Button>
            <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
              ترخيص جديد
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <StatCard title="إجمالي التراخيص" value={stats.total || 0} icon={<DocIcon />} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <StatCard title="ساري المفعول" value={stats.active || 0} icon={<CheckCircle />} color="#4caf50" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <StatCard title="منتهي الصلاحية" value={stats.expired || 0} icon={<ErrorIcon />} color="#f44336" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <StatCard
            title="ينتهي خلال 30 يوم"
            value={stats.expiringIn30 || 0}
            icon={<WarningIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <StatCard title="بانتظار التجديد" value={stats.pendingRenewal || 0} icon={<RenewIcon />} color="#0288d1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <StatCard title="موقوف" value={stats.suspended || 0} icon={<CancelIcon />} color="#9c27b0" />
        </Grid>
      </Grid>

      {/* التنبيهات العاجلة */}
      {(dashboard?.criticalAlerts?.length > 0) && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} icon={<WarningIcon />}
          action={
            <Button color="inherit" size="small" onClick={() => setActiveTab(2)}>
              عرض الكل
            </Button>
          }
        >
          <strong>تنبيهات حرجة ({dashboard.criticalAlerts.length}):</strong>{' '}
          {dashboard.criticalAlerts.slice(0, 3).map(a => a.title).join(' | ')}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => {
          setActiveTab(v);
          // Lazy-load data for tabs
          if (v === 4) fetchPenalties();
          if (v === 5) { fetchHighRisk(); fetchRenewalForecast(); fetchRegionStats(); }
          if (v === 6) fetchComplianceReport();
          if (v === 7) fetchArchived();
          if (v === 8) { fetchOverdueTasks(); fetchTaskStats(); fetchPendingComms(); }
          if (v === 9) fetchUpcomingEvents();
          if (v === 10) { fetchLowHealth(); fetchDocStats(); }
          if (v === 11) { fetchKPIDashboard(); fetchBudgetStats(); }
          if (v === 12) { fetchTemplates(); fetchFavorites(); fetchWatchlist(); }
          if (v === 13) { fetchSLAStats(); fetchSLABreached(); fetchOpenTickets(); fetchTicketStats(); }
          if (v === 14) { fetchExecutiveReport(); fetchExpiringDocs(); }
          if (v === 15) { fetchPredictiveAnalytics(); }
          if (v === 16) { fetchGlobalSatisfaction(); fetchGlobalMeetings(); }
          if (v === 17) { fetchGlobalTraining(); }
          if (v === 18) { fetchGlobalVendorRatings(); }
          if (v === 19) { fetchGlobalComplaints(); }
        }} variant="scrollable" scrollButtons="auto">
          <Tab icon={<DocIcon />} label="جميع التراخيص" iconPosition="start" />
          <Tab icon={<StatsIcon />} label="لوحة المعلومات" iconPosition="start" />
          <Tab
            icon={
              <Badge badgeContent={alerts.length} color="error" max={99}>
                <AlertIcon />
              </Badge>
            }
            label="التنبيهات"
            iconPosition="start"
          />
          <Tab icon={<CalendarIcon />} label="القريبة الانتهاء" iconPosition="start" />
          <Tab icon={<PenaltyIcon />} label="الغرامات والعقوبات" iconPosition="start" />
          <Tab icon={<RiskIcon />} label="تحليل المخاطر" iconPosition="start" />
          <Tab icon={<ComplianceIcon />} label="تقرير الامتثال" iconPosition="start" />
          <Tab icon={<ArchiveIcon />} label="الأرشيف" iconPosition="start" />
          <Tab icon={<TaskIcon />} label="المهام والمتابعة" iconPosition="start" />
          <Tab icon={<EventIcon />} label="التقويم" iconPosition="start" />
          <Tab icon={<HealthIcon />} label="صحة التراخيص" iconPosition="start" />
          <Tab icon={<KpiIcon />} label="مؤشرات الأداء" iconPosition="start" />
          <Tab icon={<TemplateIcon />} label="القوالب والمفضلة" iconPosition="start" />
          <Tab icon={<SlaIcon />} label="SLA والتذاكر" iconPosition="start" />
          <Tab icon={<SummaryIcon />} label="التقارير التنفيذية" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات التنبؤية" iconPosition="start" />
          {/* Round 5 Tabs */}
          <Tab icon={<SurveyIcon />} label="الرضا والاجتماعات" iconPosition="start" />
          <Tab icon={<TrainingIcon />} label="التدريب والتأهيل" iconPosition="start" />
          <Tab icon={<VendorIcon />} label="الموردين" iconPosition="start" />
          <Tab icon={<ComplaintIcon />} label="الشكاوى والمقترحات" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ==================== تبويب: جميع التراخيص ==================== */}
      {activeTab === 0 && (
        <Box>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth size="small" placeholder="بحث بالاسم أو رقم الترخيص..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="الحالة">
                    <MenuItem value="">الكل</MenuItem>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <MenuItem key={val} value={val}>{cfg.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الفئة</InputLabel>
                  <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} label="الفئة">
                    <MenuItem value="">الكل</MenuItem>
                    {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
                      <MenuItem key={val} value={val}>{cfg.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الأولوية</InputLabel>
                  <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} label="الأولوية">
                    <MenuItem value="">الكل</MenuItem>
                    {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                      <MenuItem key={val} value={val}>{cfg.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => {
                    setSearch(''); setFilterStatus(''); setFilterCategory(''); setFilterType(''); setFilterPriority('');
                  }}>
                    مسح
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          {loading ? (
            <LinearProgress sx={{ mb: 2 }} />
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نوع الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الجهة المصدرة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الانتهاء</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المتبقي</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {licenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">لا توجد تراخيص مسجلة</Typography>
                        <Button startIcon={<AddIcon />} onClick={() => setCreateDialog(true)} sx={{ mt: 1 }}>
                          إضافة ترخيص جديد
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    licenses.map((lic) => {
                      const cat = CATEGORY_CONFIG[lic.category] || {};
                      const st = STATUS_CONFIG[lic.status] || {};
                      const pri = PRIORITY_CONFIG[lic.priority] || {};
                      const days = lic.daysUntilExpiry;

                      return (
                        <TableRow key={lic._id} hover sx={{
                          borderRight: `4px solid ${cat.color || '#ccc'}`,
                          ...(days !== null && days < 0 ? { bgcolor: '#fff3f3' } : {}),
                          ...(days !== null && days >= 0 && days <= 7 ? { bgcolor: '#fff8e1' } : {}),
                        }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">{lic.licenseNumber}</Typography>
                            {lic.referenceNumber && (
                              <Typography variant="caption" color="text.secondary">مرجع: {lic.referenceNumber}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{lic.licenseTypeLabel || lic.licenseType}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={cat.icon}
                              label={cat.label || lic.category}
                              size="small"
                              sx={{ bgcolor: `${cat.color}15`, color: cat.color, fontWeight: 'bold' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{lic.issuingAuthority?.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={st.label || lic.status} color={st.color || 'default'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {lic.dates?.expiry ? new Date(lic.dates.expiry).toLocaleDateString('ar-SA') : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold', color: getDaysColor(days) }}
                            >
                              {days === null ? '-' : days < 0 ? `منتهي منذ ${Math.abs(days)} يوم` : `${days} يوم`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pri.label || lic.priority}
                              size="small"
                              sx={{ bgcolor: `${pri.color}20`, color: pri.color, fontWeight: 'bold' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="عرض التفاصيل">
                                <IconButton size="small" color="primary" onClick={() => setViewDialog(lic)}>
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تجديد">
                                <IconButton size="small" color="success" onClick={() => { setRenewDialog(lic); setFormData({}); }}>
                                  <RenewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تفويض">
                                <IconButton size="small" sx={{ color: '#9c27b0' }} onClick={() => { setDelegationDialog(lic); setFormData({}); }}>
                                  <DelegateIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="غرامة">
                                <IconButton size="small" color="warning" onClick={() => { setPenaltyDialog(lic); setFormData({}); }}>
                                  <PenaltyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="أرشفة">
                                <IconButton size="small" sx={{ color: '#607d8b' }} onClick={() => handleArchive(lic._id)}>
                                  <ArchiveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="نسخ">
                                <IconButton size="small" sx={{ color: '#00695c' }} onClick={() => handleCloneLicense(lic._id)}>
                                  <CloneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="مهمة">
                                <IconButton size="small" sx={{ color: '#1565c0' }} onClick={() => { setTaskDialog(lic); setFormData({}); }}>
                                  <TaskIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="مفضلة">
                                <IconButton size="small" sx={{ color: '#e91e63' }} onClick={() => handleToggleFavorite(lic._id)}>
                                  <HeartIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="قالب">
                                <IconButton size="small" sx={{ color: '#7b1fa2' }} onClick={() => { setTemplateDialog(lic); setFormData({}); }}>
                                  <TemplateIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تذكرة">
                                <IconButton size="small" sx={{ color: '#e65100' }} onClick={() => { setTicketDialog(lic); setFormData({}); }}>
                                  <TicketIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="سجل التغييرات">
                                <IconButton size="small" sx={{ color: '#37474f' }} onClick={() => handleViewChangeLog(lic._id)}>
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {/* ── Round 5 Quick Actions ── */}
                              <Tooltip title="إشعار">
                                <IconButton size="small" sx={{ color: '#0288d1' }} onClick={() => { setNotificationDialog(lic); setFormData({}); }}>
                                  <ScheduleNotifIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تقييم رضا">
                                <IconButton size="small" sx={{ color: '#00897b' }} onClick={() => { setSurveyDialog(lic); setFormData({}); }}>
                                  <SurveyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="توقيع رقمي">
                                <IconButton size="small" sx={{ color: '#5e35b1' }} onClick={() => { setSignatureDialog(lic); setFormData({}); }}>
                                  <SignatureIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="اجتماع">
                                <IconButton size="small" sx={{ color: '#ef6c00' }} onClick={() => { setMeetingDialog(lic); setFormData({}); }}>
                                  <MeetingIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تدريب">
                                <IconButton size="small" sx={{ color: '#2e7d32' }} onClick={() => { setTrainingDialog(lic); setFormData({}); }}>
                                  <TrainingIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="مورد">
                                <IconButton size="small" sx={{ color: '#4e342e' }} onClick={() => { setVendorDialog(lic); setFormData({}); }}>
                                  <VendorIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="شكوى">
                                <IconButton size="small" sx={{ color: '#c62828' }} onClick={() => { setComplaintDialog(lic); setFormData({}); }}>
                                  <ComplaintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="حذف">
                                <IconButton size="small" color="error" onClick={() => setDeleteDialog(lic)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {pagination.total > 0 && (
                <TablePagination
                  component="div"
                  count={pagination.total}
                  page={pagination.page - 1}
                  rowsPerPage={pagination.limit}
                  onPageChange={(_, p) => fetchLicenses(p + 1)}
                  rowsPerPageOptions={[20]}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
              )}
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: لوحة المعلومات ==================== */}
      {activeTab === 1 && (
        <Box>
          {/* توزيع حسب الفئة */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            📊 التوزيع حسب الفئة
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {(dashboard?.statistics?.byCategory || []).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat._id] || {};
              return (
                <Grid item xs={6} sm={4} md={3} key={cat._id}>
                  <Card sx={{ textAlign: 'center', borderTop: `3px solid ${cfg.color || '#ccc'}` }}>
                    <CardContent>
                      <Avatar sx={{ bgcolor: `${cfg.color}20`, color: cfg.color, mx: 'auto', mb: 1 }}>
                        {cfg.icon || <DocIcon />}
                      </Avatar>
                      <Typography variant="h5" fontWeight="bold">{cat.count}</Typography>
                      <Typography variant="body2" color="text.secondary">{cfg.label || cat._id}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* توزيع حسب الحالة */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            📋 التوزيع حسب الحالة
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {(dashboard?.statistics?.byStatus || []).map((st) => {
              const cfg = STATUS_CONFIG[st._id] || {};
              return (
                <Grid item xs={6} sm={4} md={2} key={st._id}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Chip label={cfg.label || st._id} color={cfg.color || 'default'} sx={{ mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{st.count}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* التجديدات الأخيرة */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            🔄 آخر التجديدات
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>تاريخ التجديد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dashboard?.recentRenewals || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.licenseNumber}</TableCell>
                    <TableCell>{r.licenseType}</TableCell>
                    <TableCell>{r.center?.name || '-'}</TableCell>
                    <TableCell>{r.dates?.lastRenewal ? new Date(r.dates.lastRenewal).toLocaleDateString('ar-SA') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ==================== تبويب: التنبيهات ==================== */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              🔔 التنبيهات النشطة ({alerts.length})
            </Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRunAlertScan}>
              فحص التنبيهات
            </Button>
          </Box>

          {alerts.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
              <Typography variant="h6">لا توجد تنبيهات نشطة</Typography>
              <Typography color="text.secondary">جميع التراخيص في حالة جيدة</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {alerts.map((alert, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    borderRight: `4px solid ${PRIORITY_CONFIG[alert.priority]?.color || '#ccc'}`,
                    bgcolor: alert.priority === 'critical' ? '#fff3f3' : 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={PRIORITY_CONFIG[alert.priority]?.label || alert.priority}
                          size="small"
                          sx={{
                            bgcolor: `${PRIORITY_CONFIG[alert.priority]?.color}20`,
                            color: PRIORITY_CONFIG[alert.priority]?.color,
                            fontWeight: 'bold',
                          }}
                        />
                        <Typography variant="subtitle2" fontWeight="bold">{alert.title}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{alert.message}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          المركز: {alert.centerName || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          انتهاء: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString('ar-SA') : '-'}
                        </Typography>
                      </Box>
                    </Box>
                    <Tooltip title="تجاهل">
                      <IconButton size="small" onClick={() => handleDismissAlert(alert.licenseId, alert._id)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ==================== تبويب: القريبة الانتهاء ==================== */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            ⏰ التراخيص القريبة الانتهاء (خلال 90 يوم)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الانتهاء</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المتبقي</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dashboard?.upcomingExpirations || []).map((lic, i) => {
                  const days = lic.dates?.expiry
                    ? Math.ceil((new Date(lic.dates.expiry) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <TableRow key={i} sx={{ bgcolor: days !== null && days <= 7 ? '#ffebee' : 'inherit' }}>
                      <TableCell><Typography fontWeight="bold">{lic.licenseNumber}</Typography></TableCell>
                      <TableCell>{lic.licenseType}</TableCell>
                      <TableCell>{lic.center?.name}</TableCell>
                      <TableCell>{lic.dates?.expiry ? new Date(lic.dates.expiry).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 'bold', color: getDaysColor(days) }}>
                          {days === null ? '-' : days < 0 ? `منتهي` : `${days} يوم`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={PRIORITY_CONFIG[lic.priority]?.label || lic.priority}
                          size="small"
                          sx={{
                            bgcolor: `${PRIORITY_CONFIG[lic.priority]?.color || '#ccc'}20`,
                            color: PRIORITY_CONFIG[lic.priority]?.color,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="contained" color="success" startIcon={<RenewIcon />}
                          onClick={() => { setRenewDialog(lic); setFormData({}); }}>
                          تجديد
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ==================== تبويب: الغرامات والعقوبات ==================== */}
      {activeTab === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">⚖️ الغرامات والعقوبات المعلقة ({pendingPenalties.length})</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPenalties}>تحديث</Button>
          </Box>
          {pendingPenalties.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
              <Typography variant="h6">لا توجد غرامات معلقة</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نوع العقوبة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المبلغ (ر.س)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>السبب</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingPenalties.map((item, i) => (
                    (item.penalties || []).map((pen, j) => (
                      <TableRow key={`${i}-${j}`} hover>
                        <TableCell><Typography fontWeight="bold">{item.licenseNumber}</Typography></TableCell>
                        <TableCell>{item.center?.name || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={
                            pen.type === 'fine' ? 'غرامة مالية' :
                            pen.type === 'warning' ? 'إنذار' :
                            pen.type === 'suspension' ? 'إيقاف' :
                            pen.type === 'restriction' ? 'تقييد' :
                            pen.type === 'closure_threat' ? 'تهديد بالإغلاق' : pen.type
                          } color={pen.type === 'fine' ? 'warning' : pen.type === 'closure_threat' ? 'error' : 'default'} />
                        </TableCell>
                        <TableCell>{pen.amount ? pen.amount.toLocaleString() : '-'}</TableCell>
                        <TableCell>{pen.reason || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={
                            pen.status === 'pending' ? 'معلق' :
                            pen.status === 'paid' ? 'مدفوع' :
                            pen.status === 'appealed' ? 'مستأنف' :
                            pen.status === 'waived' ? 'معفي' :
                            pen.status === 'escalated' ? 'مصعّد' : pen.status
                          } color={pen.status === 'pending' ? 'warning' : pen.status === 'paid' ? 'success' : 'info'} />
                        </TableCell>
                        <TableCell>{pen.issuedDate ? new Date(pen.issuedDate).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: تحليل المخاطر ==================== */}
      {activeTab === 5 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">🛡️ تحليل المخاطر</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchHighRisk}>تحديث</Button>
              <Button variant="contained" color="warning" startIcon={<RiskIcon />} onClick={handleCalculateAllRisks}>
                إعادة حساب المخاطر الكلية
              </Button>
            </Box>
          </Box>

          {/* High Risk Licenses */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>التراخيص عالية المخاطرة ({highRiskLicenses.length})</Typography>
          {highRiskLicenses.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography>لا توجد تراخيص عالية المخاطرة</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#ffebee' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>درجة المخاطرة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المستوى</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الانتهاء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {highRiskLicenses.map((lic, i) => (
                    <TableRow key={i} hover sx={{
                      bgcolor: (lic.riskScore?.score || 0) >= 75 ? '#fff3f3' : 'inherit',
                    }}>
                      <TableCell><Typography fontWeight="bold">{lic.licenseNumber}</Typography></TableCell>
                      <TableCell>{lic.center?.name || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={lic.riskScore?.score || 0}
                            sx={{ width: 80, height: 8, borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: (lic.riskScore?.score || 0) >= 75 ? '#f44336' :
                                  (lic.riskScore?.score || 0) >= 50 ? '#ff9800' : '#4caf50'
                              }
                            }}
                          />
                          <Typography fontWeight="bold">{lic.riskScore?.score || 0}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={
                          lic.riskScore?.level === 'critical' ? 'حرج' :
                          lic.riskScore?.level === 'high' ? 'عالي' :
                          lic.riskScore?.level === 'medium' ? 'متوسط' : 'منخفض'
                        } color={
                          lic.riskScore?.level === 'critical' ? 'error' :
                          lic.riskScore?.level === 'high' ? 'warning' : 'info'
                        } />
                      </TableCell>
                      <TableCell><Chip label={STATUS_CONFIG[lic.status]?.label || lic.status} color={STATUS_CONFIG[lic.status]?.color || 'default'} size="small" /></TableCell>
                      <TableCell>{lic.dates?.expiry ? new Date(lic.dates.expiry).toLocaleDateString('ar-SA') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Renewal Forecast */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, mt: 3 }}>📅 توقعات التجديد القادمة</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {renewalForecast.slice(0, 6).map((m, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Card sx={{ textAlign: 'center', borderTop: `3px solid ${m.count > 5 ? '#f44336' : m.count > 2 ? '#ff9800' : '#4caf50'}` }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">{m.month}</Typography>
                    <Typography variant="h5" fontWeight="bold">{m.count}</Typography>
                    <Typography variant="caption">تكلفة: {(m.estimatedCost || 0).toLocaleString()} ر.س</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Region Stats */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, mt: 3 }}>🗺️ إحصائيات المناطق</Typography>
          <Grid container spacing={2}>
            {regionStats.map((r, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">{r._id || 'غير محدد'}</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">{r.count}</Typography>
                    <Typography variant="caption">ساري: {r.active || 0} | منتهي: {r.expired || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ==================== تبويب: تقرير الامتثال ==================== */}
      {activeTab === 6 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">✅ تقرير الامتثال الشامل</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchComplianceReport}>تحديث</Button>
          </Box>
          {!complianceReport ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Paper>
          ) : (
            <Grid container spacing={3}>
              {/* Overall Score */}
              <Grid item xs={12} md={4}>
                <Card sx={{ textAlign: 'center', borderTop: '4px solid #1976d2' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">نسبة الامتثال الكلية</Typography>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mt: 2, mb: 1 }}>
                      <CircularProgress
                        variant="determinate"
                        value={complianceReport.overallCompliance || 0}
                        size={100}
                        thickness={6}
                        sx={{ color: (complianceReport.overallCompliance || 0) >= 80 ? '#4caf50' : '#ff9800' }}
                      />
                      <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h5" fontWeight="bold">{complianceReport.overallCompliance || 0}%</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              {/* Summary Cards */}
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card><CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">إجمالي التراخيص</Typography>
                      <Typography variant="h5" fontWeight="bold">{complianceReport.totalLicenses || 0}</Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card><CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">ساري المفعول</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">{complianceReport.activeLicenses || 0}</Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card><CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">منتهي</Typography>
                      <Typography variant="h5" fontWeight="bold" color="error.main">{complianceReport.expiredLicenses || 0}</Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card><CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">المخالفات</Typography>
                      <Typography variant="h5" fontWeight="bold" color="warning.main">{complianceReport.totalViolations || 0}</Typography>
                    </CardContent></Card>
                  </Grid>
                </Grid>
              </Grid>
              {/* Issues List */}
              {complianceReport.issues?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>⚠️ المشكلات المكتشفة</Typography>
                  <Stack spacing={1}>
                    {complianceReport.issues.map((issue, i) => (
                      <Alert key={i} severity={issue.severity || 'warning'} sx={{ borderRadius: 2 }}>
                        <strong>{issue.title}:</strong> {issue.description}
                        {issue.count && <Chip size="small" label={`${issue.count} ترخيص`} sx={{ ml: 1 }} />}
                      </Alert>
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* ==================== تبويب: الأرشيف ==================== */}
      {activeTab === 7 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📦 التراخيص المؤرشفة ({archivedLicenses.length})</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchArchived}>تحديث</Button>
          </Box>
          {archivedLicenses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ArchiveIcon sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">لا توجد تراخيص مؤرشفة</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الأرشفة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>سبب الأرشفة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {archivedLicenses.map((lic, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography fontWeight="bold">{lic.licenseNumber}</Typography></TableCell>
                      <TableCell>{lic.licenseTypeLabel || lic.licenseType}</TableCell>
                      <TableCell>{lic.center?.name || '-'}</TableCell>
                      <TableCell>{lic.archivedAt ? new Date(lic.archivedAt).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      <TableCell>{lic.archivedReason || '-'}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" color="primary" startIcon={<UnarchiveIcon />}
                          onClick={() => handleUnarchive(lic._id)}>
                          استعادة
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: المهام والمتابعة ==================== */}
      {activeTab === 8 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📋 إدارة المهام والمتابعة</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchOverdueTasks(); fetchTaskStats(); }}>تحديث</Button>
            </Box>
          </Box>

          {/* Task Statistics */}
          {taskStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">إجمالي المهام</Typography>
                    <Typography variant="h5" fontWeight="bold">{taskStats.total || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">قيد التنفيذ</Typography>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">{taskStats.inProgress || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">متأخرة</Typography>
                    <Typography variant="h5" fontWeight="bold" color="error.main">{taskStats.overdue || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">مكتملة</Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">{taskStats.completed || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Overdue Tasks */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#f44336' }}>
            ⏰ المهام المتأخرة ({overdueTasks.length})
          </Typography>
          {overdueTasks.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography>لا توجد مهام متأخرة - عمل ممتاز!</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#ffebee' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المهمة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الاستحقاق</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المسند إليه</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overdueTasks.map((item, i) => (
                    (item.tasks || []).filter(t => t.status !== 'completed' && t.status !== 'cancelled').map((task, j) => (
                      <TableRow key={`${i}-${j}`} hover sx={{ bgcolor: '#fff3f3' }}>
                        <TableCell><Typography fontWeight="bold">{item.licenseNumber}</Typography></TableCell>
                        <TableCell>{task.title || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={
                            task.type === 'renewal' ? 'تجديد' : task.type === 'inspection' ? 'تفتيش' :
                            task.type === 'payment' ? 'دفع' : task.type === 'document_submission' ? 'تقديم مستند' :
                            task.type === 'follow_up' ? 'متابعة' : task.type === 'review' ? 'مراجعة' : task.type
                          } />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={
                            task.priority === 'critical' ? 'حرجة' : task.priority === 'high' ? 'عالية' :
                            task.priority === 'normal' ? 'عادية' : 'منخفضة'
                          } color={task.priority === 'critical' ? 'error' : task.priority === 'high' ? 'warning' : 'default'} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error.main" fontWeight="bold">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{task.assignedTo || '-'}</TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pending Communications */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, mt: 3 }}>
            📨 المراسلات المعلقة ({pendingComms.length})
          </Typography>
          {pendingComms.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography>لا توجد مراسلات معلقة</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الموضوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الجهة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingComms.map((item, i) => (
                    (item.communications || []).filter(c => c.responseRequired && !c.responseDate).map((comm, j) => (
                      <TableRow key={`${i}-${j}`} hover>
                        <TableCell><Typography fontWeight="bold">{item.licenseNumber}</Typography></TableCell>
                        <TableCell>
                          <Chip size="small" label={
                            comm.type === 'email' ? 'بريد إلكتروني' : comm.type === 'phone' ? 'هاتف' :
                            comm.type === 'letter' ? 'خطاب' : comm.type === 'meeting' ? 'اجتماع' :
                            comm.type === 'portal' ? 'بوابة إلكترونية' : comm.type
                          } />
                        </TableCell>
                        <TableCell>{comm.subject || '-'}</TableCell>
                        <TableCell>{comm.withAuthority || '-'}</TableCell>
                        <TableCell>{comm.date ? new Date(comm.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: التقويم ==================== */}
      {activeTab === 9 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📅 تقويم المواعيد والأحداث</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUpcomingEvents}>تحديث</Button>
          </Box>

          {upcomingEvents.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <EventIcon sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">لا توجد أحداث قادمة خلال 30 يوم</Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {upcomingEvents.map((item, i) => (
                (item.calendarEvents || []).map((event, j) => (
                  <Paper key={`${i}-${j}`} sx={{
                    p: 2,
                    borderRight: `4px solid ${
                      event.type === 'expiry' ? '#f44336' : event.type === 'renewal_deadline' ? '#ff9800' :
                      event.type === 'inspection' ? '#2196f3' : event.type === 'payment_due' ? '#ed6c02' :
                      event.type === 'meeting' ? '#9c27b0' : '#4caf50'
                    }`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip size="small" label={
                            event.type === 'expiry' ? 'انتهاء صلاحية' : event.type === 'renewal_deadline' ? 'موعد تجديد' :
                            event.type === 'inspection' ? 'تفتيش' : event.type === 'payment_due' ? 'موعد دفع' :
                            event.type === 'meeting' ? 'اجتماع' : event.type === 'court_date' ? 'جلسة' :
                            event.type === 'training' ? 'تدريب' : event.type === 'audit' ? 'تدقيق' : event.type
                          } color={event.type === 'expiry' ? 'error' : event.type === 'renewal_deadline' ? 'warning' : 'info'} />
                          <Typography variant="subtitle2" fontWeight="bold">{event.title || '-'}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">{event.description || ''}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Typography variant="caption"><strong>الترخيص:</strong> {item.licenseNumber}</Typography>
                          <Typography variant="caption"><strong>المركز:</strong> {item.center?.name || '-'}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {event.startDate ? new Date(event.startDate).toLocaleDateString('ar-SA', { day: 'numeric' }) : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.startDate ? new Date(event.startDate).toLocaleDateString('ar-SA', { month: 'long' }) : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ==================== تبويب: صحة التراخيص ==================== */}
      {activeTab === 10 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">🏥 مؤشر صحة التراخيص</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchLowHealth(); fetchDocStats(); }}>تحديث</Button>
              <Button variant="contained" color="warning" startIcon={<HealthIcon />} onClick={handleCalculateAllHealth}>
                إعادة حساب الصحة
              </Button>
            </Box>
          </Box>

          {/* Document Statistics */}
          {docStats && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📄 إحصائيات المستندات</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">مستندات مكتملة</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">{docStats.verified || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">قيد المراجعة</Typography>
                      <Typography variant="h5" fontWeight="bold" color="warning.main">{docStats.pending || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">ناقصة</Typography>
                      <Typography variant="h5" fontWeight="bold" color="error.main">{docStats.missing || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #9c27b0' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">منتهية الصلاحية</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#9c27b0' }}>{docStats.expired || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          {/* Low Health Licenses */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#f44336' }}>
            ⚠️ التراخيص منخفضة الصحة ({lowHealthLicenses.length})
          </Typography>
          {lowHealthLicenses.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <HealthIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography>جميع التراخيص في صحة جيدة</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>درجة الصحة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التقدير</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>آخر تحديث</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowHealthLicenses.map((lic, i) => (
                    <TableRow key={i} hover sx={{
                      bgcolor: (lic.healthScore?.score || 0) < 40 ? '#fff3f3' : 'inherit',
                    }}>
                      <TableCell><Typography fontWeight="bold">{lic.licenseNumber}</Typography></TableCell>
                      <TableCell>{lic.center?.name || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={lic.healthScore?.score || 0}
                            sx={{ width: 80, height: 8, borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: (lic.healthScore?.score || 0) < 40 ? '#f44336' :
                                  (lic.healthScore?.score || 0) < 60 ? '#ff9800' : '#4caf50'
                              }
                            }}
                          />
                          <Typography fontWeight="bold">{lic.healthScore?.score || 0}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={
                          lic.healthScore?.grade === 'A' ? 'ممتاز A' :
                          lic.healthScore?.grade === 'B' ? 'جيد B' :
                          lic.healthScore?.grade === 'C' ? 'مقبول C' :
                          lic.healthScore?.grade === 'D' ? 'ضعيف D' :
                          lic.healthScore?.grade === 'F' ? 'راسب F' : '-'
                        } color={
                          lic.healthScore?.grade === 'A' ? 'success' :
                          lic.healthScore?.grade === 'B' ? 'info' :
                          lic.healthScore?.grade === 'C' ? 'warning' : 'error'
                        } />
                      </TableCell>
                      <TableCell>
                        <Chip label={STATUS_CONFIG[lic.status]?.label || lic.status} color={STATUS_CONFIG[lic.status]?.color || 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        {lic.healthScore?.lastCalculated ? new Date(lic.healthScore.lastCalculated).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: مؤشرات الأداء ==================== */}
      {activeTab === 11 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📊 مؤشرات الأداء الرئيسية (KPIs)</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchKPIDashboard(); fetchBudgetStats(); }}>تحديث</Button>
          </Box>

          {!kpiDashboard ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Paper>
          ) : (
            <>
              {/* KPI Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">نسبة التجديد في الوقت</Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">{kpiDashboard.renewalOnTimeRate || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">نسبة الامتثال</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{kpiDashboard.complianceRate || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">متوسط أيام التجديد</Typography>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{kpiDashboard.avgRenewalDays || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">إجمالي الغرامات</Typography>
                      <Typography variant="h4" fontWeight="bold" color="error.main">
                        {(kpiDashboard.totalPenalties || 0).toLocaleString()} <Typography component="span" variant="caption">ر.س</Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #9c27b0' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">متوسط صحة التراخيص</Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#9c27b0' }}>{kpiDashboard.avgHealthScore || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #0288d1' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">إنجاز المهام</Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#0288d1' }}>{kpiDashboard.taskCompletionRate || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #2e7d32' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">اكتمال المستندات</Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#2e7d32' }}>{kpiDashboard.documentCompleteness || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #ed6c02' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">الالتزام بالميزانية</Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: '#ed6c02' }}>{kpiDashboard.budgetAdherence || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Budget Statistics */}
              {budgetStats && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, mt: 3 }}>💰 ملخص الميزانية</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">إجمالي الميزانية</Typography>
                          <Typography variant="h5" fontWeight="bold">{(budgetStats.totalBudget || 0).toLocaleString()} ر.س</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">المصروف</Typography>
                          <Typography variant="h5" fontWeight="bold" color="error.main">{(budgetStats.totalSpent || 0).toLocaleString()} ر.س</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">المتبقي</Typography>
                          <Typography variant="h5" fontWeight="bold" color="success.main">{(budgetStats.remaining || 0).toLocaleString()} ر.س</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">نسبة الإنفاق</Typography>
                          <Typography variant="h5" fontWeight="bold" color={
                            (budgetStats.spentPercentage || 0) > 90 ? 'error.main' :
                            (budgetStats.spentPercentage || 0) > 70 ? 'warning.main' : 'success.main'
                          }>{budgetStats.spentPercentage || 0}%</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}
            </>
          )}
        </Box>
      )}

      {/* ==================== تبويب: القوالب والمفضلة ==================== */}
      {activeTab === 12 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📋 القوالب والمفضلة وقائمة المتابعة</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchTemplates(); fetchFavorites(); fetchWatchlist(); }}>تحديث</Button>
          </Box>

          {/* Templates Section */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>🗂️ القوالب المحفوظة</Typography>
          {templates.length === 0 ? (
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد قوالب محفوظة بعد. قم بحفظ ترخيص كقالب من قائمة التراخيص.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {templates.map((tpl) => (
                <Grid item xs={12} sm={6} md={4} key={tpl._id}>
                  <Card sx={{ borderRight: '4px solid #7b1fa2' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography fontWeight="bold">{tpl.templateData?.templateName || tpl.licenseNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">{tpl.templateData?.templateDescription || 'بدون وصف'}</Typography>
                        </Box>
                        <Chip label={tpl.templateData?.templateCategory || 'عام'} size="small" color="secondary" />
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        الاستخدام: {tpl.templateData?.usageCount || 0} مرة | الفئة: {CATEGORY_CONFIG[tpl.category]?.label || tpl.category}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Button size="small" variant="contained" color="secondary" startIcon={<AddIcon />}
                          onClick={() => handleCreateFromTemplate(tpl._id)}>
                          إنشاء من القالب
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Favorites Section */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>⭐ المفضلة</Typography>
          {favorites.length === 0 ? (
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">لم تقم بإضافة أي ترخيص للمفضلة بعد.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>اسم المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {favorites.map((lic) => (
                    <TableRow key={lic._id} hover>
                      <TableCell>{lic.licenseNumber}</TableCell>
                      <TableCell>{lic.center?.name || '-'}</TableCell>
                      <TableCell><Chip label={CATEGORY_CONFIG[lic.category]?.label || lic.category} size="small" /></TableCell>
                      <TableCell><Chip label={STATUS_CONFIG[lic.status]?.label || lic.status} size="small" color={STATUS_CONFIG[lic.status]?.color || 'default'} /></TableCell>
                      <TableCell>
                        <Tooltip title="إزالة من المفضلة"><IconButton size="small" color="warning" onClick={() => handleToggleFavorite(lic._id)}><HeartIcon /></IconButton></Tooltip>
                        <Tooltip title="عرض"><IconButton size="small" onClick={() => setViewDialog(lic)}><ViewIcon /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Watchlist Section */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>👁️ قائمة المتابعة</Typography>
          {watchlist.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد تراخيص في قائمة المتابعة.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>اسم المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {watchlist.map((lic) => (
                    <TableRow key={lic._id} hover>
                      <TableCell>{lic.licenseNumber}</TableCell>
                      <TableCell>{lic.center?.name || '-'}</TableCell>
                      <TableCell><Chip label={STATUS_CONFIG[lic.status]?.label || lic.status} size="small" color={STATUS_CONFIG[lic.status]?.color || 'default'} /></TableCell>
                      <TableCell>
                        <Tooltip title="إيقاف المتابعة"><IconButton size="small" color="primary" onClick={() => handleToggleWatch(lic._id)}><WatchIcon /></IconButton></Tooltip>
                        <Tooltip title="عرض"><IconButton size="small" onClick={() => setViewDialog(lic)}><ViewIcon /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Comparison Tool */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>🔀 أداة المقارنة</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              اختر من 2 إلى 5 تراخيص للمقارنة بينها (المحدد: {selectedForCompare.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {licenses.slice(0, 20).map((lic) => (
                <Chip
                  key={lic._id}
                  label={lic.licenseNumber}
                  size="small"
                  variant={selectedForCompare.includes(lic._id) ? 'filled' : 'outlined'}
                  color={selectedForCompare.includes(lic._id) ? 'primary' : 'default'}
                  onClick={() => toggleCompareSelection(lic._id)}
                />
              ))}
            </Box>
            <Button variant="contained" startIcon={<CompareIcon />} onClick={handleCompareLicenses}
              disabled={selectedForCompare.length < 2}>
              مقارنة ({selectedForCompare.length})
            </Button>
          </Paper>
        </Box>
      )}

      {/* ==================== تبويب: SLA والتذاكر ==================== */}
      {activeTab === 13 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">⏱️ اتفاقيات مستوى الخدمة (SLA) والتذاكر</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="warning" startIcon={<SlaIcon />} onClick={handleEvaluateAllSLA}>تقييم SLA الشامل</Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchSLAStats(); fetchSLABreached(); fetchOpenTickets(); fetchTicketStats(); }}>تحديث</Button>
            </Box>
          </Box>

          {/* SLA Statistics */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📊 إحصائيات SLA</Typography>
          {!slaStats ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}><CircularProgress /></Paper>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">ملتزم</Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">{slaStats.compliant || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">تحذير</Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">{slaStats.warning || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">مخالف</Typography>
                    <Typography variant="h4" fontWeight="bold" color="error.main">{slaStats.breached || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">متوسط الامتثال</Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary">{slaStats.avgCompliance || 0}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* SLA Breached */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#f44336' }}>⚠️ تراخيص مخالفة لـ SLA</Typography>
          {slaBreached.length === 0 ? (
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد تراخيص مخالفة لاتفاقيات الخدمة ✅</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#ffebee' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم الترخيص</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نسبة الامتثال</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slaBreached.map((lic) => (
                    <TableRow key={lic._id} hover>
                      <TableCell>{lic.licenseNumber}</TableCell>
                      <TableCell>{lic.center?.name || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={lic.sla?.overallCompliance || 0}
                            sx={{ flex: 1, height: 8, borderRadius: 1, bgcolor: '#ffcdd2',
                              '& .MuiLinearProgress-bar': { bgcolor: '#f44336' } }} />
                          <Typography variant="caption" fontWeight="bold" color="error">{lic.sla?.overallCompliance || 0}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="إعدادات SLA"><IconButton size="small" onClick={() => { setSlaDialog(lic); setFormData({}); }}><SlaIcon /></IconButton></Tooltip>
                        <Tooltip title="عرض"><IconButton size="small" onClick={() => setViewDialog(lic)}><ViewIcon /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Ticket Statistics */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>🎫 إحصائيات التذاكر</Typography>
          {!ticketStats ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}><CircularProgress /></Paper>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={2.4}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">الإجمالي</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">{ticketStats.total || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">مفتوحة</Typography>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">{ticketStats.open || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #0288d1' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">قيد المعالجة</Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#0288d1' }}>{ticketStats.inProgress || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">مغلقة</Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">{ticketStats.resolved || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={2.4}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">عاجلة</Typography>
                    <Typography variant="h5" fontWeight="bold" color="error.main">{ticketStats.critical || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Open Tickets Table */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📌 التذاكر المفتوحة</Typography>
          {openTickets.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد تذاكر مفتوحة حالياً ✅</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fff8e1' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>رقم التذكرة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الترخيص</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {openTickets.map((item, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell><Typography variant="body2" fontWeight="bold">{item.ticketNumber || '-'}</Typography></TableCell>
                      <TableCell>{item.title || '-'}</TableCell>
                      <TableCell><Chip label={item.ticketType || '-'} size="small" /></TableCell>
                      <TableCell>
                        <Chip label={PRIORITY_CONFIG[item.priority]?.label || item.priority} size="small"
                          sx={{ bgcolor: PRIORITY_CONFIG[item.priority]?.color || '#757575', color: 'white' }} />
                      </TableCell>
                      <TableCell><Chip label={item.status || '-'} size="small" variant="outlined" /></TableCell>
                      <TableCell>{item.licenseNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: التقارير التنفيذية ==================== */}
      {activeTab === 14 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📈 التقارير التنفيذية وإصدارات المستندات</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="info" startIcon={<SummaryIcon />} onClick={handleGenerateAllSummaries}>إنشاء الملخصات</Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchExecutiveReport(); fetchExpiringDocs(); }}>تحديث</Button>
            </Box>
          </Box>

          {/* Executive Report */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📊 التقرير التنفيذي الشامل</Typography>
          {!executiveReport ? (
            <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}><CircularProgress /></Paper>
          ) : (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي التراخيص</Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">{executiveReport.totalLicenses || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="caption">نسبة الامتثال</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{executiveReport.complianceRate || 0}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="caption">تنتهي قريباً</Typography>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{executiveReport.expiringSoon || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#fce4ec' }}>
                    <CardContent>
                      <Typography variant="caption">مخاطر عالية</Typography>
                      <Typography variant="h4" fontWeight="bold" color="error">{executiveReport.highRisk || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Status Breakdown */}
              {executiveReport.statusBreakdown && (
                <>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, mt: 2 }}>توزيع الحالات</Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {Object.entries(executiveReport.statusBreakdown).map(([status, count]) => (
                      <Grid item xs={6} sm={4} md={2} key={status}>
                        <Chip label={`${STATUS_CONFIG[status]?.label || status}: ${count}`} size="small"
                          sx={{ width: '100%', bgcolor: STATUS_CONFIG[status]?.color === 'success' ? '#e8f5e9' : '#f5f5f5' }} />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* Highlights & Concerns */}
              {executiveReport.highlights?.length > 0 && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">أبرز الإنجازات:</Typography>
                  {executiveReport.highlights.map((h, i) => <Typography variant="body2" key={i}>✅ {h}</Typography>)}
                </Alert>
              )}
              {executiveReport.concerns?.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">نقاط تحتاج انتباه:</Typography>
                  {executiveReport.concerns.map((c, i) => <Typography variant="body2" key={i}>⚠️ {c}</Typography>)}
                </Alert>
              )}
              {executiveReport.recommendations?.length > 0 && (
                <Alert severity="info">
                  <Typography variant="subtitle2" fontWeight="bold">التوصيات:</Typography>
                  {executiveReport.recommendations.map((r, i) => <Typography variant="body2" key={i}>💡 {r}</Typography>)}
                </Alert>
              )}
            </Paper>
          )}

          {/* Expiring Documents */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📄 المستندات القريبة الانتهاء</Typography>
          {expiringDocs.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد مستندات تنتهي قريباً ✅</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>اسم المستند</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نوع المستند</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الانتهاء</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الترخيص</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringDocs.map((doc, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{doc.documentName || '-'}</TableCell>
                      <TableCell><Chip label={doc.documentType || '-'} size="small" /></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: getDaysColor(doc.daysUntilExpiry) }}>
                          {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('ar-SA') : '-'}
                          {doc.daysUntilExpiry != null && ` (${doc.daysUntilExpiry} يوم)`}
                        </Typography>
                      </TableCell>
                      <TableCell>{doc.licenseNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== تبويب: التحليلات التنبؤية ==================== */}
      {activeTab === 15 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">🔮 التحليلات التنبؤية والاتجاهات</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPredictiveAnalytics}>تحديث</Button>
          </Box>

          {!predictiveAnalytics ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Paper>
          ) : (
            <>
              {/* Cost Forecast */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>💰 توقعات التكاليف</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">التكلفة المتوقعة (شهرياً)</Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {(predictiveAnalytics.monthlyCostForecast || 0).toLocaleString()} <Typography component="span" variant="caption">ر.س</Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">التكلفة المتوقعة (ربع سنوي)</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">
                        {(predictiveAnalytics.quarterlyCostForecast || 0).toLocaleString()} <Typography component="span" variant="caption">ر.س</Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #9c27b0' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">التكلفة المتوقعة (سنوياً)</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                        {(predictiveAnalytics.annualCostForecast || 0).toLocaleString()} <Typography component="span" variant="caption">ر.س</Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Risk Predictions */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>⚡ تحليل المخاطر التنبؤي</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#f3e5f5' }}>
                    <CardContent>
                      <Typography variant="caption">خطر انتهاء عالي</Typography>
                      <Typography variant="h4" fontWeight="bold" color="error">{predictiveAnalytics.highExpiryRisk || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#e8eaf6' }}>
                    <CardContent>
                      <Typography variant="caption">خطر انتهاء متوسط</Typography>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{predictiveAnalytics.mediumExpiryRisk || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#e0f2f1' }}>
                    <CardContent>
                      <Typography variant="caption">توقع تحسن الامتثال</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{predictiveAnalytics.complianceImproving || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', bgcolor: '#fce4ec' }}>
                    <CardContent>
                      <Typography variant="caption">توقع تراجع الامتثال</Typography>
                      <Typography variant="h4" fontWeight="bold" color="error">{predictiveAnalytics.complianceDeclining || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Renewal Timeline */}
              {predictiveAnalytics.renewalTimeline?.length > 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📅 جدول التجديدات المتوقعة</Typography>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#e8eaf6' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>عدد التجديدات</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>التكلفة المتوقعة</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>مستوى الأولوية</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {predictiveAnalytics.renewalTimeline.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell fontWeight="bold">{item.period || '-'}</TableCell>
                            <TableCell>{item.count || 0}</TableCell>
                            <TableCell>{(item.estimatedCost || 0).toLocaleString()} ر.س</TableCell>
                            <TableCell>
                              <Chip label={item.priority || 'عادي'} size="small"
                                color={item.priority === 'عاجل' ? 'error' : item.priority === 'مهم' ? 'warning' : 'default'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Insights */}
              {predictiveAnalytics.insights?.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>💡 رؤى وتوصيات ذكية</Typography>
                  {predictiveAnalytics.insights.map((insight, idx) => (
                    <Typography variant="body2" key={idx}>• {insight}</Typography>
                  ))}
                </Alert>
              )}
            </>
          )}
        </Box>
      )}

      {/* ==================== Round 5: Tab 16 — الرضا والاجتماعات ==================== */}
      {activeTab === 16 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📊 تقييم رضا المتعاملين والاجتماعات</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchGlobalSatisfaction(); fetchGlobalMeetings(); }}>تحديث</Button>
          </Box>

          {/* Satisfaction Analytics */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>⭐ تحليل مؤشرات الرضا العام</Typography>
          {!globalSatisfaction ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}><CircularProgress /></Paper>
          ) : globalSatisfaction.totalSurveys === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>لا توجد تقييمات رضا بعد</Alert>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                  <CardContent>
                    <Typography variant="caption">إجمالي التقييمات</Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary">{globalSatisfaction.totalSurveys}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                  <CardContent>
                    <Typography variant="caption">متوسط التقييم العام</Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">{globalSatisfaction.averageOverall || 0}/5</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                  <CardContent>
                    <Typography variant="caption">جودة الخدمة</Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">{globalSatisfaction.averageService || 0}/5</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ textAlign: 'center', borderTop: '3px solid #9c27b0' }}>
                  <CardContent>
                    <Typography variant="caption">سرعة الاستجابة</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#9c27b0' }}>{globalSatisfaction.averageResponse || 0}/5</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {globalSatisfaction.topSuggestions?.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>💡 أبرز المقترحات</Typography>
                    {globalSatisfaction.topSuggestions.slice(0, 5).map((s, i) => (
                      <Typography key={i} variant="body2">• {s}</Typography>
                    ))}
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}

          {/* Meetings Calendar */}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>📅 الاجتماعات والمراجعات</Typography>
          {globalMeetings.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>لا توجد اجتماعات مسجلة</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاجتماع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحضور</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القرارات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {globalMeetings.slice(0, 20).map((m, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell fontWeight="bold">{m.title}</TableCell>
                      <TableCell><Chip label={m.meetingType || 'مراجعة'} size="small" /></TableCell>
                      <TableCell>{m.center?.name || '-'}</TableCell>
                      <TableCell>{m.date ? new Date(m.date).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      <TableCell>{(m.attendees || []).length} حاضر</TableCell>
                      <TableCell>
                        <Chip label={`${(m.decisions || []).length} قرارات`} size="small"
                          color={(m.decisions || []).some(d => d.status === 'pending') ? 'warning' : 'success'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ==================== Round 5: Tab 17 — التدريب والتأهيل ==================== */}
      {activeTab === 17 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">🎓 التدريب والتأهيل</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchGlobalTraining}>تحديث</Button>
          </Box>

          {globalTraining.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Paper>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي المراكز</Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">{globalTraining.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                    <CardContent>
                      <Typography variant="caption">معدل الامتثال التدريبي</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {globalTraining.length ? (globalTraining.reduce((s, t) => s + t.complianceRate, 0) / globalTraining.length).toFixed(0) : 0}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                    <CardContent>
                      <Typography variant="caption">سجلات مكتملة</Typography>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{globalTraining.reduce((s, t) => s + t.completed, 0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي السجلات</Typography>
                      <Typography variant="h4" fontWeight="bold" color="error">{globalTraining.reduce((s, t) => s + t.total, 0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>المركز</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>إجمالي التدريبات</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>مكتملة</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>نسبة الامتثال</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الوضع</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {globalTraining.map((t, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell fontWeight="bold">{t.center?.name || '-'}</TableCell>
                        <TableCell>{t.total}</TableCell>
                        <TableCell>{t.completed}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={t.complianceRate} sx={{ flex: 1, height: 8, borderRadius: 4 }}
                              color={t.complianceRate >= 80 ? 'success' : t.complianceRate >= 50 ? 'warning' : 'error'} />
                            <Typography variant="body2" fontWeight="bold">{t.complianceRate}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={t.complianceRate >= 80 ? 'ممتاز' : t.complianceRate >= 50 ? 'متوسط' : 'ضعيف'} size="small"
                            color={t.complianceRate >= 80 ? 'success' : t.complianceRate >= 50 ? 'warning' : 'error'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}

      {/* ==================== Round 5: Tab 18 — الموردين ==================== */}
      {activeTab === 18 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">🏢 الموردين والمقاولين</Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchGlobalVendorRatings}>تحديث</Button>
          </Box>

          {globalVendorRatings.length === 0 ? (
            <Alert severity="info">لا توجد بيانات موردين مسجلة</Alert>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي الموردين</Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">{globalVendorRatings.length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                    <CardContent>
                      <Typography variant="caption">متوسط التقييم</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {globalVendorRatings.length
                          ? (globalVendorRatings.reduce((s, v) => s + (v.avgRating || 0), 0) / globalVendorRatings.length).toFixed(1)
                          : 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي العقود</Typography>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{globalVendorRatings.reduce((s, v) => s + v.contracts, 0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #9c27b0' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي القيمة</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                        {globalVendorRatings.reduce((s, v) => s + (v.totalValue || 0), 0).toLocaleString()} ر.س
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fce4ec' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>المورد</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>عدد العقود</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>القيمة الإجمالية</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>التقييم</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {globalVendorRatings.map((v, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell fontWeight="bold">{v.name}</TableCell>
                        <TableCell><Chip label={v.type || 'عام'} size="small" /></TableCell>
                        <TableCell>{v.contracts}</TableCell>
                        <TableCell>{(v.totalValue || 0).toLocaleString()} ر.س</TableCell>
                        <TableCell>
                          <Chip label={`${v.avgRating}/5 ⭐`} size="small"
                            color={v.avgRating >= 4 ? 'success' : v.avgRating >= 3 ? 'warning' : 'error'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}

      {/* ==================== Round 5: Tab 19 — الشكاوى والمقترحات ==================== */}
      {activeTab === 19 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">📝 الشكاوى والمقترحات</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<RemediationIcon />} onClick={handleRunAutoRemediation}>مسح تلقائي</Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchGlobalComplaints}>تحديث</Button>
            </Box>
          </Box>

          {!globalComplaints ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Paper>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #f44336' }}>
                    <CardContent>
                      <Typography variant="caption">إجمالي الشكاوى</Typography>
                      <Typography variant="h4" fontWeight="bold" color="error">{globalComplaints.totalComplaints || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #4caf50' }}>
                    <CardContent>
                      <Typography variant="caption">المقترحات</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{globalComplaints.totalSuggestions || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #ff9800' }}>
                    <CardContent>
                      <Typography variant="caption">متوسط أيام الحل</Typography>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{globalComplaints.avgResolutionDays || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                    <CardContent>
                      <Typography variant="caption">الإجمالي</Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">{(globalComplaints.totalComplaints || 0) + (globalComplaints.totalSuggestions || 0)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Status breakdown */}
              {globalComplaints.complaintsByStatus && Object.keys(globalComplaints.complaintsByStatus).length > 0 && (
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>حسب الحالة</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(globalComplaints.complaintsByStatus).map(([status, count]) => (
                      <Chip key={status} label={`${status}: ${count}`} size="small"
                        color={status === 'resolved' || status === 'closed' ? 'success' : status === 'open' ? 'error' : 'warning'} />
                    ))}
                  </Box>
                </Paper>
              )}

              {/* Type breakdown */}
              {globalComplaints.complaintsByType && Object.keys(globalComplaints.complaintsByType).length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>حسب النوع</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(globalComplaints.complaintsByType).map(([type, count]) => (
                      <Chip key={type} label={`${type}: ${count}`} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Paper>
              )}
            </>
          )}
        </Box>
      )}

      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white' }}>
          إنشاء ترخيص جديد
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                معلومات المركز
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="اسم المركز *" size="small"
                value={formData.center?.name || ''}
                onChange={(e) => setFormData({ ...formData, center: { ...formData.center, name: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="المدينة *" size="small"
                value={formData.center?.city || ''}
                onChange={(e) => setFormData({ ...formData, center: { ...formData.center, city: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="رقم السجل التجاري" size="small"
                value={formData.center?.crNumber || ''}
                onChange={(e) => setFormData({ ...formData, center: { ...formData.center, crNumber: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="الرقم الموحد 700" size="small"
                value={formData.center?.unifiedNumber || ''}
                onChange={(e) => setFormData({ ...formData, center: { ...formData.center, unifiedNumber: e.target.value } })}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                بيانات الترخيص
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الفئة *</InputLabel>
                <Select value={formData.category || ''} label="الفئة *"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {licenseTypes.categories?.map(c => (
                    <MenuItem key={c.value} value={c.value}>{c.icon} {c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الترخيص *</InputLabel>
                <Select value={formData.licenseType || ''} label="نوع الترخيص *"
                  onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}>
                  {licenseTypes.types
                    ?.filter(t => !formData.category || t.category === formData.category)
                    .map(t => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="رقم الترخيص *" size="small"
                value={formData.licenseNumber || ''}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="الجهة المصدرة *" size="small"
                value={formData.issuingAuthority?.name || ''}
                onChange={(e) => setFormData({ ...formData, issuingAuthority: { ...formData.issuingAuthority, name: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ الإصدار *" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dates?.issued || ''}
                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, issued: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ الانتهاء *" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dates?.expiry || ''}
                onChange={(e) => setFormData({ ...formData, dates: { ...formData.dates, expiry: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="رسوم الإصدار (ر.س)" size="small" type="number"
                value={formData.costs?.issueFee || ''}
                onChange={(e) => setFormData({ ...formData, costs: { ...formData.costs, issueFee: Number(e.target.value) } })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="رسوم التجديد (ر.س)" size="small" type="number"
                value={formData.costs?.renewalFee || ''}
                onChange={(e) => setFormData({ ...formData, costs: { ...formData.costs, renewalFee: Number(e.target.value) } })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={formData.priority || 'normal'} label="الأولوية"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                    <MenuItem key={val} value={val}>{cfg.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} startIcon={<AddIcon />}>
            حفظ الترخيص
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: تجديد ==================== */}
      <Dialog open={!!renewDialog} onClose={() => setRenewDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          تجديد الترخيص: {renewDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                الترخيص الحالي ينتهي بتاريخ:{' '}
                <strong>
                  {renewDialog?.dates?.expiry ? new Date(renewDialog.dates.expiry).toLocaleDateString('ar-SA') : '-'}
                </strong>
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="تاريخ الانتهاء الجديد *" type="date" size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.newExpiryDate || ''}
                onChange={(e) => setFormData({ ...formData, newExpiryDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="تكلفة التجديد (ر.س)" type="number" size="small"
                value={formData.renewalCost || ''}
                onChange={(e) => setFormData({ ...formData, renewalCost: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ملاحظات التجديد" size="small" multiline rows={3}
                value={formData.renewalNotes || ''}
                onChange={(e) => setFormData({ ...formData, renewalNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRenewDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleRenew} startIcon={<RenewIcon />}>
            تأكيد التجديد
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: عرض التفاصيل ==================== */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white' }}>
          تفاصيل الترخيص: {viewDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {viewDialog && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  معلومات المركز
                </Typography>
              </Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>الاسم:</strong> {viewDialog.center?.name || '-'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>المدينة:</strong> {viewDialog.center?.city || '-'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>السجل التجاري:</strong> {viewDialog.center?.crNumber || '-'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>الرقم الموحد:</strong> {viewDialog.center?.unifiedNumber || '-'}</Typography></Grid>

              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  بيانات الترخيص
                </Typography>
              </Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>النوع:</strong> {viewDialog.licenseTypeLabel || viewDialog.licenseType}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>الفئة:</strong> {CATEGORY_CONFIG[viewDialog.category]?.label || viewDialog.category}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>الجهة المصدرة:</strong> {viewDialog.issuingAuthority?.name || '-'}</Typography></Grid>
              <Grid item xs={6}>
                <Typography variant="body2"><strong>الحالة:</strong>{' '}
                  <Chip label={STATUS_CONFIG[viewDialog.status]?.label || viewDialog.status} color={STATUS_CONFIG[viewDialog.status]?.color} size="small" />
                </Typography>
              </Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>تاريخ الإصدار:</strong> {viewDialog.dates?.issued ? new Date(viewDialog.dates.issued).toLocaleDateString('ar-SA') : '-'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>تاريخ الانتهاء:</strong> {viewDialog.dates?.expiry ? new Date(viewDialog.dates.expiry).toLocaleDateString('ar-SA') : '-'}</Typography></Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>المتبقي:</strong>{' '}
                  <span style={{ color: getDaysColor(viewDialog.daysUntilExpiry), fontWeight: 'bold' }}>
                    {viewDialog.daysUntilExpiry !== null
                      ? viewDialog.daysUntilExpiry < 0
                        ? `منتهي منذ ${Math.abs(viewDialog.daysUntilExpiry)} يوم`
                        : `${viewDialog.daysUntilExpiry} يوم`
                      : '-'}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}><Typography variant="body2"><strong>الأولوية:</strong> {PRIORITY_CONFIG[viewDialog.priority]?.label || viewDialog.priority}</Typography></Grid>

              {viewDialog.costs && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                      التكاليف
                    </Typography>
                  </Grid>
                  <Grid item xs={4}><Typography variant="body2"><strong>رسوم الإصدار:</strong> {viewDialog.costs.issueFee || 0} ر.س</Typography></Grid>
                  <Grid item xs={4}><Typography variant="body2"><strong>رسوم التجديد:</strong> {viewDialog.costs.renewalFee || 0} ر.س</Typography></Grid>
                  <Grid item xs={4}><Typography variant="body2"><strong>إجمالي المدفوع:</strong> {viewDialog.costs.totalPaid || 0} ر.س</Typography></Grid>
                </>
              )}

              {viewDialog.compliance && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                      الامتثال
                    </Typography>
                  </Grid>
                  <Grid item xs={6}><Typography variant="body2"><strong>حالة الامتثال:</strong> {viewDialog.compliance.status || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2"><strong>آخر تفتيش:</strong> {viewDialog.compliance.lastInspectionDate ? new Date(viewDialog.compliance.lastInspectionDate).toLocaleDateString('ar-SA') : '-'}</Typography></Grid>
                </>
              )}

              {viewDialog.renewalHistory?.length > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                      سجل التجديدات ({viewDialog.renewalHistory.length})
                    </Typography>
                    {viewDialog.renewalHistory.map((r, i) => (
                      <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#f9f9f9' }}>
                        <Typography variant="body2">
                          {new Date(r.renewalDate).toLocaleDateString('ar-SA')} - حتى {new Date(r.newExpiryDate).toLocaleDateString('ar-SA')}
                          {r.renewalCost ? ` (${r.renewalCost} ر.س)` : ''}
                        </Typography>
                      </Paper>
                    ))}
                  </Grid>
                </>
              )}

              {/* Delegation Info */}
              {viewDialog.delegation?.hasDelegation && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#9c27b0' }} gutterBottom>
                      التفويض
                    </Typography>
                  </Grid>
                  <Grid item xs={6}><Typography variant="body2"><strong>المفوض:</strong> {viewDialog.delegation.delegateName || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2"><strong>نوع التفويض:</strong> {viewDialog.delegation.delegationType || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2"><strong>الهاتف:</strong> {viewDialog.delegation.delegatePhone || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2"><strong>الهوية:</strong> {viewDialog.delegation.delegateId || '-'}</Typography></Grid>
                </>
              )}

              {/* Risk Score */}
              {viewDialog.riskScore?.score > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#f44336' }} gutterBottom>
                      درجة المخاطرة
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={viewDialog.riskScore.score}
                        sx={{ width: 100, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': {
                          bgcolor: viewDialog.riskScore.score >= 75 ? '#f44336' : viewDialog.riskScore.score >= 50 ? '#ff9800' : '#4caf50'
                        }}} />
                      <Typography fontWeight="bold">{viewDialog.riskScore.score}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip label={
                      viewDialog.riskScore.level === 'critical' ? 'حرج' :
                      viewDialog.riskScore.level === 'high' ? 'عالي' :
                      viewDialog.riskScore.level === 'medium' ? 'متوسط' : 'منخفض'
                    } color={viewDialog.riskScore.level === 'critical' ? 'error' : viewDialog.riskScore.level === 'high' ? 'warning' : 'info'} size="small" />
                  </Grid>
                </>
              )}

              {/* Penalties Summary */}
              {viewDialog.penalties?.length > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#ed6c02' }} gutterBottom>
                      الغرامات ({viewDialog.penalties.length})
                    </Typography>
                    {viewDialog.penalties.map((p, i) => (
                      <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#fff8e1', borderRight: '3px solid #ed6c02' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{p.reason || 'بدون سبب'}</Typography>
                          <Chip size="small" label={p.amount ? `${p.amount.toLocaleString()} ر.س` : p.type} color="warning" />
                        </Box>
                      </Paper>
                    ))}
                  </Grid>
                </>
              )}

              {/* Branches */}
              {viewDialog.branches?.length > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#2e7d32' }} gutterBottom>
                      الفروع ({viewDialog.branches.length})
                    </Typography>
                    {viewDialog.branches.map((b, i) => (
                      <Chip key={i} icon={<BranchIcon />} label={`${b.branchName} - ${b.city || ''}`}
                        sx={{ m: 0.5, bgcolor: b.isMainBranch ? '#e8f5e9' : '#f5f5f5' }}
                        color={b.isMainBranch ? 'success' : 'default'} variant="outlined"
                      />
                    ))}
                  </Grid>
                </>
              )}

              {/* Health Score - Round 3 */}
              {viewDialog.healthScore?.score > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#00695c' }} gutterBottom>
                      مؤشر صحة الترخيص
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={viewDialog.healthScore.score}
                        sx={{ width: 100, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': {
                          bgcolor: viewDialog.healthScore.score >= 80 ? '#4caf50' : viewDialog.healthScore.score >= 60 ? '#ff9800' : '#f44336'
                        }}} />
                      <Typography fontWeight="bold">{viewDialog.healthScore.score}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip label={`التقدير: ${viewDialog.healthScore.grade || '-'}`} color={
                      viewDialog.healthScore.grade === 'A' ? 'success' :
                      viewDialog.healthScore.grade === 'B' ? 'info' :
                      viewDialog.healthScore.grade === 'C' ? 'warning' : 'error'
                    } size="small" />
                  </Grid>
                </>
              )}

              {/* Tasks Summary - Round 3 */}
              {viewDialog.tasks?.length > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#1565c0' }} gutterBottom>
                      المهام ({viewDialog.tasks.length})
                    </Typography>
                    {viewDialog.tasks.slice(0, 5).map((t, i) => (
                      <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#e3f2fd', borderRight: `3px solid ${
                        t.status === 'completed' ? '#4caf50' : t.status === 'overdue' ? '#f44336' : '#1976d2'
                      }` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{t.title || '-'}</Typography>
                          <Chip size="small" label={
                            t.status === 'pending' ? 'معلق' : t.status === 'in_progress' ? 'قيد التنفيذ' :
                            t.status === 'completed' ? 'مكتمل' : t.status === 'overdue' ? 'متأخر' : t.status
                          } color={t.status === 'completed' ? 'success' : t.status === 'overdue' ? 'error' : 'info'} />
                        </Box>
                      </Paper>
                    ))}
                  </Grid>
                </>
              )}

              {/* Comments Summary - Round 3 */}
              {viewDialog.comments?.length > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#455a64' }} gutterBottom>
                      التعليقات ({viewDialog.comments.filter(c => !c.isDeleted).length})
                    </Typography>
                    {viewDialog.comments.filter(c => !c.isDeleted).slice(0, 3).map((c, i) => (
                      <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#f5f5f5', borderRight: c.isPinned ? '3px solid #ff9800' : 'none' }}>
                        <Typography variant="body2">{c.content}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.authorName || '-'} - {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : ''}
                        </Typography>
                      </Paper>
                    ))}
                  </Grid>
                </>
              )}

              {/* Budget - Round 3 */}
              {viewDialog.budget?.allocatedAmount > 0 && (
                <>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#bf360c' }} gutterBottom>
                      الميزانية
                    </Typography>
                  </Grid>
                  <Grid item xs={4}><Typography variant="body2"><strong>المخصص:</strong> {(viewDialog.budget.allocatedAmount || 0).toLocaleString()} ر.س</Typography></Grid>
                  <Grid item xs={4}><Typography variant="body2"><strong>المصروف:</strong> {(viewDialog.budget.spentAmount || 0).toLocaleString()} ر.س</Typography></Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      <strong>المتبقي:</strong>{' '}
                      <span style={{ color: (viewDialog.budget.allocatedAmount - viewDialog.budget.spentAmount) < 0 ? '#f44336' : '#4caf50', fontWeight: 'bold' }}>
                        {((viewDialog.budget.allocatedAmount || 0) - (viewDialog.budget.spentAmount || 0)).toLocaleString()} ر.س
                      </span>
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={() => setViewDialog(null)}>إغلاق</Button>
          <Button variant="outlined" color="info" startIcon={<ChecklistIcon />}
            onClick={() => { setRequirementDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            إضافة متطلب
          </Button>
          <Button variant="outlined" sx={{ color: '#9c27b0', borderColor: '#9c27b0' }} startIcon={<DelegateIcon />}
            onClick={() => { setDelegationDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            تفويض
          </Button>
          <Button variant="outlined" startIcon={<BranchIcon />} color="success"
            onClick={() => { setBranchDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            إضافة فرع
          </Button>
          <Button variant="outlined" startIcon={<TaskIcon />}
            onClick={() => { setTaskDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            مهمة
          </Button>
          <Button variant="outlined" sx={{ color: '#455a64', borderColor: '#455a64' }} startIcon={<CommentIcon />}
            onClick={() => { setCommentDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            تعليق
          </Button>
          <Button variant="outlined" sx={{ color: '#0288d1', borderColor: '#0288d1' }} startIcon={<ContactIcon />}
            onClick={() => { setCommunicationDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            مراسلة
          </Button>
          <Button variant="outlined" sx={{ color: '#bf360c', borderColor: '#bf360c' }} startIcon={<ExpenseIcon />}
            onClick={() => { setBudgetDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            مصروف
          </Button>
          <Button variant="contained" color="success" startIcon={<RenewIcon />}
            onClick={() => { setRenewDialog(viewDialog); setViewDialog(null); setFormData({}); }}>
            تجديد
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: تأكيد حذف ==================== */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle sx={{ color: '#d32f2f' }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف الترخيص <strong>{deleteDialog?.licenseNumber}</strong>؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            هذا الإجراء غير قابل للتراجع.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} startIcon={<DeleteIcon />}>
            تأكيد الحذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: تفويض ==================== */}
      <Dialog open={!!delegationDialog} onClose={() => setDelegationDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#9c27b0', color: 'white' }}>
          تفويض الترخيص: {delegationDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم المفوض *" size="small"
                value={formData.delegateName || ''}
                onChange={(e) => setFormData({ ...formData, delegateName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="رقم هوية المفوض" size="small"
                value={formData.delegateId || ''}
                onChange={(e) => setFormData({ ...formData, delegateId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="هاتف المفوض" size="small"
                value={formData.delegatePhone || ''}
                onChange={(e) => setFormData({ ...formData, delegatePhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التفويض</InputLabel>
                <Select value={formData.delegationType || 'full'} label="نوع التفويض"
                  onChange={(e) => setFormData({ ...formData, delegationType: e.target.value })}>
                  <MenuItem value="full">تفويض كامل</MenuItem>
                  <MenuItem value="renewal_only">تجديد فقط</MenuItem>
                  <MenuItem value="review_only">مراجعة فقط</MenuItem>
                  <MenuItem value="payment_only">دفع فقط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ البداية" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ النهاية" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDelegationDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#9c27b0' }} onClick={handleSetDelegation} startIcon={<DelegateIcon />}>
            حفظ التفويض
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: غرامة ==================== */}
      <Dialog open={!!penaltyDialog} onClose={() => setPenaltyDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ed6c02', color: 'white' }}>
          تسجيل غرامة: {penaltyDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع العقوبة *</InputLabel>
                <Select value={formData.type || 'fine'} label="نوع العقوبة *"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <MenuItem value="fine">غرامة مالية</MenuItem>
                  <MenuItem value="warning">إنذار</MenuItem>
                  <MenuItem value="suspension">إيقاف</MenuItem>
                  <MenuItem value="restriction">تقييد</MenuItem>
                  <MenuItem value="closure_threat">تهديد بالإغلاق</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="المبلغ (ر.س)" size="small" type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ الاستحقاق" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="السبب *" size="small" multiline rows={2}
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="رقم القرار" size="small"
                value={formData.referenceNumber || ''}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPenaltyDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleAddPenalty} startIcon={<PenaltyIcon />}>
            تسجيل الغرامة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: متطلب ==================== */}
      <Dialog open={!!requirementDialog} onClose={() => setRequirementDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0288d1', color: 'white' }}>
          إضافة متطلب: {requirementDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="المتطلب *" size="small"
                value={formData.requirement || ''}
                onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف</InputLabel>
                <Select value={formData.category || 'document'} label="التصنيف"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <MenuItem value="document">مستند</MenuItem>
                  <MenuItem value="payment">دفعة مالية</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="approval">موافقة</MenuItem>
                  <MenuItem value="training">تدريب</MenuItem>
                  <MenuItem value="equipment">معدات</MenuItem>
                  <MenuItem value="personnel">كوادر بشرية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={formData.priority || 'normal'} label="الأولوية"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="low">منخفضة</MenuItem>
                  <MenuItem value="normal">عادية</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="critical">حرجة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="تاريخ الاستحقاق" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRequirementDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="info" onClick={handleAddRequirement} startIcon={<ChecklistIcon />}>
            إضافة المتطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: فرع ==================== */}
      <Dialog open={!!branchDialog} onClose={() => setBranchDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          إضافة فرع: {branchDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم الفرع *" size="small"
                value={formData.branchName || ''}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="المدينة" size="small"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الفرع الرئيسي؟</InputLabel>
                <Select value={formData.isMainBranch || false} label="الفرع الرئيسي؟"
                  onChange={(e) => setFormData({ ...formData, isMainBranch: e.target.value })}>
                  <MenuItem value={true}>نعم</MenuItem>
                  <MenuItem value={false}>لا</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBranchDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleAddBranch} startIcon={<BranchIcon />}>
            إضافة الفرع
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: سير عمل الموافقات ==================== */}
      <Dialog open={!!approvalDialog} onClose={() => setApprovalDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white' }}>
          إعداد سير عمل الموافقات: {approvalDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 1 }}>أدخل اسم كل مراجع في سطر منفصل بالترتيب</Alert>
              <TextField fullWidth label="خطوات الموافقة *" size="small" multiline rows={5}
                placeholder="مدير الفرع&#10;مدير العمليات&#10;المدير العام"
                value={formData.approvalSteps || ''}
                onChange={(e) => setFormData({ ...formData, approvalSteps: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setApprovalDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSetupApproval} startIcon={<WorkflowIcon />}>
            حفظ سير العمل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: مهمة جديدة ==================== */}
      <Dialog open={!!taskDialog} onClose={() => setTaskDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white' }}>
          إضافة مهمة: {taskDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان المهمة *" size="small"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع المهمة *</InputLabel>
                <Select value={formData.type || 'follow_up'} label="نوع المهمة *"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <MenuItem value="renewal">تجديد</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="payment">دفع</MenuItem>
                  <MenuItem value="document_submission">تقديم مستند</MenuItem>
                  <MenuItem value="follow_up">متابعة</MenuItem>
                  <MenuItem value="review">مراجعة</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={formData.priority || 'normal'} label="الأولوية"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="low">منخفضة</MenuItem>
                  <MenuItem value="normal">عادية</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="critical">حرجة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ الاستحقاق" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="المسند إليه" size="small"
                value={formData.assignedTo || ''}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوصف" size="small" multiline rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTaskDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddTask} startIcon={<TaskIcon />}>
            إضافة المهمة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: مراسلة ==================== */}
      <Dialog open={!!communicationDialog} onClose={() => setCommunicationDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0288d1', color: 'white' }}>
          تسجيل مراسلة: {communicationDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع المراسلة *</InputLabel>
                <Select value={formData.type || 'email'} label="نوع المراسلة *"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <MenuItem value="email">بريد إلكتروني</MenuItem>
                  <MenuItem value="phone">هاتف</MenuItem>
                  <MenuItem value="letter">خطاب رسمي</MenuItem>
                  <MenuItem value="meeting">اجتماع</MenuItem>
                  <MenuItem value="portal">بوابة إلكترونية</MenuItem>
                  <MenuItem value="fax">فاكس</MenuItem>
                  <MenuItem value="visit">زيارة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الاتجاه</InputLabel>
                <Select value={formData.direction || 'outgoing'} label="الاتجاه"
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}>
                  <MenuItem value="incoming">وارد</MenuItem>
                  <MenuItem value="outgoing">صادر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الموضوع *" size="small"
                value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الجهة المعنية" size="small"
                value={formData.withAuthority || ''}
                onChange={(e) => setFormData({ ...formData, withAuthority: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الملخص" size="small" multiline rows={2}
                value={formData.summary || ''}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCommunicationDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#0288d1' }} onClick={handleAddCommunication} startIcon={<ContactIcon />}>
            تسجيل المراسلة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: حدث تقويم ==================== */}
      <Dialog open={!!calendarEventDialog} onClose={() => setCalendarEventDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#7b1fa2', color: 'white' }}>
          إضافة حدث: {calendarEventDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان الحدث *" size="small"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الحدث *</InputLabel>
                <Select value={formData.type || 'meeting'} label="نوع الحدث *"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <MenuItem value="expiry">انتهاء صلاحية</MenuItem>
                  <MenuItem value="renewal_deadline">موعد تجديد</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="payment_due">موعد دفع</MenuItem>
                  <MenuItem value="meeting">اجتماع</MenuItem>
                  <MenuItem value="court_date">جلسة</MenuItem>
                  <MenuItem value="training">تدريب</MenuItem>
                  <MenuItem value="audit">تدقيق</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ البداية *" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ النهاية" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="الموقع" size="small"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوصف" size="small" multiline rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCalendarEventDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#7b1fa2' }} onClick={handleAddCalendarEvent} startIcon={<EventIcon />}>
            إضافة الحدث
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: تعليق ==================== */}
      <Dialog open={!!commentDialog} onClose={() => setCommentDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#455a64', color: 'white' }}>
          إضافة تعليق: {commentDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="التعليق *" size="small" multiline rows={4}
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>الرؤية</InputLabel>
                <Select value={formData.visibility || 'team'} label="الرؤية"
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}>
                  <MenuItem value="private">خاص</MenuItem>
                  <MenuItem value="team">الفريق</MenuItem>
                  <MenuItem value="public">عام</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCommentDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#455a64' }} onClick={handleAddComment} startIcon={<CommentIcon />}>
            إضافة التعليق
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: إضافة مستند ==================== */}
      <Dialog open={!!documentChecklistDialog} onClose={() => setDocumentChecklistDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#00695c', color: 'white' }}>
          إضافة مستند للقائمة: {documentChecklistDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم المستند *" size="small"
                value={formData.documentName || ''}
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع المستند</InputLabel>
                <Select value={formData.documentType || 'license_copy'} label="نوع المستند"
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}>
                  <MenuItem value="license_copy">نسخة الترخيص</MenuItem>
                  <MenuItem value="commercial_register">السجل التجاري</MenuItem>
                  <MenuItem value="insurance_certificate">شهادة التأمين</MenuItem>
                  <MenuItem value="safety_certificate">شهادة السلامة</MenuItem>
                  <MenuItem value="staff_qualifications">مؤهلات الموظفين</MenuItem>
                  <MenuItem value="financial_statement">قائمة مالية</MenuItem>
                  <MenuItem value="inspection_report">تقرير تفتيش</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الفئة</InputLabel>
                <Select value={formData.category || 'legal'} label="الفئة"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <MenuItem value="legal">قانوني</MenuItem>
                  <MenuItem value="financial">مالي</MenuItem>
                  <MenuItem value="operational">تشغيلي</MenuItem>
                  <MenuItem value="compliance">امتثال</MenuItem>
                  <MenuItem value="hr">موارد بشرية</MenuItem>
                  <MenuItem value="safety">سلامة</MenuItem>
                  <MenuItem value="technical">فني</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="تاريخ انتهاء المستند" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ملاحظات" size="small" multiline rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDocumentChecklistDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#00695c' }} onClick={handleAddDocumentItem} startIcon={<ChecklistDoneIcon />}>
            إضافة المستند
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Dialog: مصروف ==================== */}
      <Dialog open={!!budgetDialog} onClose={() => setBudgetDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#bf360c', color: 'white' }}>
          تسجيل مصروف: {budgetDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="وصف المصروف *" size="small"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="المبلغ (ر.س) *" size="small" type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الفئة</InputLabel>
                <Select value={formData.category || 'renewal_fees'} label="الفئة"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <MenuItem value="renewal_fees">رسوم تجديد</MenuItem>
                  <MenuItem value="penalty_payment">دفع غرامات</MenuItem>
                  <MenuItem value="inspection_fees">رسوم تفتيش</MenuItem>
                  <MenuItem value="consultation">استشارة</MenuItem>
                  <MenuItem value="documentation">توثيق</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="التاريخ" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="رقم الإيصال/الفاتورة" size="small"
                value={formData.receiptNumber || ''}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBudgetDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#bf360c' }} onClick={handleAddExpense} startIcon={<ExpenseIcon />}>
            تسجيل المصروف
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: حفظ كقالب ==================== */}
      <Dialog open={!!templateDialog} onClose={() => setTemplateDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#7b1fa2', color: 'white' }}>
          حفظ كقالب: {templateDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم القالب *" size="small"
                value={formData.templateName || ''}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="وصف القالب" size="small" multiline rows={2}
                value={formData.templateDescription || ''}
                onChange={(e) => setFormData({ ...formData, templateDescription: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>فئة القالب</InputLabel>
                <Select value={formData.templateCategory || 'general'} label="فئة القالب"
                  onChange={(e) => setFormData({ ...formData, templateCategory: e.target.value })}>
                  <MenuItem value="general">عام</MenuItem>
                  <MenuItem value="government">حكومي</MenuItem>
                  <MenuItem value="municipal">بلدي</MenuItem>
                  <MenuItem value="commercial">تجاري</MenuItem>
                  <MenuItem value="professional">مهني</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الكلمات المفتاحية (مفصولة بفواصل)" size="small"
                value={formData.templateTags || ''}
                onChange={(e) => setFormData({ ...formData, templateTags: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#7b1fa2' }} onClick={handleSaveAsTemplate} startIcon={<TemplateIcon />}>
            حفظ القالب
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: تذكرة جديدة ==================== */}
      <Dialog open={!!ticketDialog} onClose={() => setTicketDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e65100', color: 'white' }}>
          إنشاء تذكرة: {ticketDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان التذكرة *" size="small"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوصف *" size="small" multiline rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التذكرة</InputLabel>
                <Select value={formData.ticketType || 'inquiry'} label="نوع التذكرة"
                  onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}>
                  <MenuItem value="inquiry">استفسار</MenuItem>
                  <MenuItem value="complaint">شكوى</MenuItem>
                  <MenuItem value="request">طلب</MenuItem>
                  <MenuItem value="bug">خلل</MenuItem>
                  <MenuItem value="enhancement">تحسين</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={formData.priority || 'medium'} label="الأولوية"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="low">منخفضة</MenuItem>
                  <MenuItem value="medium">متوسطة</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="critical">حرجة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف</InputLabel>
                <Select value={formData.category || 'general'} label="التصنيف"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <MenuItem value="general">عام</MenuItem>
                  <MenuItem value="renewal">تجديد</MenuItem>
                  <MenuItem value="compliance">امتثال</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="documentation">مستندات</MenuItem>
                  <MenuItem value="technical">تقني</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="المكلف بالمعالجة" size="small"
                value={formData.assignedTo || ''}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTicketDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#e65100' }} onClick={handleCreateTicket} startIcon={<TicketIcon />}>
            إنشاء التذكرة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: إعدادات SLA ==================== */}
      <Dialog open={!!slaDialog} onClose={() => setSlaDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#00695c', color: 'white' }}>
          إعدادات SLA: {slaDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary">SLA التجديد</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="أيام الهدف *" size="small" type="number"
                value={formData.renewalTargetDays || ''}
                onChange={(e) => setFormData({ ...formData, renewalTargetDays: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="أيام التحذير" size="small" type="number"
                value={formData.renewalWarningDays || ''}
                onChange={(e) => setFormData({ ...formData, renewalWarningDays: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary">SLA الاستجابة</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="ساعات الهدف *" size="small" type="number"
                value={formData.responseTargetHours || ''}
                onChange={(e) => setFormData({ ...formData, responseTargetHours: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="ساعات التحذير" size="small" type="number"
                value={formData.responseWarningHours || ''}
                onChange={(e) => setFormData({ ...formData, responseWarningHours: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary">SLA التفتيش</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="أيام الهدف" size="small" type="number"
                value={formData.inspectionTargetDays || ''}
                onChange={(e) => setFormData({ ...formData, inspectionTargetDays: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="أيام التحذير" size="small" type="number"
                value={formData.inspectionWarningDays || ''}
                onChange={(e) => setFormData({ ...formData, inspectionWarningDays: Number(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSlaDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#00695c' }} onClick={handleUpdateSLA} startIcon={<SlaIcon />}>
            حفظ إعدادات SLA
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: مقارنة التراخيص ==================== */}
      <Dialog open={comparisonDialog} onClose={() => setComparisonDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#283593', color: 'white' }}>
          🔀 مقارنة التراخيص
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {!comparisonResult ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e8eaf6' }}>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>الحقل</TableCell>
                    {comparisonResult.licenses?.map((lic, idx) => (
                      <TableCell key={idx} sx={{ fontWeight: 'bold', minWidth: 150 }}>{lic.licenseNumber || `ترخيص ${idx + 1}`}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparisonResult.fields?.map((field, idx) => (
                    <TableRow key={idx} hover sx={{ bgcolor: field.isDifferent ? '#fff3e0' : 'transparent' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{field.label || field.name}</TableCell>
                      {field.values?.map((val, vIdx) => (
                        <TableCell key={vIdx}>{val || '-'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setComparisonDialog(false); setComparisonResult(null); setSelectedForCompare([]); }}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: سجل التغييرات ==================== */}
      <Dialog open={!!changeLogDialog} onClose={() => setChangeLogDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#37474f', color: 'white' }}>
          📝 سجل التغييرات
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {changeLogData.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>لا توجد تغييرات مسجلة</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#eceff1' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نوع التغيير</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحقل</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القيمة القديمة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القيمة الجديدة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>بواسطة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changeLogData.map((entry, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{entry.changeDate ? new Date(entry.changeDate).toLocaleDateString('ar-SA') : '-'}</TableCell>
                      <TableCell><Chip label={entry.changeType || '-'} size="small" /></TableCell>
                      <TableCell>{entry.fieldLabel || entry.fieldName || '-'}</TableCell>
                      <TableCell sx={{ color: '#f44336', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.oldValue || '-'}</TableCell>
                      <TableCell sx={{ color: '#4caf50', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.newValue || '-'}</TableCell>
                      <TableCell>{entry.changedBy || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setChangeLogDialog(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: إصدار مستند ==================== */}
      <Dialog open={!!docVersionDialog} onClose={() => setDocVersionDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#4e342e', color: 'white' }}>
          إضافة إصدار مستند: {docVersionDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم المستند *" size="small"
                value={formData.documentName || ''}
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع المستند</InputLabel>
                <Select value={formData.documentType || 'license'} label="نوع المستند"
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}>
                  <MenuItem value="license">ترخيص</MenuItem>
                  <MenuItem value="permit">رخصة</MenuItem>
                  <MenuItem value="certificate">شهادة</MenuItem>
                  <MenuItem value="report">تقرير</MenuItem>
                  <MenuItem value="contract">عقد</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="تاريخ الانتهاء" size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="أيام التذكير قبل الانتهاء" size="small" type="number"
                value={formData.reminderDays || 30}
                onChange={(e) => setFormData({ ...formData, reminderDays: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ملاحظات التغيير" size="small" multiline rows={2}
                value={formData.changeNotes || ''}
                onChange={(e) => setFormData({ ...formData, changeNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDocVersionDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#4e342e' }} onClick={handleAddDocumentVersion} startIcon={<VersionIcon />}>
            إضافة الإصدار
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 4: Dialog: قاعدة أتمتة ==================== */}
      <Dialog open={!!automationDialog} onClose={() => setAutomationDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white' }}>
          إضافة قاعدة أتمتة: {automationDialog?.licenseNumber}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم القاعدة *" size="small"
                value={formData.ruleName || ''}
                onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>حدث التفعيل</InputLabel>
                <Select value={formData.triggerEvent || 'expiry_approaching'} label="حدث التفعيل"
                  onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}>
                  <MenuItem value="expiry_approaching">اقتراب الانتهاء</MenuItem>
                  <MenuItem value="status_change">تغيير الحالة</MenuItem>
                  <MenuItem value="renewal_due">موعد التجديد</MenuItem>
                  <MenuItem value="compliance_drop">انخفاض الامتثال</MenuItem>
                  <MenuItem value="risk_increase">ارتفاع المخاطر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الإجراء</InputLabel>
                <Select value={formData.actionType || 'send_notification'} label="نوع الإجراء"
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}>
                  <MenuItem value="send_notification">إرسال إشعار</MenuItem>
                  <MenuItem value="send_email">إرسال بريد إلكتروني</MenuItem>
                  <MenuItem value="create_task">إنشاء مهمة</MenuItem>
                  <MenuItem value="escalate">تصعيد</MenuItem>
                  <MenuItem value="update_status">تحديث الحالة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="تفاصيل الإجراء" size="small" multiline rows={2}
                value={formData.actionDetails || ''}
                onChange={(e) => setFormData({ ...formData, actionDetails: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAutomationDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleAddAutomationRule} startIcon={<AutomationIcon />}>
            إضافة القاعدة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: إشعار مجدول ==================== */}
      <Dialog open={!!notificationDialog} onClose={() => setNotificationDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565c0', color: 'white' }}>إشعار مجدول: {notificationDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان الإشعار *" size="small" value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الرسالة" size="small" multiline rows={2} value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الإشعار</InputLabel>
                <Select value={formData.notificationType || 'reminder'} label="نوع الإشعار"
                  onChange={(e) => setFormData({ ...formData, notificationType: e.target.value })}>
                  <MenuItem value="reminder">تذكير</MenuItem>
                  <MenuItem value="escalation">تصعيد</MenuItem>
                  <MenuItem value="digest">ملخص</MenuItem>
                  <MenuItem value="scheduled">مجدول</MenuItem>
                  <MenuItem value="recurring">متكرر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التكرار</InputLabel>
                <Select value={formData.recurringPattern || 'none'} label="التكرار"
                  onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}>
                  <MenuItem value="none">مرة واحدة</MenuItem>
                  <MenuItem value="daily">يومي</MenuItem>
                  <MenuItem value="weekly">أسبوعي</MenuItem>
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="تاريخ الجدولة" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={formData.scheduledDate || ''} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNotificationDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddNotification} startIcon={<ScheduleNotifIcon />}>إضافة الإشعار</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: تقييم رضا ==================== */}
      <Dialog open={!!surveyDialog} onClose={() => setSurveyDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#4caf50', color: 'white' }}>تقييم رضا: {surveyDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التقييم</InputLabel>
                <Select value={formData.surveyType || 'general'} label="نوع التقييم"
                  onChange={(e) => setFormData({ ...formData, surveyType: e.target.value })}>
                  <MenuItem value="renewal">تجديد</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="general">عام</MenuItem>
                  <MenuItem value="support">دعم</MenuItem>
                  <MenuItem value="process">عملية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم المقيّم" size="small" value={formData.respondentName || ''}
                onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="الدور" size="small" value={formData.respondentRole || ''}
                onChange={(e) => setFormData({ ...formData, respondentRole: e.target.value })} />
            </Grid>
            {['overallRating', 'serviceQuality', 'responseTime', 'communication', 'processClarity'].map(field => (
              <Grid item xs={6} key={field}>
                <FormControl fullWidth size="small">
                  <InputLabel>{{overallRating: 'التقييم العام', serviceQuality: 'جودة الخدمة', responseTime: 'سرعة الاستجابة', communication: 'التواصل', processClarity: 'وضوح الإجراءات'}[field]}</InputLabel>
                  <Select value={formData[field] || ''} label={field}
                    onChange={(e) => setFormData({ ...formData, [field]: Number(e.target.value) })}>
                    {[1,2,3,4,5].map(n => <MenuItem key={n} value={n}>{'⭐'.repeat(n)} ({n})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField fullWidth label="تعليقات" size="small" multiline rows={2} value={formData.comments || ''}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="مقترحات" size="small" multiline rows={2} value={formData.suggestions || ''}
                onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSurveyDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleAddSurvey} startIcon={<SurveyIcon />}>إرسال التقييم</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: توقيع رقمي ==================== */}
      <Dialog open={!!signatureDialog} onClose={() => setSignatureDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#9c27b0', color: 'white' }}>توقيع رقمي: {signatureDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم الموقّع *" size="small" value={formData.signerName || ''}
                onChange={(e) => setFormData({ ...formData, signerName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="المسمى الوظيفي" size="small" value={formData.signerTitle || ''}
                onChange={(e) => setFormData({ ...formData, signerTitle: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="البريد الإلكتروني" size="small" value={formData.signerEmail || ''}
                onChange={(e) => setFormData({ ...formData, signerEmail: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التوقيع</InputLabel>
                <Select value={formData.signatureType || 'approval'} label="نوع التوقيع"
                  onChange={(e) => setFormData({ ...formData, signatureType: e.target.value })}>
                  <MenuItem value="approval">موافقة</MenuItem>
                  <MenuItem value="review">مراجعة</MenuItem>
                  <MenuItem value="acknowledgment">إقرار</MenuItem>
                  <MenuItem value="authorization">تفويض</MenuItem>
                  <MenuItem value="witness">شاهد</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ملاحظات" size="small" multiline rows={2} value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSignatureDialog(null)}>إلغاء</Button>
          <Button variant="contained" sx={{ bgcolor: '#9c27b0' }} onClick={handleAddSignature} startIcon={<SignatureIcon />}>إضافة التوقيع</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: اجتماع ==================== */}
      <Dialog open={!!meetingDialog} onClose={() => setMeetingDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0288d1', color: 'white' }}>اجتماع جديد: {meetingDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان الاجتماع *" size="small" value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الاجتماع</InputLabel>
                <Select value={formData.meetingType || 'review'} label="نوع الاجتماع"
                  onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}>
                  <MenuItem value="review">مراجعة</MenuItem>
                  <MenuItem value="planning">تخطيط</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="compliance">امتثال</MenuItem>
                  <MenuItem value="emergency">طوارئ</MenuItem>
                  <MenuItem value="follow_up">متابعة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="التاريخ" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="المدة (دقائق)" size="small" type="number"
                value={formData.duration || ''} onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="الموقع" size="small" value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوصف" size="small" multiline rows={2} value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMeetingDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="info" onClick={handleAddMeeting} startIcon={<MeetingIcon />}>إضافة الاجتماع</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: ربط خارجي ==================== */}
      <Dialog open={!!integrationDialog} onClose={() => setIntegrationDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ed6c02', color: 'white' }}>ربط خارجي: {integrationDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم النظام *" size="small" value={formData.systemName || ''}
                onChange={(e) => setFormData({ ...formData, systemName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع النظام</InputLabel>
                <Select value={formData.systemType || 'custom'} label="نوع النظام"
                  onChange={(e) => setFormData({ ...formData, systemType: e.target.value })}>
                  <MenuItem value="government_api">واجهة حكومية</MenuItem>
                  <MenuItem value="payment_gateway">بوابة دفع</MenuItem>
                  <MenuItem value="notification_service">خدمة إشعارات</MenuItem>
                  <MenuItem value="erp">نظام ERP</MenuItem>
                  <MenuItem value="crm">نظام CRM</MenuItem>
                  <MenuItem value="custom">مخصص</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="المعرّف الخارجي" size="small" value={formData.externalId || ''}
                onChange={(e) => setFormData({ ...formData, externalId: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان API" size="small" value={formData.apiEndpoint || ''}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Webhook URL" size="small" value={formData.webhookUrl || ''}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIntegrationDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleAddIntegration} startIcon={<IntegrationIcon />}>إضافة الربط</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: تدريب ==================== */}
      <Dialog open={!!trainingDialog} onClose={() => setTrainingDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>سجل تدريب: {trainingDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="عنوان التدريب *" size="small" value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التدريب</InputLabel>
                <Select value={formData.trainingType || 'mandatory'} label="نوع التدريب"
                  onChange={(e) => setFormData({ ...formData, trainingType: e.target.value })}>
                  <MenuItem value="mandatory">إلزامي</MenuItem>
                  <MenuItem value="optional">اختياري</MenuItem>
                  <MenuItem value="certification">شهادة</MenuItem>
                  <MenuItem value="workshop">ورشة عمل</MenuItem>
                  <MenuItem value="online">عن بعد</MenuItem>
                  <MenuItem value="orientation">تعريفي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="مقدم التدريب" size="small" value={formData.provider || ''}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم الموظف" size="small" value={formData.employeeName || ''}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="المدة (ساعات)" size="small" type="number"
                value={formData.duration || ''} onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="تاريخ البدء" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="تاريخ الانتهاء" size="small" type="date" InputLabelProps={{ shrink: true }}
                value={formData.endDate || ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTrainingDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleAddTraining} startIcon={<TrainingIcon />}>إضافة التدريب</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: مورد ==================== */}
      <Dialog open={!!vendorDialog} onClose={() => setVendorDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>مورد جديد: {vendorDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم المورد *" size="small" value={formData.vendorName || ''}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع المورد</InputLabel>
                <Select value={formData.vendorType || 'other'} label="نوع المورد"
                  onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}>
                  <MenuItem value="consultancy">استشارات</MenuItem>
                  <MenuItem value="legal">قانوني</MenuItem>
                  <MenuItem value="inspection">تفتيش</MenuItem>
                  <MenuItem value="maintenance">صيانة</MenuItem>
                  <MenuItem value="documentation">توثيق</MenuItem>
                  <MenuItem value="training">تدريب</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="جهة الاتصال" size="small" value={formData.contactPerson || ''}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="الهاتف" size="small" value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="البريد الإلكتروني" size="small" value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="رقم العقد" size="small" value={formData.contractNumber || ''}
                onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="قيمة العقد" size="small" type="number"
                value={formData.contractValue || ''} onChange={(e) => setFormData({ ...formData, contractValue: Number(e.target.value) })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setVendorDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleAddVendor} startIcon={<VendorIcon />}>إضافة المورد</Button>
        </DialogActions>
      </Dialog>

      {/* ==================== Round 5: Dialog: شكوى/مقترح ==================== */}
      <Dialog open={!!complaintDialog} onClose={() => setComplaintDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#7b1fa2', color: 'white' }}>شكوى/مقترح: {complaintDialog?.licenseNumber}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="الموضوع *" size="small" value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select value={formData.complaintType || 'other'} label="النوع"
                  onChange={(e) => setFormData({ ...formData, complaintType: e.target.value })}>
                  <MenuItem value="service_quality">جودة الخدمة</MenuItem>
                  <MenuItem value="delay">تأخير</MenuItem>
                  <MenuItem value="communication">تواصل</MenuItem>
                  <MenuItem value="process">إجراءات</MenuItem>
                  <MenuItem value="staff">موظفين</MenuItem>
                  <MenuItem value="other">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={formData.priority || 'medium'} label="الأولوية"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="low">منخفضة</MenuItem>
                  <MenuItem value="medium">متوسطة</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="critical">حرجة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوصف" size="small" multiline rows={3} value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="مقدم الشكوى" size="small" value={formData.submittedBy || ''}
                onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setComplaintDialog(null)}>إلغاء</Button>
          <Button variant="outlined" onClick={() => { setFormData({ ...formData, isSuggestion: true }); handleAddComplaint(); }} startIcon={<SurveyIcon />}>مقترح</Button>
          <Button variant="contained" sx={{ bgcolor: '#7b1fa2' }} onClick={handleAddComplaint} startIcon={<ComplaintIcon />}>شكوى</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RehabCenterLicenses;
