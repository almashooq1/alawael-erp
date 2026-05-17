/**
 * UsersAccessTab — إدارة وصول المستخدمين
 * RBAC-focused user table with inline role change and permission summary
 */
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  alpha,
  useTheme,
  Skeleton,
  Pagination,
  TableContainer,
  Paper,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as ActiveIcon,
  Lock as LockedIcon,
  VerifiedUser as MFAIcon,
  RadioButtonUnchecked as InactiveIcon,
  PeopleAlt as PeopleIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { SYSTEM_ROLES, getRoleConfig } from './accessControl.constants';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

// Format last-login date to Arabic-friendly relative time
const formatLastLogin = date => {
  if (!date) return 'لم يسجّل دخولاً';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 30) return `${days} يوم`;
  if (days < 365) return `${Math.floor(days / 30)} شهر`;
  return `${Math.floor(days / 365)} سنة`;
};

// ─── Reusable status chip ─────────────────────────────────────────────────────
const StatusChip = ({ user }) => {
  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    return (
      <Chip
        icon={<LockedIcon />}
        label="مقفل"
        size="small"
        color="error"
        variant="filled"
        sx={{ fontWeight: 600, fontSize: 11 }}
      />
    );
  }
  if (user.isActive) {
    return (
      <Chip
        icon={<ActiveIcon />}
        label="نشط"
        size="small"
        color="success"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: 11 }}
      />
    );
  }
  return (
    <Chip
      icon={<InactiveIcon />}
      label="معطّل"
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary' }}
    />
  );
};

// ─── Inline role selector ─────────────────────────────────────────────────────
const RoleSelector = ({ current, saving, onChange }) => {
  const cfg = getRoleConfig(current) || { color: '#78909c', label: current };
  return (
    <Select
      value={current || ''}
      onChange={e => onChange(e.target.value)}
      size="small"
      disabled={saving}
      variant="standard"
      disableUnderline
      sx={{
        '& .MuiSelect-select': {
          py: 0.4,
          px: 1,
          bgcolor: alpha(cfg.color, 0.1),
          borderRadius: 1,
          color: cfg.color,
          fontWeight: 600,
          fontSize: 12,
          lineHeight: 1.6,
        },
      }}
    >
      {SYSTEM_ROLES.map(r => (
        <MenuItem key={r.value} value={r.value}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
            {r.label}
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
};

// ─── UsersAccessTab ───────────────────────────────────────────────────────────
const UsersAccessTab = ({ users = [], loading, saving, onRoleUpdate }) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // Filter + search
  const filtered = useMemo(() => {
    let out = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        u =>
          (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
      );
    }
    if (filterRole) {
      out = out.filter(u => u.role === filterRole);
    }
    if (filterStatus === 'active') out = out.filter(u => u.isActive && !u.lockUntil);
    if (filterStatus === 'locked')
      out = out.filter(u => u.lockUntil && new Date(u.lockUntil) > new Date());
    if (filterStatus === 'inactive') out = out.filter(u => !u.isActive);
    if (filterStatus === 'no_mfa') out = out.filter(u => !u.mfa?.enabled);
    return out;
  }, [users, search, filterRole, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Role options for filter (only roles that appear in users list)
  const activeRoles = useMemo(() => {
    const seen = new Set(users.map(u => u.role).filter(Boolean));
    return SYSTEM_ROLES.filter(r => seen.has(r.value));
  }, [users]);

  // Quick summary stats
  const lockedCount = users.filter(u => u.lockUntil && new Date(u.lockUntil) > new Date()).length;
  const noMfaCount = users.filter(u => u.isActive && !u.mfa?.enabled).length;
  const activeCount = users.filter(u => u.isActive).length;

  const handleRoleChange = (userId, newRole) => {
    onRoleUpdate && onRoleUpdate(userId, newRole);
  };

  if (loading) {
    return (
      <Box>
        <Skeleton height={60} sx={{ mb: 1 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={50} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2.5,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            وصول المستخدمين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {users.length} مستخدم — عرض الأدوار والصلاحيات
          </Typography>
        </Box>
      </Box>

      {/* Quick stats */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <Chip
          icon={<ActiveIcon />}
          label={`${activeCount} نشط`}
          size="small"
          color="success"
          variant="outlined"
        />
        {lockedCount > 0 && (
          <Chip icon={<LockedIcon />} label={`${lockedCount} مقفل`} size="small" color="error" />
        )}
        {noMfaCount > 0 && (
          <Chip
            icon={<MFAIcon />}
            label={`${noMfaCount} بدون MFA`}
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="بحث بالاسم أو البريد..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ width: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>الدور</InputLabel>
          <Select
            value={filterRole}
            label="الدور"
            onChange={e => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">الكل</MenuItem>
            {activeRoles.map(r => (
              <MenuItem key={r.value} value={r.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                  {r.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filterStatus}
            label="الحالة"
            onChange={e => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="locked">مقفل</MenuItem>
            <MenuItem value="inactive">معطّل</MenuItem>
            <MenuItem value="no_mfa">بدون MFA</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>المستخدم</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>الدور</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>MFA</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>آخر دخول</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>الصلاحيات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <PeopleIcon
                    sx={{
                      fontSize: 40,
                      color: 'text.disabled',
                      display: 'block',
                      mx: 'auto',
                      mb: 1,
                    }}
                  />
                  <Typography color="text.secondary" variant="body2">
                    لا يوجد مستخدمون مطابقون
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {pageUsers.map(user => {
              const roleColor = getRoleConfig(user.role)?.color || '#78909c';
              const permCount = (user.customPermissions || []).length;
              const initials = (user.fullName || '?')
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('');

              return (
                <TableRow
                  key={user._id}
                  hover
                  sx={{
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                  }}
                >
                  {/* User */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={user.avatar}
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: alpha(roleColor, 0.15),
                          color: roleColor,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {user.fullName || 'مجهول'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Role (inline selector) */}
                  <TableCell>
                    <RoleSelector
                      current={user.role}
                      saving={saving}
                      onChange={newRole => handleRoleChange(user._id, newRole)}
                    />
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusChip user={user} />
                  </TableCell>

                  {/* MFA */}
                  <TableCell>
                    {user.mfa?.enabled ? (
                      <Tooltip title="تحقق ثنائي مفعّل">
                        <MFAIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      </Tooltip>
                    ) : (
                      <Chip
                        label="غير مفعّل"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10, height: 18, color: 'text.disabled' }}
                      />
                    )}
                  </TableCell>

                  {/* Last login */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatLastLogin(user.lastLogin)}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Custom permissions count */}
                  <TableCell>
                    {permCount > 0 ? (
                      <Chip
                        label={`+${permCount} مخصص`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontSize: 10, height: 18 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  );
};

export default UsersAccessTab;
