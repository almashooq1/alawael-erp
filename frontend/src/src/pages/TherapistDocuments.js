import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  AudioFile as AudioFileIcon,
  VideoLibrary as VideoLibraryIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { therapistService } from '../services/therapistService';

const TherapistDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const data = await therapistService.getTherapistDocuments('TH001');
        setDocuments(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading documents:', error);
        setLoading(false);
      }
    };
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter(
    doc => (filterType === 'all' || doc.type === filterType) && (doc.name.includes(searchText) || doc.patientName.includes(searchText)),
  );

  const getDocumentIcon = type => {
    switch (type) {
      case 'PDF':
        return <PictureAsPdfIcon sx={{ color: '#f44336' }} />;
      case 'Image':
        return <ImageIcon sx={{ color: '#4caf50' }} />;
      case 'Audio':
        return <AudioFileIcon sx={{ color: '#2196f3' }} />;
      case 'Video':
        return <VideoLibraryIcon sx={{ color: '#ff9800' }} />;
      default:
        return <DescriptionIcon sx={{ color: '#999' }} />;
    }
  };

  const getTypeColor = type => {
    switch (type) {
      case 'PDF':
        return 'error';
      case 'Image':
        return 'success';
      case 'Audio':
        return 'primary';
      case 'Video':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل المستندات...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          📁 المستندات والملفات
        </Typography>

        {/* الإحصائيات */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي المستندات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                  {documents.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  ملفات PDF
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                  {documents.filter(d => d.type === 'PDF').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  صور وفيديوهات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {documents.filter(d => d.type === 'Image' || d.type === 'Video').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي الحجم
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                  {documents.reduce((sum, d) => sum + parseInt(d.size), 0)}MB
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* البحث والفلترة */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="ابحث عن ملف..."
            variant="outlined"
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            {['all', 'PDF', 'Image', 'Audio', 'Video'].map(type => (
              <Chip
                key={type}
                label={type === 'all' ? 'الكل' : type}
                onClick={() => setFilterType(type)}
                variant={filterType === type ? 'filled' : 'outlined'}
                color={filterType === type ? 'primary' : 'default'}
              />
            ))}
          </Box>

          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setOpenUploadDialog(true)}>
            رفع ملف
          </Button>
        </Box>
      </Box>

      {/* قائمة المستندات */}
      <Grid container spacing={2}>
        {filteredDocuments.map(doc => (
          <Grid item xs={12} sm={6} md={4} key={doc.id}>
            <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, mb: 2 }}>
                  <Box sx={{ fontSize: '2rem' }}>{getDocumentIcon(doc.type)}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {doc.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 0.5 }}>
                      المريض: {doc.patientName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 0.5 }}>
                      {doc.date}
                    </Typography>
                    <Chip label={doc.type} size="small" color={getTypeColor(doc.type)} variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                </Box>

                <Box sx={{ pb: 1, mb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    الحجم: {doc.size}MB • الوصول: {doc.access}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" startIcon={<VisibilityIcon />}>
                    عرض
                  </Button>
                  <Button size="small" startIcon={<DownloadIcon />}>
                    تحميل
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />}>
                    حذف
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredDocuments.length === 0 && (
        <Card sx={{ borderRadius: 2, textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">لا توجد مستندات</Typography>
        </Card>
      )}

      {/* Dialog رفع ملف */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>رفع ملف جديد</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper
              sx={{
                border: '2px dashed #ddd',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#2196f3',
                  backgroundColor: '#e3f2fd',
                },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: '3rem', color: '#2196f3', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                اسحب الملف هنا أو انقر لاختيار
              </Typography>
            </Paper>

            <TextField label="اسم الملف" fullWidth variant="outlined" size="small" />

            <TextField label="المريض المرتبط" fullWidth variant="outlined" size="small" />

            <TextField label="الوصف" fullWidth variant="outlined" size="small" multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenUploadDialog(false)}>إلغاء</Button>
          <Button variant="contained">رفع الملف</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistDocuments;
