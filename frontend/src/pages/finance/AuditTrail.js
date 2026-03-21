import { useState, useEffect } from 'react';




import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ module: '', action: '', search: '' });

  useEffect(() => {
    fetchLogs();
  }, [filters.module, filters.action]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.module) params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);
      const res = await fetch(`${API}/finance/advanced/audit-trail?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const actionIcons = {
    create: <AddIcon fontSize="small" sx={{ color: '#4CAF50' }} />,
    update: <Edit fontSize="small" sx={{ color: '#2196F3' }} />,
    delete: <Delete fontSize="small" sx={{ color: '#F44336' }} />,
    view: <Visibility fontSize="small" sx={{ color: '#9E9E9E' }} />,
    approve: <Settings fontSize="small" sx={{ color: '#FF9800' }} />,
  };

  const actionLabels = {
    create: 'إنشاء',
    update: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    approve: 'اعتماد',
    login: 'تسجيل دخول',
    export: 'تصدير',
    print: 'طباعة',
  };

  const actionColors = {
    create: '#4CAF50',
    update: '#2196F3',
    delete: '#F44336',
    view: '#9E9E9E',
    approve: '#FF9800',
    login: '#673AB7',
    export: '#00BCD4',
    print: '#795548',
  };

  const modules = [
    { value: '', label: 'كل الأقسام' },
    { value: 'invoices', label: 'الفواتير' },
    { value: 'expenses', label: 'المصروفات' },
    { value: 'journal', label: 'القيود المحاسبية' },
    { value: 'accounts', label: 'دليل الحسابات' },
    { value: 'bank', label: 'التسوية البنكية' },
    { value: 'tax', label: 'الضرائب' },
    { value: 'budget', label: 'الموازنات' },
    { value: 'payroll', label: 'الرواتب' },
    { value: 'reports', label: 'التقارير' },
    { value: 'settings', label: 'الإعدادات' },
  ];

  const actions = [
    { value: '', label: 'كل الإجراءات' },
    { value: 'create', label: 'إنشاء' },
    { value: 'update', label: 'تعديل' },
    { value: 'delete', label: 'حذف' },
    { value: 'approve', label: 'اعتماد' },
    { value: 'view', label: 'عرض' },
    { value: 'export', label: 'تصدير' },
  ];

  const filteredLogs = logs.filter(l => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (
      (l.description || '').toLowerCase().includes(s) ||
      (l.userName || '').toLowerCase().includes(s) ||
      (l.module || '').toLowerCase().includes(s)
    );
  });

  // Summary stats
  const stats = {
    total: logs.length,
    creates: logs.filter(l => l.action === 'create').length,
    updates: logs.filter(l => l.action === 'update').length,
    deletes: logs.filter(l => l.action === 'delete').length,
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            سجل المراجعة
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Audit Trail - تتبع جميع العمليات والتغييرات المالية
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          {
            label: 'إجمالي العمليات',
            value: stats.total,
            color: brandColors.primary,
            icon: <History />,
          },
          { label: 'عمليات إنشاء', value: stats.creates, color: '#4CAF50', icon: <AddIcon /> },
          { label: 'عمليات تعديل', value: stats.updates, color: '#2196F3', icon: <Edit /> },
          { label: 'عمليات حذف', value: stats.deletes, color: '#F44336', icon: <Delete /> },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 170,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
              <Box sx={{ bgcolor: `${item.color}15`, borderRadius: 2, p: 1, display: 'flex' }}>
                {item.icon}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: item.color }}>
                  {item.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}`, mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterList sx={{ color: neutralColors.textSecondary }} />
          <TextField
            size="small"
            placeholder="بحث في السجلات..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            size="small"
            label="القسم"
            value={filters.module}
            onChange={e => setFilters({ ...filters, module: e.target.value })}
            sx={{ minWidth: 150 }}
          >
            {modules.map(m => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="الإجراء"
            value={filters.action}
            onChange={e => setFilters({ ...filters, action: e.target.value })}
            sx={{ minWidth: 140 }}
          >
            {actions.map(a => (
              <MenuItem key={a.value} value={a.value}>
                {a.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      {/* Logs Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ والوقت</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المستخدم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الإجراء</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>عنوان IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log, idx) => (
                <TableRow key={log._id || idx} hover sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(log.timestamp || log.createdAt).toLocaleDateString('ar-SA')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                      {new Date(log.timestamp || log.createdAt).toLocaleTimeString('ar-SA')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" sx={{ color: neutralColors.textSecondary }} />
                      <Typography variant="body2" fontWeight={600}>
                        {log.userName || 'النظام'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={actionIcons[log.action] || null}
                      label={actionLabels[log.action] || log.action}
                      sx={{
                        bgcolor: `${actionColors[log.action] || '#9E9E9E'}15`,
                        color: actionColors[log.action] || '#9E9E9E',
                        fontWeight: 700,
                        '& .MuiChip-icon': { ml: 0.5 },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={modules.find(m => m.value === log.module)?.label || log.module}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.description}</Typography>
                    {log.details && (
                      <Typography
                        variant="caption"
                        sx={{ color: neutralColors.textSecondary, display: 'block' }}
                      >
                        {log.details}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ color: neutralColors.textSecondary, fontFamily: 'monospace' }}
                    >
                      {log.ipAddress || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد سجلات مراجعة مطابقة للفلتر المحدد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default AuditTrail;
