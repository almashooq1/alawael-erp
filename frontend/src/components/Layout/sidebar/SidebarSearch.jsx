/**
 * SidebarSearch — Search/filter input for navigation items.
 * مُحسّن ليتوافق مع الخلفية الداكنة للقائمة الجانبية
 */
import { Box, InputBase, IconButton } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

const SidebarSearch = ({ collapsed, isMobile, searchQuery, onSearchChange, onClear }) => {
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
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.2s ease',
          '&:focus-within': {
            backgroundColor: 'rgba(99,102,241,0.12)',
            borderColor: 'rgba(99,102,241,0.4)',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
          },
        }}
      >
        <SearchIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <InputBase
          placeholder="بحث في القائمة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            flex: 1,
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.85)',
            '& input::placeholder': {
              color: 'rgba(255,255,255,0.35)',
              opacity: 1,
            },
          }}
        />
        {searchQuery && (
          <IconButton
            size="small"
            aria-label="مسح البحث"
            onClick={onClear}
            sx={{
              color: 'rgba(255,255,255,0.4)',
              '&:hover': { color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default SidebarSearch;
