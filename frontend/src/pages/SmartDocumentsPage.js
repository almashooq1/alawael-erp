import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Description as DocIcon,
  Assignment as FormIcon,
  MedicalServices as MedicalIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  LocalShipping as TransportIcon,
  Gavel as LegalIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  Event as EventIcon,
  Security as SecurityIcon,
  ShoppingCart as ShopIcon,
} from '@mui/icons-material';

// Map categories to icons
const CATEGORY_ITCONS = {
  EMPLOYEE: <BusinessIcon />,
  STUDENT: <SchoolIcon />,
  MEDICAL: <MedicalIcon />,
  FINANCE: <BusinessIcon />,
  TRANSPORT: <TransportIcon />,
  LEGAL: <LegalIcon />,
  IT: <SettingsIcon />,
  HOUSING: <HomeIcon />,
  MARKETING: <EventIcon />,
  QUALITY: <SecurityIcon />,
  PROCUREMENT: <ShopIcon />,
  DEFAULT: <DocIcon />,
};

function SmartDocumentsPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(0);

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [generatedDoc, setGeneratedDoc] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/documents-smart/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
        // Extract unique categories
        const cats = [...new Set(data.data.map(t => t.type))];
        setCategories(cats);
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  };

  const extractPlaceholders = html => {
    const regex = /{{(.*?)}}/g;
    const matches = [...html.matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))]; // Unique keys
  };

  const handleTemplateClick = template => {
    const placeholders = extractPlaceholders(template.body);
    // Initialize form data
    const initialData = {};
    placeholders.forEach(key => {
      initialData[key] = '';
    });
    // Auto-fill common fields helper
    if (initialData.hasOwnProperty('DATE')) initialData['DATE'] = new Date().toISOString().split('T')[0];

    setFormData(initialData);
    setSelectedTemplate({ ...template, placeholders });
    setGeneratedDoc(null);
    setOpenDialog(true);
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/documents-smart/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          personId: 'USER-123', // Mock ID
          customData: formData,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setGeneratedDoc(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderIcon = type => CATEGORY_ITCONS[type] || CATEGORY_ITCONS.DEFAULT;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center' }}>
          <FormIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
          Smart Document Generator (Enterprise)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Generate official letters, contracts, and reports using the approved organization templates.
        </Typography>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper square>
          <Tabs
            value={selectedCategory}
            onChange={(e, v) => setSelectedCategory(v)}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
          >
            {categories.map((cat, index) => (
              <Tab key={cat} label={cat} icon={renderIcon(cat)} iconPosition="start" />
            ))}
          </Tabs>

          <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '500px' }}>
            <Grid container spacing={3}>
              {templates
                .filter(t => t.type === categories[selectedCategory])
                .map(template => (
                  <Grid item xs={12} sm={6} md={4} key={template.id}>
                    <Card sx={{ height: '100%', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                      <CardActionArea onClick={() => handleTemplateClick(template)} sx={{ height: '100%', p: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Chip label={template.type} size="small" color="primary" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {template.language || 'AR'}
                            </Typography>
                          </Box>
                          <Typography variant="h6" gutterBottom>
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Click to customize and generate this document.
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Generation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{generatedDoc ? 'Document Ready' : `Customize: ${selectedTemplate?.name}`}</DialogTitle>
        <DialogContent dividers>
          {generatedDoc ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Document generated successfully! Reference: {generatedDoc.refNumber}
              </Alert>
              <Paper elevation={3} sx={{ p: 4, minHeight: '400px', bgcolor: '#fff' }}>
                <div dangerouslySetInnerHTML={{ __html: generatedDoc.content }} />
              </Paper>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {selectedTemplate?.placeholders.map(key => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    fullWidth
                    label={key.replace(/_/g, ' ')}
                    value={formData[key] || ''}
                    onChange={e => handleInputChange(key, e.target.value)}
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          {!generatedDoc && (
            <Button onClick={handleGenerate} variant="contained" color="primary">
              Generate Document
            </Button>
          )}
          {generatedDoc && (
            <Button onClick={() => window.print()} variant="contained" color="secondary">
              Print / Save PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SmartDocumentsPage;
