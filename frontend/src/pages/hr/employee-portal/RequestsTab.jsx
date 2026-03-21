import {
  Paper,
} from '@mui/material';
import {
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';

const TYPE_LABELS = {
  salary_certificate: 'شهادة راتب',
  letter: 'خطاب تعريف',
  vacation_settlement: 'تسوية إجازة',
  experience_certificate: 'شهادة خبرة',
};

const STATUS_MAP = {
  approved: { label: 'تمت الموافقة', color: 'success' },
  pending: { label: 'قيد المراجعة', color: 'warning' },
  rejected: { label: 'مرفوض', color: 'error' },
};

/**
 * RequestsTab – Requests table with status chips and a "new request" button.
 */
export default function RequestsTab({ requests = [], onOpenDialog }) {
  return (
    <Box>
      {/* ─── Action Row ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onOpenDialog}
        >
          طلب جديد
        </Button>
      </Box>

      {/* ─── Table ─── */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>نوع الطلب</TableCell>
              <TableCell>الوصف</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell align="center">الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Box sx={{ py: 3.5, textAlign: 'center' }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      لا توجد طلبات حتى الآن
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => {
                const st = STATUS_MAP[req.status] || {
                  label: req.status,
                  color: 'default',
                };
                return (
                  <TableRow key={req._id} hover>
                    <TableCell>
                      <Chip
                        label={TYPE_LABELS[req.type] || req.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{req.description}</TableCell>
                    <TableCell>
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString('ar-SA')
                        : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={st.label} color={st.color} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
