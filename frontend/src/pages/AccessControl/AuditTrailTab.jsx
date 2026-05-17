/**
 * AuditTrailTab — سجل التدقيق
 * Filterable timeline of all permission/role/user-access changes
 */
import {
  Box,
  Card,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  InputAdornment,
  alpha,
  useTheme,
  Skeleton,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { AUDIT_ACTIONS } from './accessControl.constants';
import { formatDateTime } from 'utils/dateUtils';

// ─── Format date ──────────────────────────────────────────────────────────────
const fmtDate = iso => formatDateTime(iso);

// ─── Action Chip ──────────────────────────────────────────────────────────────
const ActionChip = ({ action }) => {
  const cfg = AUDIT_ACTIONS[action] || AUDIT_ACTIONS.default;
  return (
    <Chip
      label={cfg.label || action}
      size="small"
      sx={{
        bgcolor: alpha(cfg.color || '#78909c', 0.15),
        color: cfg.color || '#78909c',
        fontWeight: 600,
        fontSize: 11,
        height: 22,
      }}
    />
  );
};

// ─── Row ─────────────────────────────────────────────────────────────────────
const AuditRow = ({ entry }) => {
  const theme = useTheme();
  return (
    <TableRow sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 12 }}>
        {fmtDate(entry.createdAt || entry.timestamp)}
      </TableCell>
      <TableCell>
        <ActionChip action={entry.action} />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'primary.light' }}>
            {(entry.actorName || entry.actor || '?')[0]}
          </Avatar>
          <Typography variant="body2" noWrap>
            {entry.actorName || entry.actor || '—'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {entry.targetName || entry.target || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 240 }} noWrap>
          {entry.details || entry.description || '—'}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

// ─── AuditTrailTab ────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'جميع الأحداث' },
  { value: 'PERMISSION_CHANGE', label: 'تغيير صلاحية' },
  { value: 'ROLE_ASSIGN', label: 'تعيين دور' },
  { value: 'ROLE_REVOKE', label: 'سحب دور' },
  { value: 'USER_LOCK', label: 'قفل حساب' },
  { value: 'USER_UNLOCK', label: 'فتح حساب' },
  { value: 'ROLE_CREATE', label: 'إنشاء دور' },
  { value: 'ROLE_DELETE', label: 'حذف دور' },
  { value: 'MFA_CHANGE', label: 'تغيير MFA' },
];

const AuditTrailTab = ({ entries = [], loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = entries;
    if (actionFilter !== 'all') list = list.filter(e => e.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        e =>
          (e.actorName || '').toLowerCase().includes(q) ||
          (e.targetName || '').toLowerCase().includes(q) ||
          (e.details || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, search, actionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <HistoryIcon color="primary" />
            سجل التدقيق
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تتبع جميع التغييرات على الأدوار والصلاحيات
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, mb: 2 }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم أو التفاصيل..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="نوع الحدث"
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 180 }}
          >
            {ACTION_FILTER_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Chip
            label={`${filtered.length} سجل`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Box>
      </Card>

      {/* Table */}
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>التوقيت</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحدث</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المنفذ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الهدف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التفاصيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton height={24} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pageSlice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <HistoryIcon
                      sx={{
                        fontSize: 40,
                        color: 'text.disabled',
                        display: 'block',
                        mx: 'auto',
                        mb: 1,
                      }}
                    />
                    <Typography color="text.secondary">لا توجد سجلات مطابقة</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pageSlice.map((entry, i) => <AuditRow key={entry._id || i} entry={entry} />)
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
              size="small"
            />
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default AuditTrailTab;
