/**
 * FilterBar — شريط البحث والفلترة المتقدم (Phase 2)
 *
 * Smart filter bar with:
 * - Debounced search input
 * - Filter chip row (status, type, date, etc.)
 * - Active filter count badge
 * - Clear all filters
 * - Export / column toggle slots
 * - Responsive collapse on mobile
 * - Phase 2: date range picker, saved filters, keyboard shortcuts, view toggle
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Box, InputBase, IconButton, Chip, Tooltip, Button,
  Popover, Badge, Typography, Divider, useTheme, alpha,
  Collapse, TextField, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterListOutlined,
  CloseOutlined,
  TuneOutlined,
  KeyboardArrowDown,
  Done as DoneIcon,
  RefreshOutlined,
  ViewListOutlined,
  ViewModuleOutlined,
  CalendarMonth as CalendarIcon,
  BookmarkBorderOutlined,
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
function FilterChip({ label, options = [], value, onChange, color = 'primary', multiple = false }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [anchor, setAnchor] = useState(null);

  // Support single and multiple selection
  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : [];
  const selectedOption = !multiple ? options.find((o) => o.value === value) : null;
  const hasValue = multiple ? selectedValues.length > 0 : Boolean(value);

  const displayLabel = multiple
    ? (selectedValues.length > 0 ? `${label} (${selectedValues.length})` : label)
    : (selectedOption ? selectedOption.label : label);

  const handleSelect = (optValue) => {
    if (multiple) {
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange(next.length > 0 ? next : null);
    } else {
      onChange(optValue === value ? null : optValue);
      setAnchor(null);
    }
  };

  return (
    <>
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{displayLabel}</span>
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
        slotProps={{ paper: { sx: { width: 220, mt: 0.75, py: 0.5, maxHeight: 320, overflow: 'auto' } } }}
      >
        {options.map((opt) => {
          const isSelected = multiple
            ? selectedValues.includes(opt.value)
            : opt.value === value;

          return (
            <Box
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
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
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? (theme.palette[color]?.main || '#6366F1') : 'text.primary',
                backgroundColor: isSelected
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
                {opt.count !== undefined && (
                  <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.disabled', ml: 0.5 }}>
                    ({opt.count})
                  </Typography>
                )}
              </Box>
              {isSelected && <DoneIcon sx={{ fontSize: 15 }} />}
            </Box>
          );
        })}
      </Popover>
    </>
  );
}

// ─── Date range filter ────────────────────────────────────────────────────────
function DateRangeChip({ label = 'التاريخ', value, onChange, color = 'primary' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [anchor, setAnchor] = useState(null);
  const hasValue = Boolean(value?.from || value?.to);

  return (
    <>
      <Chip
        icon={<CalendarIcon sx={{ fontSize: 14 }} />}
        label={
          hasValue
            ? `${value.from || '...'} → ${value.to || '...'}`
            : label
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
          '& .MuiChip-icon': { color: 'inherit' },
          '& .MuiChip-label': { px: 1 },
          transition: 'all 0.15s',
        }}
      />

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 260, p: 2, mt: 0.75 } } }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
          نطاق التاريخ
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="من"
            type="date"
            size="small"
            value={value?.from || ''}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={value?.to || ''}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => { onChange(null); setAnchor(null); }}>
              مسح
            </Button>
            <Button size="small" variant="contained" onClick={() => setAnchor(null)}>
              تطبيق
            </Button>
          </Box>
        </Box>
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
  // Phase 2 new props
  dateRange,          // { from, to } or null
  onDateRangeChange,  // (range) => void
  viewMode,           // 'list' | 'grid'
  onViewModeChange,   // (mode) => void
  resultCount,        // number — show result count
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

  const activeFilterCount = Object.values(filterValues).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return Boolean(v);
  }).length + (dateRange?.from || dateRange?.to ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || searchText;

  const handleReset = useCallback(() => {
    setSearchText('');
    onDateRangeChange?.(null);
    onReset?.();
  }, [onReset, onDateRangeChange]);

  // Phase 2: Keyboard shortcut — Ctrl+K to focus search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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

        {/* Keyboard shortcut hint */}
        {!searchText && (
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: 'text.disabled',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
              borderRadius: '4px',
              px: 0.75,
              py: 0.15,
              fontFamily: 'monospace',
              display: { xs: 'none', sm: 'block' },
              flexShrink: 0,
            }}
          >
            Ctrl+K
          </Typography>
        )}

        {/* Clear search */}
        {searchText && (
          <Tooltip title="مسح البحث">
            <IconButton size="small" onClick={() => setSearchText('')} sx={{ p: 0.5, color: 'text.secondary' }}>
              <CloseOutlined sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Divider */}
        {(filters.length > 0 || onDateRangeChange) && (
          <Box sx={{ width: '1px', height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', flexShrink: 0 }} />
        )}

        {/* Filter toggle */}
        {(filters.length > 0 || onDateRangeChange) && (
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

        {/* Phase 2: View mode toggle */}
        {onViewModeChange && (
          <>
            <Box sx={{ width: '1px', height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', flexShrink: 0 }} />
            <ToggleButtonGroup
              value={viewMode || 'list'}
              exclusive
              onChange={(_, v) => v && onViewModeChange(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  p: 0.5,
                  border: 'none',
                  borderRadius: '6px !important',
                  color: 'text.disabled',
                  '&.Mui-selected': { color: 'primary.main', backgroundColor: alpha('#6366F1', 0.08) },
                },
              }}
            >
              <ToggleButton value="list"><ViewListOutlined sx={{ fontSize: 17 }} /></ToggleButton>
              <ToggleButton value="grid"><ViewModuleOutlined sx={{ fontSize: 17 }} /></ToggleButton>
            </ToggleButtonGroup>
          </>
        )}

        {/* Extra actions slot */}
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {actions}
          </Box>
        )}
      </Box>

      {/* ── Filters row ────────────────────────────────────────────────── */}
      {(filters.length > 0 || onDateRangeChange) && (
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
                multiple={f.multiple}
              />
            ))}

            {/* Phase 2: Date range filter */}
            {onDateRangeChange && (
              <DateRangeChip
                value={dateRange}
                onChange={onDateRangeChange}
              />
            )}

            {/* Result count + clear */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 'auto' }}>
              {resultCount !== undefined && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                  {resultCount.toLocaleString('ar-SA')} نتيجة
                </Typography>
              )}
            </Box>

            {activeFilterCount > 0 && (
              <Button
                size="small"
                onClick={handleReset}
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
