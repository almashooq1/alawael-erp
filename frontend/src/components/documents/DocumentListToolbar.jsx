/**
 * DocumentListToolbar — Search, filters, stats row
 * شريط البحث والمرشحات والإحصائيات
 */


import { CATEGORIES } from './documentListConstants';
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FilterListIcon from '@mui/icons-material/FilterList';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

const DocumentListToolbar = ({
  filters,
  searchRef,
  uniqueTags,
  selection,
  actions,
  filteredCount,
  documents,
  filteredAndSortedDocs,
  onOpenColumnsMenu,
}) => (
  <Paper sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: 2 }}>
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="🔍 البحث في المستندات..."
          value={filters.searchQuery}
          onChange={e => filters.setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 250 }}
          size="small"
          inputRef={searchRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={filters.categoryFilter}
            onChange={e => filters.setCategoryFilter(e.target.value)}
            label="الفئة"
          >
            {CATEGORIES.map(cat => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الترتيب</InputLabel>
          <Select
            value={filters.sortBy}
            onChange={e => filters.setSortBy(e.target.value)}
            label="الترتيب"
          >
            <MenuItem value="date">التاريخ</MenuItem>
            <MenuItem value="title">العنوان</MenuItem>
            <MenuItem value="category">الفئة</MenuItem>
            <MenuItem value="size">الحجم</MenuItem>
          </Select>
        </FormControl>
        <Tooltip title="عكس الترتيب">
          <IconButton
            onClick={() => filters.setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            color="primary"
            sx={{
              transform: filters.sortOrder === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s',
            }}
            aria-label="عكس الترتيب"
          >
            <KeyboardArrowUpIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="المرشحات المتقدمة">
          <IconButton
            onClick={() => filters.setShowFilters(!filters.showFilters)}
            color="primary"
            aria-label="المرشحات المتقدمة"
          >
            <Badge badgeContent={filters.categoryFilter !== 'الكل' ? 1 : 0} color="error">
              <FilterListIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      {/* Advanced Filters Panel */}
      <Collapse in={filters.showFilters}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9ff', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            📊 المرشحات المتقدمة
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="من تاريخ"
                type="date"
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                InputLabelProps={{ shrink: true }}
                value={filters.fromDate}
                onChange={e => filters.setFromDate(e.target.value)}
              />
              <TextField
                label="إلى تاريخ"
                type="date"
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                InputLabelProps={{ shrink: true }}
                value={filters.toDate}
                onChange={e => filters.setToDate(e.target.value)}
              />
              <TextField
                label="الحد الأدنى للحجم (KB)"
                type="number"
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                value={filters.minSizeKB}
                onChange={e => filters.setMinSizeKB(e.target.value)}
              />
              <TextField
                label="الحد الأقصى للحجم (KB)"
                type="number"
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                value={filters.maxSizeKB}
                onChange={e => filters.setMaxSizeKB(e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => filters.setShowFilters(false)}
              >
                إغلاق
              </Button>
              <Button variant="contained" size="small" onClick={filters.handleResetFilters}>
                إعادة تعيين
              </Button>
            </Box>
            {uniqueTags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  🏷️ تصفية بالوسوم
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {uniqueTags.map(tag => {
                    const active = filters.tagFilter.includes(tag);
                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        clickable
                        color={active ? 'success' : 'default'}
                        variant={active ? 'filled' : 'outlined'}
                        onClick={() => filters.handleToggleTag(tag)}
                      />
                    );
                  })}
                  {filters.tagFilter.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => filters.setTagFilter([])}
                      sx={{ ml: 1 }}
                    >
                      مسح الوسوم
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </Paper>
      </Collapse>

      {/* Stats & Selection Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          📁 إجمالي: {filteredCount} مستند
          {filters.searchQuery && ` | 🔍 نتائج البحث: ${filteredCount}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {selection.selected.length > 0 && (
            <Chip
              label={`✓ محدد: ${selection.selected.length}`}
              color="primary"
              size="small"
              onDelete={() => selection.clearSelection()}
              sx={{ fontWeight: 600 }}
            />
          )}
          {filteredCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                actions.handleExportList(
                  'filtered',
                  selection.selected,
                  filteredAndSortedDocs,
                  documents
                )
              }
              sx={{ borderRadius: 2 }}
            >
              تصدير النتائج
            </Button>
          )}
          {filteredCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                actions.handleExportJSON(
                  'filtered',
                  selection.selected,
                  filteredAndSortedDocs,
                  documents
                )
              }
              sx={{ borderRadius: 2 }}
              startIcon={<DataObjectIcon />}
            >
              تصدير JSON
            </Button>
          )}
          <Tooltip title="عرض/إخفاء الأعمدة">
            <IconButton size="small" onClick={onOpenColumnsMenu} aria-label="columns-menu">
              <ViewColumnIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Stack>
  </Paper>
);

export default DocumentListToolbar;
