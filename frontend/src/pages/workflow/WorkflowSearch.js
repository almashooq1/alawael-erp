/**
 * WorkflowSearch – البحث المتقدم
 * Global search across workflow instances, tasks, definitions, comments, and tags.
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  Skeleton,
  alpha,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  Search,
  Refresh,
  Assignment,
  Description,
  Label,
  Comment,
  Person,
  CalendarMonth,
  Circle,
  OpenInNew,
  FilterList,
  TuneRounded,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const typeConfig = {
  instance: { label: 'سير العمل', color: '#6366f1', icon: <Description fontSize="small" /> },
  task: { label: 'مهمة', color: '#2563eb', icon: <Assignment fontSize="small" /> },
  definition: { label: 'تعريف', color: '#0891b2', icon: <TuneRounded fontSize="small" /> },
  comment: { label: 'تعليق', color: '#f59e0b', icon: <Comment fontSize="small" /> },
  tag: { label: 'تصنيف', color: '#16a34a', icon: <Label fontSize="small" /> },
};

export default function WorkflowSearch() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setSearched(true);
      const params = { q: query.trim() };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await workflowService.searchWorkflows(params);
      setResults(res.data?.data || res.data || {});
    } catch {
      showSnackbar('خطأ في البحث', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, priorityFilter, showSnackbar]);

  const handleKeyDown = e => {
    if (e.key === 'Enter') doSearch();
  };

  const allItems = results
    ? [
        ...(results.instances || []).map(r => ({ ...r, _type: 'instance' })),
        ...(results.tasks || []).map(r => ({ ...r, _type: 'task' })),
        ...(results.definitions || []).map(r => ({ ...r, _type: 'definition' })),
        ...(results.comments || []).map(r => ({ ...r, _type: 'comment' })),
        ...(results.tags || []).map(r => ({ ...r, _type: 'tag' })),
      ]
    : [];

  const grouped = {
    all: allItems,
    instance: allItems.filter(i => i._type === 'instance'),
    task: allItems.filter(i => i._type === 'task'),
    definition: allItems.filter(i => i._type === 'definition'),
    comment: allItems.filter(i => i._type === 'comment'),
    tag: allItems.filter(i => i._type === 'tag'),
  };

  const tabs = [
    { key: 'all', label: `الكل (${grouped.all.length})` },
    { key: 'instance', label: `سير العمل (${grouped.instance.length})` },
    { key: 'task', label: `المهام (${grouped.task.length})` },
    { key: 'definition', label: `التعريفات (${grouped.definition.length})` },
    { key: 'comment', label: `التعليقات (${grouped.comment.length})` },
    { key: 'tag', label: `التصنيفات (${grouped.tag.length})` },
  ];

  const currentKey = tabs[tabValue]?.key || 'all';
  const currentItems = grouped[currentKey] || [];

  const navigateToItem = item => {
    switch (item._type) {
      case 'instance':
        nav(`/workflow/instances/${item._id}`);
        break;
      case 'task':
        nav(`/workflow/my-tasks`);
        break;
      case 'definition':
        nav(`/workflow/builder/${item._id}`);
        break;
      default:
        break;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => nav('/workflow')}>
          <ArrowBack />
        </IconButton>
        <Search sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            البحث المتقدم
          </Typography>
          <Typography variant="body2" color="text.secondary">
            البحث في جميع عناصر سير العمل
          </Typography>
        </Box>
      </Box>

      {/* SEARCH BAR */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            placeholder="ابحث عن سير عمل، مهام، تعليقات، تصنيفات..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={statusFilter}
              label="الحالة"
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="completed">مكتمل</MenuItem>
              <MenuItem value="pending">معلق</MenuItem>
              <MenuItem value="cancelled">ملغي</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={priorityFilter}
              label="الأولوية"
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="critical">حرج</MenuItem>
              <MenuItem value="high">عالي</MenuItem>
              <MenuItem value="medium">متوسط</MenuItem>
              <MenuItem value="low">منخفض</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={doSearch}
            disabled={!query.trim() || loading}
          >
            بحث
          </Button>
        </Box>
      </Paper>

      {/* RESULTS */}
      {loading ? (
        <Box>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} height={60} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : !searched ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Search sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            أدخل كلمة البحث للبدء
          </Typography>
          <Typography variant="body2" color="text.secondary">
            يمكنك البحث في جميع سير العمل، المهام، التعليقات، والتصنيفات
          </Typography>
        </Paper>
      ) : allItems.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Search sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" variant="h6">
            لا توجد نتائج
          </Typography>
          <Typography variant="body2" color="text.secondary">
            جرّب كلمات بحث مختلفة أو غيّر عوامل التصفية
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map(t => (
              <Tab key={t.key} label={t.label} />
            ))}
          </Tabs>
          <Divider />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>النوع</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentItems.map((item, i) => {
                  const t = typeConfig[item._type] || typeConfig.instance;
                  return (
                    <TableRow
                      key={i}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigateToItem(item)}
                    >
                      <TableCell>
                        <Chip
                          size="small"
                          icon={t.icon}
                          label={t.label}
                          sx={{ bgcolor: alpha(t.color, 0.1), color: t.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.title || item.name || item.content?.substring(0, 50) || '—'}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description.substring(0, 80)}
                            {item.description.length > 80 ? '...' : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status ? (
                          <Chip size="small" label={item.status} variant="outlined" />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="فتح">
                          <IconButton size="small">
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
