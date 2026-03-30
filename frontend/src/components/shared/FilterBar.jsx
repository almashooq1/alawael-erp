/**
 * FilterBar — شريط البحث والفلترة المتقدم
 *
 * Smart filter bar with:
 * - Debounced search input
 * - Filter chip row (status, type, date, etc.)
 * - Active filter count badge
 * - Clear all filters
 * - Export / column toggle slots
 * - Responsive collapse on mobile
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Box, InputBase, IconButton, Chip, Tooltip, Button,
  Popover, Badge, Typography, Divider, useTheme, alpha,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterListOutlined,
  CloseOutlined,
  TuneOutlined,
  KeyboardArrowDown,
  Done as DoneIcon,
  RefreshOutlined,
} from '@mui/icons-material';

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Filter option chip ───────────────────────────────────────────────────────
function FilterChip({ label, options = [], value, onChange, color = 'primary' }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [anchor, setAnchor] = useState(null);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = Boolean(value);

  return (
    <>
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{selectedOption ? selectedOption.label : label}</span>
            <KeyboardArrowDown sx={{ fontSize: 14, transition: 'transform 0.2s', transform: anchor ? 'rotate(180deg)' : 'none' }} />
          </Box>
        }
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        onDelete={hasValue ? () => onChange(null) : undefined}
        deleteIcon={hasValue ? <CloseOutlined sx={{ fontSize: 13 }} /> : undefined}
        sx={{
          height: 30,
          fontSize: '0.8125rem',
          fontWeight: hasValue ? 600 : 400,
          cursor: 'pointer',
          borderRadius: '8px',
          border: `1px solid ${hasValue ? alpha(theme.palette[color]?.main || '#6366F1', 0.4) : (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0')}`,
          backgroundColor: hasValue
            ? alpha(theme.palette[color]?.main || '#6366F1', isDark ? 0.15 : 0.07)
            : (isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'),
          color: hasValue ? (theme.palette[color]?.main || '#6366F1') : 'text.secondary',
          '& .MuiChip-label': { px: 1.25 },
          transition: 'all 0.15s',
          '&:hover': {
            borderColor: theme.palette[color]?.main || '#6366F1',
          },
        }}
      />

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 200, mt: 0.75, py: 0.5 } } }}
      >
        {options.map((opt) => (
          <Box
            key={opt.value}
            onClick={() => { onChange(opt.value === value ? null : opt.value); setAnchor(null); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.875,
              mx: 0.75,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: opt.value === value ? 600 : 400,
              color: opt.value === value ? (theme.palette[color]?.main || '#6366F1') : 'text.primary',
              backgroundColor: opt.value === value
                ? alpha(theme.palette[color]?.main || '#6366F1', 0.07)
                : 'transparent',
              transition: 'background-color 0.12s',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {opt.icon && <Box sx={{ color: opt.color || 'inherit', display: 'flex' }}>{opt.icon}</Box>}
              {opt.label}
            </Box>
            {opt.value === value && <DoneIcon sx={{ fontSize: 15 }} />}
          </Box>
        ))}
      </Popover>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const FilterBar = memo(function FilterBar({
  placeholder = 'ابحث...',
  onSearch,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  actions,
  searchDebounce = 400,
  defaultExpanded = true,
  sx = {},
}) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [searchText, setSearchText] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(defaultExpanded);
  const inputRef = useRef(null);

  const debouncedSearch = useDebounce(searchText, searchDebounce);

  useEffect(() => {
    onSearch?.(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  const activeFilterCount = Object.values(filterValues).filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0 || searchText;

  const handleReset = useCallback(() => {
    setSearchText('');
    onReset?.();
  }, [onReset]);

  return (
    <Box
      sx={{
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* ── Search row ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          height: 48,
        }}
      >
        {/* Search icon */}
        <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />

        {/* Input */}
        <InputBase
          inputRef={inputRef}
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{
            flex: 1,
            fontSize: '0.875rem',
            '& input': { padding: 0 },
          }}
        />

        {/* Clear search */}
        {searchText && (
          <Tooltip title="مسح البحث">
            <IconButton size="small" onClick={() => setSearchText('')} sx={{ p: 0.5, color: 'text.secondary' }}>
              <CloseOutlined sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Divider */}
        {filters.length > 0 && (
          <Box sx={{ width: '1px', height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', flexShrink: 0 }} />
        )}

        {/* Filter toggle */}
        {filters.length > 0 && (
          <Tooltip title={filtersOpen ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}>
            <Badge badgeContent={activeFilterCount} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}>
              <IconButton
                size="small"
                onClick={() => setFiltersOpen((o) => !o)}
                sx={{
                  p: 0.75,
                  color: activeFilterCount > 0 ? 'primary.main' : 'text.secondary',
                  backgroundColor: activeFilterCount > 0 ? alpha('#6366F1', 0.08) : 'transparent',
                  '&:hover': { color: 'primary.main' },
                  borderRadius: '8px',
                }}
              >
                <TuneOutlined sx={{ fontSize: 17 }} />
              </IconButton>
            </Badge>
          </Tooltip>
        )}

        {/* Reset */}
        {hasActiveFilters && (
          <Tooltip title="إعادة تعيين">
            <IconButton
              size="small"
              onClick={handleReset}
              sx={{ p: 0.75, color: 'text.secondary', '&:hover': { color: 'error.main' }, borderRadius: '8px' }}
            >
              <RefreshOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Extra actions slot */}
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {actions}
          </Box>
        )}
      </Box>

      {/* ── Filters row ────────────────────────────────────────────────── */}
      {filters.length > 0 && (
        <Collapse in={filtersOpen}>
          <Box
            sx={{
              px: 1.5,
              pb: 1.25,
              pt: 0.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}`,
            }}
          >
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', mr: 0.5 }}>
              فلتر:
            </Typography>

            {filters.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                options={f.options || []}
                value={filterValues[f.key]}
                onChange={(val) => onFilterChange?.(f.key, val)}
                color={f.color}
              />
            ))}

            {activeFilterCount > 0 && (
              <Button
                size="small"
                onClick={onReset}
                sx={{ fontSize: '0.75rem', color: 'error.main', p: 0.5, minWidth: 'auto', mr: 0 }}
              >
                مسح الكل ({activeFilterCount})
              </Button>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
});

export default FilterBar;
