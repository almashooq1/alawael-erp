 
import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';


import { surfaceColors, neutralColors, brandColors, statusColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const FiscalPeriods = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [_openDialog, _setOpenDialog] = useState(false);

  useEffect(() => {
    fetchPeriods();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/fiscal-periods?fiscalYear=${fiscalYear}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setPeriods(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id, name) => {
    if (!window.confirm(`هل تريد إقفال الفترة: ${name}؟\nلن تتمكن من إضافة قيود بعد الإقفال.`))
      return;
    try {
      await fetch(`${API}/finance/advanced/fiscal-periods/${id}/close`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchPeriods();
    } catch (err) {
      console.error(err);
    }
  };

  const handleYearEndClose = async () => {
    if (
      !window.confirm(`هل تريد إقفال السنة المالية ${fiscalYear}؟\nهذا إجراء لا يمكن التراجع عنه.`)
    )
      return;
    try {
      const res = await fetch(`${API}/finance/advanced/fiscal-periods/year-end-closing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ fiscalYear }),
      });
      const json = await res.json();
      if (json.success) {
        alert(
          `تم إقفال السنة المالية ${fiscalYear}\nصافي الدخل: ${json.data.summary.netIncome} ر.س`
        );
        fetchPeriods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const statusConfig = {
    open: { label: 'مفتوح', color: statusColors.success, icon: <LockOpen fontSize="small" /> },
    closed: { label: 'مقفل', color: statusColors.error, icon: <Lock fontSize="small" /> },
    adjusting: {
      label: 'فترة تعديل',
      color: statusColors.warning,
      icon: <CalendarMonth fontSize="small" />,
    },
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  const openPeriods = periods.filter(p => p.status === 'open').length;
  const closedPeriods = periods.filter(p => p.status === 'closed').length;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            الفترات المحاسبية
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Fiscal Periods - إدارة الفترات وإقفالها
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            select
            size="small"
            label="السنة"
            value={fiscalYear}
            onChange={e => setFiscalYear(e.target.value)}
            sx={{ width: 120 }}
          >
            {[2024, 2025, 2026].map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Lock />}
            onClick={handleYearEndClose}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            إقفال نهاية السنة
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: 'إجمالي الفترات', value: periods.length, color: brandColors.primary },
          { label: 'فترات مفتوحة', value: openPeriods, color: statusColors.success },
          { label: 'فترات مقفلة', value: closedPeriods, color: statusColors.error },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{ flex: 1, borderRadius: 2, border: `1px solid ${surfaceColors.border}` }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>الكود</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم الفترة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ البداية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ النهاية</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  المعاملات
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  القيود
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periods.map((period, idx) => (
                <TableRow
                  key={idx}
                  hover
                  sx={{ bgcolor: period.status === 'closed' ? '#f5f5f5' : 'inherit' }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {period.code}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{period.name}</TableCell>
                  <TableCell>{new Date(period.startDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{new Date(period.endDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell align="center">{period.transactionCount || 0}</TableCell>
                  <TableCell align="center">{period.journalEntryCount || 0}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={statusConfig[period.status]?.icon}
                      label={statusConfig[period.status]?.label || period.status}
                      sx={{
                        bgcolor: `${statusConfig[period.status]?.color || '#999'}20`,
                        color: statusConfig[period.status]?.color,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {period.status === 'open' && (
                      <Tooltip title="إقفال الفترة">
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Lock />}
                          onClick={() => handleClose(period._id, period.name)}
                          sx={{ borderRadius: 2, fontSize: '0.75rem' }}
                        >
                          إقفال
                        </Button>
                      </Tooltip>
                    )}
                    {period.status === 'closed' && (
                      <Chip size="small" icon={<CheckCircle />} label="مقفل" color="default" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default FiscalPeriods;
