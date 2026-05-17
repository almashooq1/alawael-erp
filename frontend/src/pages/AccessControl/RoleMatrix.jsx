/**
 * RoleMatrix — مصفوفة الأدوار والصلاحيات
 * Interactive permission matrix: rows = roles, columns = modules
 * Supports view / edit mode with optimistic UI updates
 */
import {
  Box,
  Card,
  Typography,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  Button,
  alpha,
  useTheme,
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
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CrossIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { useState, useMemo } from 'react';
import {
  SYSTEM_ROLES,
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  RISK_CONFIG,
} from './accessControl.constants';
import RoleFormDialog from './RoleFormDialog';

// ─── Permission cell ──────────────────────────────────────────────────────────
const PermCell = ({ granted, editMode, onChange, riskLevel }) => {
  const theme = useTheme();
  const riskCfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;

  if (editMode) {
    return (
      <Checkbox
        checked={granted}
        onChange={e => onChange(e.target.checked)}
        size="small"
        sx={{
          p: 0.3,
          color: granted ? riskCfg.color : 'action.disabled',
          '&.Mui-checked': { color: riskCfg.color },
        }}
      />
    );
  }
  return granted ? (
    <CheckIcon sx={{ fontSize: 18, color: riskCfg.color }} />
  ) : (
    <CrossIcon sx={{ fontSize: 14, color: alpha(theme.palette.text.disabled, 0.4) }} />
  );
};

// ─── Module column group header ───────────────────────────────────────────────
const ModuleHeader = ({ module, expanded, onToggle }) => {
  const theme = useTheme();
  return (
    <TableCell
      colSpan={module.permissions.length}
      align="center"
      sx={{
        bgcolor: alpha(module.color, 0.08),
        borderLeft: `3px solid ${module.color}`,
        borderRight: `1px solid ${theme.palette.divider}`,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        py: 0.8,
      }}
      onClick={onToggle}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Typography variant="caption" fontWeight={700} color={module.color}>
          {module.label}
        </Typography>
        {expanded ? (
          <CollapseIcon sx={{ fontSize: 14, color: module.color }} />
        ) : (
          <ExpandIcon sx={{ fontSize: 14, color: module.color }} />
        )}
      </Box>
    </TableCell>
  );
};

// ─── Role Row ─────────────────────────────────────────────────────────────────
const RoleRow = ({
  roleKey,
  label,
  color,
  permissions,
  editMode,
  expandedModules,
  onChange,
  onDelete,
  onClone,
  isCustom,
}) => {
  const theme = useTheme();
  return (
    <TableRow
      sx={{
        '&:hover': { bgcolor: alpha(color, 0.04) },
        '&:last-child td': { borderBottom: 0 },
      }}
    >
      {/* Role label cell */}
      <TableCell
        sx={{
          position: 'sticky',
          left: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          borderRight: `2px solid ${alpha(color, 0.3)}`,
          minWidth: 180,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Typography variant="body2" fontWeight={600} noWrap>
            {label}
          </Typography>
          {editMode && isCustom && (
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
              <Tooltip title="استنساخ">
                <IconButton size="small" onClick={() => onClone(roleKey)}>
                  <CloneIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton size="small" color="error" onClick={() => onDelete(roleKey)}>
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </TableCell>

      {/* Permission cells per module */}
      {PERMISSION_MODULES.map(module =>
        expandedModules.has(module.key) ? (
          module.permissions.map(perm => (
            <TableCell
              key={perm.key}
              align="center"
              sx={{
                p: 0.5,
                borderRight: `1px solid ${theme.palette.divider}`,
                bgcolor: permissions.has(perm.key)
                  ? alpha(RISK_CONFIG[perm.risk]?.color || '#000', 0.04)
                  : 'transparent',
              }}
            >
              <PermCell
                granted={permissions.has(perm.key)}
                editMode={editMode}
                riskLevel={perm.risk}
                onChange={val => onChange(roleKey, perm.key, val)}
              />
            </TableCell>
          ))
        ) : (
          // Collapsed module: show summary chip
          <TableCell
            key={module.key}
            align="center"
            sx={{
              p: 0.5,
              borderRight: `1px solid ${theme.palette.divider}`,
            }}
          >
            {(() => {
              const granted = module.permissions.filter(p => permissions.has(p.key)).length;
              const total = module.permissions.length;
              return (
                <Chip
                  label={`${granted}/${total}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    bgcolor:
                      granted === total
                        ? alpha('#43a047', 0.15)
                        : granted === 0
                          ? alpha('#e0e0e0', 0.5)
                          : alpha('#fb8c00', 0.15),
                    color: granted === total ? '#43a047' : granted === 0 ? '#9e9e9e' : '#fb8c00',
                  }}
                />
              );
            })()}
          </TableCell>
        )
      )}
    </TableRow>
  );
};

// ─── RoleMatrix ───────────────────────────────────────────────────────────────
const RoleMatrix = ({ customRoles = [], onRoleCreate, onRoleUpdate, onRoleDelete, saving }) => {
  const theme = useTheme();

  // Which modules are expanded (all by default collapsed for compact view)
  const [expandedModules, setExpandedModules] = useState(new Set(['users', 'clinic']));
  const [editMode, setEditMode] = useState(false);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Local editable permissions state: map roleKey → Set<permKey>
  const [localPerms, setLocalPerms] = useState(() => {
    const map = {};
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      map[role] = new Set(perms);
    }
    return map;
  });

  const toggleModule = key => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handlePermChange = (roleKey, permKey, val) => {
    setLocalPerms(prev => {
      const next = { ...prev };
      const set = new Set(prev[roleKey] || []);
      val ? set.add(permKey) : set.delete(permKey);
      next[roleKey] = set;
      return next;
    });
  };

  const handleSave = () => {
    // Convert sets to arrays and persist via callback
    const updates = {};
    for (const [role, set] of Object.entries(localPerms)) {
      updates[role] = [...set];
    }
    onRoleUpdate && onRoleUpdate(updates);
    setEditMode(false);
  };

  const handleClone = roleKey => {
    const clonePerms = [...(localPerms[roleKey] || [])];
    setEditingRole({ clone: true, baseRole: roleKey, permissions: clonePerms });
    setRoleFormOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (deleteConfirm) {
      onRoleDelete && onRoleDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // All rows: system roles + custom roles
  const allRoles = useMemo(
    () => [
      ...SYSTEM_ROLES.map(r => ({ ...r, isCustom: false })),
      ...customRoles.map(r => ({
        value: r._id || r.key || r.value,
        label: r.name || r.label,
        color: r.color || '#78909c',
        level: 99,
        isCustom: true,
      })),
    ],
    [customRoles]
  );

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            مصفوفة الأدوار والصلاحيات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            انقر على رأس الوحدة للتوسيع / الطي
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {editMode ? (
            <>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                حفظ التغييرات
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloseIcon />}
                onClick={() => setEditMode(false)}
              >
                إلغاء
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
              >
                تعديل
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingRole(null);
                  setRoleFormOpen(true);
                }}
              >
                دور جديد
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Matrix Table */}
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
      >
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              {/* Module headers */}
              <TableRow>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    bgcolor: theme.palette.grey[50],
                    minWidth: 180,
                    fontWeight: 700,
                  }}
                >
                  الدور / الوحدة
                </TableCell>
                {PERMISSION_MODULES.map(m => (
                  <ModuleHeader
                    key={m.key}
                    module={m}
                    expanded={expandedModules.has(m.key)}
                    onToggle={() => toggleModule(m.key)}
                  />
                ))}
              </TableRow>

              {/* Permission sub-headers (only for expanded modules) */}
              <TableRow>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    bgcolor: theme.palette.grey[50],
                  }}
                />
                {PERMISSION_MODULES.map(m =>
                  expandedModules.has(m.key) ? (
                    m.permissions.map(p => (
                      <TableCell
                        key={p.key}
                        align="center"
                        sx={{
                          py: 0.5,
                          px: 0.3,
                          borderRight: `1px solid ${theme.palette.divider}`,
                          bgcolor: alpha(RISK_CONFIG[p.risk]?.color || '#000', 0.05),
                        }}
                      >
                        <Tooltip title={`مستوى الخطر: ${RISK_CONFIG[p.risk]?.label}`}>
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{ fontSize: 10, display: 'block' }}
                          >
                            {p.label}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    ))
                  ) : (
                    <TableCell
                      key={m.key}
                      align="center"
                      sx={{ py: 0.5, borderRight: `1px solid ${theme.palette.divider}` }}
                    />
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {allRoles.map(role => (
                <RoleRow
                  key={role.value}
                  roleKey={role.value}
                  label={role.label}
                  color={role.color}
                  permissions={localPerms[role.value] || new Set()}
                  editMode={editMode}
                  expandedModules={expandedModules}
                  onChange={handlePermChange}
                  onDelete={key => setDeleteConfirm(key)}
                  onClone={handleClone}
                  isCustom={role.isCustom}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Role Form Dialog */}
      <RoleFormDialog
        open={roleFormOpen}
        onClose={() => setRoleFormOpen(false)}
        editingRole={editingRole}
        onSave={data => {
          onRoleCreate && onRoleCreate(data);
          setRoleFormOpen(false);
        }}
        basePermissions={editingRole?.permissions}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل تريد حذف الدور &quot;<strong>{deleteConfirm}</strong>&quot;؟ سيتم إزالة هذا الدور من
            جميع المستخدمين المعينين له.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirmed}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleMatrix;
