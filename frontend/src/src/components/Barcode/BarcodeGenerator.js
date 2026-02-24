/**
 * Barcode Generator Component
 * Create new barcodes
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
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarcodeService from '../../services/BarcodeService';

const BarcodeGenerator = ({ onBarcodeGenerated }) => {
  const [formData, setFormData] = useState({
    barcodeType: 'CODE128',
    entityType: 'PRODUCT',
    entityId: '',
    entityName: '',
    expiresAt: '',
    tags: [],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newTag, setNewTag] = useState('');

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = tagToRemove => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await BarcodeService.generateBarcode(formData);

      setMessage({
        type: 'success',
        text: `Barcode generated successfully: ${result.barcode.code}`,
      });

      // Reset form
      setFormData({
        barcodeType: 'CODE128',
        entityType: 'PRODUCT',
        entityId: '',
        entityName: '',
        expiresAt: '',
        tags: [],
      });

      // Callback
      if (onBarcodeGenerated) {
        onBarcodeGenerated(result.barcode);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to generate barcode',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Generate Barcode" />
      <CardContent>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
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
                  <MenuItem value="EAN8">EAN8</MenuItem>
                  <MenuItem value="UPC">UPC</MenuItem>
                  <MenuItem value="QR">QR Code</MenuItem>
                  <MenuItem value="DATAMATRIX">Data Matrix</MenuItem>
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
                  <MenuItem value="STUDENT">Student</MenuItem>
                  <MenuItem value="PATIENT">Patient</MenuItem>
                  <MenuItem value="INVOICE">Invoice</MenuItem>
                  <MenuItem value="SHIPMENT">Shipment</MenuItem>
                  <MenuItem value="PACKAGE">Package</MenuItem>
                  <MenuItem value="CUSTOM">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Entity ID */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="entityId"
                label="Entity ID"
                value={formData.entityId}
                onChange={handleInputChange}
                required
                placeholder="e.g., 123456789"
              />
            </Grid>

            {/* Entity Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="entityName"
                label="Entity Name"
                value={formData.entityName}
                onChange={handleInputChange}
                required
                placeholder="e.g., Product Name"
              />
            </Grid>

            {/* Expiration Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="expiresAt"
                label="Expires At"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="Add Tag"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  size="small"
                />
                {formData.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {formData.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              </Stack>
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
                {loading ? 'Generating...' : 'Generate Barcode'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default BarcodeGenerator;
