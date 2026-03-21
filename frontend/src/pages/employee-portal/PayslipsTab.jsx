/**
 * PayslipsTab — بوابة الموظف: تبويب كشوف الرواتب
 */
import {
  Paper,
} from '@mui/material';


import { fmt } from './employeePortalData';
import { gradients } from '../../theme/palette';

export default function PayslipsTab({
  payslips,
  payrollSummary,
  onViewPayslip,
  onPrint,
}) {
  return (
    <Box>
      {payrollSummary && (
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            background: gradients.successSurface,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                آخر راتب صافي
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.dark">
                {fmt(payrollSummary.latest.net)} ر.س
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                متوسط الصافي
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {fmt(Math.round(payrollSummary.avgNet))} ر.س
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                عدد الكشوف
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {payrollSummary.monthCount} أشهر
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          كشوف الرواتب
        </Typography>
        <Button
          size="small"
          startIcon={<PrintIcon />}
          onClick={onPrint}
          sx={{ borderRadius: 2 }}
        >
          طباعة
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              {[
                'الشهر',
                'الأساسي',
                'بدل السكن',
                'بدل النقل',
                'التأمينات',
                'الخصومات',
                'الصافي',
                '',
              ].map(h => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.map(p => (
              <TableRow key={p._id} hover>
                <TableCell>
                  <Typography fontWeight="bold">{p.month}</Typography>
                </TableCell>
                <TableCell>{fmt(p.basic)}</TableCell>
                <TableCell>{fmt(p.housing)}</TableCell>
                <TableCell>{fmt(p.transport)}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{fmt(p.gosi || 0)}</TableCell>
                <TableCell sx={{ color: 'error.main' }}>-{fmt(p.deductions)}</TableCell>
                <TableCell>
                  <Typography fontWeight="bold" color="success.main">
                    {fmt(p.net)} ر.س
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="عرض التفاصيل">
                    <IconButton size="small" onClick={() => onViewPayslip(p)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
