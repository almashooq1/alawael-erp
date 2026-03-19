/**
 * SidebarSearch — Search/filter input for navigation items.
 */
import { Box, InputBase, IconButton, alpha } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

const SidebarSearch = ({ collapsed, isMobile, searchQuery, onSearchChange, onClear, theme }) => {
  if (collapsed && !isMobile) return null;

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: '8px',
          backgroundColor: theme.palette.action.hover,
          transition: 'background-color 0.2s',
          '&:focus-within': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            outline: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          },
        }}
      >
        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <InputBase
          placeholder="بحث في القائمة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ flex: 1, fontSize: '0.8125rem' }}
        />
        {searchQuery && (
          <IconButton size="small" aria-label="مسح البحث" onClick={onClear}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default SidebarSearch;
