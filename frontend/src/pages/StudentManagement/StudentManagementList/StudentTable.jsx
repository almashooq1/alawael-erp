

import { useNavigate } from 'react-router-dom';
import { gradients } from 'theme/palette';
import {
  STATUS_MAP,
  SEVERITY_MAP,
  DISABILITY_LABELS,
  HEAD_CELLS,
} from './studentManagement.constants';

/** Sortable table with pagination, skeleton, and empty state */
const StudentTable = ({
  loading,
  paginatedStudents,
  filteredStudents,
  orderBy,
  order,
  handleRequestSort,
  page,
  setPage,
  rowsPerPage,
  setRowsPerPage,
  searchQuery,
  statusFilter,
  disabilityFilter,
  setDeleteDialog,
}) => {
  const navigate = useNavigate();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f7ff' }}>
              {HEAD_CELLS.map((cell) => (
                <TableCell key={cell.id} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {cell.sortable ? (
                    <TableSortLabel
                      active={orderBy === cell.id}
                      direction={orderBy === cell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(cell.id)}
                    >
                      {cell.label}
                    </TableSortLabel>
                  ) : (
                    cell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {HEAD_CELLS.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={HEAD_CELLS.length} align="center" sx={{ py: 8 }}>
                  <PersonSearch sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {searchQuery || statusFilter !== 'all' || disabilityFilter !== 'all'
                      ? 'لا توجد نتائج مطابقة'
                      : 'لا يوجد طلاب مسجلون'}
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                    {searchQuery || statusFilter !== 'all' || disabilityFilter !== 'all'
                      ? 'جرّب تعديل معايير البحث'
                      : 'ابدأ بتسجيل أول طالب'}
                  </Typography>
                  {!searchQuery && statusFilter === 'all' && disabilityFilter === 'all' && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => navigate('/student-registration')}
                      sx={{ background: gradients.primary, borderRadius: 2 }}
                    >
                      تسجيل طالب جديد
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedStudents.map((student) => {
                const firstName =
                  student.personalInfo?.firstName?.ar || student.personalInfo?.firstName || '';
                const lastName =
                  student.personalInfo?.lastName?.ar || student.personalInfo?.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim() || '—';
                const nid = student.personalInfo?.nationalId || '—';
                const dtype = student.disabilityInfo?.primaryType;
                const sev = student.disabilityInfo?.severity;
                const statusInfo = STATUS_MAP[student.status] || {
                  label: student.status || '—',
                  color: 'default',
                };
                const sevInfo = SEVERITY_MAP[sev];
                const programs = student.programs || [];
                const enrollDate = student.center?.enrollmentDate || student.createdAt;

                return (
                  <TableRow
                    key={student._id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'rgba(102,126,234,0.03)' },
                      transition: 'background 0.2s',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            background: gradients.primary,
                            fontSize: 14,
                            fontWeight: 'bold',
                          }}
                        >
                          {firstName?.charAt(0) || '؟'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {fullName}
                          </Typography>
                          {student.studentId && (
                            <Typography variant="caption" color="text.disabled">
                              {student.studentId}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {nid}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {DISABILITY_LABELS[dtype] || dtype || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {sevInfo ? (
                        <Chip
                          label={sevInfo.label}
                          size="small"
                          sx={{
                            bgcolor: `${sevInfo.color}15`,
                            color: sevInfo.color,
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                          }}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {programs.slice(0, 2).map((p, i) => (
                          <Chip
                            key={i}
                            label={p.programName || p.programType}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        ))}
                        {programs.length > 2 && (
                          <Chip
                            label={`+${programs.length - 2}`}
                            size="small"
                            color="default"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        )}
                        {programs.length === 0 && (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        size="small"
                        color={statusInfo.color}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {enrollDate ? new Date(enrollDate).toLocaleDateString('ar-SA') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="عرض">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/student-portal/${student._id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="التقرير الشامل">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() =>
                              navigate(`/student-report/${student.studentId || student._id}`)
                            }
                          >
                            <AssessmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() =>
                              navigate(`/student-registration?edit=${student._id}`)
                            }
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, student })}
                          >
                            <Delete fontSize="small" />
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

      {filteredStudents.length > 0 && (
        <TablePagination
          component="div"
          count={filteredStudents.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          sx={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        />
      )}
    </Paper>
  );
};

export default StudentTable;
