/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚖️ Policy Management Interface - واجهة إدارة السياسات
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete policy management interface with rule builder,
 * condition evaluation, and testing capabilities
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
  Table as DetailTable,
  TableBody as DetailTableBody,
  TableCell as DetailTableCell,
  TableHead as DetailTableHead,
  TableRow as DetailTableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  Psychology as TestIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { usePolicies } from '../../hooks/useRBAC';
import { rbacService } from '../../services/rbacAPIService';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const POLICY_EFFECTS = [
  { value: 'Allow', label: '✅ Allow', color: 'success' },
  { value: 'Deny', label: '❌ Deny', color: 'error' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: '= (Equals)' },
  { value: 'notEquals', label: '≠ (Not Equals)' },
  { value: 'contains', label: '⊇ (Contains)' },
  { value: 'startsWith', label: '→ (Starts With)' },
  { value: 'greaterThan', label: '> (Greater Than)' },
  { value: 'lessThan', label: '< (Less Than)' },
];

const PolicyManagementInterface = () => {
  // State Management
  const { policies, loading, error, createPolicy } = usePolicies();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEffect, setFilterEffect] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    effect: 'Allow',
    priority: 100,
    enabled: true,
    conditions: [],
  });

  const [testData, setTestData] = useState({
    principal: '',
    action: '',
    resource: '',
    context: '',
  });

  const [testResult, setTestResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const matchSearch =
        policy.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchEffect = !filterEffect || policy.effect === filterEffect;

      return matchSearch && matchEffect;
    });
  }, [policies, searchTerm, filterEffect]);

  const paginatedPolicies = filteredPolicies.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handlers
  const handleOpenDialog = useCallback((policy = null) => {
    if (policy) {
      setFormData({
        name: policy.name,
        description: policy.description || '',
        effect: policy.effect || 'Allow',
        priority: policy.priority || 100,
        enabled: policy.enabled !== false,
        conditions: policy.conditions || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        effect: 'Allow',
        priority: 100,
        enabled: true,
        conditions: [],
      });
    }
    setSubmitted(false);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleCloseTestDialog = useCallback(() => {
    setOpenTestDialog(false);
    setTestResult(null);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'priority' ? parseInt(value) : value,
    }));
  }, []);

  const handleAddCondition = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      conditions: [
        ...(prev.conditions || []),
        { attribute: '', operator: 'equals', value: '' },
      ],
    }));
  }, []);

  const handleRemoveCondition = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      conditions: (prev.conditions || []).filter((_, i) => i !== index),
    }));
  }, []);

  const handleConditionChange = useCallback((index, field, value) => {
    setFormData((prev) => {
      const newConditions = [...(prev.conditions || [])];
      newConditions[index] = {
        ...newConditions[index],
        [field]: value,
      };
      return {
        ...prev,
        conditions: newConditions,
      };
    });
  }, []);

  const handleSavePolicy = useCallback(async () => {
    try {
      setSubmitted(true);

      if (!formData.name.trim()) {
        alert('Policy name is required');
        return;
      }

      await createPolicy(formData);
      alert('Policy created successfully');
      handleCloseDialog();
    } catch (err) {
      alert('Error saving policy: ' + err.message);
    }
  }, [formData, createPolicy, handleCloseDialog]);

  const handleTestPolicy = useCallback(async () => {
    try {
      if (!testData.principal || !testData.action || !testData.resource) {
        alert('Please fill in principal, action, and resource');
        return;
      }

      const result = await rbacService.policy.evaluatePolicies({
        principal: testData.principal,
        action: testData.action,
        resource: testData.resource,
        context: testData.context ? JSON.parse(testData.context) : {},
      });

      setTestResult(result);
    } catch (err) {
      alert('Error testing policy: ' + err.message);
    }
  }, [testData]);

  const handleDeletePolicy = useCallback((policyName, policyId) => {
    setDeleteId(policyId);
    setDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      // Delete policy implementation needed
      alert('Policy deleted (implement in service)');
      setDeleteConfirm(false);
      setDeleteId(null);
    } catch (err) {
      alert('Error deleting policy: ' + err.message);
    }
  }, [deleteId]);

  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleExportPolicies = useCallback(() => {
    try {
      const json = JSON.stringify(policies, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `policies-${Date.now()}.json`;
      link.click();
      alert('Policies exported successfully');
    } catch (err) {
      alert('Error exporting: ' + err.message);
    }
  }, [policies]);

  // Calculate statistics
  const stats = {
    total: policies.length,
    enabled: policies.filter((p) => p.enabled).length,
    allow: policies.filter((p) => p.effect === 'Allow').length,
    deny: policies.filter((p) => p.effect === 'Deny').length,
    avgConditions: policies.length > 0
      ? (policies.reduce((sum, p) => sum + (p.conditions?.length || 0), 0) / policies.length).toFixed(1)
      : 0,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          ⚖️ Policy Management
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Create and manage access control policies with conditions
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Policies
              </Typography>
              <Typography variant="h5">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Enabled
              </Typography>
              <Typography variant="h5" color="success.main">{stats.enabled}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Allow
              </Typography>
              <Typography variant="h5" color="primary">{stats.allow}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Deny
              </Typography>
              <Typography variant="h5" color="error">{stats.deny}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Conditions
              </Typography>
              <Typography variant="h5">{stats.avgConditions}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {/* Search Box */}
          <TextField
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
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

          {/* Effect Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Effect</InputLabel>
            <Select
              value={filterEffect}
              label="Effect"
              onChange={(e) => {
                setFilterEffect(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Effects</MenuItem>
              {POLICY_EFFECTS.map((effect) => (
                <MenuItem key={effect.value} value={effect.value}>
                  {effect.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Create policy">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                New Policy
              </Button>
            </Tooltip>

            <Tooltip title="Test policies">
              <Button
                variant="outlined"
                startIcon={<TestIcon />}
                onClick={() => setOpenTestDialog(true)}
              >
                Test
              </Button>
            </Tooltip>

            <Tooltip title="Export policies">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportPolicies}
              >
                Export
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Content Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="All Policies" />
          <Tab label="By Effect" />
          <Tab label="Priority Order" />
        </Tabs>

        {/* Tab 1: All Policies */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="center"><strong>Effect</strong></TableCell>
                  <TableCell align="center"><strong>Priority</strong></TableCell>
                  <TableCell align="center"><strong>Conditions</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
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
                ) : paginatedPolicies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No policies found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPolicies.map((policy) => (
                    <TableRow key={policy.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {policy.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{policy.description || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={policy.effect}
                          color={policy.effect === 'Allow' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={policy.priority} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${(policy.conditions || []).length} cond.`}
                          size="small"
                          color={policy.conditions?.length > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.enabled ? 'Enabled' : 'Disabled'}
                          color={policy.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(policy)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeletePolicy(policy.name, policy.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
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
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredPolicies.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TabPanel>

        {/* Tab 2: By Effect */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {POLICY_EFFECTS.map((effect) => {
              const effectPolicies = policies.filter((p) => p.effect === effect.value);
              return (
                <Box key={effect.value}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {effect.label} ({effectPolicies.length})
                  </Typography>
                  <Stack spacing={1}>
                    {effectPolicies.length > 0 ? (
                      effectPolicies.map((policy) => (
                        <Card key={policy.id}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between">
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {policy.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {policy.description || 'No description'}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={`Priority: ${policy.priority}`}
                                  size="small"
                                />
                                <Chip
                                  label={`${(policy.conditions || []).length} conditions`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No policies with {effect.label} effect
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </TabPanel>

        {/* Tab 3: Priority Order */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={1}>
            {[...filteredPolicies].sort((a, b) => (a.priority || 0) - (b.priority || 0)).map((policy, idx) => (
              <Card key={policy.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ flex: 1 }}>
                      <Chip label={idx + 1} size="small" sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'inline' }}>
                        {policy.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={policy.effect}
                      color={policy.effect === 'Allow' ? 'success' : 'error'}
                      size="small"
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </TabPanel>
      </Paper>

      {/* Create/Edit Policy Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          ➕ Create Policy
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Policy Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              fullWidth
              required
              error={submitted && !formData.name}
            />

            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={2}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Effect</InputLabel>
                <Select
                  name="effect"
                  value={formData.effect}
                  label="Effect"
                  onChange={handleFormChange}
                >
                  {POLICY_EFFECTS.map((effect) => (
                    <MenuItem key={effect.value} value={effect.value}>
                      {effect.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Priority"
                name="priority"
                type="number"
                value={formData.priority}
                onChange={handleFormChange}
                inputProps={{ min: 1, max: 1000 }}
                sx={{ minWidth: 120 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleFormChange}
                  />
                }
                label="Enabled"
              />
            </Stack>

            {/* Conditions */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Conditions
                </Typography>
                <Button size="small" color="primary" onClick={handleAddCondition}>
                  + Add Condition
                </Button>
              </Stack>

              {(formData.conditions || []).map((condition, idx) => (
                <Stack direction="row" spacing={1} key={idx} sx={{ mb: 1 }} alignItems="flex-start">
                  <TextField
                    label="Attribute"
                    value={condition.attribute}
                    onChange={(e) => handleConditionChange(idx, 'attribute', e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={condition.operator}
                      onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <MenuItem key={op.value} value={op.value}>
                          {op.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Value"
                    value={condition.value}
                    onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveCondition(idx)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSavePolicy} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Policy Test Dialog */}
      <Dialog open={openTestDialog} onClose={handleCloseTestDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          🧪 Test Policies
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Test Input
            </Typography>

            <TextField
              label="Principal (User/Role)"
              value={testData.principal}
              onChange={(e) => setTestData({ ...testData, principal: e.target.value })}
              fullWidth
              size="small"
            />

            <TextField
              label="Action"
              value={testData.action}
              onChange={(e) => setTestData({ ...testData, action: e.target.value })}
              fullWidth
              size="small"
            />

            <TextField
              label="Resource"
              value={testData.resource}
              onChange={(e) => setTestData({ ...testData, resource: e.target.value })}
              fullWidth
              size="small"
            />

            <TextField
              label="Context (JSON)"
              value={testData.context}
              onChange={(e) => setTestData({ ...testData, context: e.target.value })}
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder='{"key": "value"}'
            />

            {/* Test Result */}
            {testResult && (
              <Alert severity={testResult.allowed ? 'success' : 'error'}>
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {testResult.allowed ? '✅ ALLOWED' : '❌ DENIED'}
                  </Typography>
                  {testResult.policies && testResult.policies.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        Applied Policies:
                      </Typography>
                      {testResult.policies.map((p, i) => (
                        <Typography key={i} variant="caption" display="block">
                          • {p.name} ({p.effect})
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTestDialog}>Close</Button>
          <Button onClick={handleTestPolicy} variant="contained" color="primary">
            Test Policies
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)}>
        <DialogTitle>⚠️ Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this policy?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PolicyManagementInterface;
