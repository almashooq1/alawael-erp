/**
 * CommunicationFilters — Search bar + filter selects
 */

import {
  COMMUNICATION_TYPES,
  COMMUNICATION_STATUS,
  PRIORITY_LEVELS,
} from './communicationsConstants';
import {
  Card,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterIcon from '@mui/icons-material/Filter';

const CommunicationFilters = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  resultCount,
}) => (
  <Card sx={{ mb: 2, p: 2 }}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          placeholder="بحث في المراسلات..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> }}
        />
      </Grid>
      <Grid item xs={12} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>النوع</InputLabel>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)} label="النوع">
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(COMMUNICATION_TYPES).map(([key, value]) => (
              <MenuItem key={key} value={key}>{value.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>الحالة</InputLabel>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="الحالة">
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(COMMUNICATION_STATUS).map(([key, value]) => (
              <MenuItem key={key} value={key}>{value.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>الأولوية</InputLabel>
          <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} label="الأولوية">
            <MenuItem value="all">الكل</MenuItem>
            {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
              <MenuItem key={key} value={key}>{value.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={2}>
        <Chip label={`${resultCount} مراسلة`} color="primary" icon={<FilterIcon />} />
      </Grid>
    </Grid>
  </Card>
);

export default CommunicationFilters;
