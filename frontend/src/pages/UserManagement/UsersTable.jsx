/**
 * UsersTable — جدول المستخدمين مع التحديد والإجراءات
 */


import { useState } from 'react';


import { getRoleColor, getRoleLabel } from './constants';

const COLUMNS = [
  { id: 'fullName', label: 'المستخدم', sortable: true },
  { id: 'email', label: 'البريد الإلكتروني', sortable: true },
  { id: 'phone', label: 'الهاتف', sortable: false },
  { id: 'role', label: 'الدور', sortable: true },
  { id: 'isActive', label: 'الحالة', sortable: true },
  { id: 'lastLogin', label: 'آخر دخول', sortable: true },
  { id: 'createdAt', label: 'تاريخ الإنشاء', sortable: true },
  { id: 'actions', label: 'الإجراءات', sortable: false },
];

const formatDate = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatDateTime = (date) => {
  if (!date) return 'لم يسجل دخول';
  try {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const UsersTable = ({
  users,
  loading,
  pagination,
  sortBy,
  sortOrder,
  selectedIds,
  onSort,
  onPageChange,
  onLimitChange,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onView,
  onDelete,
  onToggleStatus,
  onResetPassword,
  onUnlock,
  onPermissions,
}) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser] = useState(null);

  const handleMenuOpen = (event, user) => {
    setMenuAnchor(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuUser(null);
  };

  const allSelected = users.length > 0 && selectedIds.length === users.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < users.length;

  if (loading) {
    return (
      <Card>
        <CardHeader title="المستخدمون" />
        <TableContainer>
          <Table>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {COLUMNS.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">المستخدمون</Typography>
            <Chip label={pagination.total} size="small" color="primary" variant="outlined" />
          </Box>
        }
      />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onSelectAll}
                  size="small"
                />
              </TableCell>
              {COLUMNS.map((col) => (
                <TableCell key={col.id} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortOrder : 'asc'}
                      onClick={() => onSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 1} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    لا يوجد مستخدمون مطابقون للبحث
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const userId = user._id || user.id;
                const isSelected = selectedIds.includes(userId);
                const isLocked = user.isLocked || (user.lockUntil && new Date(user.lockUntil) > new Date());

                return (
                  <TableRow
                    key={userId}
                    hover
                    selected={isSelected}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onView(user)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleSelect(userId)}
                        size="small"
                      />
                    </TableCell>

                    {/* المستخدم */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: getRoleColor(user.role),
                            fontSize: 14,
                            fontWeight: 'bold',
                          }}
                        >
                          {(user.fullName || user.username || '?').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {user.fullName || 'بدون اسم'}
                          </Typography>
                          {user.username && (
                            <Typography variant="caption" color="text.secondary">
                              @{user.username}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* البريد */}
                    <TableCell>
                      <Typography variant="body2" dir="ltr" sx={{ textAlign: 'right' }}>
                        {user.email || '—'}
                      </Typography>
                    </TableCell>

                    {/* الهاتف */}
                    <TableCell>
                      <Typography variant="body2" dir="ltr" sx={{ textAlign: 'right' }}>
                        {user.phone || '—'}
                      </Typography>
                    </TableCell>

                    {/* الدور */}
                    <TableCell>
                      <Chip
                        label={user.roleLabel || getRoleLabel(user.role)}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(user.role) + '20',
                          color: getRoleColor(user.role),
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      />
                    </TableCell>

                    {/* الحالة */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isLocked ? (
                          <Chip
                            icon={<LockedIcon sx={{ fontSize: 14 }} />}
                            label="مقفل"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ) : user.isActive ? (
                          <Chip
                            icon={<ActiveIcon sx={{ fontSize: 14 }} />}
                            label="نشط"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            icon={<InactiveIcon sx={{ fontSize: 14 }} />}
                            label="معطل"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* آخر دخول */}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(user.lastLogin)}
                      </Typography>
                    </TableCell>

                    {/* تاريخ الإنشاء */}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(user.createdAt)}
                      </Typography>
                    </TableCell>

                    {/* الإجراءات */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.25 }}>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => onView(user)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="primary" onClick={() => onEdit(user)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="المزيد">
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, user)}>
                            <MoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={pagination.total}
        page={pagination.page - 1}
        rowsPerPage={pagination.limit}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage="عدد الصفوف:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
      />

      {/* قائمة الإجراءات */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (menuUser) onToggleStatus(menuUser._id || menuUser.id);
          }}
        >
          <ListItemIcon>
            <ToggleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{menuUser?.isActive ? 'تعطيل' : 'تفعيل'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (menuUser) onResetPassword(menuUser);
          }}
        >
          <ListItemIcon>
            <ResetPassIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>إعادة تعيين كلمة المرور</ListItemText>
        </MenuItem>
        {(menuUser?.isLocked || (menuUser?.lockUntil && new Date(menuUser.lockUntil) > new Date())) && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              if (menuUser) onUnlock(menuUser._id || menuUser.id);
            }}
          >
            <ListItemIcon>
              <UnlockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>فك قفل الحساب</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (menuUser) onPermissions(menuUser);
          }}
        >
          <ListItemIcon>
            <PermIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>الصلاحيات</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            if (menuUser) onDelete(menuUser._id || menuUser.id, menuUser.fullName);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>تعطيل الحساب</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default UsersTable;
