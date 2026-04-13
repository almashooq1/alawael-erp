import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  FactCheck as AuditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Assignment as PlanIcon,
  ReportProblem as NCRIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { auditService } from 'services/operationsService';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const planStatusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  approved: { label: 'معتمد', color: 'info' },
  in_progress: { label: 'قيد التنفيذ', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
  cancelled: { label: 'ملغي', color: 'error' },
};

const ncrSeverity = {
  minor: { label: 'بسيط', color: 'info' },
  major: { label: 'رئيسي', color: 'warning' },
  critical: { label: 'حرج', color: 'error' },
};

const ncrStatus = {
  open: { label: 'مفتوح', color: 'error' },
  under_review: { label: 'قيد المراجعة', color: 'warning' },
  corrective_action: { label: 'إجراء تصحيحي', color: 'info' },
  closed: { label: 'مغلق', color: 'success' },
};

const auditTypes = ['مالي', 'إداري', 'تشغيلي', 'امتثال', 'جودة', 'أمن', 'بيئي', 'تقني'];

const InternalAuditPage = () => {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [ncrs, setNCRs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planDialog, setPlanDialog] = useState(false);
  const [viewNCR, setViewNCR] = useState(null);
  const [planForm, setPlanForm] = useState({
    title: '',
    year: new Date().getFullYear(),
    department: '',
    type: '',
    scope: '',
    frequency: 'quarterly',
  });

  const loadData = useCallback(async () => {
    try {
      const [p, n, s] = await Promise.all([
        auditService.getPlans(),
        auditService.getNCRs(),
        auditService.getStats(),
      ]);
      setPlans(Array.isArray(p?.data) ? p.data : auditService.getMockPlans());
      setNCRs(Array.isArray(n?.data) ? n.data : auditService.getMockNCRs());
      setStats(s || auditService.getMockStats());
    } catch {
      setPlans(auditService.getMockPlans());
      setNCRs(auditService.getMockNCRs());
      setStats(auditService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePlan = async () => {
    try {
      await auditService.createPlan(planForm);
      showSnackbar('تم إنشاء خطة التدقيق بنجاح', 'success');
      setPlanDialog(false);
      setPlanForm({
        title: '',
        year: new Date().getFullYear(),
        department: '',
        type: '',
        scope: '',
        frequency: 'quarterly',
      });
      loadData();
    } catch {
      showSnackbar('فشل في إنشاء الخطة', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <AuditIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  التدقيق الداخلي
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  خطط التدقيق وعدم المطابقة والإجراءات التصحيحية
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setPlanDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              خطة تدقيق جديدة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'خطط التدقيق', value: stats.totalPlans, color: brandColors.primary },
            { label: 'قيد التنفيذ', value: stats.inProgress, color: statusColors.warning },
            { label: 'مكتملة', value: stats.completed, color: statusColors.success },
            { label: 'حالات عدم مطابقة', value: stats.totalNCRs, color: statusColors.error },
            { label: 'إجراءات تصحيحية', value: stats.openCAPAs, color: statusColors.info },
            { label: 'متوسط التقييم', value: `${stats.avgScore}%`, color: brandColors.primary },
          ].map((s, i) => (
            <Grid item xs={2} key={i}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  border: `1px solid ${surfaceColors.border}`,
                  textAlign: 'center',
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab
                icon={<PlanIcon />}
                iconPosition="start"
                label={`خطط التدقيق (${plans.length})`}
              />
              <Tab
                icon={<NCRIcon />}
                iconPosition="start"
                label={`عدم المطابقة (${ncrs.length})`}
              />
            </Tabs>
            <TextField
              size="small"
              placeholder="بحث..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
          </Box>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* Audit Plans Table */}
      {tab === 0 && (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>السنة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النطاق</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التكرار</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    التقييم
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    النتائج
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans
                  .filter(
                    p => !search || p.title?.includes(search) || p.department?.includes(search)
                  )
                  .map(plan => (
                    <TableRow key={plan._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {plan.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={plan.year} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={plan.type} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>{plan.department}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {plan.scope}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {plan.frequency === 'quarterly'
                          ? 'ربع سنوي'
                          : plan.frequency === 'semi_annual'
                            ? 'نصف سنوي'
                            : plan.frequency === 'annual'
                              ? 'سنوي'
                              : plan.frequency}
                      </TableCell>
                      <TableCell align="center">
                        {plan.score !== null && (
                          <Chip
                            label={`${plan.score}%`}
                            size="small"
                            sx={{
                              bgcolor:
                                plan.score >= 80
                                  ? `${statusColors.success}15`
                                  : plan.score >= 60
                                    ? `${statusColors.warning}15`
                                    : `${statusColors.error}15`,
                              color:
                                plan.score >= 80
                                  ? statusColors.success
                                  : plan.score >= 60
                                    ? statusColors.warning
                                    : statusColors.error,
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">{plan.findings || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={planStatusConfig[plan.status]?.label || plan.status}
                          color={planStatusConfig[plan.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* NCR Table */}
      {tab === 1 && (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم عدم المطابقة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الخطورة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المدقق</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ncrs
                  .filter(
                    n => !search || n.title?.includes(search) || n.ncrNumber?.includes(search)
                  )
                  .map(ncr => (
                    <TableRow key={ncr._id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {ncr.ncrNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {ncr.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{ncr.department}</TableCell>
                      <TableCell>
                        <Chip
                          label={ncrSeverity[ncr.severity]?.label || ncr.severity}
                          color={ncrSeverity[ncr.severity]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{ncr.date}</TableCell>
                      <TableCell>{ncr.auditor}</TableCell>
                      <TableCell>
                        <Chip
                          label={ncrStatus[ncr.status]?.label || ncr.status}
                          color={ncrStatus[ncr.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => setViewNCR(ncr)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                {ncrs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ color: neutralColors.textDisabled }}>
                        لا توجد حالات عدم مطابقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* NCR View Dialog */}
      <Dialog
        open={!!viewNCR}
        onClose={() => setViewNCR(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          تفاصيل عدم المطابقة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {viewNCR && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  رقم NCR
                </Typography>
                <Typography fontWeight={700}>{viewNCR.ncrNumber}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الخطورة
                </Typography>
                <Chip
                  label={ncrSeverity[viewNCR.severity]?.label}
                  color={ncrSeverity[viewNCR.severity]?.color}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  العنوان
                </Typography>
                <Typography fontWeight={700}>{viewNCR.title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  الوصف
                </Typography>
                <Typography>{viewNCR.description}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  القسم
                </Typography>
                <Typography fontWeight={600}>{viewNCR.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المدقق
                </Typography>
                <Typography fontWeight={600}>{viewNCR.auditor}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  التاريخ
                </Typography>
                <Typography>{viewNCR.date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الحالة
                </Typography>
                <Chip
                  label={ncrStatus[viewNCR.status]?.label}
                  color={ncrStatus[viewNCR.status]?.color}
                  size="small"
                />
              </Grid>
              {viewNCR.correctiveAction && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    الإجراء التصحيحي
                  </Typography>
                  <Typography>{viewNCR.correctiveAction}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewNCR(null)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog
        open={planDialog}
        onClose={() => setPlanDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          خطة تدقيق جديدة
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان الخطة *"
                value={planForm.title}
                onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="السنة"
                type="number"
                value={planForm.year}
                onChange={e => setPlanForm(f => ({ ...f, year: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={planForm.type}
                  label="النوع"
                  onChange={e => setPlanForm(f => ({ ...f, type: e.target.value }))}
                >
                  {auditTypes.map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={planForm.department}
                onChange={e => setPlanForm(f => ({ ...f, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>التكرار</InputLabel>
                <Select
                  value={planForm.frequency}
                  label="التكرار"
                  onChange={e => setPlanForm(f => ({ ...f, frequency: e.target.value }))}
                >
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                  <MenuItem value="semi_annual">نصف سنوي</MenuItem>
                  <MenuItem value="annual">سنوي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="النطاق"
                value={planForm.scope}
                onChange={e => setPlanForm(f => ({ ...f, scope: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPlanDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePlan}
            disabled={!planForm.title}
            sx={{ borderRadius: 2 }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InternalAuditPage;
