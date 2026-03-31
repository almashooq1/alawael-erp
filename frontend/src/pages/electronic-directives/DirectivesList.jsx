/**
 * Directives List — قائمة التوجيهات الإلكترونية
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Skeleton,
  Alert,
  Grid,
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Campaign as CampaignIcon,
  Gavel as DecisionIcon,
  Description as MemoIcon,
  NotificationsActive as UrgentIcon,
  PolicyOutlined as PolicyIcon,
  Rule as ProcedureIcon,
  Assignment as InstructionIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import electronicDirectivesService from '../../services/electronicDirectives.service';
import {
  DIRECTIVE_TYPES,
  DIRECTIVE_PRIORITIES,
  DIRECTIVE_STATUS,
  typeOptions,
  priorityOptions,
  statusOptions,
} from './constants';

const typeIcons = {
  instruction: <InstructionIcon fontSize="small" />,
  circular: <CampaignIcon fontSize="small" />,
  decision: <DecisionIcon fontSize="small" />,
  memo: <MemoIcon fontSize="small" />,
  urgent_notice: <UrgentIcon fontSize="small" />,
  policy_update: <PolicyIcon fontSize="small" />,
  procedure_change: <ProcedureIcon fontSize="small" />,
};

export default function DirectivesList() {
  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();

  // ─── State ───────────────────────────────────────────
  const [directives, setDirectives] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');

  // ─── Fetch ───────────────────────────────────────────
  const fetchDirectives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (query) params.query = query;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await electronicDirectivesService.search(params);
      const data = res.data;
      setDirectives(data?.data || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Failed to load directives:', err);
      setError('فشل في تحميل التوجيهات');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, query, statusFilter, typeFilter, priorityFilter]);

  useEffect(() => {
    fetchDirectives();
  }, [fetchDirectives]);

  // ─── Search handler (debounced) ──────────────────────
  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Render ──────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          قائمة التوجيهات
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchDirectives}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/electronic-directives/compose')}
          >
            توجيه جديد
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث بالموضوع أو الرقم المرجعي..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={statusFilter}
                label="الحالة"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">الكل</MenuItem>
                {statusOptions.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>النوع</InputLabel>
              <Select
                value={typeFilter}
                label="النوع"
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">الكل</MenuItem>
                {typeOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>الأولوية</InputLabel>
              <Select
                value={priorityFilter}
                label="الأولوية"
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">الكل</MenuItem>
                {priorityOptions.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الرقم المرجعي</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الموضوع</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الإصدار</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>المستلمون</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">
                إجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : directives.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      لا توجد توجيهات مطابقة لمعايير البحث
                    </Typography>
                  </TableCell>
                </TableRow>
              )
              : directives.map((d) => {
                  const typeInfo = DIRECTIVE_TYPES[d.type] || {};
                  const priorityInfo = DIRECTIVE_PRIORITIES[d.priority] || {};
                  const statusInfo = DIRECTIVE_STATUS[d.status] || {};
                  return (
                    <TableRow
                      key={d._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/electronic-directives/view/${d._id}`)}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: `${typeInfo.color || '#1976d2'}20`,
                              color: typeInfo.color || '#1976d2',
                            }}
                          >
                            {typeIcons[d.type] || <CampaignIcon fontSize="small" />}
                          </Avatar>
                          <Typography variant="body2">{typeInfo.label || d.type}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                          {d.referenceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                          {d.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={priorityInfo.label || d.priority}
                          size="small"
                          sx={{
                            bgcolor: `${priorityInfo.color || '#9e9e9e'}20`,
                            color: priorityInfo.color || '#9e9e9e',
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label || d.status}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: statusInfo.color || '#9e9e9e',
                            color: statusInfo.color || '#9e9e9e',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {d.issuedAt
                            ? new Date(d.issuedAt).toLocaleDateString('ar-SA')
                            : d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString('ar-SA')
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={d.deliveryStats?.totalRecipients || d.recipients?.length || 0}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض التفاصيل">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/electronic-directives/view/${d._id}`);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
          }
        />
      </TableContainer>
    </Box>
  );
}
