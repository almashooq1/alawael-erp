/**
 * Barcode Main Hub Component
 * Central dashboard for all barcode operations
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ListIcon from '@mui/icons-material/List';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import BatchPredictionIcon from '@mui/icons-material/BatchPrediction';
import BarcodeGenerator from './BarcodeGenerator';
import BarcodeScanner from './BarcodeScanner';
import BarcodeManager from './BarcodeManager';
import BatchBarcodeGenerator from './BatchBarcodeGenerator';
import BarcodeStatistics from './BarcodeStatistics';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`barcode-tabpanel-${index}`}
      aria-labelledby={`barcode-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const BarcodeHub = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              📦 Barcode Management System
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Generate, scan, and manage barcodes for your organization
            </Typography>
          </Box>
          <QrCodeIcon sx={{ fontSize: 80, opacity: 0.3 }} />
        </Box>
      </Paper>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="Barcode operations"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #e0e0e0',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              minWidth: 'auto',
              px: 3,
            },
            '& .Mui-selected': {
              color: '#667eea',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#667eea',
            }
          }}
        >
          <Tab
            label="Generate"
            icon={<AddIcon />}
            iconPosition="start"
            id="barcode-tab-0"
          />
          <Tab
            label="Scan"
            icon={<CameraAltIcon />}
            iconPosition="start"
            id="barcode-tab-1"
          />
          <Tab
            label="Batch Create"
            icon={<BatchPredictionIcon />}
            iconPosition="start"
            id="barcode-tab-2"
          />
          <Tab
            label="Manage"
            icon={<ListIcon />}
            iconPosition="start"
            id="barcode-tab-3"
          />
          <Tab
            label="Statistics"
            icon={<InsertChartIcon />}
            iconPosition="start"
            id="barcode-tab-4"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        <TabPanel value={currentTab} index={0}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Generate Single Barcode
            </Typography>
            <BarcodeGenerator />
          </Paper>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Scan Barcode
            </Typography>
            <BarcodeScanner />
          </Paper>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Generate Batch
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'textSecondary' }}>
              Create multiple barcodes at once for bulk operations
            </Typography>
            <BatchBarcodeGenerator />
          </Paper>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Manage Barcodes
            </Typography>
            <BarcodeManager />
          </Paper>
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Statistics & Analytics
            </Typography>
            <BarcodeStatistics />
          </Paper>
        </TabPanel>
      </Box>

      {/* Footer Info */}
      <Paper sx={{ p: 2, mt: 4, backgroundColor: '#f5f5f5', border: '1px dashed #ddd' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="textSecondary">
            💡 Tip: Use the Batch Create tab to generate multiple barcodes at once for efficiency
          </Typography>
          <Button size="small" variant="outlined">
            Learn More
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default BarcodeHub;
