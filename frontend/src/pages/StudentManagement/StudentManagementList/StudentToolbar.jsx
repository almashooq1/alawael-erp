import {
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import { Search, Add, Refresh, Download, FilterList, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from 'theme/palette';
import { STATUS_MAP, DISABILITY_LABELS } from './studentManagement.constants';

/** Search bar, filter dropdowns, action buttons, and result count */
const StudentToolbar = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  disabilityFilter,
  setDisabilityFilter,
  setPage,
  fetchStudents,
  handleExport,
  filteredStudents,
  students,
  loading,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          p: 2,
          mb: 3,
          bgcolor: 'white',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث بالاسم، الهوية، أو رقم الطالب..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 260, flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>نوع الإعاقة</InputLabel>
          <Select
            value={disabilityFilter}
            label="نوع الإعاقة"
            onChange={(e) => {
              setDisabilityFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(DISABILITY_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchStudents} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="تصدير">
            <IconButton onClick={handleExport} color="primary">
              <Download />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/student-registration')}
            sx={{ background: gradients.primary, borderRadius: 2, fontWeight: 'bold' }}
          >
            تسجيل طالب جديد
          </Button>
        </Box>
      </Paper>

      {/* Results info */}
      {!loading && (
        <Box sx={{ mb: 1, px: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {filteredStudents.length === students.length
              ? `${students.length} طالب`
              : `${filteredStudents.length} من ${students.length} طالب`}
          </Typography>
          {(searchQuery || statusFilter !== 'all' || disabilityFilter !== 'all') && (
            <Chip
              label="مسح الفلاتر"
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDisabilityFilter('all');
              }}
            />
          )}
        </Box>
      )}
    </>
  );
};

export default StudentToolbar;
