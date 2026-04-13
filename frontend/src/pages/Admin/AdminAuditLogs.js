import { useState, useEffect } from 'react';




import { adminService } from 'services/adminService';
import exportService from 'services/exportService';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, brandColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';

const AdminAuditLogs = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await adminService.getAdminAuditLogs(userId);
        setLogs(data);
        setFilteredLogs(data);
      } catch (err) {
        logger.error('Failed to load audit logs:', err);
        setError(err.message || 'حدث خطأ في تحميل سجلات المراجعة');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [userId]);

  const handleSearch = event => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    filterLogs(term, actionFilter, userFilter);
  };

  const handleActionFilter = event => {
    const action = event.target.value;
    setActionFilter(action);
    filterLogs(searchTerm, action, userFilter);
  };

  const handleUserFilter = event => {
    const user = event.target.value;
    setUserFilter(user);
    filterLogs(searchTerm, actionFilter, user);
  };

  const filterLogs = (search, action, user) => {
    let filtered = logs;

    if (search) {
      filtered = filtered.filter(
        log =>
          log.description.toLowerCase().includes(search) ||
          log.userName.toLowerCase().includes(search) ||
          log.ipAddress.includes(search)
      );
    }

    if (action !== 'all') {
      filtered = filtered.filter(log => log.action === action);
    }

    if (user !== 'all') {
      filtered = filtered.filter(log => log.userId === user);
    }

    setFilteredLogs(filtered);
  };

  const handleOpenDialog = log => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleExportLogs = () => {
    try {
      exportService.toCSV(
        filteredLogs.map(log => ({
          المستخدم: log.userName,
          الإجراء: log.action,
          الوصف: log.description,
          'عنوان IP': log.ipAddress,
          التاريخ: log.timestamp,
          الحالة: log.status,
        })),
        `audit_logs_${new Date().toISOString().slice(0, 10)}`
      );
      showSnackbar('تم تصدير السجلات بنجاح', 'success');
    } catch (err) {
      logger.error('Export logs failed:', err);
      showSnackbar('حدث خطأ أثناء تصدير السجلات', 'error');
    }
  };

  const getActionColor = action => {
    switch (action) {
      case 'إنشاء':
        return 'success';
      case 'تعديل':
        return 'info';
      case 'حذف':
        return 'error';
      case 'دخول':
        return 'primary';
      case 'خروج':
        return 'default';
      default:
        return 'default';
    }
  };

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
      <Box
        sx={{
          background: gradients.primary,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HistoryIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                سجلات التدقيق
              </Typography>
              <Typography variant="body2">تتبع جميع العمليات والتغييرات في النظام</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportLogs}
            sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            تنزيل
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.primary,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي السجلات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {logs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.warning,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                عمليات اليوم
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {
                  logs.filter(
                    l => new Date(l.timestamp).toDateString() === new Date().toDateString()
                  ).length
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.info,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المستخدمون النشطون
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {new Set(logs.map(l => l.userId)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.success,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                عمليات حساسة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {logs.filter(l => l.action === 'حذف').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="البحث في السجلات..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterAltIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select value={actionFilter} label="النوع" onChange={handleActionFilter}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="إنشاء">إنشاء</MenuItem>
                  <MenuItem value="تعديل">تعديل</MenuItem>
                  <MenuItem value="حذف">حذف</MenuItem>
                  <MenuItem value="دخول">دخول</MenuItem>
                  <MenuItem value="خروج">خروج</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>المستخدم</InputLabel>
                <Select value={userFilter} label="المستخدم" onChange={handleUserFilter}>
                  <MenuItem value="all">الكل</MenuItem>
                  {Array.from(new Set(logs.map(l => l.userId))).map(userId => (
                    <MenuItem key={userId} value={userId}>
                      {logs.find(l => l.userId === userId)?.userName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader title={`السجلات (${filteredLogs.length})`} />
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                <TableCell sx={{ fontWeight: 'bold' }}>المستخدم</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الفعل</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>عنوان IP</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: brandColors.primaryStart,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}
                      >
                        {log.userName.charAt(0)}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {log.userName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.action}
                      color={getActionColor(log.action)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {log.ipAddress}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleOpenDialog(log)}
                    >
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل السجل</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                >
                  المستخدم:
                </Typography>
                <Typography variant="body2">{selectedLog.userName}</Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                >
                  النوع:
                </Typography>
                <Chip label={selectedLog.action} color={getActionColor(selectedLog.action)} />
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                >
                  الوصف:
                </Typography>
                <Typography variant="body2">{selectedLog.description}</Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                >
                  التفاصيل:
                </Typography>
                <Typography variant="body2">{selectedLog.details}</Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                >
                  عنوان IP:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {selectedLog.ipAddress}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                >
                  الوقت:
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedLog.timestamp).toLocaleString('ar-SA')}
                </Typography>
              </Box>

              {selectedLog.status && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                  >
                    الحالة:
                  </Typography>
                  <Chip
                    label={selectedLog.status}
                    color={selectedLog.status === 'نجاح' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminAuditLogs;
