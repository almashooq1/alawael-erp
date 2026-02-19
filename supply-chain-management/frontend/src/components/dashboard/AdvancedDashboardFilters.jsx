/**
 * Advanced Dashboard Filters Component
 * Provides multi-criteria filtering, search, and saved filters
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Chip,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Grid,
  Typography,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ClearAll as ClearAllIcon,
  SaveAs as SaveAsIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const AdvancedDashboardFilters = ({
  kpis = [],
  onFiltersChange,
  onSearch,
  availableFilters = {},
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    statuses: [],
    trends: [],
    owners: [],
    frequencies: [],
    performanceMin: 0,
    performanceMax: 100,
  });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle search query
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (value.length >= 2) {
        // Generate suggestions
        const matchedKPIs = kpis.filter(
          (kpi) =>
            kpi.name.toLowerCase().includes(value.toLowerCase()) ||
            kpi.category.toLowerCase().includes(value.toLowerCase())
        );

        setSuggestions(matchedKPIs.slice(0, 5));
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }

      onSearch(value);
    },
    [kpis, onSearch]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filterType, value) => {
      setActiveFilters((prev) => {
        const updated = { ...prev };

        if (filterType.includes('Min') || filterType.includes('Max')) {
          // Range filters
          updated[filterType] = value;
        } else {
          // Multi-select filters
          if (updated[filterType].includes(value)) {
            updated[filterType] = updated[filterType].filter((v) => v !== value);
          } else {
            updated[filterType] = [...updated[filterType], value];
          }
        }

        onFiltersChange(updated);
        return updated;
      });
    },
    [onFiltersChange]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    const clearedFilters = {
      categories: [],
      statuses: [],
      trends: [],
      owners: [],
      frequencies: [],
      performanceMin: 0,
      performanceMax: 100,
    };

    setActiveFilters(clearedFilters);
    setSearchQuery('');
    onFiltersChange(clearedFilters);
    onSearch('');
  }, [onFiltersChange, onSearch]);

  // Save filter preset
  const handleSaveFilter = useCallback(() => {
    if (!filterName.trim()) return;

    const newFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: activeFilters,
      createdAt: new Date(),
    };

    setSavedFilters([...savedFilters, newFilter]);
    setFilterName('');
    setOpenSaveDialog(false);
  }, [filterName, activeFilters]);

  // Load saved filter
  const handleLoadSavedFilter = useCallback(
    (filterId) => {
      const saved = savedFilters.find((f) => f.id === filterId);
      if (saved) {
        setActiveFilters(saved.filters);
        onFiltersChange(saved.filters);
      }
    },
    [savedFilters, onFiltersChange]
  );

  // Delete saved filter
  const handleDeleteSavedFilter = useCallback((filterId) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (activeFilters.categories.length > 0) count++;
    if (activeFilters.statuses.length > 0) count++;
    if (activeFilters.trends.length > 0) count++;
    if (activeFilters.owners.length > 0) count++;
    if (activeFilters.frequencies.length > 0) count++;
    if (
      activeFilters.performanceMin > 0 ||
      activeFilters.performanceMax < 100
    ) {
      count++;
    }
    return count;
  }, [searchQuery, activeFilters]);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search KPIs by name, category, or owner..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
          size="small"
          autoComplete="off"
          onFocus={() => searchQuery && setShowSuggestions(true)}
        />

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              {suggestions.length} suggestions found
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {suggestions.map((kpi) => (
                <Chip
                  key={kpi.id}
                  label={kpi.name}
                  size="small"
                  onClick={() => {
                    setSearchQuery(kpi.name);
                    setShowSuggestions(false);
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Filter Chips and Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
              />
            }
            label="Advanced Mode"
          />
          <Button
            startIcon={<FilterListIcon />}
            size="small"
            variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
          >
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
          <Button
            startIcon={<SaveAsIcon />}
            size="small"
            onClick={() => setOpenSaveDialog(true)}
          >
            Save Filter
          </Button>
          <Button
            startIcon={<ClearAllIcon />}
            size="small"
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0}
          >
            Clear All
          </Button>
        </Stack>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {searchQuery && (
                <Chip
                  label={`Search: ${searchQuery}`}
                  onDelete={() => {
                    setSearchQuery('');
                    onSearch('');
                  }}
                  color="primary"
                  variant="outlined"
                />
              )}

              {activeFilters.categories.map((cat) => (
                <Chip
                  key={`cat_${cat}`}
                  label={`Category: ${cat}`}
                  onDelete={() => handleFilterChange('categories', cat)}
                  color="primary"
                  variant="outlined"
                />
              ))}

              {activeFilters.statuses.map((status) => (
                <Chip
                  key={`status_${status}`}
                  label={`Status: ${status}`}
                  onDelete={() => handleFilterChange('statuses', status)}
                  color="primary"
                  variant="outlined"
                />
              ))}

              {activeFilters.trends.map((trend) => (
                <Chip
                  key={`trend_${trend}`}
                  label={`Trend: ${trend}`}
                  onDelete={() => handleFilterChange('trends', trend)}
                  color="primary"
                  variant="outlined"
                />
              ))}

              {activeFilters.owners.map((owner) => (
                <Chip
                  key={`owner_${owner}`}
                  label={`Owner: ${owner}`}
                  onDelete={() => handleFilterChange('owners', owner)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Filter Dropdowns */}
        {advancedMode && (
          <Grid container spacing={2}>
            {/* Category Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Select
                multiple
                fullWidth
                size="small"
                value={activeFilters.categories}
                onChange={(e) => {
                  const value = e.target.value;
                  setActiveFilters((prev) => ({
                    ...prev,
                    categories: typeof value === 'string' ? value.split(',') : value,
                  }));
                }}
                displayEmpty
                renderValue={(selected) =>
                  selected.length === 0 ? 'Select Categories' : `${selected.length} selected`
                }
              >
                {availableFilters.categories?.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Select
                multiple
                fullWidth
                size="small"
                value={activeFilters.statuses}
                onChange={(e) => {
                  const value = e.target.value;
                  setActiveFilters((prev) => ({
                    ...prev,
                    statuses: typeof value === 'string' ? value.split(',') : value,
                  }));
                }}
                displayEmpty
                renderValue={(selected) =>
                  selected.length === 0 ? 'Select Status' : `${selected.length} selected`
                }
              >
                {availableFilters.statuses?.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            {/* Trend Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Select
                multiple
                fullWidth
                size="small"
                value={activeFilters.trends}
                onChange={(e) => {
                  const value = e.target.value;
                  setActiveFilters((prev) => ({
                    ...prev,
                    trends: typeof value === 'string' ? value.split(',') : value,
                  }));
                }}
                displayEmpty
                renderValue={(selected) =>
                  selected.length === 0 ? 'Select Trend' : `${selected.length} selected`
                }
              >
                {availableFilters.trends?.map((trend) => (
                  <MenuItem key={trend} value={trend}>
                    {trend}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            {/* Performance Range */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label="Min Performance %"
                value={activeFilters.performanceMin}
                onChange={(e) =>
                  handleFilterChange('performanceMin', parseInt(e.target.value))
                }
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Saved Filters
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {savedFilters.map((filter) => (
              <Tooltip key={filter.id} title={`Created: ${filter.createdAt.toLocaleDateString()}`}>
                <Chip
                  label={filter.name}
                  onClick={() => handleLoadSavedFilter(filter.id)}
                  onDelete={() => handleDeleteSavedFilter(filter.id)}
                  color="secondary"
                  variant="outlined"
                />
              </Tooltip>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={openSaveDialog} onClose={() => setOpenSaveDialog(false)}>
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Filter Name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="e.g., Critical Revenue KPIs"
            sx={{ mt: 2 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSaveDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveFilter}
            variant="contained"
            disabled={!filterName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedDashboardFilters;
