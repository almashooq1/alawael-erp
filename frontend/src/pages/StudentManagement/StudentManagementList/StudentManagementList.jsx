/**
 * StudentManagementList — صفحة إدارة الطلاب (slim orchestrator)
 *
 * Sub-modules: useStudentList, studentManagement.constants,
 * studentManagement.styles, StudentStatsCards, StudentToolbar,
 * StudentTable, DeleteStudentDialog
 */
import useStudentList from './useStudentList';

const StudentManagementList = () => {
  const {
    students,
    loading,
    error,
    filteredStudents,
    paginatedStudents,
    statCards,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    disabilityFilter,
    setDisabilityFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    orderBy,
    order,
    handleRequestSort,
    deleteDialog,
    setDeleteDialog,
    handleDelete,
    snackbar,
    setSnackbar,
    fetchStudents,
    handleExport,
  } = useStudentList();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9ff', pb: 6 }}>
      {/* Header */}
      <GradientHeader>
        <Slide in direction="down" timeout={600}>
          <Box>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto', mb: 2 }}>
              <School sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
              إدارة الطلاب والمستفيدين
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              عرض وإدارة بيانات جميع الطلاب المسجلين في النظام
            </Typography>
          </Box>
        </Slide>
      </GradientHeader>

      <Container maxWidth="xl" sx={{ mt: -3, position: 'relative', zIndex: 2 }}>
        {/* Stats */}
        <StudentStatsCards statCards={statCards} loading={loading} />

        {/* Toolbar + filters */}
        <StudentToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          disabilityFilter={disabilityFilter}
          setDisabilityFilter={setDisabilityFilter}
          setPage={setPage}
          fetchStudents={fetchStudents}
          handleExport={handleExport}
          filteredStudents={filteredStudents}
          students={students}
          loading={loading}
        />

        {/* Error */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchStudents}>
                إعادة المحاولة
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Table */}
        <StudentTable
          loading={loading}
          paginatedStudents={paginatedStudents}
          filteredStudents={filteredStudents}
          orderBy={orderBy}
          order={order}
          handleRequestSort={handleRequestSort}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          disabilityFilter={disabilityFilter}
          setDeleteDialog={setDeleteDialog}
        />
      </Container>

      {/* Delete Confirmation Dialog */}
      <DeleteStudentDialog
        open={deleteDialog.open}
        student={deleteDialog.student}
        onClose={() => setDeleteDialog({ open: false, student: null })}
        onConfirm={handleDelete}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentManagementList;
