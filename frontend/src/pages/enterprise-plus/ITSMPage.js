/**
 * IT Service Management (ITSM) — إدارة خدمات تقنية المعلومات
 * IT Assets, Incidents, Change Requests, Service Catalog, SLA Policies
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Tooltip,
  Badge,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Computer as AssetIcon,
  BugReport as IncidentIcon,
  ChangeCircle as ChangeIcon,
  MenuBook as CatalogIcon,
  Speed as SLAIcon,
  Close as CloseIcon,
  CheckCircle as ResolvedIcon,
  Error as CriticalIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import * as svc from '../../services/enterpriseProPlus.service';

const ASSET_TYPES = {
  laptop: 'حاسب محمول',
  desktop: 'حاسب مكتبي',
  server: 'خادم',
  printer: 'طابعة',
  network: 'شبكات',
  phone: 'هاتف',
  tablet: 'جهاز لوحي',
  software: 'برمجيات',
  license: 'رخصة',
};
const ASSET_STATUSES = {
  active: 'نشط',
  in_use: 'قيد الاستخدام',
  in_stock: 'مخزون',
  maintenance: 'صيانة',
  retired: 'متقاعد',
  disposed: 'مستبعد',
};
const PRIORITY_LABELS = { P1: 'حرج', P2: 'عالي', P3: 'متوسط', P4: 'منخفض' };
const PRIORITY_COLORS = { P1: '#d32f2f', P2: '#ed6c02', P3: '#0288d1', P4: '#2e7d32' };
const INCIDENT_STATUSES = {
  open: 'مفتوح',
  assigned: 'معين',
  in_progress: 'قيد المعالجة',
  pending: 'معلق',
  resolved: 'محلول',
  closed: 'مغلق',
};
const CHANGE_TYPES = { standard: 'قياسي', normal: 'عادي', emergency: 'طارئ' };
const CHANGE_STATUSES = {
  draft: 'مسودة',
  submitted: 'مقدم',
  approved: 'معتمد',
  scheduled: 'مجدول',
  implementing: 'قيد التنفيذ',
  completed: 'مكتمل',
  rolled_back: 'تم التراجع',
  rejected: 'مرفوض',
};

export default function ITSMPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [assets, setAssets] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [changes, setChanges] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [slaList, setSlaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assetDialog, setAssetDialog] = useState(false);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [changeDialog, setChangeDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, i, c, cat, sla] = await Promise.all([
        svc.getITAssets().then(r => r.data?.data || []),
        svc.getITIncidents().then(r => r.data?.data || []),
        svc.getITChangeRequests().then(r => r.data?.data || []),
        svc.getServiceCatalog().then(r => r.data?.data || []),
        svc.getSLAPolicies().then(r => r.data?.data || []),
      ]);
      setAssets(a);
      setIncidents(i);
      setChanges(c);
      setCatalog(cat);
      setSlaList(sla);
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveAsset = async formData => {
    try {
      if (editItem?._id) await svc.updateITAsset(editItem._id, formData);
      else await svc.createITAsset(formData);
      showSnackbar('تم الحفظ', 'success');
      setAssetDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveIncident = async formData => {
    try {
      if (editItem?._id) await svc.resolveITIncident(editItem._id, formData);
      else await svc.createITIncident(formData);
      showSnackbar('تم الحفظ', 'success');
      setIncidentDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveChange = async formData => {
    try {
      if (editItem?._id) await svc.approveITChange(editItem._id, formData);
      else await svc.createITChangeRequest(formData);
      showSnackbar('تم الحفظ', 'success');
      setChangeDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const openIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status));
  const p1Count = incidents.filter(
    i => i.priority === 'P1' && !['resolved', 'closed'].includes(i.status)
  ).length;

  const statCards = [
    { label: 'إجمالي الأصول', value: assets.length, color: '#1976d2', icon: <AssetIcon /> },
    {
      label: 'حوادث مفتوحة',
      value: openIncidents.length,
      color: p1Count > 0 ? '#d32f2f' : '#ed6c02',
      icon: <IncidentIcon />,
    },
    {
      label: 'طلبات تغيير',
      value: changes.filter(c => !['completed', 'rejected', 'rolled_back'].includes(c.status))
        .length,
      color: '#9c27b0',
      icon: <ChangeIcon />,
    },
    { label: 'خدمات الكتالوج', value: catalog.length, color: '#00796b', icon: <CatalogIcon /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        إدارة خدمات تقنية المعلومات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة الأصول التقنية والحوادث وطلبات التغيير وكتالوج الخدمات
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRight: `4px solid ${s.color}`,
              }}
            >
              <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color }}>{s.icon}</Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {p1Count > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: alpha('#d32f2f', 0.08),
            border: '1px solid',
            borderColor: alpha('#d32f2f', 0.3),
          }}
        >
          <Typography variant="body1" fontWeight={600} color="error">
            <CriticalIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            {p1Count} حادثة حرجة (P1) تحتاج اهتمام فوري
          </Typography>
        </Paper>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="الأصول التقنية" icon={<AssetIcon />} iconPosition="start" />
        <Tab
          label={
            <Badge badgeContent={openIncidents.length} color="error" max={99}>
              إدارة الحوادث
            </Badge>
          }
          icon={<IncidentIcon />}
          iconPosition="start"
        />
        <Tab label="طلبات التغيير" icon={<ChangeIcon />} iconPosition="start" />
        <Tab label="كتالوج الخدمات" icon={<CatalogIcon />} iconPosition="start" />
        <Tab label="سياسات SLA" icon={<SLAIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: IT Assets (CMDB) */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setAssetDialog(true);
              }}
            >
              أصل جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الرقم التسلسلي</TableCell>
                  <TableCell>معين لـ</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.map(a => (
                  <TableRow key={a._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{a.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={<AssetIcon />}
                        label={ASSET_TYPES[a.type] || a.type}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{a.serialNumber || '-'}</TableCell>
                    <TableCell>{a.assignedTo?.name || a.assignedTo || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ASSET_STATUSES[a.status] || a.status}
                        color={
                          a.status === 'active' || a.status === 'in_use'
                            ? 'success'
                            : a.status === 'maintenance'
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(a);
                          setAssetDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد أصول مسجلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 1: Incidents */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setIncidentDialog(true);
              }}
            >
              حادثة جديدة
            </Button>
          </Box>
          <Grid container spacing={2}>
            {incidents.map(inc => (
              <Grid item xs={12} md={6} key={inc._id}>
                <Card
                  variant="outlined"
                  sx={{ borderRight: `4px solid ${PRIORITY_COLORS[inc.priority] || '#999'}` }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {inc.title}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          size="small"
                          label={PRIORITY_LABELS[inc.priority] || inc.priority}
                          sx={{
                            bgcolor: alpha(PRIORITY_COLORS[inc.priority] || '#999', 0.15),
                            fontWeight: 700,
                          }}
                        />
                        <Chip
                          size="small"
                          label={INCIDENT_STATUSES[inc.status] || inc.status}
                          color={
                            inc.status === 'resolved'
                              ? 'success'
                              : inc.status === 'closed'
                                ? 'default'
                                : inc.status === 'open'
                                  ? 'error'
                                  : 'warning'
                          }
                        />
                      </Stack>
                    </Box>
                    {inc.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {inc.description.slice(0, 120)}...
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1}>
                      {inc.category && (
                        <Chip size="small" variant="outlined" label={inc.category} />
                      )}
                      {inc.assignedTeam && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<BuildIcon />}
                          label={inc.assignedTeam}
                        />
                      )}
                    </Stack>
                    {inc.sla?.breached && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        <WarningIcon sx={{ fontSize: 12, mr: 0.5 }} />
                        تم تجاوز مدة SLA
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(inc);
                          setIncidentDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {!['resolved', 'closed'].includes(inc.status) && (
                        <Tooltip title="حل">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              svc.resolveITIncident(inc._id, { status: 'resolved' }).then(fetchData)
                            }
                          >
                            <ResolvedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {incidents.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد حوادث</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 2: Change Requests */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setChangeDialog(true);
              }}
            >
              طلب تغيير جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>العنوان</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المخاطر</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التنفيذ المخطط</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {changes.map(c => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{c.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={CHANGE_TYPES[c.type] || c.type}
                        color={c.type === 'emergency' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          c.riskLevel === 'high'
                            ? 'عالي'
                            : c.riskLevel === 'medium'
                              ? 'متوسط'
                              : 'منخفض'
                        }
                        color={
                          c.riskLevel === 'high'
                            ? 'error'
                            : c.riskLevel === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={CHANGE_STATUSES[c.status] || c.status}
                        color={
                          c.status === 'completed'
                            ? 'success'
                            : c.status === 'rejected'
                              ? 'error'
                              : 'info'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {c.scheduledDate
                        ? new Date(c.scheduledDate).toLocaleDateString('ar-SA')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditItem(c);
                          setChangeDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {c.status === 'submitted' && (
                        <Tooltip title="اعتماد">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              svc.approveITChange(c._id, { status: 'approved' }).then(fetchData)
                            }
                          >
                            <ResolvedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {changes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد طلبات تغيير
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 3: Service Catalog */}
      {tab === 3 && (
        <Box>
          <Grid container spacing={2}>
            {catalog.map(item => (
              <Grid item xs={12} md={6} lg={4} key={item._id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.description}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {item.category && <Chip size="small" label={item.category} />}
                      {item.sla && (
                        <Chip size="small" variant="outlined" icon={<SLAIcon />} label={item.sla} />
                      )}
                      {item.approvalRequired && (
                        <Chip size="small" color="warning" label="يحتاج موافقة" />
                      )}
                    </Stack>
                    {item.cost?.amount !== null && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        التكلفة: {item.cost.amount.toLocaleString()} {item.cost.currency}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {catalog.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد خدمات في الكتالوج</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 4: SLA Policies */}
      {tab === 4 && (
        <Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>اسم السياسة</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>وقت الاستجابة</TableCell>
                  <TableCell>وقت الحل</TableCell>
                  <TableCell>التصعيد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slaList.map(s => (
                  <TableRow key={s._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{s.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={PRIORITY_LABELS[s.priority] || s.priority}
                        sx={{ bgcolor: alpha(PRIORITY_COLORS[s.priority] || '#999', 0.15) }}
                      />
                    </TableCell>
                    <TableCell>
                      {s.responseTimeMinutes ? `${s.responseTimeMinutes} د` : '-'}
                    </TableCell>
                    <TableCell>
                      {s.resolutionTimeMinutes
                        ? `${Math.round(s.resolutionTimeMinutes / 60)} ساعة`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {s.escalationMatrix?.length ? `${s.escalationMatrix.length} مستويات` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {slaList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      لا توجد سياسات SLA
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Asset Dialog */}
      <Dialog
        open={assetDialog}
        onClose={() => {
          setAssetDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل الأصل' : 'أصل جديد'}
          <IconButton
            onClick={() => {
              setAssetDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <AssetForm initial={editItem} onSave={handleSaveAsset} />
        </DialogContent>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog
        open={incidentDialog}
        onClose={() => {
          setIncidentDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل الحادثة' : 'حادثة جديدة'}
          <IconButton
            onClick={() => {
              setIncidentDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <IncidentForm initial={editItem} onSave={handleSaveIncident} />
        </DialogContent>
      </Dialog>

      {/* Change Dialog */}
      <Dialog
        open={changeDialog}
        onClose={() => {
          setChangeDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل طلب التغيير' : 'طلب تغيير جديد'}
          <IconButton
            onClick={() => {
              setChangeDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ChangeForm initial={editItem} onSave={handleSaveChange} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function AssetForm({ initial, onSave }) {
  const [form, setForm] = useState({
    name: '',
    type: 'laptop',
    serialNumber: '',
    status: 'in_stock',
  });
  useEffect(() => {
    if (initial)
      setForm({
        name: initial.name || '',
        type: initial.type || 'laptop',
        serialNumber: initial.serialNumber || '',
        status: initial.status || 'in_stock',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="اسم الأصل" value={form.name} onChange={ch('name')} required />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(ASSET_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="الرقم التسلسلي"
          value={form.serialNumber}
          onChange={ch('serialNumber')}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="الحالة" value={form.status} onChange={ch('status')}>
          {Object.entries(ASSET_STATUSES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function IncidentForm({ initial, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'P3',
    category: '',
    assignedTeam: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        priority: initial.priority || 'P3',
        category: initial.category || '',
        assignedTeam: initial.assignedTeam || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="العنوان" value={form.title} onChange={ch('title')} required />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={3}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          select
          fullWidth
          label="الأولوية"
          value={form.priority}
          onChange={ch('priority')}
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField fullWidth label="التصنيف" value={form.category} onChange={ch('category')} />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          label="الفريق المعين"
          value={form.assignedTeam}
          onChange={ch('assignedTeam')}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function ChangeForm({ initial, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'normal',
    riskLevel: 'medium',
    reason: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        type: initial.type || 'normal',
        riskLevel: initial.riskLevel || 'medium',
        reason: initial.reason || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="العنوان" value={form.title} onChange={ch('title')} required />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(CHANGE_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField
          select
          fullWidth
          label="مستوى المخاطر"
          value={form.riskLevel}
          onChange={ch('riskLevel')}
        >
          <MenuItem value="low">منخفض</MenuItem>
          <MenuItem value="medium">متوسط</MenuItem>
          <MenuItem value="high">عالي</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="سبب التغيير"
          value={form.reason}
          onChange={ch('reason')}
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}
