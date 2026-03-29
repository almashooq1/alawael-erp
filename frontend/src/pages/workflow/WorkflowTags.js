/**
 * WorkflowTags – إدارة التصنيفات
 * Tag management for workflow instances — create, edit, assign, search.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Skeleton,  alpha,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Add,
  Label,
  Edit,
  Delete,
  LocalOffer,  Tag,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#78716c',
  '#64748b',
];

export default function WorkflowTags() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', color: '#3b82f6', description: '' });

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getTags();
      setTags(res.data?.data || res.data || []);
    } catch {
      showSnackbar('تعذر تحميل التصنيفات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editId) {
        await workflowService.updateTag(editId, form);
        showSnackbar('تم تحديث التصنيف', 'success');
      } else {
        await workflowService.createTag(form);
        showSnackbar('تم إنشاء التصنيف بنجاح', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchTags();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'خطأ في حفظ التصنيف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
    try {
      await workflowService.deleteTag(id);
      showSnackbar('تم حذف التصنيف', 'success');
      fetchTags();
    } catch {
      showSnackbar('خطأ في حذف التصنيف', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', color: '#3b82f6', description: '' });
    setEditId(null);
  };

  const openEdit = tag => {
    setForm({ name: tag.name, color: tag.color || '#3b82f6', description: tag.description || '' });
    setEditId(tag._id);
    setDialogOpen(true);
  };

  const filtered = tags.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <LocalOffer sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة التصنيفات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إنشاء وإدارة تصنيفات سير العمل
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            تصنيف جديد
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchTags}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{ bgcolor: alpha('#6366f1', 0.06), border: `1px solid ${alpha('#6366f1', 0.15)}` }}
          >
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 1.5,
                '&:last-child': { pb: 1.5 },
              }}
            >
              <Avatar sx={{ bgcolor: alpha('#6366f1', 0.15), color: '#6366f1' }}>
                <Label />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700} color="#6366f1">
                  {loading ? '—' : tags.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  إجمالي التصنيفات
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={8}>
          {/* TAG CLOUD */}
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              minHeight: 60,
              alignItems: 'center',
            }}
          >
            {loading ? (
              <Skeleton width="100%" height={40} />
            ) : tags.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                لا توجد تصنيفات بعد
              </Typography>
            ) : (
              tags.map(t => (
                <Chip
                  key={t._id}
                  label={`${t.name} (${t.usageCount || 0})`}
                  sx={{
                    bgcolor: alpha(t.color || '#3b82f6', 0.12),
                    color: t.color || '#3b82f6',
                    fontWeight: 600,
                  }}
                  icon={<Tag sx={{ fontSize: 16, color: `${t.color || '#3b82f6'} !important` }} />}
                  onClick={() => openEdit(t)}
                />
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* SEARCH */}
      <TextField
        fullWidth
        placeholder="البحث في التصنيفات..."
        variant="outlined"
        size="small"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* TAGS TABLE */}
      <Paper>
        <TableContainer>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} height={50} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <LocalOffer sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                {search ? 'لا توجد نتائج مطابقة' : 'لا توجد تصنيفات'}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>التصنيف</TableCell>
                  <TableCell>الوصف</TableCell>
                  <TableCell>الاستخدام</TableCell>
                  <TableCell>تاريخ الإنشاء</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(tag => (
                  <TableRow key={tag._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: tag.color || '#3b82f6',
                          }}
                        />
                        <Typography fontWeight={600}>{tag.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {tag.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${tag.usageCount || 0} استخدام`}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {tag.createdAt ? new Date(tag.createdAt).toLocaleDateString('ar') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(tag)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(tag._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل التصنيف' : 'تصنيف جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="اسم التصنيف"
              fullWidth
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                اللون
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <Box
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
                      border: form.color === c ? '3px solid' : '2px solid transparent',
                      borderColor: form.color === c ? 'text.primary' : 'transparent',
                      transition: 'all 0.15s',
                      '&:hover': { transform: 'scale(1.15)' },
                    }}
                  />
                ))}
              </Box>
            </Box>
            {/* Preview */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                معاينة
              </Typography>
              <Chip
                label={form.name || 'اسم التصنيف'}
                icon={<Tag sx={{ fontSize: 16, color: `${form.color} !important` }} />}
                sx={{
                  bgcolor: alpha(form.color, 0.12),
                  color: form.color,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || saving}>
            {saving ? <CircularProgress size={20} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
