/**
 * Finance Operations Page — العمليات المالية
 * AlAwael ERP — Invoices, Cheques, Petty Cash, Journal Entries, etc.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Stack,
  Alert,
  IconButton,
} from '@mui/material';
import {
  AccountBalance as FinanceIcon,
  Receipt as InvoiceIcon,
  MenuBook as JournalIcon,
  AccountBalanceWallet as PettyCashIcon,
  TrendingUp as CashFlowIcon,
  CreditCard as ChequeIcon,
  SyncAlt as ReconIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import financeOperationsService from '../../services/financeOperationsService';

const STATUS_MAP = {
  DRAFT: { label: 'مسودة', color: 'default' },
  SENT: { label: 'مرسلة', color: 'info' },
  PAID: { label: 'مدفوعة', color: 'success' },
  OVERDUE: { label: 'متأخرة', color: 'error' },
  CANCELLED: { label: 'ملغاة', color: 'default' },
  PENDING: { label: 'معلّق', color: 'warning' },
  POSTED: { label: 'مرحّل', color: 'success' },
  CLEARED: { label: 'تم الصرف', color: 'success' },
  BOUNCED: { label: 'مرتجع', color: 'error' },
  COMPLETED: { label: 'مكتمل', color: 'success' },
  OPEN: { label: 'مفتوح', color: 'info' },
  RECONCILED: { label: 'مطابق', color: 'success' },
};

const getStatusChip = status => {
  const cfg = STATUS_MAP[status] || { label: status || '—', color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

const TAB_CONFIG = [
  { label: 'الفواتير', icon: <InvoiceIcon />, key: 'invoices' },
  { label: 'القيود المحاسبية', icon: <JournalIcon />, key: 'journalEntries' },
  { label: 'الصندوق النثري', icon: <PettyCashIcon />, key: 'pettyCash' },
  { label: 'التدفقات النقدية', icon: <CashFlowIcon />, key: 'cashFlows' },
  { label: 'الشيكات', icon: <ChequeIcon />, key: 'cheques' },
  { label: 'التسويات البنكية', icon: <ReconIcon />, key: 'bankReconciliations' },
];

export default function FinanceOperationsPage() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const svc = financeOperationsService[TAB_CONFIG[tab].key];
      const res = await svc.getAll();
      setData(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderTableContent = () => {
    const tabKey = TAB_CONFIG[tab].key;

    const columnsMap = {
      invoices: ['رقم الفاتورة', 'العميل', 'المبلغ', 'تاريخ الاستحقاق', 'الحالة'],
      journalEntries: ['رقم القيد', 'الوصف', 'مدين', 'دائن', 'الحالة'],
      pettyCash: ['الرقم', 'الغرض', 'المبلغ', 'التاريخ', 'الحالة'],
      cashFlows: ['الرقم', 'النوع', 'المبلغ', 'التاريخ', 'الفئة'],
      cheques: ['رقم الشيك', 'المستفيد', 'المبلغ', 'تاريخ الاستحقاق', 'الحالة'],
      bankReconciliations: ['الحساب', 'الفترة', 'رصيد الدفتر', 'رصيد البنك', 'الحالة'],
    };

    const columns = columnsMap[tabKey] || [];

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell key={col}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    لا توجد بيانات
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map(item => (
                <TableRow key={item._id} hover>
                  {tabKey === 'invoices' && (
                    <>
                      <TableCell>{item.invoiceNumber || '—'}</TableCell>
                      <TableCell>{item.customer?.name || item.customerName || '—'}</TableCell>
                      <TableCell>{item.totalAmount?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                  {tabKey === 'journalEntries' && (
                    <>
                      <TableCell>{item.entryNumber || '—'}</TableCell>
                      <TableCell>{item.description || '—'}</TableCell>
                      <TableCell>{item.totalDebit?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>{item.totalCredit?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                  {tabKey === 'pettyCash' && (
                    <>
                      <TableCell>{item.voucherNumber || '—'}</TableCell>
                      <TableCell>{item.purpose || '—'}</TableCell>
                      <TableCell>{item.amount?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>
                        {item.date ? new Date(item.date).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                  {tabKey === 'cashFlows' && (
                    <>
                      <TableCell>{item.referenceNumber || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.type === 'INFLOW' ? 'وارد' : 'صادر'}
                          color={item.type === 'INFLOW' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.amount?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>
                        {item.date ? new Date(item.date).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>{item.category || '—'}</TableCell>
                    </>
                  )}
                  {tabKey === 'cheques' && (
                    <>
                      <TableCell>{item.chequeNumber || '—'}</TableCell>
                      <TableCell>{item.payee || '—'}</TableCell>
                      <TableCell>{item.amount?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                  {tabKey === 'bankReconciliations' && (
                    <>
                      <TableCell>{item.bankAccount?.name || item.accountName || '—'}</TableCell>
                      <TableCell>{item.period || '—'}</TableCell>
                      <TableCell>{item.bookBalance?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>{item.bankBalance?.toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FinanceIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            العمليات المالية
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined" size="small">
          تحديث
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {TAB_CONFIG.map((t, i) => (
          <Tab key={i} icon={t.icon} label={t.label} iconPosition="start" />
        ))}
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {renderTableContent()}
    </Container>
  );
}
