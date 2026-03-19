/**
 * Barcode Scanner Component
 * Scan and process barcodes
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import BarcodeService from '../../services/BarcodeService';

const BarcodeScanner = () => {
  const [scannedCode, setScannedCode] = useState('');
  const [barcodeData, setBarcodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [scanHistory, setScanHistory] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus on input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleScan = async e => {
    e.preventDefault();

    if (!scannedCode.trim()) {
      setMessage({ type: 'warning', text: 'Please enter or scan a barcode' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // First, get barcode details
      const barcodeResponse = await BarcodeService.getBarcodeByCode(scannedCode);

      if (!barcodeResponse.success) {
        setMessage({
          type: 'error',
          text: barcodeResponse.message || 'Barcode not found',
        });
        setBarcodeData(null);
        return;
      }

      const barcode = barcodeResponse.barcode;

      // Record the scan
      const scanResponse = await BarcodeService.scanBarcode({
        code: scannedCode,
        action: 'SCAN',
        location: 'Scanner Device',
        device: navigator.userAgent,
      });

      setBarcodeData(barcode);
      setScanHistory(prev => [
        {
          code: scannedCode,
          timestamp: new Date().toLocaleTimeString(),
          status: 'success',
        },
        ...prev.slice(0, 9), // Keep last 10 scans
      ]);

      setMessage({
        type: 'success',
        text: `Barcode scanned successfully! Total scans: ${scanResponse.scanInfo.totalScans}`,
      });

      // Clear input and focus for next scan
      setScannedCode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to process barcode',
      });

      setScanHistory(prev => [
        {
          code: scannedCode,
          timestamp: new Date().toLocaleTimeString(),
          status: 'error',
        },
        ...prev.slice(0, 9),
      ]);

      setScannedCode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Scanner Input */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Barcode Scanner" />
          <CardContent>
            {message.text && (
              <Alert severity={message.type} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}

            <form onSubmit={handleScan}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  ref={inputRef}
                  fullWidth
                  label="Scan Barcode"
                  value={scannedCode}
                  onChange={e => setScannedCode(e.target.value.toUpperCase())}
                  placeholder="Place cursor here and scan barcode..."
                  autoFocus
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <QrCodeScannerIcon />}
                  sx={{ minWidth: '120px' }}
                >
                  {loading ? 'Scanning...' : 'Scan'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Grid>

      {/* Barcode Details */}
      {barcodeData && (
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Barcode Details"
              avatar={<CheckCircleIcon sx={{ color: 'green' }} />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Barcode Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {barcodeData.code}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Type
                  </Typography>
                  <Typography variant="body1">{barcodeData.barcodeType}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Entity
                  </Typography>
                  <Typography variant="body1">
                    {barcodeData.entityType} - {barcodeData.entityName}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Scans
                  </Typography>
                  <Chip
                    label={`${barcodeData.totalScans} scans`}
                    color="primary"
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={barcodeData.status}
                    color={barcodeData.status === 'ACTIVE' ? 'success' : 'warning'}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Last Scanned
                  </Typography>
                  <Typography variant="body1">
                    {barcodeData.lastScannedAt
                      ? new Date(barcodeData.lastScannedAt).toLocaleString()
                      : 'Never'}
                  </Typography>
                </Grid>

                {barcodeData.tags && barcodeData.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      {barcodeData.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Scan History (Last 10)" />
            <CardContent>
              <Stack spacing={1}>
                {scanHistory.map((scan, index) => (
                  <Paper key={index} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    {scan.status === 'success' ? (
                      <CheckCircleIcon sx={{ color: 'green' }} />
                    ) : (
                      <ErrorIcon sx={{ color: 'red' }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {scan.code}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {scan.timestamp}
                      </Typography>
                    </Box>
                    <Chip
                      label={scan.status}
                      color={scan.status === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default BarcodeScanner;
