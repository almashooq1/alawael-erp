import React, { useState, useEffect } from 'react';
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
import { parentService } from '../services/parentService';

const DocumentsReports = () => {
  const [docData, setDocData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getDocumentsReports('parent001');
      setDocData(data);
    };
    fetchData();
  }, []);

  if (!docData) return <Typography>جاري التحميل...</Typography>;

  const getDocIcon = type => {
    if (type === 'PDF') return <FilePdfIcon sx={{ color: '#F44336' }} />;
    if (type === 'صورة') return <ImageIcon sx={{ color: '#2196F3' }} />;
    if (type === 'تقرير') return <DescriptionIcon sx={{ color: '#FF9800' }} />;
    return <DescriptionIcon />;
  };

  const getDocColor = type => {
    if (type === 'PDF') return '#ffebee';
    if (type === 'صورة') return '#e3f2fd';
    if (type === 'تقرير') return '#fff3e0';
    return '#f5f5f5';
  };

  const filteredDocs = selectedFolder === 'all' ? docData.documents : docData.documents?.filter(d => d.category === selectedFolder);

  const searchedDocs = filteredDocs?.filter(d => d.name.includes(searchText) || d.description.includes(searchText));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
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
                    backgroundColor: selectedFolder === folder.id ? '#f5f5f5' : 'transparent',
                    borderLeft: selectedFolder === folder.id ? '3px solid #f5af19' : 'none',
                  }}
                >
                  <ListItemIcon>
                    <FolderIcon sx={{ color: '#f5af19' }} />
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
                    <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 1 }}>
                      {doc.date}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={doc.type} size="small" variant="outlined" />
                      <Chip label={doc.size} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                        }}
                      >
                        <PreviewIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
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
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      تاريخ الملف
                    </Typography>
                    <Typography variant="body2">{selectedDoc.date}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      حجم الملف
                    </Typography>
                    <Typography variant="body2">{selectedDoc.size}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      النوع
                    </Typography>
                    <Typography variant="body2">{selectedDoc.type}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#999' }}>
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
                <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
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
                sx={{
                  background: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
                }}
              >
                عرض
              </Button>
              <Button
                variant="contained"
                startIcon={<GetAppIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
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
