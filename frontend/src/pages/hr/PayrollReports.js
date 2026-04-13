import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Download as DownloadIcon,
  AccountBalance as BankIcon,
  Security as GOSIIcon,
  Description as WPSIcon,
  Print as PrintIcon,
  BarChart as ChartIcon,
  CompareArrows as VarianceIcon,
  Business as DeptIcon,
  CalendarMonth as AnnualIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  TableChart as ExcelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import payrollService from 'services/payrollService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

// ─── Report Type Definitions ───
const REPORT_TYPES = [
  {
    id: 'wps',
    label: 'ملف حماية الأجور (WPS)',
    icon: <WPSIcon />,
    description: 'ملف حماية الأجور المطلوب من وزارة العمل',
    color: statusColors.info,
    category: 'compliance',
  },
  {
    id: 'gosi',
    label: 'تقرير التأمينات (GOSI)',
    icon: <GOSIIcon />,
    description: 'تقرير المؤسسة العامة للتأمينات الاجتماعية',
    color: statusColors.success,
    category: 'compliance',
  },
  {
    id: 'bank',
    label: 'ملف التحويل البنكي',
    icon: <BankIcon />,
    description: 'ملف تحويلات الرواتب للبنك',
    color: statusColors.warning,
    category: 'compliance',
  },
  {
    id: 'summary',
    label: 'ملخص الرواتب الشهري',
    icon: <ChartIcon />,
    description: 'تقرير ملخص شامل للرواتب حسب الأقسام',
    color: brandColors.primary,
    category: 'analysis',
  },
  {
    id: 'deductions',
    label: 'تقرير الخصومات',
    icon: <ReportIcon />,
    description: 'تفصيل جميع الخصومات والاستقطاعات',
    color: statusColors.error,
    category: 'analysis',
  },
  {
    id: 'department',
    label: 'مقارنة الأقسام',
    icon: <DeptIcon />,
    description: 'مقارنة تفصيلية لتكاليف الرواتب بين الأقسام',
    color: '#6366f1',
    category: 'analysis',
  },
  {
    id: 'variance',
    label: 'تقرير الفروقات',
    icon: <VarianceIcon />,
    description: 'مقارنة مع الشهر السابق وتحليل التغييرات',
    color: '#f59e0b',
    category: 'analysis',
  },
  {
    id: 'annual',
    label: 'التقرير السنوي',
    icon: <AnnualIcon />,
    description: 'ملخص سنوي شامل للرواتب والتكاليف',
    color: '#8b5cf6',
    category: 'summary',
  },
];

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ][i],
}));

const CATEGORIES = [
  { id: 'all', label: 'جميع التقارير' },
  { id: 'compliance', label: 'تقارير الامتثال' },
  { id: 'analysis', label: 'التحليلات' },
  { id: 'summary', label: 'الملخصات' },
];

// ─── Helper: Format currency ───
const formatCurrency = amount =>
  typeof amount === 'number' ? amount.toLocaleString('ar-SA') + ' ر.س' : '—';

// ─── Helper: Percentage chip ───
const PercentChip = ({ value }) => {
  if (value === undefined || value === null) return null;
  const isPositive = value > 0;
  const icon = isPositive ? (
    <TrendUpIcon sx={{ fontSize: 14 }} />
  ) : (
    <TrendDownIcon sx={{ fontSize: 14 }} />
  );
  return (
    <Chip
      icon={icon}
      label={`${Math.abs(value)}%`}
      size="small"
      sx={{
        bgcolor: isPositive ? '#dcfce7' : '#fef2f2',
        color: isPositive ? '#16a34a' : '#dc2626',
        fontWeight: 700,
        fontSize: '0.75rem',
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
};

// ─── Simple Bar Chart ───
const SimpleBarChart = ({
  data,
  labelKey,
  valueKey,
  color = brandColors.primary,
  maxHeight = 200,
}) => {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0));
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: maxHeight, mt: 2 }}>
      {data.map((d, i) => {
        const height = maxVal > 0 ? ((d[valueKey] || 0) / maxVal) * (maxHeight - 30) : 0;
        return (
          <Tooltip key={i} title={`${d[labelKey]}: ${formatCurrency(d[valueKey])}`}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', mb: 0.5, fontWeight: 600 }}>
                {(d[valueKey] || 0).toLocaleString()}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 48,
                  height: Math.max(height, 4),
                  bgcolor: color,
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.85,
                  transition: '0.3s',
                  '&:hover': { opacity: 1 },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  fontSize: '0.6rem',
                  textAlign: 'center',
                  color: neutralColors.textSecondary,
                  maxWidth: 50,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {d[labelKey]}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

// ─── Stat Card ───
const StatCard = ({ label, value, color, subtext }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      borderRadius: 2,
      border: `1px solid ${surfaceColors.border}`,
      textAlign: 'center',
    }}
  >
    <Typography variant="body2" color="textSecondary" gutterBottom>
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: color || brandColors.primary }}>
      {value}
    </Typography>
    {subtext && (
      <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
        {subtext}
      </Typography>
    )}
  </Paper>
);

// ═══════════════════════════════════════════════
// ─── Report Detail Renderers ───
// ═══════════════════════════════════════════════

const WPSReportDetail = ({ data }) => (
  <>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={3}>
        <StatCard label="إجمالي الموظفين" value={data.records} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="إجمالي الرواتب الأساسية"
          value={formatCurrency(data.summary?.totalBaseSalary)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="إجمالي بدل السكن"
          value={formatCurrency(data.summary?.totalHousingAllowance)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="صافي المبلغ الإجمالي"
          value={formatCurrency(data.summary?.totalNetSalary)}
          color={statusColors.success}
        />
      </Grid>
    </Grid>
    {data.employees?.length > 0 && (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.background }}>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>اسم الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الراتب الأساسي
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                بدل السكن
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                بدلات أخرى
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الخصومات
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                صافي الراتب
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.employees.map((emp, i) => (
              <TableRow key={i} hover>
                <TableCell>{emp.sequenceNumber || i + 1}</TableCell>
                <TableCell>{emp.employeeName}</TableCell>
                <TableCell align="left">{emp.baseSalary?.toLocaleString()}</TableCell>
                <TableCell align="left">{emp.housingAllowance?.toLocaleString()}</TableCell>
                <TableCell align="left">{emp.otherAllowances?.toLocaleString()}</TableCell>
                <TableCell align="left" sx={{ color: statusColors.error }}>
                  {emp.deductions?.toLocaleString()}
                </TableCell>
                <TableCell align="left">
                  <strong>{emp.netSalary?.toLocaleString()}</strong>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
      تنسيق الملف: {data.format || 'SIF'} — جاهز للرفع على نظام حماية الأجور
    </Alert>
  </>
);

const GOSIReportDetail = ({ data }) => (
  <>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={3}>
        <StatCard label="إجمالي الموظفين" value={data.records} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="حصة الموظف"
          value={formatCurrency(data.summary?.totalEmployeeContribution)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="حصة صاحب العمل"
          value={formatCurrency(data.summary?.totalEmployerContribution)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="إجمالي الاشتراكات"
          value={formatCurrency(data.summary?.totalContribution)}
          color={statusColors.success}
        />
      </Grid>
    </Grid>
    {data.breakdown && (
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Chip
          label={`سعوديون: ${data.breakdown.saudi?.count || 0} — ${formatCurrency(data.breakdown.saudi?.totalContribution)}`}
          sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 600 }}
        />
        <Chip
          label={`غير سعوديين: ${data.breakdown.nonSaudi?.count || 0} — ${formatCurrency(data.breakdown.nonSaudi?.totalContribution)}`}
          sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }}
        />
      </Box>
    )}
    {data.employees?.length > 0 && (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.background }}>
              <TableCell sx={{ fontWeight: 700 }}>اسم الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                أساس الاشتراك
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                حصة الموظف (9%)
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                حصة صاحب العمل (11%)
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الإجمالي
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.employees.map((emp, i) => (
              <TableRow key={i} hover>
                <TableCell>{emp.employeeName}</TableCell>
                <TableCell align="left">{emp.contributionBase?.toLocaleString()}</TableCell>
                <TableCell align="left">{emp.employeeContribution?.toLocaleString()}</TableCell>
                <TableCell align="left">{emp.employerContribution?.toLocaleString()}</TableCell>
                <TableCell align="left">
                  <strong>{emp.totalContribution?.toLocaleString()}</strong>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </>
);

const BankTransferDetail = ({ data }) => (
  <>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={4}>
        <StatCard label="عدد التحويلات" value={data.records} />
      </Grid>
      <Grid item xs={6} sm={4}>
        <StatCard
          label="إجمالي المبلغ"
          value={formatCurrency(data.totalAmount)}
          color={statusColors.success}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <StatCard label="عدد البنوك" value={data.byBank?.length || 0} />
      </Grid>
    </Grid>
    {data.byBank?.length > 0 && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          توزيع التحويلات حسب البنك
        </Typography>
        <SimpleBarChart
          data={data.byBank}
          labelKey="bankName"
          valueKey="totalAmount"
          color={statusColors.warning}
        />
      </Box>
    )}
    {data.transfers?.length > 0 && (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.background }}>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>اسم الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>البنك</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                المبلغ
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>العملة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.transfers.map((t, i) => (
              <TableRow key={i} hover>
                <TableCell>{t.sequenceNumber || i + 1}</TableCell>
                <TableCell>{t.employeeName}</TableCell>
                <TableCell>{t.bankName}</TableCell>
                <TableCell align="left">
                  <strong>{t.amount?.toLocaleString()}</strong>
                </TableCell>
                <TableCell>{t.currency || 'SAR'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </>
);

const DepartmentComparisonDetail = ({ data }) => (
  <>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={3}>
        <StatCard label="عدد الأقسام" value={data.totalDepartments} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard label="إجمالي الموظفين" value={data.totalEmployees} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="إجمالي الصافي"
          value={formatCurrency(data.grandTotalNet)}
          color={statusColors.success}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard label="إجمالي الإجمالي" value={formatCurrency(data.grandTotalGross)} />
      </Grid>
    </Grid>
    {data.departments?.length > 0 && (
      <>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          توزيع التكاليف حسب الأقسام
        </Typography>
        <SimpleBarChart
          data={data.departments}
          labelKey="name"
          valueKey="totalNet"
          color="#6366f1"
          maxHeight={180}
        />
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  الموظفين
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  إجمالي الصافي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  متوسط الصافي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  نسبة التكلفة
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.departments.map((dept, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <strong>{dept.name}</strong>
                  </TableCell>
                  <TableCell align="center">{dept.employeeCount}</TableCell>
                  <TableCell align="left">{dept.totalNet?.toLocaleString()}</TableCell>
                  <TableCell align="left">{dept.averageNet?.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <Box sx={{ flex: 1, maxWidth: 80 }}>
                        <LinearProgress
                          variant="determinate"
                          value={dept.costPercentage || 0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 4 },
                          }}
                        />
                      </Box>
                      <Typography variant="caption" fontWeight={600}>
                        {dept.costPercentage}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    )}
  </>
);

const VarianceReportDetail = ({ data }) => {
  const variance = data.variance || {};
  const changes = data.employeeChanges || {};

  const varianceRows = [
    { label: 'عدد الموظفين', key: 'employeeCount', isCurrency: false },
    { label: 'الرواتب الأساسية', key: 'totalBaseSalary', isCurrency: true },
    { label: 'البدلات', key: 'totalAllowances', isCurrency: true },
    { label: 'الحوافز', key: 'totalIncentives', isCurrency: true },
    { label: 'الخصومات', key: 'totalDeductions', isCurrency: true },
    { label: 'إجمالي الراتب', key: 'totalGross', isCurrency: true },
    { label: 'صافي الراتب', key: 'totalNet', isCurrency: true },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`الشهر الحالي: ${data.currentPeriod?.month}/${data.currentPeriod?.year}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`الشهر السابق: ${data.previousPeriod?.month}/${data.previousPeriod?.year}`}
          variant="outlined"
        />
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.background }}>
              <TableCell sx={{ fontWeight: 700 }}>البند</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الشهر السابق
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الشهر الحالي
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الفرق
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                النسبة
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {varianceRows.map(row => {
              const v = variance[row.key] || {};
              return (
                <TableRow key={row.key} hover>
                  <TableCell>
                    <strong>{row.label}</strong>
                  </TableCell>
                  <TableCell align="left">
                    {row.isCurrency ? v.previous?.toLocaleString() : v.previous}
                  </TableCell>
                  <TableCell align="left">
                    {row.isCurrency ? v.current?.toLocaleString() : v.current}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{ color: (v.change || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}
                  >
                    {(v.change || 0) >= 0 ? '+' : ''}
                    {row.isCurrency ? v.change?.toLocaleString() : v.change}
                  </TableCell>
                  <TableCell align="center">
                    <PercentChip value={v.percentageChange} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {changes.newEmployees?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#16a34a' }}>
            موظفون جدد ({changes.newEmployees.length})
          </Typography>
          {changes.newEmployees.map((emp, i) => (
            <Chip
              key={i}
              label={`${emp.name} — ${emp.department} — ${formatCurrency(emp.netSalary)}`}
              sx={{ m: 0.5 }}
              variant="outlined"
            />
          ))}
        </Box>
      )}

      {changes.removedEmployees?.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#dc2626' }}>
            موظفون تم حذفهم ({changes.removedEmployees.length})
          </Typography>
          {changes.removedEmployees.map((emp, i) => (
            <Chip
              key={i}
              label={`${emp.name} — ${emp.department}`}
              sx={{ m: 0.5 }}
              variant="outlined"
              color="error"
            />
          ))}
        </Box>
      )}

      {changes.significantSalaryChanges?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#f59e0b' }}>
            تغييرات رواتب كبيرة (&gt;5%)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  سابق
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  حالي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  التغيير
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {changes.significantSalaryChanges.map((c, i) => (
                <TableRow key={i} hover>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.department}</TableCell>
                  <TableCell align="left">{c.previousNet?.toLocaleString()}</TableCell>
                  <TableCell align="left">{c.currentNet?.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <PercentChip value={c.percentageChange} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </>
  );
};

const AnnualSummaryDetail = ({ data }) => {
  const activeMonths = data.monthlyBreakdown?.filter(m => m.employeeCount > 0) || [];
  const totals = data.annualTotals || {};

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="إجمالي صافي الرواتب"
            value={formatCurrency(totals.totalNet)}
            color={statusColors.success}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="إجمالي الإجمالي" value={formatCurrency(totals.totalGross)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="متوسط الشهري" value={formatCurrency(data.averageMonthlyPayroll)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="أشهر نشطة"
            value={activeMonths.length}
            subtext={`${totals.totalEmployeeMonths || 0} موظف/شهر`}
          />
        </Grid>
      </Grid>

      {activeMonths.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            صافي الرواتب الشهري
          </Typography>
          <SimpleBarChart
            data={activeMonths}
            labelKey="monthName"
            valueKey="totalNet"
            color="#8b5cf6"
            maxHeight={160}
          />
        </>
      )}

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.background }}>
              <TableCell sx={{ fontWeight: 700 }}>الشهر</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                الموظفين
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الأساسي
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                البدلات
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الحوافز
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الخصومات
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الصافي
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.monthlyBreakdown?.map((m, i) => (
              <TableRow key={i} hover sx={{ opacity: m.employeeCount > 0 ? 1 : 0.4 }}>
                <TableCell>
                  <strong>{m.monthName}</strong>
                </TableCell>
                <TableCell align="center">{m.employeeCount || '—'}</TableCell>
                <TableCell align="left">
                  {m.totalBaseSalary ? m.totalBaseSalary.toLocaleString() : '—'}
                </TableCell>
                <TableCell align="left">
                  {m.totalAllowances ? m.totalAllowances.toLocaleString() : '—'}
                </TableCell>
                <TableCell align="left">
                  {m.totalIncentives ? m.totalIncentives.toLocaleString() : '—'}
                </TableCell>
                <TableCell
                  align="left"
                  sx={{ color: m.totalDeductions > 0 ? statusColors.error : 'inherit' }}
                >
                  {m.totalDeductions ? m.totalDeductions.toLocaleString() : '—'}
                </TableCell>
                <TableCell align="left">
                  <strong>{m.totalNet ? m.totalNet.toLocaleString() : '—'}</strong>
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell>
                <strong>الإجمالي السنوي</strong>
              </TableCell>
              <TableCell align="center">
                <strong>{totals.totalEmployeeMonths}</strong>
              </TableCell>
              <TableCell align="left">
                <strong>{totals.totalBaseSalary?.toLocaleString()}</strong>
              </TableCell>
              <TableCell align="left">
                <strong>{totals.totalAllowances?.toLocaleString()}</strong>
              </TableCell>
              <TableCell align="left">
                <strong>{totals.totalIncentives?.toLocaleString()}</strong>
              </TableCell>
              <TableCell align="left" sx={{ color: statusColors.error }}>
                <strong>{totals.totalDeductions?.toLocaleString()}</strong>
              </TableCell>
              <TableCell align="left" sx={{ color: statusColors.success }}>
                <strong>{totals.totalNet?.toLocaleString()}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {data.departmentSummary?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            ملخص سنوي حسب القسم
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  إجمالي الصافي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  عدد الكشوف
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  متوسط الصافي
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.departmentSummary.map((d, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <strong>{d.department}</strong>
                  </TableCell>
                  <TableCell align="left">{d.totalNet?.toLocaleString()}</TableCell>
                  <TableCell align="center">{d.records}</TableCell>
                  <TableCell align="left">{d.averageNet?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </>
  );
};

const SummaryReportDetail = ({ data }) => (
  <Grid container spacing={2}>
    <Grid item xs={6} sm={3}>
      <StatCard label="إجمالي الموظفين" value={data.totalEmployees || data.records || '—'} />
    </Grid>
    <Grid item xs={6} sm={3}>
      <StatCard label="إجمالي الإجمالي" value={formatCurrency(data.totalGross)} />
    </Grid>
    <Grid item xs={6} sm={3}>
      <StatCard
        label="إجمالي الخصومات"
        value={formatCurrency(data.totalDeductions)}
        color={statusColors.error}
      />
    </Grid>
    <Grid item xs={6} sm={3}>
      <StatCard
        label="إجمالي الصافي"
        value={formatCurrency(data.totalNet)}
        color={statusColors.success}
      />
    </Grid>
    {data.byStatus && (
      <Grid item xs={12}>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Object.entries(data.byStatus).map(([status, count]) => (
            <Chip key={status} label={`${status}: ${count}`} size="small" variant="outlined" />
          ))}
        </Box>
      </Grid>
    )}
  </Grid>
);

const DeductionsReportDetail = ({ data }) => (
  <>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} sm={3}>
        <StatCard label="إجمالي الموظفين" value={data.records} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard
          label="إجمالي الخصومات"
          value={formatCurrency(data.totalDeductions)}
          color={statusColors.error}
        />
      </Grid>
    </Grid>
    {data.categories && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          توزيع الخصومات حسب الفئة
        </Typography>
        <SimpleBarChart
          data={Object.values(data.categories).filter(c => c.total > 0)}
          labelKey="label"
          valueKey="total"
          color={statusColors.error}
          maxHeight={150}
        />
      </Box>
    )}
    {data.details?.length > 0 && (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.background }}>
              <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                ضريبة الدخل
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                التأمينات
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                التأمين الصحي
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                العقوبات
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="left">
                الإجمالي
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.details.map((d, i) => (
              <TableRow key={i} hover>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.department || d.dept}</TableCell>
                <TableCell align="left">{d.incomeTax?.toLocaleString() || '—'}</TableCell>
                <TableCell align="left">{d.socialSecurity?.toLocaleString() || '—'}</TableCell>
                <TableCell align="left">{d.healthInsurance?.toLocaleString() || '—'}</TableCell>
                <TableCell align="left">{d.penalties?.toLocaleString() || '—'}</TableCell>
                <TableCell align="left" sx={{ color: statusColors.error, fontWeight: 700 }}>
                  {(d.totalDeductions || d.amount)?.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </>
);

// ═══════════════════════════════════════════════
// ─── Main Component ───
// ═══════════════════════════════════════════════

const PayrollReports = () => {
  const showSnackbar = useSnackbar();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const filteredReports =
    categoryFilter === 'all'
      ? REPORT_TYPES
      : REPORT_TYPES.filter(r => r.category === categoryFilter);

  const generateReport = useCallback(
    async type => {
      setLoading(true);
      setSelectedReport(type);
      setReportData(null);
      try {
        let data;
        switch (type) {
          case 'wps':
            data = await payrollService.generateWPSReport(month, year);
            break;
          case 'gosi':
            data = await payrollService.generateGOSIReport(month, year);
            break;
          case 'bank':
            data = await payrollService.generateBankTransferFile(month, year);
            break;
          case 'summary': {
            const stats = await payrollService.getPayrollStats(month, year);
            data = {
              type: 'Summary',
              reportName: 'ملخص الرواتب الشهري',
              ...stats,
              generatedAt: new Date().toISOString(),
            };
            break;
          }
          case 'deductions':
            data = await payrollService.generateDeductionsReport(month, year);
            break;
          case 'department':
            data = await payrollService.generateDepartmentComparison(month, year);
            break;
          case 'variance':
            data = await payrollService.generateVarianceReport(month, year);
            break;
          case 'annual':
            data = await payrollService.generateAnnualSummary(year);
            break;
          default:
            data = null;
        }
        setReportData(data);
        setGeneratedReports(prev => [
          {
            type,
            label: REPORT_TYPES.find(r => r.id === type)?.label,
            month,
            year,
            date: new Date().toLocaleString('ar-SA'),
            records: data?.records || data?.totalEmployees || data?.totalDepartments || '—',
          },
          ...prev,
        ]);
        showSnackbar('تم توليد التقرير بنجاح', 'success');
      } catch (err) {
        logger.error('Report error:', err);
        showSnackbar('فشل في توليد التقرير', 'error');
      } finally {
        setLoading(false);
      }
    },
    [month, year, showSnackbar]
  );

  const handleExportCSV = () => {
    if (!reportData) return;
    try {
      let csvContent = '';
      const employees = reportData.employees || reportData.details || reportData.transfers || [];
      if (employees.length > 0) {
        const headers = Object.keys(employees[0]);
        csvContent = '\uFEFF' + headers.join(',') + '\n';
        employees.forEach(row => {
          csvContent += headers.map(h => `"${row[h] ?? ''}"`).join(',') + '\n';
        });
      } else {
        csvContent = '\uFEFF' + JSON.stringify(reportData, null, 2);
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-report-${selectedReport}-${month}-${year}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showSnackbar('تم تصدير التقرير بنجاح', 'success');
    } catch {
      showSnackbar('فشل في تصدير التقرير', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderReportDetail = () => {
    if (!reportData) return null;
    switch (selectedReport) {
      case 'wps':
        return <WPSReportDetail data={reportData} />;
      case 'gosi':
        return <GOSIReportDetail data={reportData} />;
      case 'bank':
        return <BankTransferDetail data={reportData} />;
      case 'department':
        return <DepartmentComparisonDetail data={reportData} />;
      case 'variance':
        return <VarianceReportDetail data={reportData} />;
      case 'annual':
        return <AnnualSummaryDetail data={reportData} />;
      case 'summary':
        return <SummaryReportDetail data={reportData} />;
      case 'deductions':
        return <DeductionsReportDetail data={reportData} />;
      default:
        return (
          <pre dir="ltr" style={{ fontSize: 12 }}>
            {JSON.stringify(reportData, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <ReportIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                تقارير الرواتب المتقدمة
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                توليد تقارير WPS والتأمينات والتحويلات البنكية وتحليلات الأقسام والفروقات الشهرية
              </Typography>
            </Box>
            <Chip
              label={`${generatedReports.length} تقرير مُولّد`}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Period Selection + Category Filter */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography fontWeight={700} sx={{ mr: 1 }}>
              الفترة:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>الشهر</InputLabel>
              <Select value={month} label="الشهر" onChange={e => setMonth(e.target.value)}>
                {months.map(m => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>السنة</InputLabel>
              <Select value={year} label="السنة" onChange={e => setYear(e.target.value)}>
                {[2024, 2025, 2026, 2027].map(y => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tabs
              value={categoryFilter}
              onChange={(_, v) => setCategoryFilter(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.85rem' },
              }}
            >
              {CATEGORIES.map(c => (
                <Tab key={c.id} value={c.id} label={c.label} />
              ))}
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      {/* Report Types Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {filteredReports.map(rt => (
          <Grid item xs={12} sm={6} md={3} key={rt.id}>
            <Card
              sx={{
                borderRadius: 3,
                border: `1px solid ${selectedReport === rt.id ? rt.color : surfaceColors.border}`,
                cursor: 'pointer',
                transition: '0.2s',
                '&:hover': { borderColor: rt.color, boxShadow: 2, transform: 'translateY(-2px)' },
                ...(selectedReport === rt.id && { boxShadow: `0 0 0 2px ${rt.color}` }),
              }}
              onClick={() => !loading && generateReport(rt.id)}
            >
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 1.5,
                    width: 48,
                    height: 48,
                    bgcolor: `${rt.color}15`,
                    color: rt.color,
                  }}
                >
                  {rt.icon}
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700}>
                  {rt.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: neutralColors.textSecondary, mt: 0.5, display: 'block' }}
                >
                  {rt.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading && <LinearProgress sx={{ borderRadius: 2, mb: 3 }} />}

      {/* Report Result */}
      {reportData && !loading && (
        <Card
          sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}
          id="report-output"
        >
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {reportData.reportName || REPORT_TYPES.find(r => r.id === selectedReport)?.label}
                </Typography>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  {reportData.generatedAt &&
                    new Date(reportData.generatedAt).toLocaleString('ar-SA')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="إعادة التوليد">
                  <IconButton size="small" onClick={() => generateReport(selectedReport)}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  startIcon={<PrintIcon />}
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 2 }}
                  onClick={handlePrint}
                >
                  طباعة
                </Button>
                <Button
                  startIcon={<ExcelIcon />}
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 2 }}
                  onClick={handleExportCSV}
                >
                  CSV تصدير
                </Button>
                <Button
                  startIcon={<DownloadIcon />}
                  variant="contained"
                  size="small"
                  sx={{ borderRadius: 2 }}
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `payroll-report-${selectedReport}-${month}-${year}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    showSnackbar('تم تصدير التقرير بنجاح', 'success');
                  }}
                >
                  JSON تصدير
                </Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {renderReportDetail()}
          </CardContent>
        </Card>
      )}

      {/* Generated Reports History */}
      {generatedReports.length > 0 && (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent sx={{ pb: historyExpanded ? 2 : '16px !important' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setHistoryExpanded(!historyExpanded)}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                سجل التقارير المولدة ({generatedReports.length})
              </Typography>
              <IconButton size="small">
                {historyExpanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Box>
            <Collapse in={historyExpanded}>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell sx={{ fontWeight: 700 }}>التقرير</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الفترة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>السجلات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedReports.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {r.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {months[r.month - 1]?.label} {r.year}
                      </TableCell>
                      <TableCell>{r.records || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                          {r.date}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Collapse>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default PayrollReports;
