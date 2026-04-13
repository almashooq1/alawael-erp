import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Avatar, IconButton, Button,
  CircularProgress, Alert, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Paper, Grid, Tooltip, InputAdornment, Autocomplete,
  List, ListItem, ListItemAvatar, ListItemText, Divider, Menu, MenuItem,
} from '@mui/material';
import {
  Label as TagIcon, Add as AddIcon, Refresh as RefreshIcon,
  Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
  Merge as MergeIcon, CloudQueue as CloudIcon,
  Circle as CircleIcon, Category as CategoryIcon,
} from '@mui/icons-material';
import { tagsApi } from '../../services/documentProPhase4Service';
import logger from '../../utils/logger';

const PRESET_COLORS = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e',
  '#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7',
  '#d946ef','#ec4899','#f43f5e','#64748b',
];

/**
 * TagsManager — مدير الوسوم المتقدم
 * إدارة الوسوم، التصنيفات، السحابة، الدمج
 */
export default function TagsManager({ documentId, onTagsChange }) {
  const [tags, setTags] = useState([]);
  const [docTags, setDocTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cloud, setCloud] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6', category: '' });
  const [mergeData, setMergeData] = useState({ sourceId: '', targetId: '' });
  const [contextTag, setContextTag] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [
        tagsApi.getAll({ search: searchTerm || undefined }),
        tagsApi.getCloud(),
        tagsApi.getCategories(),
      ];
      if (documentId) promises.push(tagsApi.getForDocument(documentId));
      const [tagsRes, cloudRes, catsRes, docRes] = await Promise.all(promises);
      setTags(tagsRes.data?.tags ?? []);
      setCloud(cloudRes.data?.cloud ?? cloudRes.data?.tags ?? []);
      setCategories(catsRes.data?.categories ?? []);
      if (docRes) setDocTags(docRes.data?.tags ?? []);
    } catch (err) {
      logger.error('Load tags error', err);
      setError('فشل تحميل الوسوم');
    } finally {
      setLoading(false);
    }
  }, [documentId, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  // Tag CRUD
  const handleCreate = async () => {
    if (!newTag.name.trim()) return;
    try {
      await tagsApi.create(newTag);
      setCreateOpen(false);
      setNewTag({ name: '', color: '#3b82f6', category: '' });
      loadData();
    } catch (err) {
      logger.error('Create tag error', err);
    }
  };

  const handleDelete = async (tagId) => {
    try {
      await tagsApi.delete(tagId);
      setMenuAnchor(null);
      loadData();
    } catch (err) {
      logger.error('Delete tag error', err);
    }
  };

  const handleMerge = async () => {
    if (!mergeData.sourceId || !mergeData.targetId) return;
    try {
      await tagsApi.merge(mergeData.sourceId, mergeData.targetId);
      setMergeOpen(false);
      setMergeData({ sourceId: '', targetId: '' });
      loadData();
    } catch (err) {
      logger.error('Merge tags error', err);
    }
  };

  const handleToggleTag = async (tagId) => {
    if (!documentId) return;
    const isAttached = docTags.some((t) => (t._id || t.id) === tagId);
    try {
      if (isAttached) {
        await tagsApi.removeFromDocument(documentId, tagId);
      } else {
        await tagsApi.addToDocument(documentId, tagId);
      }
      loadData();
      onTagsChange?.();
    } catch (err) {
      logger.error('Toggle tag error', err);
    }
  };

  const filteredTags = tags.filter((t) =>
    !searchTerm || t.name?.includes(searchTerm) || t.nameAr?.includes(searchTerm)
  );

  return (
    <Box dir="rtl">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TagIcon color="primary" />
          <Typography variant="h6">إدارة الوسوم</Typography>
          <Chip label={`${tags.length} وسم`} size="small" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
            وسم جديد
          </Button>
          <Button size="small" startIcon={<MergeIcon />} variant="outlined" onClick={() => setMergeOpen(true)}>
            دمج
          </Button>
          <IconButton size="small" onClick={loadData}><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Search */}
      <TextField
        fullWidth size="small" placeholder="بحث في الوسوم..." value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {/* Tag Cloud */}
      {cloud.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <CloudIcon color="action" />
            <Typography variant="subtitle2">سحابة الوسوم</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {cloud.map((tag) => {
              const size = Math.min(Math.max(tag.count || 1, 1), 5);
              const isDocTag = docTags.some((dt) => (dt._id || dt.id) === (tag._id || tag.id));
              return (
                <Tooltip key={tag._id || tag.id} title={`${tag.count || 0} مستند`}>
                  <Chip
                    label={tag.name}
                    size={size > 3 ? 'medium' : 'small'}
                    onClick={() => handleToggleTag(tag._id || tag.id)}
                    sx={{
                      bgcolor: isDocTag ? (tag.color || '#3b82f6') + '30' : 'default',
                      borderColor: tag.color || '#3b82f6',
                      color: isDocTag ? tag.color || '#3b82f6' : 'text.primary',
                      fontWeight: isDocTag ? 700 : 400,
                      fontSize: 10 + size * 2,
                      my: 0.5,
                    }}
                    variant={isDocTag ? 'filled' : 'outlined'}
                  />
                </Tooltip>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <CategoryIcon color="action" />
            <Typography variant="subtitle2">التصنيفات</Typography>
          </Stack>
          <Grid container spacing={1}>
            {categories.map((cat) => (
              <Grid item xs={6} sm={4} md={3} key={cat._id || cat.id}>
                <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>{cat.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{cat.tagCount ?? 0} وسم</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Tags List */}
      <Card variant="outlined">
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            جميع الوسوم ({filteredTags.length})
          </Typography>
          {filteredTags.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>لا توجد وسوم</Typography>
          ) : (
            <List dense>
              {filteredTags.map((tag, i) => {
                const isDocTag = docTags.some((dt) => (dt._id || dt.id) === (tag._id || tag.id));
                return (
                  <React.Fragment key={tag._id || tag.id}>
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          {documentId && (
                            <Button size="small" variant={isDocTag ? 'contained' : 'outlined'}
                              onClick={() => handleToggleTag(tag._id || tag.id)}
                              sx={{ minWidth: 50 }}>
                              {isDocTag ? 'إزالة' : 'إضافة'}
                            </Button>
                          )}
                          <IconButton size="small" onClick={(e) => { setContextTag(tag); setMenuAnchor(e.currentTarget); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: (tag.color || '#3b82f6') + '20', width: 32, height: 32 }}>
                          <CircleIcon sx={{ color: tag.color || '#3b82f6', fontSize: 16 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={tag.name}
                        secondary={`${tag.category?.name || 'بدون تصنيف'} • ${tag.documentCount ?? 0} مستند`}
                      />
                    </ListItem>
                    {i < filteredTags.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { handleDelete(contextTag?._id || contextTag?.id); }}>
          <DeleteIcon fontSize="small" sx={{ ml: 1 }} /> حذف الوسم
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إنشاء وسم جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="اسم الوسم" size="small" value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} />
            <Autocomplete
              options={categories} getOptionLabel={(o) => o.name || ''} size="small"
              onChange={(_, v) => setNewTag({ ...newTag, category: v?._id || '' })}
              renderInput={(params) => <TextField {...params} label="التصنيف" />}
            />
            <Box>
              <Typography variant="caption" gutterBottom>اللون</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {PRESET_COLORS.map((c) => (
                  <IconButton key={c} size="small" onClick={() => setNewTag({ ...newTag, color: c })}
                    sx={{ border: newTag.color === c ? '2px solid' : '2px solid transparent', borderColor: c, p: 0.5 }}>
                    <CircleIcon sx={{ color: c, fontSize: 20 }} />
                  </IconButton>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newTag.name.trim()}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>دمج الوسوم</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            سيتم نقل جميع المستندات من الوسم المصدر إلى الوسم الهدف ثم حذف المصدر.
          </Typography>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={tags} getOptionLabel={(o) => o.name || ''} size="small"
              onChange={(_, v) => setMergeData({ ...mergeData, sourceId: v?._id || '' })}
              renderInput={(params) => <TextField {...params} label="الوسم المصدر (سيُحذف)" />}
            />
            <Autocomplete
              options={tags} getOptionLabel={(o) => o.name || ''} size="small"
              onChange={(_, v) => setMergeData({ ...mergeData, targetId: v?._id || '' })}
              renderInput={(params) => <TextField {...params} label="الوسم الهدف (سيبقى)" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)}>إلغاء</Button>
          <Button onClick={handleMerge} variant="contained" color="warning"
            disabled={!mergeData.sourceId || !mergeData.targetId}>دمج</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
