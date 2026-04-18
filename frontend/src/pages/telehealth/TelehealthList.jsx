/**
 * TelehealthList — /telehealth page.
 *
 * Shows my upcoming telehealth sessions. Usable by therapist, guardian, admin.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  IconButton,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VideocamIcon from '@mui/icons-material/Videocam';
import api from '../../services/api.client';

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

const STATUS_LABELS = {
  SCHEDULED: 'مجدولة',
  CONFIRMED: 'مؤكَّدة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
};

export default function TelehealthList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get('/telehealth-v2/my/upcoming');
      setItems(data?.items || []);
    } catch (e) {
      setErr(e?.response?.data?.message || 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            جلسات الفيديو القادمة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الجلسات المفعَّل بها الطب عن بُعد — انضم إلى الاجتماع في الوقت المحدد.
          </Typography>
        </Box>
        <IconButton onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>
          {err}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الوقت</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>المعالج</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">الإجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد جلسات فيديو قادمة.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(s => (
              <TableRow key={s._id} hover>
                <TableCell>{formatDate(s.date)}</TableCell>
                <TableCell>
                  {s.startTime} → {s.endTime}
                </TableCell>
                <TableCell>{s.sessionType}</TableCell>
                <TableCell>{fullName(s.beneficiary)}</TableCell>
                <TableCell>{fullName(s.therapist)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[s.status] || s.status}
                    color={s.status === 'IN_PROGRESS' ? 'warning' : 'primary'}
                    variant={s.status === 'IN_PROGRESS' ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="الدخول إلى الغرفة">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VideocamIcon />}
                      component={RouterLink}
                      to={`/telehealth/${s._id}`}
                    >
                      انضمام
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
