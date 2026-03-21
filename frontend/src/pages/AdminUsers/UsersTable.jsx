/**
 * UsersTable — Paginated table of users with actions
 * جدول المستخدمين مع الترقيم والإجراءات
 */


import { brandColors, surfaceColors } from '../../theme/palette';
import {
  Box,
  Card,
  CardHeader,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const UsersTable = ({
  filteredUsers,
  page,
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  handleOpenDialog,
  handleDeleteUser,
}) => (
  <Card>
    <CardHeader title={`المستخدمون (${filteredUsers.length})`} />
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
            <TableCell sx={{ fontWeight: 'bold' }}>الاسم</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>البريد الإلكتروني</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>الهاتف</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>الدور</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الإنشاء</TableCell>
            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => (
            <TableRow key={user.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: brandColors.primaryStart,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >
                    {(user.name || '?').charAt(0)}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {user.name || 'بدون اسم'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{user.email}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{user.phone}</Typography>
              </TableCell>
              <TableCell>
                <Chip label={user.role} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip
                  label={user.status}
                  color={user.status === 'نشط' ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="caption">{user.createdDate}</Typography>
              </TableCell>
              <TableCell sx={{ textAlign: 'center' }}>
                <Tooltip title="تعديل">
                  <IconButton aria-label="تعديل" size="small" onClick={() => handleOpenDialog(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                  <IconButton
                    aria-label="حذف"
                    size="small"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      rowsPerPageOptions={[5, 10, 25]}
      component="div"
      count={filteredUsers.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage="صفوف لكل صفحة:"
    />
  </Card>
);

export default UsersTable;
