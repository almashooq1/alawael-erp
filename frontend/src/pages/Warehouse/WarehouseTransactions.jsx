/**
 * Warehouse Transactions — حركات المستودع
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getTransactions, approveTransaction, completeTransaction } from '../../services/warehouse.service';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import CheckCircle from '@mui/icons-material/CheckCircle';

const TX_TYPE = { receive: 'استلام', issue: 'صرف', transfer: 'تحويل', return: 'إرجاع', adjustment: 'تسوية', disposal: 'إتلاف', count: 'جرد' };
const TX_STATUS = { draft: 'مسودة', pending: 'معلق', approved: 'معتمد', completed: 'مكتمل', rejected: 'مرفوض', cancelled: 'ملغي' };
const STATUS_COLOR = { draft: 'default', pending: 'warning', approved: 'info', completed: 'success', rejected: 'error', cancelled: 'default' };

export default function WarehouseTransactions() {
  const theme = useTheme();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      setTxs(await getTransactions(params));
    } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, [filterType, filterStatus]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleApprove = async (id) => { try { await approveTransaction(id); fetch(); } catch { setError('خطأ في الاعتماد'); } };
  const handleComplete = async (id) => { try { await completeTransaction(id); fetch(); } catch { setError('خطأ في الإكمال'); } };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>حركات المستودع</Typography>
          <Typography variant="body2" color="text.secondary">استلام، صرف، تحويل، جرد</Typography>
        </Box>
        <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={filterType} label="النوع" onChange={(e) => setFilterType(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(TX_TYPE).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={filterStatus} label="الحالة" onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(TX_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip label={`${txs.length} حركة`} variant="outlined" />
      </Paper>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box> : txs.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Typography color="text.secondary">لا توجد حركات</Typography>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم الحركة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأصناف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القيمة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {txs.map((tx, i) => (
                <TableRow key={tx._id || i}>
                  <TableCell><Typography fontWeight={600} variant="body2">{tx.transactionNumber}</Typography></TableCell>
                  <TableCell><Chip label={TX_TYPE[tx.type] || tx.type} size="small" variant="outlined" /></TableCell>
                  <TableCell>{tx.items?.length || 0}</TableCell>
                  <TableCell>{(tx.totalValue || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                  <TableCell><Chip label={TX_STATUS[tx.status] || tx.status} size="small" color={STATUS_COLOR[tx.status] || 'default'} /></TableCell>
                  <TableCell>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell align="center">
                    {tx.status === 'pending' && (
                      <Tooltip title="اعتماد"><IconButton size="small" color="info" onClick={() => handleApprove(tx._id)}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                    )}
                    {tx.status === 'approved' && (
                      <Tooltip title="إكمال"><IconButton size="small" color="success" onClick={() => handleComplete(tx._id)}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
