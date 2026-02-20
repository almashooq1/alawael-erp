/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 Audit Log Viewer - عارض سجل التدقيق
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete audit log viewer with advanced filtering, search,
 * incident detection, and export capabilities
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  Visibility as ViewIcon,
  WarningAmber as IncidentIcon,
  CheckCircle as SuccessIcon,
  Cancel as FailureIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { useAuditLogs, useSecurity } from '../../hooks/useRBAC';
import { rbacService } from '../../services/rbacAPIService';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EVENTTYPE_COLORS = {
  'role_assigned': 'success',
  'role_removed': 'warning',
  'permission_granted': 'success',
  'permission_revoked': 'error',
  'policy_evaluated': 'info',
  'access_denied': 'error',
  'login': 'success',
  'logout': 'info',
  'user_created': 'success',
  'user_deleted': 'error',
  'policy_created': 'success',
  'policy_updated': 'info',
  'anomaly_detected': 'error',
};

const SEVERITY_LEVELS = [
  { value: 'critical', label: '🔴 Critical', color: 'error' },
  { value: 'high', label: '🟠 High', color: 'warning' },
  { value: 'medium', label: '🟡 Medium', color: 'info' },
  { value: 'low', label: '🟢 Low', color: 'success' },
];

const AuditLogViewer = () => {
  // State Management
  const { auditLogs, loading, error, searchLogs, exportLogs } = useAuditLogs();
  const { incidents } = useSecurity();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // Get unique values for filters
  const uniqueUsers = useMemo(() => {
    return [...new Set((auditLogs || []).map((log) => log.user))].filter(Boolean);
  }, [auditLogs]);

  const uniqueActions = useMemo(() => {
    return [...new Set((auditLogs || []).map((log) => log.action))].filter(Boolean);
  }, [auditLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter((log) => {
      const matchSearch =
        searchTerm === '' ||
        log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase?.().includes(searchTerm.toLowerCase());

      const matchUser = !filterUser || log.user === filterUser;
      const matchAction = !filterAction || log.action === filterAction;
      const matchSeverity = !filterSeverity || log.severity === filterSeverity;
      const matchStatus = !filterStatus || log.status === filterStatus;

      let matchDate = true;
      if (dateFrom || dateTo) {
        const logDate = new Date(log.timestamp);
        if (dateFrom) matchDate &= logDate >= new Date(dateFrom);
        if (dateTo) matchDate &= logDate <= new Date(dateTo);
      }

      return matchSearch && matchUser && matchAction && matchSeverity && matchStatus && matchDate;
    });
  }, [auditLogs, searchTerm, filterUser, filterAction, filterSeverity, filterStatus, dateFrom, dateTo]);

  const paginatedLogs = filteredLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // trigger refresh - in real app, call refresh API
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Handlers
  const handleOpenDetail = useCallback((log) => {
    setSelectedLog(log);
    setOpenDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setOpenDetail(false);
    setSelectedLog(null);
  }, []);

  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleSearch = useCallback(async () => {
    try {
      await searchLogs({
        query: searchTerm,
        user: filterUser,
        action: filterAction,
        severity: filterSeverity,
        status: filterStatus,
        dateFrom,
        dateTo,
      });
    } catch (err) {
      alert('Error searching logs: ' + err.message);
    }
  }, [searchTerm, filterUser, filterAction, filterSeverity, filterStatus, dateFrom, dateTo, searchLogs]);

  const handleExport = useCallback(async () => {
    try {
      const format = window.prompt('Export format (csv or json)?', 'csv');
      if (!format) return;

      await exportLogs({
        format,
        logs: filteredLogs,
      });

      alert('Logs exported successfully');
    } catch (err) {
      alert('Error exporting logs: ' + err.message);
    }
  }, [filteredLogs, exportLogs]);

  // Calculate statistics
  const stats = {
    total: (auditLogs || []).length,
    today: (auditLogs || []).filter((log) => {
      const logDate = new Date(log.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
    succeeded: (auditLogs || []).filter((log) => log.status === 'success').length,
    failed: (auditLogs || []).filter((log) => log.status === 'failure').length,
    incidents: (incidents || []).length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          📋 Audit Logs
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Monitor and analyze system access and security events
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Logs
              </Typography>
              <Typography variant="h5">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Today
              </Typography>
              <Typography variant="h5">{stats.today}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Succeeded
              </Typography>
              <Typography variant="h5" color="success.main">{stats.succeeded}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h5" color="error.main">{stats.failed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Badge badgeContent={stats.incidents} color="error">
                <Typography color="textSecondary" gutterBottom>
                  Incidents
                </Typography>
              </Badge>
              <Typography variant="h5" color="error">{stats.incidents}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Incidents Alert */}
      {incidents && incidents.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            ⚠️ {incidents.length} security incident(s) detected
          </Typography>
        </Alert>
      )}

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Search Row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
            />

            <Tooltip title="Export logs">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Tooltip>

            <Tooltip title="Refresh logs">
              <IconButton onClick={handleSearch} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Filter Row 1 */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>User</InputLabel>
              <Select
                value={filterUser}
                label="User"
                onChange={(e) => {
                  setFilterUser(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Users</MenuItem>
                {uniqueUsers.map((user) => (
                  <MenuItem key={user} value={user}>
                    {user}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={filterAction}
                label="Action"
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Actions</MenuItem>
                {uniqueActions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="success">✅ Success</MenuItem>
                <MenuItem value="failure">❌ Failure</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filterSeverity}
                label="Severity"
                onChange={(e) => {
                  setFilterSeverity(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Levels</MenuItem>
                {SEVERITY_LEVELS.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Filter Row 2 - Date Range */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="From Date"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="To Date"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <FormControl size="small">
              <InputLabel>Auto Refresh</InputLabel>
              <Select
                value={autoRefresh ? refreshInterval : ''}
                label="Auto Refresh"
                onChange={(e) => {
                  if (e.target.value === '') {
                    setAutoRefresh(false);
                  } else {
                    setAutoRefresh(true);
                    setRefreshInterval(parseInt(e.target.value));
                  }
                }}
              >
                <MenuItem value="">Off</MenuItem>
                <MenuItem value="10">Every 10s</MenuItem>
                <MenuItem value="30">Every 30s</MenuItem>
                <MenuItem value="60">Every 1m</MenuItem>
                <MenuItem value="300">Every 5m</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {/* Content Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Logs" />
          <Tab label="Incidents" />
          <Tab label="Statistics" />
        </Tabs>

        {/* Tab 1: All Logs */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Timestamp</strong></TableCell>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                  <TableCell><strong>Resource</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Severity</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log, idx) => (
                    <TableRow
                      key={idx}
                      hover
                      sx={{
                        bgcolor:
                          log.isIncident || log.isAnomaly ? 'error.lighter' : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.user} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={EVENTTYPE_COLORS[log.action] || 'default'}
                        />
                      </TableCell>
                      <TableCell>{log.resource || '-'}</TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <SuccessIcon sx={{ color: 'success.main' }} />
                        ) : (
                          <FailureIcon sx={{ color: 'error.main' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.severity || 'low'}
                          size="small"
                          color={
                            SEVERITY_LEVELS.find((l) => l.value === log.severity)
                              ?.color || 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDetail(log)}
                            color="primary"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            component="div"
            count={filteredLogs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TabPanel>

        {/* Tab 2: Incidents */}
        <TabPanel value={tabValue} index={1}>
          {incidents && incidents.length > 0 ? (
            <Stack spacing={2}>
              {incidents.map((incident, idx) => (
                <Card key={idx} sx={{ borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          <IncidentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {incident.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {incident.description}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Detected: {new Date(incident.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={incident.severity}
                        color="error"
                        size="small"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
              No security incidents detected
            </Typography>
          )}
        </TabPanel>

        {/* Tab 3: Statistics */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Status Distribution
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Success</Typography>
                      <Chip
                        label={`${stats.succeeded} (${((stats.succeeded / stats.total) * 100).toFixed(1)}%)`}
                        color="success"
                        size="small"
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Failure</Typography>
                      <Chip
                        label={`${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`}
                        color="error"
                        size="small"
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Top Actions
                  </Typography>
                  <Stack spacing={1}>
                    {uniqueActions.slice(0, 5).map((action) => {
                      const count = (auditLogs || []).filter(
                        (log) => log.action === action
                      ).length;
                      return (
                        <Stack
                          key={action}
                          direction="row"
                          justifyContent="space-between"
                        >
                          <Typography variant="body2">{action}</Typography>
                          <Chip label={count} size="small" />
                        </Stack>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Detail Dialog */}
      <Dialog open={openDetail} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        <DialogTitle>
          📋 Log Details
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedLog && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    User
                  </Typography>
                  <Typography variant="body2">{selectedLog.user}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    Action
                  </Typography>
                  <Chip label={selectedLog.action} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">
                    Status
                  </Typography>
                  <Typography variant="body2">{selectedLog.status}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Resource
                  </Typography>
                  <Typography variant="body2">{selectedLog.resource || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Details
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {selectedLog.details || 'No details'}
                  </Typography>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogViewer;
