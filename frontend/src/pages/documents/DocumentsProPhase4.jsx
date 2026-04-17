import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  Alert,
  Tooltip,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Link as LinkIcon,
  Label as TagIcon,
  Security as SecurityIcon,
  PictureAsPdf as PdfIcon,
  Group as CollabIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  AccountTree as GraphIcon,
  Cloud as CloudIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  Merge as MergeIcon,
  CallSplit as SplitIcon,
  Description as DocIcon,
  People as PeopleIcon,
  Gavel as GavelIcon,
  Verified as VerifiedIcon,
  // Stamp icon is not exported by @mui/icons-material; use ApprovalRounded as a visual stand-in.
  ApprovalRounded as StampIcon,
  MenuBook as CoverIcon,
  FormatListNumbered as NumberIcon,
  Compress as CompressIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Campaign as BroadcastIcon,
  Circle as CircleIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import {
  linkingApi,
  tagsApi,
  tagCategoriesApi,
  aclApi,
  pdfApi,
  collabApi,
  dashboardApi,
} from '../../services/documentProPhase4Service';
import logger from '../../utils/logger';

/* ═══════════════════════════════════════════
 *  Helpers
 * ═══════════════════════════════════════════ */
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

function StatCard({ icon, title, value, color = 'primary.main', sub }) {
  return (
    <Card sx={{ height: '100%', borderTop: '3px solid', borderColor: color }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="start">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value ?? '—'}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 44, height: 44 }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
 *  Main Component
 * ═══════════════════════════════════════════ */
export default function DocumentsProPhase4() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [dashboard, setDashboard] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagCloud, setTagCloud] = useState([]);
  const [categories, setCategories] = useState([]);
  const [aclTemplates, setAclTemplates] = useState([]);
  const [aclStats, setAclStats] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [pdfJobs, setPdfJobs] = useState([]);
  const [pdfStats, setPdfStats] = useState(null);
  const [collabStats, setCollabStats] = useState(null);

  // Dialogs
  const [tagDialog, setTagDialog] = useState(false);
  const [pdfDialog, setPdfDialog] = useState(false);

  // ── Loaders ───────────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getV4Dashboard();
      setDashboard(res.data?.dashboard ?? res.data);
    } catch (err) {
      logger.error('Dashboard error', err);
      setError('فشل تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const [tagsRes, cloudRes, catRes] = await Promise.all([
        tagsApi.getAll({ limit: 100 }),
        tagsApi.getCloud({ limit: 40 }),
        tagCategoriesApi.getAll(),
      ]);
      setTags(tagsRes.data?.tags ?? []);
      setTagCloud(cloudRes.data?.cloud ?? []);
      setCategories(catRes.data?.categories ?? []);
    } catch (err) {
      logger.error('Tags error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadACL = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, statsRes, reqRes] = await Promise.all([
        aclApi.getTemplates(),
        aclApi.getStats(),
        aclApi.getRequests({ status: 'pending' }),
      ]);
      setAclTemplates(tplRes.data?.templates ?? []);
      setAclStats(statsRes.data?.stats ?? null);
      setAccessRequests(reqRes.data?.requests ?? []);
    } catch (err) {
      logger.error('ACL error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPDF = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        pdfApi.getJobs({ limit: 20 }),
        pdfApi.getStats(),
      ]);
      setPdfJobs(jobsRes.data?.jobs ?? []);
      setPdfStats(statsRes.data?.stats ?? null);
    } catch (err) {
      logger.error('PDF error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCollab = useCallback(async () => {
    setLoading(true);
    try {
      const res = await collabApi.getStats();
      setCollabStats(res.data?.stats ?? null);
    } catch (err) {
      logger.error('Collab error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab === 1) loadTags();
    if (tab === 2) loadACL();
    if (tab === 3) loadPDF();
    if (tab === 4) loadCollab();
  }, [tab, loadTags, loadACL, loadPDF, loadCollab]);

  const refreshTab = () => {
    if (tab === 0) loadDashboard();
    else if (tab === 1) loadTags();
    else if (tab === 2) loadACL();
    else if (tab === 3) loadPDF();
    else if (tab === 4) loadCollab();
  };

  /* ═══════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════ */
  return (
    <Box dir="rtl" sx={{ p: 3, fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            🛡️ إدارة المستندات المتقدمة — المرحلة الرابعة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الربط • الوسوم • الصلاحيات • PDF • التعاون الفوري
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshTab}>
          تحديث
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<DashboardIcon />} label="نظرة عامة" />
          <Tab
            icon={
              <Badge badgeContent={tags.length} color="secondary">
                <TagIcon />
              </Badge>
            }
            label="الوسوم"
          />
          <Tab
            icon={
              <Badge badgeContent={accessRequests.length} color="error">
                <SecurityIcon />
              </Badge>
            }
            label="الصلاحيات"
          />
          <Tab icon={<PdfIcon />} label="أدوات PDF" />
          <Tab icon={<CollabIcon />} label="التعاون الفوري" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: Overview ── */}
      <TabPanel value={tab} index={0}>
        {dashboard && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                icon={<LinkIcon />}
                title="الروابط"
                value={dashboard.links?.totalLinks ?? 0}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                icon={<TagIcon />}
                title="الوسوم"
                value={dashboard.tags?.totalTags ?? 0}
                color="secondary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                icon={<SecurityIcon />}
                title="صلاحيات نشطة"
                value={dashboard.acl?.activeACLs ?? 0}
                color="warning.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                icon={<PdfIcon />}
                title="مهام PDF"
                value={dashboard.pdf?.totalJobs ?? 0}
                color="error.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                icon={<CollabIcon />}
                title="جلسات تعاون"
                value={dashboard.collaboration?.activeSessions ?? 0}
                color="info.main"
              />
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ⚡ إجراءات سريعة
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="outlined"
                      startIcon={<TagIcon />}
                      onClick={() => {
                        setTab(1);
                      }}
                    >
                      إدارة الوسوم
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ShieldIcon />}
                      onClick={async () => {
                        try {
                          await aclApi.initialize();
                          refreshTab();
                        } catch (e) {
                          logger.error(e);
                        }
                      }}
                    >
                      تهيئة قوالب الصلاحيات
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<TagIcon />}
                      onClick={async () => {
                        try {
                          await tagsApi.initialize();
                          refreshTab();
                        } catch (e) {
                          logger.error(e);
                        }
                      }}
                    >
                      تهيئة الوسوم الافتراضية
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CollabIcon />}
                      onClick={async () => {
                        try {
                          await collabApi.cleanup();
                          refreshTab();
                        } catch (e) {
                          logger.error(e);
                        }
                      }}
                    >
                      تنظيف الجلسات الخاملة
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        {!dashboard && !loading && <Alert severity="info">اضغط تحديث لتحميل البيانات</Alert>}
      </TabPanel>

      {/* ── Tab 1: Tags ── */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          {/* Tag Cloud */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ☁️ سحابة الوسوم
                </Typography>
                {tagCloud.length === 0 ? (
                  <Alert
                    severity="info"
                    action={
                      <Button
                        size="small"
                        onClick={async () => {
                          await tagsApi.initialize();
                          loadTags();
                        }}
                      >
                        تهيئة
                      </Button>
                    }
                  >
                    لا توجد وسوم. اضغط "تهيئة" لإضافة وسوم افتراضية.
                  </Alert>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      justifyContent: 'center',
                      py: 2,
                    }}
                  >
                    {tagCloud.map(tag => (
                      <Chip
                        key={tag._id}
                        label={`${tag.nameAr || tag.name} (${tag.usageCount})`}
                        sx={{
                          fontSize: tag.size || 14,
                          bgcolor: tag.color + '20',
                          color: tag.color,
                          borderColor: tag.color,
                          fontWeight: tag.weight >= 4 ? 700 : 400,
                        }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Categories */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📁 فئات الوسوم
                </Typography>
                <List dense>
                  {categories.map(cat => (
                    <ListItem key={cat._id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: cat.color, width: 36, height: 36, fontSize: 18 }}>
                          {cat.icon || '🏷️'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={cat.nameAr || cat.name}
                        secondary={`${cat.tagCount ?? 0} وسم`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Tags list */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">🏷️ جميع الوسوم ({tags.length})</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setTagDialog(true)}>
                    وسم جديد
                  </Button>
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tags.map(tag => (
                    <Chip
                      key={tag._id}
                      label={tag.nameAr || tag.name}
                      size="small"
                      sx={{ bgcolor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                      variant="outlined"
                      onDelete={() => {}}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <CreateTagDialog
          open={tagDialog}
          onClose={() => setTagDialog(false)}
          onCreated={() => {
            setTagDialog(false);
            loadTags();
          }}
          categories={categories}
        />
      </TabPanel>

      {/* ── Tab 2: ACL ── */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          {aclStats && (
            <>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<SecurityIcon />}
                  title="صلاحيات نشطة"
                  value={aclStats.activeACLs ?? 0}
                  color="primary.main"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<GavelIcon />}
                  title="طلبات معلقة"
                  value={aclStats.pendingRequests ?? 0}
                  color="warning.main"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<ShieldIcon />}
                  title="إجمالي السجلات"
                  value={aclStats.totalACLs ?? 0}
                  color="info.main"
                />
              </Grid>
            </>
          )}

          {/* Templates */}
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">📋 قوالب الصلاحيات</Typography>
                  <Button
                    size="small"
                    onClick={async () => {
                      await aclApi.initialize();
                      loadACL();
                    }}
                  >
                    تهيئة
                  </Button>
                </Stack>
                {aclTemplates.length === 0 ? (
                  <Typography color="text.secondary">اضغط تهيئة لإنشاء القوالب</Typography>
                ) : (
                  <List dense>
                    {aclTemplates.map(tpl => (
                      <ListItem key={tpl._id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                            <VerifiedIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={tpl.nameAr || tpl.name}
                          secondary={(tpl.permissionLabels || tpl.permissions || []).join(' • ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Pending requests */}
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📨 طلبات الوصول المعلقة
                </Typography>
                {accessRequests.length === 0 ? (
                  <Typography color="text.secondary">لا توجد طلبات معلقة</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right">الطالب</TableCell>
                          <TableCell align="right">المستند</TableCell>
                          <TableCell align="right">الصلاحيات</TableCell>
                          <TableCell align="right">إجراء</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {accessRequests.map(req => (
                          <TableRow key={req._id}>
                            <TableCell align="right">
                              {req.requesterName || req.requester?.name || '—'}
                            </TableCell>
                            <TableCell align="right">{req.document?.title || '—'}</TableCell>
                            <TableCell align="right">
                              {(req.requestedPermissions || []).map(p => (
                                <Chip key={p} label={p} size="small" sx={{ mr: 0.5 }} />
                              ))}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5}>
                                <Button
                                  size="small"
                                  color="success"
                                  variant="contained"
                                  onClick={async () => {
                                    await aclApi.reviewRequest(req._id, 'approved', '');
                                    loadACL();
                                  }}
                                >
                                  قبول
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  onClick={async () => {
                                    await aclApi.reviewRequest(req._id, 'rejected', '');
                                    loadACL();
                                  }}
                                >
                                  رفض
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 3: PDF Tools ── */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          {pdfStats && (
            <>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<PdfIcon />}
                  title="إجمالي المهام"
                  value={pdfStats.totalJobs ?? 0}
                  color="error.main"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<MergeIcon />}
                  title="عمليات الدمج"
                  value={pdfStats.byType?.merge ?? 0}
                  color="primary.main"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<StampIcon />}
                  title="الختم والحماية"
                  value={(pdfStats.byType?.stamp ?? 0) + (pdfStats.byType?.protect ?? 0)}
                  color="warning.main"
                />
              </Grid>
            </>
          )}

          {/* PDF Actions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🛠️ أدوات PDF
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'تحويل إلى PDF', icon: <PdfIcon />, color: '#ef4444' },
                    { label: 'دمج ملفات', icon: <MergeIcon />, color: '#3b82f6' },
                    { label: 'تقسيم ملف', icon: <SplitIcon />, color: '#22c55e' },
                    { label: 'حماية وتشفير', icon: <LockIcon />, color: '#f59e0b' },
                    { label: 'إضافة غلاف', icon: <CoverIcon />, color: '#8b5cf6' },
                    { label: 'ترقيم الصفحات', icon: <NumberIcon />, color: '#14b8a6' },
                    { label: 'ختم المستند', icon: <StampIcon />, color: '#ec4899' },
                    { label: 'تحويل بالجملة', icon: <CompressIcon />, color: '#64748b' },
                  ].map(tool => (
                    <Grid item xs={6} sm={3} key={tool.label}>
                      <Card
                        variant="outlined"
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          cursor: 'pointer',
                          '&:hover': { borderColor: tool.color, bgcolor: tool.color + '08' },
                          transition: 'all 0.2s',
                        }}
                      >
                        <Avatar
                          sx={{ bgcolor: tool.color, mx: 'auto', mb: 1, width: 48, height: 48 }}
                        >
                          {tool.icon}
                        </Avatar>
                        <Typography variant="subtitle2">{tool.label}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent jobs */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📝 المهام الأخيرة
                </Typography>
                {pdfJobs.length === 0 ? (
                  <Typography color="text.secondary">لا توجد مهام بعد</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="right">النوع</TableCell>
                          <TableCell align="right">الحالة</TableCell>
                          <TableCell align="right">الوقت</TableCell>
                          <TableCell align="right">التاريخ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pdfJobs.slice(0, 10).map(job => (
                          <TableRow key={job._id}>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={
                                  {
                                    convert: 'تحويل',
                                    merge: 'دمج',
                                    split: 'تقسيم',
                                    protect: 'حماية',
                                    stamp: 'ختم',
                                    cover: 'غلاف',
                                    number: 'ترقيم',
                                    watermark: 'علامة مائية',
                                  }[job.type] || job.type
                                }
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={
                                  job.status === 'completed'
                                    ? 'مكتمل'
                                    : job.status === 'failed'
                                      ? 'فشل'
                                      : 'جاري'
                                }
                                color={
                                  job.status === 'completed'
                                    ? 'success'
                                    : job.status === 'failed'
                                      ? 'error'
                                      : 'warning'
                                }
                              />
                            </TableCell>
                            <TableCell align="right">
                              {job.result?.processingTime ? `${job.result.processingTime}ms` : '—'}
                            </TableCell>
                            <TableCell align="right">
                              {new Date(job.createdAt).toLocaleString('ar-SA')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 4: Collaboration ── */}
      <TabPanel value={tab} index={4}>
        <Grid container spacing={3}>
          {collabStats && (
            <>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<CollabIcon />}
                  title="جلسات نشطة"
                  value={collabStats.activeSessions ?? 0}
                  color="success.main"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<PeopleIcon />}
                  title="مشاركون الآن"
                  value={collabStats.activeParticipants ?? 0}
                  color="primary.main"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard
                  icon={<BroadcastIcon />}
                  title="إجمالي الجلسات"
                  value={collabStats.totalSessions ?? 0}
                  color="info.main"
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🤝 التعاون الفوري على المستندات
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  يدعم النظام التعاون المتزامن مع: تتبع المؤشرات، قفل الأقسام، البث المباشر، كشف
                  التعارضات
                </Alert>
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      الميزات المتاحة:
                    </Typography>
                    <Grid container spacing={1}>
                      {[
                        { icon: <PeopleIcon />, text: 'حضور فوري — رؤية المتعاونين ونشاطهم' },
                        { icon: <EditIcon />, text: 'تتبع المؤشرات — ألوان مميزة لكل مشارك' },
                        { icon: <LockIcon />, text: 'قفل الأقسام — منع التعديل المتزامن' },
                        { icon: <BroadcastIcon />, text: 'بث الأحداث — إشعارات فورية' },
                        {
                          icon: <CircleIcon sx={{ color: '#22c55e' }} />,
                          text: 'نبضة القلب — كشف الاتصال المفقود',
                        },
                      ].map((item, i) => (
                        <Grid item xs={12} sm={6} key={i}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {item.icon}
                            <Typography variant="body2">{item.text}</Typography>
                          </Stack>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={async () => {
                      try {
                        const res = await collabApi.cleanup();
                        logger.info('Cleanup result', res.data);
                        loadCollab();
                      } catch (e) {
                        logger.error(e);
                      }
                    }}
                  >
                    تنظيف الجلسات الخاملة
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

/* ═══════════════════════════════════════════
 *  Create Tag Dialog
 * ═══════════════════════════════════════════ */
function CreateTagDialog({ open, onClose, onCreated, categories = [] }) {
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!nameAr.trim()) return;
    setSaving(true);
    try {
      await tagsApi.create({
        name: name || nameAr,
        nameAr,
        color,
        category: categoryId || undefined,
      });
      setName('');
      setNameAr('');
      setColor('#3b82f6');
      setCategoryId('');
      onCreated();
    } catch (e) {
      logger.error('Create tag error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>🏷️ إنشاء وسم جديد</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="الاسم بالعربية"
            value={nameAr}
            onChange={e => setNameAr(e.target.value)}
          />
          <TextField
            fullWidth
            label="الاسم بالإنجليزية (اختياري)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <TextField
            fullWidth
            label="اللون"
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            InputProps={{ sx: { height: 50 } }}
          />
          {categories.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={categoryId}
                label="الفئة"
                onChange={e => setCategoryId(e.target.value)}
              >
                <MenuItem value="">بدون فئة</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.nameAr || c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleCreate} disabled={saving || !nameAr.trim()}>
          {saving ? <CircularProgress size={20} /> : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
