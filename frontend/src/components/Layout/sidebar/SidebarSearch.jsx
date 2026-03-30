/**
 * SidebarSearch — Search/filter input for navigation items (محسّن)
 * بحث محسّن في قائمة التنقل الجانبية
 */
import { Box, InputBase, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

const SidebarSearch = ({ collapsed, isMobile, searchQuery, onSearchChange, onClear }) => {
  if (collapsed && !isMobile) {
    // Show just an icon when collapsed
    return (
      <Box sx={{ px: 1.25, py: 1.25, display: 'flex', justifyContent: 'center' }}>
        <Tooltip title="بحث في القائمة" placement="left" arrow>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(99,102,241,0.15)',
                borderColor: 'rgba(99,102,241,0.35)',
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
          </Box>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, py: 1.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.6,
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.055)',
          border: '1px solid rgba(255,255,255,0.07)',
          transition: 'all 0.2s ease',
          '&:focus-within': {
            backgroundColor: 'rgba(99,102,241,0.12)',
            borderColor: 'rgba(99,102,241,0.45)',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
          },
        }}
      >
        <SearchIcon
          sx={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.35)',
            flexShrink: 0,
            transition: 'color 0.2s',
            '.MuiBox-root:focus-within &': { color: 'rgba(99,102,241,0.8)' },
          }}
        />
        <InputBase
          placeholder="ابحث في القائمة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            flex: 1,
            fontSize: '0.7875rem',
            color: 'rgba(255,255,255,0.82)',
            '& input': { p: 0 },
            '& input::placeholder': {
              color: 'rgba(255,255,255,0.28)',
              opacity: 1,
              fontSize: '0.7875rem',
            },
          }}
        />
        {searchQuery && (
          <IconButton
            size="small"
            aria-label="مسح البحث"
            onClick={onClear}
            sx={{
              p: 0.25,
              borderRadius: '5px',
              color: 'rgba(255,255,255,0.35)',
              '&:hover': {
                color: 'rgba(255,255,255,0.8)',
                backgroundColor: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default SidebarSearch;
