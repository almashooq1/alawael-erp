/**
 * شريط أدوات جدول المستفيدين
 * BeneficiariesToolbar – header banner + search / filter card
 */


import { gradients } from '../../theme/palette';
import { getStatusLabel, getCategoryLabel } from './beneficiariesLabelHelpers';
import { DEFAULT_FILTERS } from './beneficiariesTableConstants';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Upload from '@mui/icons-material/Upload';
import Download from '@mui/icons-material/Download';
import Search from '@mui/icons-material/Search';
import FilterList from '@mui/icons-material/FilterList';

const BeneficiariesToolbar = ({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  setFilterDialog,
  setExportDialog,
  navigate,
}) => (
  <>
    {/* Header Banner */}
    <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PersonAdd sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            جدول المستفيدين المتقدم
          </Typography>
          <Typography variant="body2">إدارة وتصفية بيانات المستفيدين</Typography>
        </Box>
      </Box>
    </Box>

    {/* Search & Filter Card */}
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              جدول المستفيدين
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Upload />}>
                استيراد
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => setExportDialog(true)}
              >
                تصدير
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/student-registration')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  fontWeight: 'bold',
                }}
              >
                تسجيل مستفيد جديد
              </Button>
            </Stack>
          </Box>

          {/* Search + Filter Button */}
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              placeholder="البحث بالاسم، رقم الهوية، أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFilterDialog(true)}
              sx={{ minWidth: 120 }}
            >
              فلترة
            </Button>
          </Stack>

          {/* Active Filter Chips */}
          {(filters.status !== 'all' ||
            filters.category !== 'all' ||
            filters.gender !== 'all') && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filters.status !== 'all' && (
                <Chip
                  label={`الحالة: ${getStatusLabel(filters.status)}`}
                  onDelete={() => setFilters({ ...filters, status: 'all' })}
                  size="small"
                />
              )}
              {filters.category !== 'all' && (
                <Chip
                  label={`الفئة: ${getCategoryLabel(filters.category)}`}
                  onDelete={() => setFilters({ ...filters, category: 'all' })}
                  size="small"
                />
              )}
              {filters.gender !== 'all' && (
                <Chip
                  label={`الجنس: ${filters.gender === 'male' ? 'ذكر' : 'أنثى'}`}
                  onDelete={() => setFilters({ ...filters, gender: 'all' })}
                  size="small"
                />
              )}
              <Button size="small" onClick={() => setFilters(DEFAULT_FILTERS)}>
                مسح الكل
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  </>
);

export default BeneficiariesToolbar;
