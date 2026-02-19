/**
 * Financial Validation Dashboard Component
 * Advanced compliance monitoring and violation tracking
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  Box,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  DatePicker
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const VIOLATION_SEVERITY = {
  critical: { color: '#d32f2f', label: 'Critical' },
  high: { color: '#f57c00', label: 'High' },
  medium: { color: '#fbc02d', label: 'Medium' },
  low: { color: '#388e3c', label: 'Low' }
};

const VIOLATION_TYPES = {
  amount_mismatch: 'Amount Mismatch',
  missing_entry: 'Missing Entry',
  incorrect_account: 'Incorrect Account',
  invalid_date: 'Invalid Date',
  duplicate: 'Duplicate',
  unauthorized: 'Unauthorized'
};

const VIOLATION_STATUS = {
  detected: 'Detected',
  investigating: 'Investigating',
  resolved: 'Resolved',
  waived: 'Waived'
};

const ValidationDashboard = () => {
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    type: ''
  });

  // Dialog states
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Resolve form
  const [resolveForm, setResolveForm] = useState({
    resolution_notes: '',
    correctionAmount: '',
    status: 'resolved'
  });

  // Report dates
  const [reportDates, setReportDates] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });

  // Load violations
  useEffect(() => {
    loadViolations();
  }, [filters]);

  const loadViolations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await fetch(`/api/validation/violations-report?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to load violations');

      const data = await response.json();
      setViolations(data.data || []);
      setStats(data.stats || {});
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDetail = (violation) => {
    setSelectedViolation(violation);
    setShowDetailDialog(true);
  };

  const handleOpenResolve = (violation) => {
    setSelectedViolation(violation);
    setShowResolveDialog(true);
  };

  const handleResolveViolation = async () => {
    try {
      const response = await fetch(`/api/validation/violations/${selectedViolation._id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resolveForm)
      });

      if (!response.ok) throw new Error('Failed to resolve violation');

      toast.success('Violation resolved successfully');
      setShowResolveDialog(false);
      setResolveForm({ resolution_notes: '', correctionAmount: '', status: 'resolved' });
      loadViolations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const response = await fetch('/api/validation/reports/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: reportDates.startDate,
          endDate: reportDates.endDate
        })
      });

      if (!response.ok) throw new Error('Failed to generate report');

      toast.success('Report generated successfully');
      setShowReportDialog(false);
      loadViolations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <ErrorIcon sx={{ color: VIOLATION_SEVERITY.critical.color }} />;
    if (severity === 'high') return <WarningIcon sx={{ color: VIOLATION_SEVERITY.high.color }} />;
    return <InfoIcon sx={{ color: VIOLATION_SEVERITY[severity].color }} />;
  };

  const getSeverityColor = (severity) => {
    return VIOLATION_SEVERITY[severity]?.color || '#666';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Financial Validation Dashboard
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Real-time compliance monitoring and violation tracking
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Violations
              </Typography>
              <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                {stats?.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Outstanding Issues
              </Typography>
              <Typography variant="h5" sx={{ color: '#f57c00' }}>
                {stats?.byStatus?.detected || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Compliance Rate
              </Typography>
              <Typography variant="h5" sx={{ color: '#388e3c' }}>
                {stats?.complianceRate || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical Issues
              </Typography>
              <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                {stats?.bySeverity?.critical || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Select
              fullWidth
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              displayEmpty
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="detected">Detected</MenuItem>
              <MenuItem value="investigating">Investigating</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="waived">Waived</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Select
              fullWidth
              name="severity"
              value={filters.severity}
              onChange={handleFilterChange}
              displayEmpty
            >
              <MenuItem value="">All Severities</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Select
              fullWidth
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              displayEmpty
            >
              <MenuItem value="">All Types</MenuItem>
              {Object.entries(VIOLATION_TYPES).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowReportDialog(true)}
          >
            Generate Report
          </Button>
          <Button
            variant="outlined"
            onClick={() => setFilters({ status: '', severity: '', type: '' })}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Charts Section */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Violations by Severity</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: stats.bySeverity?.critical || 0 },
                      { name: 'High', value: stats.bySeverity?.high || 0 },
                      { name: 'Medium', value: stats.bySeverity?.medium || 0 },
                      { name: 'Low', value: stats.bySeverity?.low || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={VIOLATION_SEVERITY.critical.color} />
                    <Cell fill={VIOLATION_SEVERITY.high.color} />
                    <Cell fill={VIOLATION_SEVERITY.medium.color} />
                    <Cell fill={VIOLATION_SEVERITY.low.color} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Violations by Status</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Detected', value: stats.byStatus?.detected || 0 },
                    { name: 'Investigating', value: stats.byStatus?.investigating || 0 },
                    { name: 'Resolved', value: stats.byStatus?.resolved || 0 },
                    { name: 'Waived', value: stats.byStatus?.waived || 0 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Violations Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Detection Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {violations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    No violations found
                  </TableCell>
                </TableRow>
              ) : (
                violations.map((violation) => (
                  <TableRow key={violation._id} hover>
                    <TableCell>{VIOLATION_TYPES[violation.violationType]}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSeverityIcon(violation.severity)}
                        <Chip
                          label={VIOLATION_SEVERITY[violation.severity]?.label}
                          sx={{
                            backgroundColor: getSeverityColor(violation.severity),
                            color: '#fff'
                          }}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>${violation.amount?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={VIOLATION_STATUS[violation.status]}
                        color={violation.status === 'resolved' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(violation.detectionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetail(violation)}
                        title="View Details"
                      >
                        <InfoIcon />
                      </IconButton>
                      {violation.status !== 'resolved' && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenResolve(violation)}
                          title="Resolve"
                          color="primary"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Violation Details</Typography>
            <IconButton onClick={() => setShowDetailDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {selectedViolation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                <Typography>{VIOLATION_TYPES[selectedViolation.violationType]}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography>{selectedViolation.description || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Amount Difference</Typography>
                <Typography>${selectedViolation.amount?.toFixed(2) || '0'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip label={VIOLATION_STATUS[selectedViolation.status]} size="small" />
              </Box>
            </Box>
          )}
        </Box>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onClose={() => setShowResolveDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Resolve Violation</Typography>
            <IconButton onClick={() => setShowResolveDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Resolution Notes"
              multiline
              rows={3}
              value={resolveForm.resolution_notes}
              onChange={(e) => setResolveForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Correction Amount"
              type="number"
              value={resolveForm.correctionAmount}
              onChange={(e) => setResolveForm(prev => ({ ...prev, correctionAmount: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowResolveDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleResolveViolation}>
                Resolve
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onClose={() => setShowReportDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Generate Report</Typography>
            <IconButton onClick={() => setShowReportDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={reportDates.startDate.toISOString().split('T')[0]}
              onChange={(e) => setReportDates(prev => ({
                ...prev,
                startDate: new Date(e.target.value)
              }))}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={reportDates.endDate.toISOString().split('T')[0]}
              onChange={(e) => setReportDates(prev => ({
                ...prev,
                endDate: new Date(e.target.value)
              }))}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowReportDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleGenerateReport}>
                Generate
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

export default ValidationDashboard;
