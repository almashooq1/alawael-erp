/**
 * Barcode Batch Generator Component
 * Create multiple barcodes at once
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import BarcodeService from '../../services/BarcodeService';

const BatchBarcodeGenerator = () => {
  const [formData, setFormData] = useState({
    quantity: 10,
    prefix: 'PRD',
    barcodeType: 'CODE128',
    entityType: 'PRODUCT',
    baseEntityName: 'Product Batch',
    tags: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 10 : value,
    }));
  };

  const handleGenerateBatch = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setProgress(0);
    setGeneratedBarcodes([]);

    try {
      const result = await BarcodeService.generateBatch({
        quantity: formData.quantity,
        prefix: formData.prefix,
        barcodeType: formData.barcodeType,
        entityType: formData.entityType,
        baseEntityName: formData.baseEntityName,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      });

      setBatchId(result.batchId);
      setGeneratedBarcodes(result.barcodes);
      setProgress(100);

      setMessage({
        type: 'success',
        text: `Batch of ${result.barcodes.length} barcodes generated successfully!`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to generate batch',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBatch = async () => {
    if (!batchId) return;

    try {
      const data = generatedBarcodes.map((b, i) => ({
        'Batch Number': i + 1,
        Code: b.code,
        'Barcode Data': b.barcodeData,
        'Entity Type': formData.entityType,
        'Generated At': new Date().toLocaleString(),
      }));

      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row =>
          Object.values(row)
            .map(v => `"${v}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcodes-batch-${batchId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({
        type: 'success',
        text: 'Batch downloaded successfully',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to download batch',
      });
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {/* Generation Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Generate Batch" />
            <CardContent>
              {message.text && (
                <Alert
                  severity={message.type}
                  sx={{ mb: 2 }}
                  onClose={() => setMessage({ type: '', text: '' })}
                >
                  {message.text}
                </Alert>
              )}

              <form onSubmit={handleGenerateBatch}>
                <Grid container spacing={2}>
                  {/* Quantity */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="quantity"
                      label="Quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      inputProps={{ min: 1, max: 1000 }}
                      required
                    />
                  </Grid>

                  {/* Prefix */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="prefix"
                      label="Prefix"
                      value={formData.prefix}
                      onChange={handleInputChange}
                      placeholder="e.g., PRD, INV"
                      maxLength="3"
                    />
                  </Grid>

                  {/* Barcode Type */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Barcode Type</InputLabel>
                      <Select
                        name="barcodeType"
                        value={formData.barcodeType}
                        onChange={handleInputChange}
                        label="Barcode Type"
                      >
                        <MenuItem value="CODE128">CODE128</MenuItem>
                        <MenuItem value="CODE39">CODE39</MenuItem>
                        <MenuItem value="EAN13">EAN13</MenuItem>
                        <MenuItem value="QR">QR Code</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Entity Type */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Entity Type</InputLabel>
                      <Select
                        name="entityType"
                        value={formData.entityType}
                        onChange={handleInputChange}
                        label="Entity Type"
                      >
                        <MenuItem value="PRODUCT">Product</MenuItem>
                        <MenuItem value="VEHICLE">Vehicle</MenuItem>
                        <MenuItem value="ASSET">Asset</MenuItem>
                        <MenuItem value="EMPLOYEE">Employee</MenuItem>
                        <MenuItem value="INVOICE">Invoice</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Base Entity Name */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="baseEntityName"
                      label="Base Entity Name"
                      value={formData.baseEntityName}
                      onChange={handleInputChange}
                      placeholder="e.g., Product Batch"
                      required
                    />
                  </Grid>

                  {/* Tags */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="tags"
                      label="Tags (comma-separated)"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="e.g., batch, urgent, warehouse"
                    />
                  </Grid>

                  {/* Submit Button */}
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      {loading ? 'Generating...' : 'Generate Batch'}
                    </Button>
                  </Grid>
                </Grid>
              </form>

              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        {generatedBarcodes.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Batch Summary" />
              <CardContent>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Barcodes Generated</span>
                    <strong>{generatedBarcodes.length}</strong>
                  </Box>
                  <LinearProgress variant="determinate" value={100} />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <strong>Batch ID:</strong>
                  <Paper sx={{ p: 1, mt: 1, backgroundColor: '#f5f5f5' }}>
                    <code>{batchId}</code>
                  </Paper>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <strong>Configuration:</strong>
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={`Type: ${formData.barcodeType}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={`Entity: ${formData.entityType}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box>
                      <Chip label={`Prefix: ${formData.prefix}`} size="small" variant="outlined" />
                    </Box>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadBatch}
                  sx={{ mt: 2 }}
                >
                  Download as CSV
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Generated Barcodes Table */}
        {generatedBarcodes.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Generated Barcodes" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>
                          <strong>#</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Barcode Code</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Barcode Data</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {generatedBarcodes.map((barcode, index) => (
                        <TableRow key={barcode.id} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{barcode.code}</TableCell>
                          <TableCell>
                            <code>{barcode.barcodeData}</code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default BatchBarcodeGenerator;
