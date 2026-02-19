/**
 * Risk Matrix Dashboard Component
 * 10x10 probability vs impact risk assessment grid
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Dialog,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const RISK_ZONES = {
  green: { color: '#4caf50', label: 'Low Risk' },
  yellow: { color: '#ffc107', label: 'Medium Risk' },
  orange: { color: '#ff9800', label: 'High Risk' },
  red: { color: '#f44336', label: 'Critical Risk' }
};

const RISK_CATEGORIES = [
  'operational', 'financial', 'market', 'credit', 'liquidity', 'compliance', 'strategic'
];

const IMPACT_SCALE = {
  1: 'Minimal',
  2: 'Minor',
  3: 'Moderate',
  4: 'Significant',
  5: 'Major',
  6: 'Critical',
  7: 'Severe',
  8: 'Catastrophic',
  9: 'Severe Catastrophic',
  10: 'Organization Threatening'
};

const PROBABILITY_SCALE = {
  1: 'Rare',
  2: 'Very Low',
  3: 'Low',
  4: 'Low-Medium',
  5: 'Medium',
  6: 'Medium-High',
  7: 'High',
  8: 'Very High',
  9: 'Almost Certain',
  10: 'Certain'
};

const RiskMatrix = () => {
  const [matrix, setMatrix] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [selectedRisks, setSelectedRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'table'

  // Dialog states
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showCreateRiskDialog, setShowCreateRiskDialog] = useState(false);
  const [showMitigationDialog, setShowMitigationDialog] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'operational',
    probability: 5,
    impact: 5
  });

  const [mitigationForm, setMitigationForm] = useState({
    strategy: '',
    description: '',
    targetDate: new Date().toISOString().split('T')[0],
    expectedImpactReduction: 0
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [matrixRes, heatmapRes] = await Promise.all([
        fetch('/api/risk/matrix', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/risk/heatmap', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!matrixRes.ok || !heatmapRes.ok) {
        throw new Error('Failed to load risk data');
      }

      const matrixData = await matrixRes.json();
      const heatmapRes_data = await heatmapRes.json();

      setMatrix(matrixData.data);
      setHeatmapData(heatmapRes_data.data);
      setSelectedRisks(
        matrixData.data?.riskItems?.map(r => ({
          id: r._id,
          title: r.title,
          probability: r.severity.probabilityScore,
          impact: r.severity.impactScore,
          score: r.severity.riskScore,
          zone: r.severity.zone,
          status: r.status,
          category: r.category
        })) || []
      );
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load risk matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRisk = async () => {
    try {
      const response = await fetch('/api/risk/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          riskId: `RISK-${Date.now()}`,
          title: createForm.title,
          description: createForm.description,
          category: createForm.category,
          probability: { value: createForm.probability },
          impact: { value: createForm.impact }
        })
      });

      if (!response.ok) throw new Error('Failed to create risk');

      toast.success('Risk created successfully');
      setShowCreateRiskDialog(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddMitigation = async () => {
    try {
      const response = await fetch(`/api/risk/${selectedRisk._id}/mitigation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mitigationForm)
      });

      if (!response.ok) throw new Error('Failed to add mitigation');

      toast.success('Mitigation strategy added');
      setShowMitigationDialog(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getRiskColor = (probability, impact) => {
    const score = probability * impact;
    if (score >= 70) return RISK_ZONES.red.color;
    if (score >= 40) return RISK_ZONES.orange.color;
    if (score >= 20) return RISK_ZONES.yellow.color;
    return RISK_ZONES.green.color;
  };

  const getRiskLabel = (probability, impact) => {
    const score = probability * impact;
    if (score >= 70) return 'CR'; // Critical Risk
    if (score >= 40) return 'HR'; // High Risk
    if (score >= 20) return 'MR'; // Medium Risk
    return 'LR'; // Low Risk
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
          Risk Assessment Matrix
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Probability vs Impact risk evaluation and management
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => setShowCreateRiskDialog(true)} startIcon={<AddIcon />}>
            Add Risk Item
          </Button>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
        >
          <ToggleButton value="matrix">Matrix View</ToggleButton>
          <ToggleButton value="table">Table View</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Risks
              </Typography>
              <Typography variant="h5">
                {matrix?.matrixStats?.totalIdentifiedRisks || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Critical (Red)
              </Typography>
              <Typography variant="h5" sx={{ color: RISK_ZONES.red.color }}>
                {matrix?.matrixStats?.risksByZone?.red || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High (Orange)
              </Typography>
              <Typography variant="h5" sx={{ color: RISK_ZONES.orange.color }}>
                {matrix?.matrixStats?.risksByZone?.orange || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Medium (Yellow)
              </Typography>
              <Typography variant="h5" sx={{ color: RISK_ZONES.yellow.color }}>
                {matrix?.matrixStats?.risksByZone?.yellow || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      {viewMode === 'matrix' ? (
        // Risk Matrix Grid
        <Paper sx={{ p: 2, overflowX: 'auto', mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Risk Matrix (10x10 Grid)</Typography>
          
          <Box sx={{ minWidth: 800, minHeight: 800, display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 0.5, backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
            {/* Header row */}
            <Box sx={{ gridColumn: 1 }} />
            {Array.from({ length: 10 }).map((_, idx) => (
              <Box
                key={`col-${idx}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  height: 80
                }}
              >
                Impact {idx + 1}
              </Box>
            ))}

            {/* Data rows */}
            {Array.from({ length: 10 }).map((_, probIdx) => (
              <React.Fragment key={`row-${probIdx}`}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    height: 80
                  }}
                >
                  Prob {10 - probIdx}
                </Box>
                {Array.from({ length: 10 }).map((_, impIdx) => {
                  const cellRisks = selectedRisks.filter(
                    r => r.probability === (10 - probIdx) && r.impact === (impIdx + 1)
                  );
                  const cellColor = getRiskColor(10 - probIdx, impIdx + 1);
                  const cellLabel = getRiskLabel(10 - probIdx, impIdx + 1);

                  return (
                    <Box
                      key={`cell-${probIdx}-${impIdx}`}
                      sx={{
                        backgroundColor: cellColor,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #999',
                        cursor: 'pointer',
                        opacity: cellRisks.length > 0 ? 1 : 0.6,
                        transition: 'all 0.3s',
                        '&:hover': {
                          opacity: 1,
                          boxShadow: '0 0 10px rgba(0,0,0,0.3)'
                        },
                        p: 0.5,
                        textAlign: 'center'
                      }}
                      onClick={() => cellRisks.length > 0 && setSelectedRisk(cellRisks[0])}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                        {cellLabel}
                      </Typography>
                      {cellRisks.length > 0 && (
                        <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.8rem', mt: 0.5 }}>
                          {cellRisks.length} risk{cellRisks.length > 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </React.Fragment>
            ))}
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {Object.entries(RISK_ZONES).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: value.color, borderRadius: 1 }} />
                <Typography variant="caption">{value.label}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ) : (
        // Table View
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Risk ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Probability</TableCell>
                <TableCell align="center">Impact</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedRisks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    No risks found
                  </TableCell>
                </TableRow>
              ) : (
                selectedRisks.map((risk) => (
                  <TableRow key={risk.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{risk.id?.toString().slice(-6)}</TableCell>
                    <TableCell>{risk.title}</TableCell>
                    <TableCell>{risk.category}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${risk.probability} (${PROBABILITY_SCALE[risk.probability]})`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${risk.impact} (${IMPACT_SCALE[risk.impact]})`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {risk.score}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={risk.zone?.toUpperCase()}
                        sx={{
                          backgroundColor: RISK_ZONES[risk.zone]?.color,
                          color: '#fff'
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={risk.status}
                        size="small"
                        color={risk.status === 'resolved' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedRisk(risk);
                          setShowDetailDialog(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Top Risks Section */}
      {matrix?.topRisks && matrix.topRisks.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 4 }}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Top {Math.min(5, matrix.topRisks.length)} Risks
            </Typography>
          </Grid>
          {matrix.topRisks.slice(0, 5).map((top) => {
            const risk = matrix.riskItems?.find(r => r._id === top.riskId);
            return (
              <Grid item xs={12} sm={6} md={4} key={top.riskId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {risk?.title || 'Unknown Risk'}
                      </Typography>
                      <Chip
                        label={top.priority?.toUpperCase()}
                        size="small"
                        sx={{ backgroundColor: RISK_ZONES[risk?.severity?.zone]?.color, color: '#fff' }}
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Score: <span style={{ fontWeight: 'bold' }}>{top.riskScore}</span>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Mitigation: {top.mitigationProgress}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Risk Dialog */}
      <Dialog open={showCreateRiskDialog} onClose={() => setShowCreateRiskDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Create Risk Item</Typography>
            <IconButton onClick={() => setShowCreateRiskDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Risk Title"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <Select
              fullWidth
              value={createForm.category}
              onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
            >
              {RISK_CATEGORIES.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption">Probability (1-10)</Typography>
                <Select
                  fullWidth
                  value={createForm.probability}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, probability: e.target.value }))}
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption">Impact (1-10)</Typography>
                <Select
                  fullWidth
                  value={createForm.impact}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, impact: e.target.value }))}
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCreateRiskDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateRisk}>
                Create Risk
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Detail Dialog */}
      {selectedRisk && (
        <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="sm" fullWidth>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{selectedRisk.title}</Typography>
              <IconButton onClick={() => setShowDetailDialog(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Category</Typography>
                <Typography>{selectedRisk.category}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Probability: {selectedRisk.probability}</Typography>
                <Typography variant="body2">{PROBABILITY_SCALE[selectedRisk.probability]}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Impact: {selectedRisk.impact}</Typography>
                <Typography variant="body2">{IMPACT_SCALE[selectedRisk.impact]}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Risk Score</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{selectedRisk.score}</Typography>
              </Box>
              <Button variant="outlined" onClick={() => {
                setShowDetailDialog(false);
                setShowMitigationDialog(true);
              }}>
                Add Mitigation Strategy
              </Button>
            </Box>
          </Box>
        </Dialog>
      )}
    </Container>
  );
};

export default RiskMatrix;
