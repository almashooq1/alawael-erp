import { useState, useEffect } from 'react';

import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import { ViewIcon } from 'utils/iconAliases';

const JournalEntries = () => {
  const showSnackbar = useSnackbar();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [newEntry, setNewEntry] = useState({
    description: '',
    date: new Date().toISOString().slice(0, 10),
    lines: [
      { account: '', accountCode: '', debit: 0, credit: 0 },
      { account: '', accountCode: '', debit: 0, credit: 0 },
    ],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await accountingService.getJournalEntries();
        setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        logger.error('Journal entries error:', err);
        showSnackbar('حدث خطأ في تحميل القيود', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showSnackbar]);

  const filtered = entries.filter(
    e =>
      (filterStatus === 'all' || e.status === filterStatus) &&
      (!searchText || e.entryNumber?.includes(searchText) || e.description?.includes(searchText))
  );

  const statusConfig = {
    posted: { label: 'مرحّل', color: 'success' },
    draft: { label: 'مسودة', color: 'warning' },
    cancelled: { label: 'ملغي', color: 'error' },
  };

  const totalDebit = newEntry.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = newEntry.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addLine = () =>
    setNewEntry(prev => ({
      ...prev,
      lines: [...prev.lines, { account: '', accountCode: '', debit: 0, credit: 0 }],
    }));

  const removeLine = index => {
    if (newEntry.lines.length <= 2) return;
    setNewEntry(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  };

  const updateLine = (index, field, value) => {
    setNewEntry(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }));
  };

  const handleCreate = async () => {
    if (!isBalanced) {
      showSnackbar('القيد غير متوازن — يجب أن يتساوى المدين مع الدائن', 'error');
      return;
    }
    try {
      await accountingService.createJournalEntry(newEntry);
      showSnackbar('تم إنشاء القيد بنجاح', 'success');
      setCreateDialog(false);
      const data = await accountingService.getJournalEntries();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('فشل إنشاء القيد', 'error');
    }
  };

  const handlePost = async id => {
    try {
      await accountingService.postJournalEntry(id);
      showSnackbar('تم ترحيل القيد بنجاح', 'success');
      setEntries(prev => prev.map(e => (e._id === id ? { ...e, status: 'posted' } : e)));
    } catch {
      showSnackbar('فشل ترحيل القيد', 'error');
    }
  };

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل القيود...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <JournalIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  القيود اليومية
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إدارة قيود القيد المزدوج
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setCreateDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              قيد جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي القيود', value: entries.length, color: brandColors.primary },
          {
            label: 'قيود مرحّلة',
            value: entries.filter(e => e.status === 'posted').length,
            color: statusColors.success,
          },
          {
            label: 'مسودات',
            value: entries.filter(e => e.status === 'draft').length,
            color: statusColors.warning,
          },
        ].map((s, i) => (
          <Grid item xs={4} key={i}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${surfaceColors.border}`,
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="بحث بالرقم أو الوصف..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={filterStatus}
              label="الحالة"
              onChange={e => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="posted">مرحّل</MenuItem>
              <MenuItem value="draft">مسودة</MenuItem>
              <MenuItem value="cancelled">ملغي</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم القيد</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  مدين
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  دائن
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry._id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: brandColors.primary }}
                    >
                      {entry.entryNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{entry.date}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{entry.description}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={600}>
                      {(entry.totalDebit || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={600}>
                      {(entry.totalCredit || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig[entry.status]?.label || entry.status}
                      color={statusConfig[entry.status]?.color || 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="عرض">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setViewDialog(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {entry.status === 'draft' && (
                        <Tooltip title="ترحيل">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handlePost(entry._id)}
                          >
                            <PostIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد قيود مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Entry Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <JournalIcon /> تفاصيل القيد — {selectedEntry?.entryNumber}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedEntry && (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="textSecondary">
                    التاريخ
                  </Typography>
                  <Typography fontWeight={600}>{selectedEntry.date}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="textSecondary">
                    الحالة
                  </Typography>
                  <Chip
                    label={statusConfig[selectedEntry.status]?.label}
                    color={statusConfig[selectedEntry.status]?.color}
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="textSecondary">
                    المنشئ
                  </Typography>
                  <Typography fontWeight={600}>{selectedEntry.createdBy}</Typography>
                </Grid>
              </Grid>
              <Typography variant="body2" color="textSecondary">
                الوصف
              </Typography>
              <Typography fontWeight={600} sx={{ mb: 2 }}>
                {selectedEntry.description}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell sx={{ fontWeight: 700 }}>كود الحساب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>اسم الحساب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="left">
                        مدين
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="left">
                        دائن
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedEntry.lines?.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {line.accountCode}
                          </Typography>
                        </TableCell>
                        <TableCell>{line.account}</TableCell>
                        <TableCell align="left">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              color:
                                line.debit > 0 ? statusColors.info : neutralColors.textDisabled,
                            }}
                          >
                            {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="left">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              color:
                                line.credit > 0 ? statusColors.success : neutralColors.textDisabled,
                            }}
                          >
                            {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell colSpan={2}>
                        <Typography fontWeight={700}>الإجمالي</Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography fontWeight={800}>
                          {(selectedEntry.totalDebit || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography fontWeight={800}>
                          {(selectedEntry.totalCredit || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Entry Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EntryIcon /> إنشاء قيد يومي جديد
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="التاريخ"
                type="date"
                value={newEntry.date}
                onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الوصف"
                value={newEntry.description}
                onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
              />
            </Grid>
          </Grid>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            بنود القيد
          </Typography>
          <TableContainer sx={{ mb: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>كود الحساب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اسم الحساب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>مدين</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>دائن</TableCell>
                  <TableCell sx={{ width: 50 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {newEntry.lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={line.accountCode}
                        onChange={e => updateLine(i, 'accountCode', e.target.value)}
                        placeholder="1101"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={line.account}
                        onChange={e => updateLine(i, 'account', e.target.value)}
                        placeholder="اسم الحساب"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.debit || ''}
                        onChange={e => updateLine(i, 'debit', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.credit || ''}
                        onChange={e => updateLine(i, 'credit', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => removeLine(i)}
                        disabled={newEntry.lines.length <= 2}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell colSpan={2}>
                    <Typography fontWeight={700}>الإجمالي</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={800} sx={{ color: statusColors.info }}>
                      {totalDebit.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={800} sx={{ color: statusColors.success }}>
                      {totalCredit.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button size="small" startIcon={<AddIcon />} onClick={addLine}>
              إضافة بند
            </Button>
            <Chip
              label={isBalanced ? 'القيد متوازن ✓' : 'القيد غير متوازن ✗'}
              color={isBalanced ? 'success' : 'error'}
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!isBalanced || !newEntry.description}
            sx={{ borderRadius: 2 }}
          >
            إنشاء القيد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default JournalEntries;
