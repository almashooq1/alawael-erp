import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Collapse,
  Paper,
  Badge,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  DateRange as DateIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { useDebounce } from 'hooks';

/**
 * FilterBar — Reusable search + filter bar with expandable advanced filters.
 *
 * @param {object}   props
 * @param {string}   props.searchValue        — Current search text
 * @param {function} props.onSearchChange      — (value) => void
 * @param {string}   [props.searchPlaceholder] — Placeholder text
 * @param {Array}    [props.filters]           — [{id,label,options:[{value,label}],value,multiple?}]
 * @param {function} [props.onFilterChange]    — (filterId, value) => void
 * @param {string}   [props.dateFrom]          — Start date value
 * @param {string}   [props.dateTo]            — End date value
 * @param {function} [props.onDateChange]      — (field, value) => void
 * @param {boolean}  [props.showDateFilter]    — Show date range
 * @param {function} [props.onClear]           — Clear all filters
 * @param {node}     [props.extraActions]      — Additional action buttons
 * @param {boolean}  [props.collapsible]       — Allow collapsing filters
 */
const FilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filters = [],
  onFilterChange,
  dateFrom = '',
  dateTo = '',
  onDateChange,
  showDateFilter = false,
  onClear,
  extraActions,
  collapsible = false,
}) => {
  const [expanded, setExpanded] = useState(!collapsible);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchValue) count++;
    if (dateFrom || dateTo) count++;
    filters.forEach(f => {
      if (f.multiple ? f.value?.length > 0 : f.value) count++;
    });
    return count;
  }, [searchValue, dateFrom, dateTo, filters]);

  const handleClear = useCallback(() => {
    onSearchChange?.('');
    onDateChange?.('dateFrom', '');
    onDateChange?.('dateTo', '');
    filters.forEach(f => onFilterChange?.(f.id, f.multiple ? [] : ''));
    onClear?.();
  }, [onSearchChange, onDateChange, onFilterChange, onClear, filters]);

  const filterContent = (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search */}
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={e => onSearchChange?.(e.target.value)}
        sx={{ minWidth: 250, flex: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchValue ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onSearchChange?.('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {/* Dynamic filters */}
      {filters.map(filter => (
        <FormControl key={filter.id} size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{filter.label}</InputLabel>
          <Select
            label={filter.label}
            value={filter.value || (filter.multiple ? [] : '')}
            multiple={filter.multiple || false}
            onChange={e => onFilterChange?.(filter.id, e.target.value)}
            renderValue={selected =>
              filter.multiple
                ? (selected || []).map(v => {
                    const opt = filter.options?.find(o => o.value === v);
                    return <Chip key={v} label={opt?.label || v} size="small" sx={{ mr: 0.5 }} />;
                  })
                : filter.options?.find(o => o.value === selected)?.label || selected
            }
          >
            {!filter.multiple && <MenuItem value=""><em>الكل</em></MenuItem>}
            {(filter.options || []).map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}

      {/* Date range */}
      {showDateFilter && (
        <>
          <TextField
            size="small"
            type="date"
            label="من تاريخ"
            value={dateFrom}
            onChange={e => onDateChange?.('dateFrom', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="إلى تاريخ"
            value={dateTo}
            onChange={e => onDateChange?.('dateTo', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
        </>
      )}

      {/* Clear button */}
      {activeFilterCount > 0 && (
        <Tooltip title="مسح الفلاتر">
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<ClearIcon />}
            onClick={handleClear}
          >
            مسح ({activeFilterCount})
          </Button>
        </Tooltip>
      )}

      {extraActions}
    </Box>
  );

  if (!collapsible) {
    return (
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        {filterContent}
      </Paper>
    );
  }

  return (
    <Paper sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
      <Box
        sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={activeFilterCount} color="primary">
            <FilterIcon color="action" />
          </Badge>
          <span>الفلاتر والبحث</span>
        </Box>
        {expanded ? <CollapseIcon /> : <ExpandIcon />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>{filterContent}</Box>
      </Collapse>
    </Paper>
  );
};

export default FilterBar;
