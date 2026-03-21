/**
 * DashboardSearchBar — Section filter with filtered count badge
 */
import { useTheme } from '@mui/material';
import { brandColors, statusColors } from 'theme/palette';
import { SECTIONS } from '../dashboardConstants';

const DashboardSearchBar = ({ searchQuery, onSearchChange, visibleSections }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
      <TextField
        size="small"
        placeholder="🔍 بحث في الأقسام... (مالية، موارد بشرية، عمليات...)"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="بحث وتصفية أقسام لوحة التحكم"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          flex: 1,
          maxWidth: 420,
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            fontSize: '0.85rem',
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          },
        }}
      />
      {searchQuery && visibleSections && (
        <Chip
          size="small"
          label={`${Object.keys(visibleSections).length} / ${SECTIONS.length} أقسام مرئية`}
          sx={{
            fontWeight: 700,
            fontSize: '0.7rem',
            height: 26,
            background: Object.keys(visibleSections).length > 0 ? 'rgba(67,233,123,0.1)' : 'rgba(244,67,54,0.1)',
            color: Object.keys(visibleSections).length > 0 ? brandColors.accentGreen : statusColors.error,
            border: '1px solid',
            borderColor: Object.keys(visibleSections).length > 0 ? 'rgba(67,233,123,0.2)' : 'rgba(244,67,54,0.2)',
          }}
        />
      )}
    </Box>
  );
};

export default DashboardSearchBar;
