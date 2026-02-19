/**
 * KPI Alert Management Component
 * Manages alerts, thresholds, and notifications
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Grid,
  Typography,
  Stack,
  Badge,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Bell as BellIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const KPIAlertManager = ({ kpiId, alerts = [], onCreateRule, onDeleteRule }) => {
  // State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    condition: 'below',
    threshold: '',
    thresholdMin: '',
    thresholdMax: '',
    severity: 'warning',
    notifyUsers: [],
    notifyChannels: [],
  });
  const [rules, setRules] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);

  // Load initial data
  useEffect(() => {
    // Fetch rules and alerts from service
    // setRules(fetchedRules);
    // setActiveAlerts(fetchedAlerts);
  }, [kpiId]);

  // Handle form input change
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Handle checkbox changes
  const handleCheckboxChange = useCallback((e, fieldName) => {
    const { checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [fieldName]: checked
        ? [...prev[fieldName], value]
        : prev[fieldName].filter((v) => v !== value),
    }));
  }, []);

  // Open create/edit dialog
  const handleOpenDialog = useCallback((rule = null) => {
    if (rule) {
      setFormData(rule);
      setEditingRule(rule);
    } else {
      setFormData({
        name: '',
        condition: 'below',
        threshold: '',
        thresholdMin: '',
        thresholdMax: '',
        severity: 'warning',
        notifyUsers: [],
        notifyChannels: [],
      });
      setEditingRule(null);
    }
    setOpenDialog(true);
  }, []);

  // Close dialog
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingRule(null);
  }, []);

  // Save rule
  const handleSaveRule = useCallback(() => {
    if (!formData.name || !formData.condition) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingRule) {
      // Update existing rule
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? { ...r, ...formData } : r))
      );
    } else {
      // Create new rule
      const newRule = {
        id: `rule_${Date.now()}`,
        ...formData,
        createdAt: new Date(),
      };
      setRules((prev) => [...prev, newRule]);
      onCreateRule(newRule);
    }

    handleCloseDialog();
  }, [formData, editingRule, onCreateRule]);

  // Delete rule
  const handleDeleteRule = useCallback((ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      onDeleteRule(ruleId);
    }
  }, [onDeleteRule]);

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'info':
        return <InfoIcon sx={{ color: 'info.main' }} />;
      default:
        return <InfoIcon />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* Active Alerts Section */}
      {activeAlerts.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Badge badgeContent={activeAlerts.length} color="error">
              <BellIcon />
            </Badge>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Active Alerts
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {activeAlerts.slice(0, 3).map((alert) => (
                  <Chip
                    key={alert.id}
                    icon={getSeverityIcon(alert.severity)}
                    label={`${alert.ruleName} (${alert.performancePercent}%)`}
                    color={getSeverityColor(alert.severity)}
                    size="small"
                    onDelete={() => {}}
                  />
                ))}
                {activeAlerts.length > 3 && (
                  <Typography variant="caption" sx={{ alignSelf: 'center' }}>
                    +{activeAlerts.length - 3} more
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Alert Rules Section */}
      <Card>
        <CardHeader
          title="Alert Rules"
          subheader={`${rules.length} rules configured`}
          action={
            <Button
              variant="contained"
              size="small"
              onClick={() => handleOpenDialog()}
            >
              Create Rule
            </Button>
          }
        />
        <CardContent>
          {rules.length === 0 ? (
            <Alert severity="info">
              <AlertTitle>No Alert Rules</AlertTitle>
              Create an alert rule to get notified when KPI values meet specific conditions.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Rule Name</TableCell>
                    <TableCell>Condition</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Notify Via</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {rule.condition === 'below'
                            ? `Below ${rule.threshold}`
                            : rule.condition === 'above'
                            ? `Above ${rule.threshold}`
                            : rule.condition === 'range'
                            ? `Outside ${rule.thresholdMin}-${rule.thresholdMax}`
                            : `${rule.threshold}% of target`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getSeverityIcon(rule.severity)}
                          label={rule.severity}
                          color={getSeverityColor(rule.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {rule.notifyChannels?.map((channel) => (
                            <Chip
                              key={channel}
                              label={channel}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(rule)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {/* Rule Name */}
            <TextField
              fullWidth
              label="Rule Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Critical Revenue Drop"
            />

            {/* Condition Type */}
            <Select
              fullWidth
              label="Condition"
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
            >
              <MenuItem value="below">Below Threshold</MenuItem>
              <MenuItem value="above">Above Threshold</MenuItem>
              <MenuItem value="equals">Equals Value</MenuItem>
              <MenuItem value="range">Outside Range</MenuItem>
              <MenuItem value="percent_of_target">% of Target</MenuItem>
            </Select>

            {/* Threshold Fields */}
            {(formData.condition === 'below' ||
              formData.condition === 'above' ||
              formData.condition === 'equals') && (
              <TextField
                fullWidth
                type="number"
                label="Threshold Value"
                name="threshold"
                value={formData.threshold}
                onChange={handleInputChange}
              />
            )}

            {formData.condition === 'range' && (
              <>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Value"
                  name="thresholdMin"
                  value={formData.thresholdMin}
                  onChange={handleInputChange}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Value"
                  name="thresholdMax"
                  value={formData.thresholdMax}
                  onChange={handleInputChange}
                />
              </>
            )}

            {formData.condition === 'percent_of_target' && (
              <TextField
                fullWidth
                type="number"
                label="Percentage of Target"
                name="threshold"
                value={formData.threshold}
                onChange={handleInputChange}
                InputProps={{ endAdornment: '%' }}
              />
            )}

            {/* Severity */}
            <Select
              fullWidth
              label="Severity Level"
              name="severity"
              value={formData.severity}
              onChange={handleInputChange}
            >
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>

            {/* Notification Channels */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Notify Via
              </Typography>
              <Stack direction="row" spacing={1}>
                {['in-app', 'email', 'slack', 'sms'].map((channel) => (
                  <FormControlLabel
                    key={channel}
                    control={
                      <Checkbox
                        checked={formData.notifyChannels.includes(channel)}
                        onChange={(e) =>
                          handleCheckboxChange(e, 'notifyChannels')
                        }
                        value={channel}
                      />
                    }
                    label={channel}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained">
            {editingRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KPIAlertManager;
