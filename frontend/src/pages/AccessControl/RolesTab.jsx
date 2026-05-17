/**
 * RolesTab — إدارة الأدوار
 * Full role management: list, create, edit, clone, delete, with user-count stats
 */
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  Grid,
  TextField,
  InputAdornment,
  alpha,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Shield as ShieldIcon,
  MoreVert as MoreIcon,
  LockOutlined as SystemIcon,
} from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { SYSTEM_ROLES, DEFAULT_ROLE_PERMISSIONS } from './accessControl.constants';
import RoleFormDialog from './RoleFormDialog';

// ─── Role card ────────────────────────────────────────────────────────────────
const RoleCard = ({ role, userCount, permCount, isSystem, onEdit, onClone, onDelete }) => {
  const [anchor, setAnchor] = useState(null);

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(role.color, 0.25)}`,
        borderRadius: 3,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: `0 4px 20px ${alpha(role.color, 0.15)}`,
          transform: 'translateY(-2px)',
          borderColor: role.color,
        },
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Color bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: role.color,
          borderRadius: '12px 12px 0 0',
        }}
      />

      <CardContent sx={{ pt: 2.5 }}>
        {/* Header */}
        <Box
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: alpha(role.color, 0.12),
                color: role.color,
                width: 40,
                height: 40,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {role.label[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                {role.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {role.value}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isSystem && (
              <Tooltip title="دور نظام (محمي)">
                <SystemIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </Tooltip>
            )}
            <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              <strong>{userCount ?? '—'}</strong> مستخدم
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ShieldIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              <strong>{permCount}</strong> صلاحية
            </Typography>
          </Box>
        </Box>

        {/* Level badge */}
        <Chip
          label={`مستوى ${role.level ?? '—'}`}
          size="small"
          sx={{
            bgcolor: alpha(role.color, 0.1),
            color: role.color,
            fontWeight: 600,
            fontSize: 11,
            height: 20,
          }}
        />
      </CardContent>

      {/* Context menu */}
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onEdit(role);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          تعديل
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onClone(role);
          }}
        >
          <ListItemIcon>
            <CloneIcon fontSize="small" />
          </ListItemIcon>
          استنساخ
        </MenuItem>
        {!isSystem && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onDelete(role.value);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            حذف
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

// ─── Permission count per role (using DEFAULT_ROLE_PERMISSIONS as baseline) ───
const getPermCount = roleValue => (DEFAULT_ROLE_PERMISSIONS[roleValue] || []).length;

// ─── RolesTab ─────────────────────────────────────────────────────────────────
const RolesTab = ({ customRoles = [], users = [], loading, onRoleCreate, onRoleDelete }) => {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Build user-count map
  const userCountByRole = useMemo(() => {
    const map = {};
    users.forEach(u => {
      map[u.role] = (map[u.role] || 0) + 1;
    });
    return map;
  }, [users]);

  // Merge system + custom roles
  const allRoles = useMemo(
    () => [
      ...SYSTEM_ROLES.map(r => ({ ...r, isSystem: true })),
      ...customRoles.map(r => ({
        value: r._id || r.key || r.value,
        label: r.name || r.label,
        color: r.color || '#78909c',
        level: r.level ?? 99,
        isSystem: false,
      })),
    ],
    [customRoles]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allRoles;
    const q = search.toLowerCase();
    return allRoles.filter(
      r => r.label.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)
    );
  }, [allRoles, search]);

  const handleEdit = role => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleClone = role => {
    setEditingRole({
      clone: true,
      baseRole: role.value,
      permissions: DEFAULT_ROLE_PERMISSIONS[role.value] || [],
    });
    setFormOpen(true);
  };

  const handleSave = data => {
    onRoleCreate && onRoleCreate(data);
    setFormOpen(false);
    setEditingRole(null);
  };

  // Stats
  const totalRoles = allRoles.length;
  const systemRoles = SYSTEM_ROLES.length;
  const customRolesCount = customRoles.length;
  const totalAssigned = users.filter(u => u.role).length;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            إدارة الأدوار
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalRoles} دور ({systemRoles} نظام، {customRolesCount} مخصص)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingRole(null);
              setFormOpen(true);
            }}
          >
            دور جديد
          </Button>
        </Box>
      </Box>

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label={`${totalRoles} إجمالي الأدوار`}
          size="small"
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`${totalAssigned} مستخدم معيّن`}
          size="small"
          color="success"
          variant="outlined"
        />
        <Chip label={`${systemRoles} أدوار النظام`} size="small" variant="outlined" />
        {customRolesCount > 0 && (
          <Chip
            label={`${customRolesCount} أدوار مخصصة`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Role grid */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton height={150} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(role => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={role.value}>
              <RoleCard
                role={role}
                userCount={userCountByRole[role.value] || 0}
                permCount={getPermCount(role.value)}
                isSystem={role.isSystem}
                onEdit={handleEdit}
                onClone={handleClone}
                onDelete={onRoleDelete}
              />
            </Grid>
          ))}
          {filtered.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <ShieldIcon
                  sx={{ fontSize: 48, color: 'text.disabled', display: 'block', mx: 'auto', mb: 1 }}
                />
                <Typography color="text.secondary">لا توجد أدوار مطابقة</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Form dialog */}
      <RoleFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRole(null);
        }}
        editingRole={editingRole}
        onSave={handleSave}
        basePermissions={editingRole?.permissions}
      />
    </Box>
  );
};

export default RolesTab;
