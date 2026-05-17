/**
 * GenericDomainTabPage — مكوّن عام متعدد التبويبات (CRUD)
 *
 * Props:
 *   title        (string)   — عنوان الصفحة
 *   description  (string)   — وصف مختصر
 *   headerIcon   (element)  — أيقونة العنوان
 *   tabs         (array)    — مصفوفة إعدادات التبويبات (انظر TabConfig أدناه)
 *
 * TabConfig shape:
 *   key          string
 *   label        string
 *   icon         element
 *   color        string  (hex)
 *   api          object  { create, list, get, update, remove, getDashboard }
 *   createTitle  string
 *   emptyText    string
 *   columns      Array<{ key, label, date?, progress? }>
 *   fields       Array<{ key, label, required?, type?, options?, multiline? }>
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  LinearProgress,
  Stack,
  Avatar,
  TextField,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatDate } from 'utils/dateUtils';

/* ── Generic Create / Edit Dialog ─────────────────────────────────────── */
function RecordDialog({ open, onClose, onSaved, tabConfig, editRecord }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (editRecord) {
        setForm({ ...editRecord });
      } else {
        const defaults = {};
        (tabConfig.fields || []).forEach(f => {
          defaults[f.key] = '';
        });
        setForm(defaults);
      }
    }
  }, [open, editRecord, tabConfig]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const required = (tabConfig.fields || []).filter(f => f.required);
    const missing = required.filter(f => !form[f.key]);
    if (missing.length) {
      setError(`يرجى تعبئة: ${missing.map(f => f.label).join('، ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editRecord) {
        await tabConfig.api.update(editRecord._id, form);
      } else {
        await tabConfig.api.create(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            sx={{ bgcolor: `${tabConfig.color}20`, color: tabConfig.color, width: 32, height: 32 }}
          >
            {tabConfig.icon}
          </Avatar>
          <Typography fontWeight="bold">
            {editRecord ? 'تعديل السجل' : tabConfig.createTitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          {(tabConfig.fields || []).map(field => (
            <Grid item xs={12} sm={field.multiline ? 12 : 6} key={field.key}>
              {field.type === 'select' ? (
                <FormControl fullWidth size="small">
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    value={form[field.key] || ''}
                    onChange={set(field.key)}
                    label={field.label}
                  >
                    {(field.options || []).map(opt => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label={field.label}
                  value={form[field.key] || ''}
                  onChange={set(field.key)}
                  size="small"
                  fullWidth
                  required={field.required}
                  multiline={field.multiline}
                  rows={field.multiline ? 3 : undefined}
                  type={field.type || 'text'}
                  InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                  inputProps={field.type === 'number' ? { min: 0, max: 100 } : undefined}
                />
              )}
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ bgcolor: tabConfig.color, '&:hover': { bgcolor: tabConfig.color } }}
        >
          {saving ? <CircularProgress size={18} /> : editRecord ? 'تحديث' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Generic Data Table ────────────────────────────────────────────────── */
function DomainTable({ tabConfig, records, loading, onEdit, onRefresh }) {
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await tabConfig.api.remove(confirmId);
      setConfirmId(null);
      onRefresh();
    } catch (_e) {
      setConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LinearProgress />;
  if (records.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{tabConfig.emptyText}</Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: `${tabConfig.color}10` }}>
              {tabConfig.columns.map(col => (
                <TableCell key={col.key} sx={{ fontWeight: 'bold', color: tabConfig.color }}>
                  {col.label}
                </TableCell>
              ))}
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map(rec => (
              <TableRow key={rec._id} hover>
                {tabConfig.columns.map(col => (
                  <TableCell key={col.key}>
                    {col.progress ? (
                      <Box>
                        <Typography variant="caption">{rec[col.key] ?? 0}%</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={rec[col.key] ?? 0}
                          sx={{ height: 5, borderRadius: 3, mt: 0.3 }}
                          color={rec[col.key] >= 80 ? 'success' : 'primary'}
                        />
                      </Box>
                    ) : col.date ? (
                      <Typography variant="body2">{formatDate(rec[col.key])}</Typography>
                    ) : (
                      <Typography variant="body2">{rec[col.key] || '—'}</Typography>
                    )}
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Stack direction="row" justifyContent="center" spacing={0.5}>
                    <IconButton size="small" color="primary" onClick={() => onEdit(rec)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setConfirmId(rec._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(confirmId)}
        onClose={() => setConfirmId(null)}
        maxWidth="xs"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* ── Domain Tab Panel ──────────────────────────────────────────────────── */
function DomainTabPanel({ tabConfig, active }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const fetchData = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const [listRes, dashRes] = await Promise.allSettled([
        tabConfig.api.list({ limit: 100, ...(search && { search }) }),
        tabConfig.api.getDashboard(),
      ]);
      if (listRes.status === 'fulfilled') {
        const d = listRes.value?.data;
        setRecords(d?.data ?? (Array.isArray(d) ? d : []));
      }
      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value?.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [active, tabConfig, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = search
    ? records.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    : records;

  return (
    <Box>
      {dashboard && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {Object.entries(dashboard)
            .filter(([, v]) => typeof v === 'number')
            .slice(0, 4)
            .map(([k, v]) => (
              <Grid item xs={6} sm={3} key={k}>
                <Card variant="outlined" sx={{ borderRight: `3px solid ${tabConfig.color}` }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="h6" fontWeight="bold" color={tabConfig.color}>
                      {v}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {k}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          placeholder={`بحث في ${tabConfig.label}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditRecord(null);
              setCreateOpen(true);
            }}
            sx={{ bgcolor: tabConfig.color, '&:hover': { bgcolor: tabConfig.color } }}
          >
            إضافة
          </Button>
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DomainTable
        tabConfig={tabConfig}
        records={filtered}
        loading={loading}
        onEdit={rec => {
          setEditRecord(rec);
          setCreateOpen(true);
        }}
        onRefresh={fetchData}
      />

      <RecordDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditRecord(null);
        }}
        onSaved={fetchData}
        tabConfig={tabConfig}
        editRecord={editRecord}
      />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 *  EXPORTED MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════════════════ */
export default function GenericDomainTabPage({ title, description, headerIcon, tabs }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Math.min(Number(searchParams.get('tab') || 0), tabs.length - 1);
  const [tab, setTab] = useState(isNaN(initialTab) ? 0 : initialTab);

  const handleTabChange = (_, v) => {
    setTab(v);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', String(v));
      return next;
    });
  };

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          {headerIcon}
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          {tabs.map(t => (
            <Tab
              key={t.key}
              icon={
                <Avatar sx={{ bgcolor: `${t.color}20`, color: t.color, width: 28, height: 28 }}>
                  {t.icon}
                </Avatar>
              }
              iconPosition="start"
              label={t.label}
              sx={{ minHeight: 56 }}
            />
          ))}
        </Tabs>
        <Divider />
        <CardContent sx={{ py: 2, px: 2 }}>
          <DomainTabPanel key={tab} tabConfig={tabs[tab]} active={true} />
        </CardContent>
      </Card>
    </Box>
  );
}
