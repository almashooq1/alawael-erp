import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  History as HistoryIcon,
  Close as CloseIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { surfaceColors } from '../../theme/palette';

/**
 * Full‑screen dialog showing assessment history with
 * scale / beneficiary filters and a results table.
 */
const HistoryDialog = ({
  open,
  scales,
  beneficiaries,
  filteredResults,
  filterScale,
  filterBeneficiary,
  onFilterScaleChange,
  onFilterBeneficiaryChange,
  onClose,
  onOpenDetail,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon />
        <span>سجل تقييمات المقاييس</span>
      </Box>
      <IconButton onClick={onClose} aria-label="إغلاق">
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3, mt: 0 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>تصفية حسب المقياس</InputLabel>
            <Select
              value={filterScale}
              onChange={(e) => onFilterScaleChange(e.target.value)}
              label="تصفية حسب المقياس"
            >
              <MenuItem value="">الكل</MenuItem>
              {scales.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>تصفية حسب المستفيد</InputLabel>
            <Select
              value={filterBeneficiary}
              onChange={(e) => onFilterBeneficiaryChange(e.target.value)}
              label="تصفية حسب المستفيد"
            >
              <MenuItem value="">الكل</MenuItem>
              {beneficiaries.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
              <TableCell>المقياس</TableCell>
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
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    onClose();
                    onOpenDetail(r);
                  }}
                >
                  <TableCell>{r.scaleName}</TableCell>
                  <TableCell>{r.beneficiaryName}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.assessorName}</TableCell>
                  <TableCell align="center">
                    {r.totalScore}/{r.maxScore} ({r.percentage}%)
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={r.level} size="small" sx={{ bgcolor: r.levelColor, color: 'white' }} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton size="small" aria-label="الرسم البياني">
                        <BarChartIcon fontSize="small" />
                      </IconButton>
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
