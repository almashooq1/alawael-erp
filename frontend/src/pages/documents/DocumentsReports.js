import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
  GetApp as GetAppIcon,
  Preview as PreviewIcon,
  PictureAsPdf as FilePdfIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { parentService } from 'services/parentService';
import documentService from 'services/documentService';
import logger from 'utils/logger';
import { gradients, statusColors, surfaceColors, brandColors, neutralColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const DocumentsReports = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [docData, setDocData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const showSnackbar = useSnackbar();
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [error, setError] = useState(null);

  const handlePreview = doc => {
    const docId = doc._id || doc.id;
    if (docId) {
      window.open(documentService.getPreviewUrl(docId), '_blank');
    } else {
      showSnackbar('لا يمكن عرض هذا المستند', 'warning');
    }
  };

  const handleDownload = async doc => {
    const docId = doc._id || doc.id;
    const fileName = doc.originalFileName || doc.name || doc.title || 'document';
    try {
      await documentService.downloadDocument(docId, fileName);
      showSnackbar('✅ تم تنزيل المستند بنجاح', 'success');
    } catch (err) {
      logger.error('Download error:', err);
      showSnackbar('❌ خطأ في تنزيل المستند', 'error');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await parentService.getDocumentsReports(userId);
        setDocData(data);
      } catch (err) {
        logger.error('Failed to load documents:', err);
        setError(err.message || 'حدث خطأ في تحميل المستندات');
        showSnackbar('حدث خطأ في تحميل المستندات', 'error');
      }
    };
    fetchData();
  }, [userId, showSnackbar]);

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  if (!docData) return <Typography>جاري التحميل...</Typography>;

  const getDocIcon = type => {
    if (type === 'PDF') return <FilePdfIcon sx={{ color: statusColors.error }} />;
    if (type === 'صورة') return <ImageIcon sx={{ color: statusColors.info }} />;
    if (type === 'تقرير') return <DescriptionIcon sx={{ color: statusColors.warning }} />;
    return <DescriptionIcon />;
  };

  const getDocColor = type => {
    if (type === 'PDF') return surfaceColors.errorLight;
    if (type === 'صورة') return surfaceColors.infoLight;
    if (type === 'تقرير') return surfaceColors.warningLight;
    return surfaceColors.lightGray;
  };

  const filteredDocs =
    selectedFolder === 'all'
      ? docData.documents
      : docData.documents?.filter(d => d.category === selectedFolder);

  const searchedDocs = filteredDocs?.filter(
    d => d.name.includes(searchText) || d.description.includes(searchText)
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.fire,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CloudDownloadIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              المستندات والتقارير
            </Typography>
            <Typography variant="body2">مكتبة شاملة للمستندات والتقارير الطبية</Typography>
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {docData.stats?.map(stat => (
          <Grid item xs={12} sm={6} md={3} key={stat.id}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: stat.color, fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(e, val) => setSelectedTab(val)} sx={{ mb: 3 }}>
        <Tab label="جميع المستندات" />
        <Tab label="التقارير الطبية" />
        <Tab label="الفحوصات والاختبارات" />
        <Tab label="نتائج العلاج" />
      </Tabs>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '250px 1fr' }, gap: 2 }}>
        {/* Sidebar - Folders */}
        <Box>
          <Card>
            <CardHeader title="الفئات" />
            <List dense>
              {docData.folders?.map(folder => (
                <ListItem
                  button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  sx={{
                    backgroundColor:
                      selectedFolder === folder.id ? surfaceColors.lightGray : 'transparent',
                    borderLeft:
                      selectedFolder === folder.id
                        ? `3px solid ${brandColors.accentAmber}`
                        : 'none',
                  }}
                >
                  <ListItemIcon>
                    <FolderIcon sx={{ color: brandColors.accentAmber }} />
                  </ListItemIcon>
                  <ListItemText primary={folder.name} secondary={`${folder.count} ملف`} />
                </ListItem>
              ))}
            </List>
          </Card>
        </Box>

        {/* Main Content */}
        <Box>
          {/* Search */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="بحث في المستندات..."
                size="small"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>

          {/* Documents Grid */}
          <Grid container spacing={2}>
            {searchedDocs?.map(doc => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: '0.3s',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setOpenDialog(true);
                  }}
                >
                  <Box
                    sx={{
                      backgroundColor: getDocColor(doc.type),
                      p: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 80,
                    }}
                  >
                    <Box sx={{ fontSize: 40 }}>{getDocIcon(doc.type)}</Box>
                  </Box>
                  <CardContent>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: neutralColors.textMuted, display: 'block', mb: 1 }}
                    >
                      {doc.date}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={doc.type} size="small" variant="outlined" />
                      <Chip label={doc.size} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        aria-label="معاينة"
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handlePreview(doc);
                        }}
                      >
                        <PreviewIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        aria-label="تحميل"
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                      >
                        <GetAppIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* Document Preview Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        {selectedDoc && (
          <>
            <DialogTitle>{selectedDoc.name}</DialogTitle>
            <DialogContent dividers sx={{ pt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      تاريخ الملف
                    </Typography>
                    <Typography variant="body2">{selectedDoc.date}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      حجم الملف
                    </Typography>
                    <Typography variant="body2">{selectedDoc.size}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      النوع
                    </Typography>
                    <Typography variant="body2">{selectedDoc.type}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      الفئة
                    </Typography>
                    <Typography variant="body2">{selectedDoc.category}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  الوصف
                </Typography>
                <Typography variant="body2">{selectedDoc.description}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  معلومات إضافية
                </Typography>
                <Box sx={{ backgroundColor: surfaceColors.lightGray, p: 2, borderRadius: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>المعالج:</strong> {selectedDoc.therapist}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>آخر تحديث:</strong> {selectedDoc.lastUpdated}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>الحالة:</strong> {selectedDoc.status}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>إغلاق</Button>
              <Button
                variant="contained"
                startIcon={<PreviewIcon />}
                onClick={() => handlePreview(selectedDoc)}
                sx={{
                  background: gradients.fire,
                }}
              >
                عرض
              </Button>
              <Button
                variant="contained"
                startIcon={<GetAppIcon />}
                onClick={() => handleDownload(selectedDoc)}
                sx={{
                  background: gradients.fire,
                }}
              >
                تحميل
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default DocumentsReports;
