/**
 * AuditLogViewer Component
 * Phase 13 - Week 1: Audit Log Display & Search
 * Displays audit trail with filtering and search capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Pagination,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { useRBAC } from '../../contexts/RBACContext';

const CATEGORIES = [
  'ALL',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'DATA_ACCESS',
  'CONFIG_CHANGE',
  'SECURITY',
  'API_CALL',
];

const SEVERITY_COLORS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
};

export const AuditLogViewer = () => {
  const { hasPermission } = useRBAC();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const logsPerPage = 50;

  useEffect(() => {
    loadLogs();
  }, [category, page, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: logsPerPage,
      };

      if (category !== 'ALL') {
        params.category = category;
      }

      if (startDate) {
        params.startDate = startDate.toISOString();
      }

      if (endDate) {
        params.endDate = endDate.toISOString();
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await axios.get('/api/audit/logs', {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setLogs(response.data.logs || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError('Failed to load audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleExport = async (format = 'csv') => {
    try {
      const params = {
        format,
      };

      if (category !== 'ALL') {
        params.category = category;
      }

      if (startDate) {
        params.startDate = startDate.toISOString();
      }

      if (endDate) {
        params.endDate = endDate.toISOString();
      }

      const response = await axios.get('/api/audit/export', {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export logs: ' + err.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Check permission
  if (!hasPermission('read:audit')) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to view audit logs.
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center">
                <HistoryIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Audit Log Viewer
                </Typography>
              </Box>

              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={loadLogs} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export CSV">
                  <IconButton onClick={() => handleExport('csv')}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                    label="Category"
                  >
                    {CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    setPage(1);
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    setPage(1);
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  placeholder="User, action, resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={handleSearch} edge="end">
                        <SearchIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Resource</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((log, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                          <TableCell>
                            <Chip label={log.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{log.email || log.userId || '-'}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.resource || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={log.severity}
                              color={SEVERITY_COLORS[log.severity] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap>
                              {JSON.stringify(log.details || {})}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {logs.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">No audit logs found</Typography>
                  </Box>
                )}

                {totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(e, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default AuditLogViewer;
