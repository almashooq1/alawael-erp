import { useState, useEffect } from 'react';




import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const typeLabels = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};
const typeColors = {
  asset: statusColors.info,
  liability: statusColors.error,
  equity: brandColors.primary,
  revenue: statusColors.success,
  expense: statusColors.warning,
};

const AccountRow = ({ account, level = 0, expanded, onToggle }) => {
  const hasChildren = account.children?.length > 0;
  const isOpen = expanded[account._id];
  return (
    <>
      <TableRow hover sx={{ '&:hover': { bgcolor: `${brandColors.primary}06` } }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', pl: level * 3 }}>
            {hasChildren && (
              <IconButton size="small" onClick={() => onToggle(account._id)} sx={{ mr: 0.5 }}>
                {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 34 }} />}
            <Typography variant="body2" fontWeight={level === 0 ? 700 : 500}>
              {account.code}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={level === 0 ? 700 : 500}>
            {account.name}
          </Typography>
          {account.nameEn && (
            <Typography variant="caption" sx={{ color: neutralColors.textDisabled }}>
              {account.nameEn}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip
            label={typeLabels[account.type] || account.type}
            size="small"
            sx={{
              bgcolor: `${typeColors[account.type]}15`,
              color: typeColors[account.type],
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </TableCell>
        <TableCell align="left">
          <Typography variant="body2" fontWeight={600}>
            {(account.balance || 0).toLocaleString()} ر.س
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={account.isActive !== false ? 'نشط' : 'معطل'}
            size="small"
            color={account.isActive !== false ? 'success' : 'default'}
            sx={{ fontWeight: 600 }}
          />
        </TableCell>
        <TableCell>
          <Tooltip title="تعديل">
            <IconButton size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      {hasChildren && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Table size="small">
                <TableBody>
                  {account.children.map(child => (
                    <AccountRow
                      key={child._id}
                      account={child}
                      level={level + 1}
                      expanded={expanded}
                      onToggle={onToggle}
                    />
                  ))}
                </TableBody>
              </Table>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const ChartOfAccounts = () => {
  const showSnackbar = useSnackbar();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: '', name: '', nameEn: '', type: 'asset' });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await accountingService.getChartOfAccounts();
        setAccounts(Array.isArray(data) ? data : []);
        const allExpanded = {};
        (Array.isArray(data) ? data : []).forEach(a => {
          allExpanded[a._id] = true;
        });
        setExpanded(allExpanded);
      } catch (err) {
        logger.error('Chart of accounts error:', err);
        showSnackbar('حدث خطأ في تحميل دليل الحسابات', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showSnackbar]);

  const toggleExpand = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredAccounts = accounts.filter(
    a =>
      (filterType === 'all' || a.type === filterType) &&
      (!searchText ||
        a.code?.includes(searchText) ||
        a.name?.includes(searchText) ||
        a.nameEn?.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleCreate = async () => {
    try {
      await accountingService.createAccount(newAccount);
      showSnackbar('تم إنشاء الحساب بنجاح', 'success');
      setDialogOpen(false);
      setNewAccount({ code: '', name: '', nameEn: '', type: 'asset' });
      const data = await accountingService.getChartOfAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('فشل إنشاء الحساب', 'error');
    }
  };

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل دليل الحسابات...
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
                <TreeIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  دليل الحسابات
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  الشجرة المحاسبية وتصنيف الحسابات
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setDialogOpen(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              حساب جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="بحث بالكود أو الاسم..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>نوع الحساب</InputLabel>
            <Select
              value={filterType}
              label="نوع الحساب"
              onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="asset">أصول</MenuItem>
              <MenuItem value="liability">خصوم</MenuItem>
              <MenuItem value="equity">حقوق ملكية</MenuItem>
              <MenuItem value="revenue">إيرادات</MenuItem>
              <MenuItem value="expense">مصروفات</MenuItem>
            </Select>
          </FormControl>
          <Chip
            label={`${filteredAccounts.length} حساب`}
            sx={{
              bgcolor: `${brandColors.primary}15`,
              color: brandColors.primary,
              fontWeight: 600,
            }}
          />
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>الكود</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم الحساب</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }} align="left">
                  الرصيد
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 70 }}>إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAccounts.map(account => (
                <AccountRow
                  key={account._id}
                  account={account}
                  expanded={expanded}
                  onToggle={toggleExpand}
                />
              ))}
              {filteredAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد حسابات مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Account Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountIcon /> إضافة حساب جديد
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="كود الحساب"
              value={newAccount.code}
              fullWidth
              onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
            />
            <TextField
              label="اسم الحساب (عربي)"
              value={newAccount.name}
              fullWidth
              onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
            />
            <TextField
              label="اسم الحساب (إنجليزي)"
              value={newAccount.nameEn}
              fullWidth
              onChange={e => setNewAccount({ ...newAccount, nameEn: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={newAccount.type}
                label="النوع"
                onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}
              >
                <MenuItem value="asset">أصول</MenuItem>
                <MenuItem value="liability">خصوم</MenuItem>
                <MenuItem value="equity">حقوق ملكية</MenuItem>
                <MenuItem value="revenue">إيرادات</MenuItem>
                <MenuItem value="expense">مصروفات</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ borderRadius: 2 }}
            disabled={!newAccount.code || !newAccount.name}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ChartOfAccounts;
