/**
 * HistoryDialog – search/filter test results in a table
 */
import {
  Paper,
} from '@mui/material';

import { surfaceColors } from '../../theme/palette';
import { getLevelColor } from './constants';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import BarChartIcon from '@mui/icons-material/BarChart';

const HistoryDialog = ({
  open, onClose,
  tests, beneficiaries,
  filteredResults,
  filterTest, onFilterTest,
  filterBeneficiary, onFilterBeneficiary,
  onRowClick,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon />
        <span>سجل نتائج الاختبارات</span>
      </Box>
      <IconButton onClick={onClose} aria-label="إغلاق"><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent>
      <Grid container spacing={2} sx={{ mb: 3, mt: 0 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>تصفية حسب الاختبار</InputLabel>
            <Select value={filterTest} onChange={(e) => onFilterTest(e.target.value)} label="تصفية حسب الاختبار">
              <MenuItem value="">الكل</MenuItem>
              {tests.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>تصفية حسب المستفيد</InputLabel>
            <Select value={filterBeneficiary} onChange={(e) => onFilterBeneficiary(e.target.value)} label="تصفية حسب المستفيد">
              <MenuItem value="">الكل</MenuItem>
              {beneficiaries.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
              <TableCell>الاختبار</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>المقيّم</TableCell>
              <TableCell align="center">الدرجة</TableCell>
              <TableCell align="center">المستوى</TableCell>
              <TableCell align="center">إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>لا توجد نتائج مطابقة</TableCell>
              </TableRow>
            ) : (
              filteredResults.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(r)}>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell>{r.beneficiaryName}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.assessorName}</TableCell>
                  <TableCell align="center">{r.totalScore}/{r.maxPossible} ({r.percentage}%)</TableCell>
                  <TableCell align="center">
                    <Chip label={r.overallLevel} size="small" sx={{ bgcolor: getLevelColor(r.percentage), color: '#fff' }} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton size="small" aria-label="الرسم البياني"><BarChartIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </DialogContent>
  </Dialog>
);

export default HistoryDialog;
