import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
} from '@mui/material';
import { Business, PlayArrow, TrendingDown } from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors, statusColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const DepreciationSchedule = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/depreciation/schedule`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runDepreciation = async () => {
    if (!window.confirm('هل تريد تنفيذ دورة الإهلاك الشهرية؟')) return;
    setRunning(true);
    try {
      const res = await fetch(`${API}/finance/advanced/depreciation/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
      });
      const json = await res.json();
      if (json.success) {
        alert(
          `تم تنفيذ الإهلاك: ${json.data.processedAssets} أصل - إجمالي ${formatCurrency(json.data.totalDepreciation)}`
        );
        fetchSchedule();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const categoryLabels = {
    buildings: 'مباني',
    vehicles: 'مركبات',
    equipment: 'معدات',
    computers: 'حاسبات',
    furniture: 'أثاث',
    machinery: 'آلات',
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
            جدول الإهلاك
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Depreciation Schedule - إهلاك الأصول الثابتة
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={running ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
          onClick={runDepreciation}
          disabled={running}
          sx={{ bgcolor: '#FF5722', borderRadius: 2, fontWeight: 700 }}
        >
          تنفيذ الإهلاك الشهري
        </Button>
      </Box>

      {/* Summary */}
      {data?.summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            {
              label: 'إجمالي تكلفة الأصول',
              value: formatCurrency(data.summary.totalCost),
              color: brandColors.primary,
            },
            {
              label: 'مجمع الإهلاك',
              value: formatCurrency(data.summary.totalAccumulated),
              color: '#FF5722',
            },
            {
              label: 'القيمة الدفترية',
              value: formatCurrency(data.summary.totalBookValue),
              color: '#4CAF50',
            },
            {
              label: 'الإهلاك الشهري',
              value: formatCurrency(data.summary.totalMonthlyDepreciation),
              color: '#FF9800',
            },
          ].map((item, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                minWidth: 200,
                borderRadius: 2,
                border: `1px solid ${surfaceColors.border}`,
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رمز الأصل</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم الأصل</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  التكلفة
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  القيمة التخريدية
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>العمر (سنوات)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الإهلاك الشهري
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  مجمع الإهلاك
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  القيمة الدفترية
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نسبة الإهلاك</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.schedule || []).map((asset, idx) => {
                const depPercent =
                  asset.cost > 0
                    ? Math.round(
                        (asset.accumulatedDepreciation / (asset.cost - (asset.salvageValue || 0))) *
                          100
                      )
                    : 0;
                return (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {asset.assetCode}
                    </TableCell>
                    <TableCell>{asset.assetName}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={categoryLabels[asset.category] || asset.category}
                        sx={{
                          bgcolor: `${brandColors.primary}15`,
                          color: brandColors.primary,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(asset.cost)}</TableCell>
                    <TableCell align="right">{formatCurrency(asset.salvageValue)}</TableCell>
                    <TableCell align="center">
                      {asset.usefulLife} ({asset.remainingLife} متبقي)
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#FF5722' }}>
                      {formatCurrency(asset.monthlyDepreciation)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(asset.accumulatedDepreciation)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                      {formatCurrency(asset.bookValue)}
                    </TableCell>
                    <TableCell sx={{ width: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(depPercent, 100)}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor:
                                depPercent > 80
                                  ? '#F44336'
                                  : depPercent > 50
                                    ? '#FF9800'
                                    : '#4CAF50',
                            },
                          }}
                        />
                        <Typography variant="caption" fontWeight={600}>
                          {depPercent}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default DepreciationSchedule;
