/**
 * AdminUsers — Main orchestrator (formerly AdminUsersManagement.js 668L → 6 files)
 * صفحة إدارة المستخدمين — المنسق الرئيسي
 */





import { gradients } from '../../theme/palette';
import useAdminUsers from './useAdminUsers';

const AdminUsersManagement = () => {
  const {
    users,
    filteredUsers,
    page,
    rowsPerPage,
    searchTerm,
    roleFilter,
    statusFilter,
    viewMode,
    setViewMode,
    openDialog,
    editingUser,
    loading,
    error,
    confirmState,
    formData,
    setFormData,
    handleSearch,
    handleRoleFilter,
    handleStatusFilter,
    handleChangePage,
    handleChangeRowsPerPage,
    handleOpenDialog,
    handleCloseDialog,
    handleSaveUser,
    handleDeleteUser,
    handleImport,
    handleExport,
  } = useAdminUsers();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                إدارة المستخدمين
              </Typography>
              <Typography variant="body2">إدارة جميع المستخدمين في النظام</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="info"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExport('excel')}
            >
              تصدير Excel
            </Button>
            <Button
              variant="outlined"
              color="info"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExport('csv')}
            >
              تصدير CSV
            </Button>
            <Button
              variant="outlined"
              color="success"
              size="small"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              استيراد
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={handleImport}
                aria-label="استيراد ملف مستخدمين"
              />
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              إضافة مستخدم
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.primary, color: 'white' }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي المستخدمين
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.warning, color: 'white' }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المستخدمون النشطون
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.filter(u => u.status === 'نشط').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.info, color: 'white' }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المعالجون
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.filter(u => u.role === 'معالج').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: gradients.success, color: 'white' }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                الآباء
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.filter(u => u.role === 'ولي أمر').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VisibilityIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الدور</InputLabel>
                <Select value={roleFilter} label="الدور" onChange={handleRoleFilter}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="إدارة">إدارة</MenuItem>
                  <MenuItem value="معالج">معالج</MenuItem>
                  <MenuItem value="ولي أمر">ولي أمر</MenuItem>
                  <MenuItem value="طالب">طالب</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select value={statusFilter} label="الحالة" onChange={handleStatusFilter}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="نشط">نشط</MenuItem>
                  <MenuItem value="معطل">معطل</MenuItem>
                  <MenuItem value="قيد الانتظار">قيد الانتظار</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_e, newMode) => setViewMode(newMode)}
                fullWidth
                size="small"
              >
                <ToggleButton value="table">
                  <ViewWeekIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="grid">
                  <ViewAgendaIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <UsersTable
        filteredUsers={filteredUsers}
        page={page}
        rowsPerPage={rowsPerPage}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        handleOpenDialog={handleOpenDialog}
        handleDeleteUser={handleDeleteUser}
      />

      {/* User Form Dialog */}
      <UserFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        editingUser={editingUser}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveUser}
      />
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default AdminUsersManagement;
