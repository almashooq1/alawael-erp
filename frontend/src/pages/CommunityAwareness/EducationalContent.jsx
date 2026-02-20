import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  Rating,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { PlayArrow, Download, Eye, ThumbUp } from '@mui/icons-material';
import axios from 'axios';

const EducationalContent = () => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    disabilityCategory: 'all',
    contentType: 'all',
    search: '',
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchContents();
  }, [page, filters]);

  const fetchContents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        ...(filters.disabilityCategory !== 'all' && { disabilityCategory: filters.disabilityCategory }),
        ...(filters.contentType !== 'all' && { contentType: filters.contentType }),
        ...(filters.search && { search: filters.search }),
      };

      const response = await axios.get('http://localhost:3001/api/community/content', {
        params,
      });

      setContents(response.data.data.content);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('خطأ في تحميل المحتوى:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1);
  };

  const handleOpenContent = (content) => {
    setSelectedContent(content);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedContent(null);
  };

  const disabilityOptions = [
    { value: 'all', label: 'جميع الفئات' },
    { value: 'visual', label: 'الإعاقة البصرية' },
    { value: 'hearing', label: 'الإعاقة السمعية' },
    { value: 'mobility', label: 'الإعاقة الحركية' },
    { value: 'intellectual', label: 'الإعاقة الذهنية' },
    { value: 'psychosocial', label: 'الإعاقة النفسية' },
  ];

  const contentTypes = [
    { value: 'all', label: 'جميع الأنواع' },
    { value: 'article', label: 'مقالة' },
    { value: 'video', label: 'فيديو' },
    { value: 'audio', label: 'صوت' },
    { value: 'pdf', label: 'ملف PDF' },
    { value: 'infographic', label: 'رسومات توضيحية' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          المحتوى التعليمي
        </Typography>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>فئة الإعاقة</InputLabel>
              <Select
                value={filters.disabilityCategory}
                label="فئة الإعاقة"
                onChange={(e) => handleFilterChange('disabilityCategory', e.target.value)}
              >
                {disabilityOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>نوع المحتوى</InputLabel>
              <Select
                value={filters.contentType}
                label="نوع المحتوى"
                onChange={(e) => handleFilterChange('contentType', e.target.value)}
              >
                {contentTypes.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="ابحث عن محتوى..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Content Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {contents.map((content) => (
              <Grid item xs={12} sm={6} md={4} key={content._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, boxShadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6,
                    },
                  }}
                  onClick={() => handleOpenContent(content)}
                >
                  {content.thumbnailUrl && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={content.thumbnailUrl}
                      alt={content.title}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="h2">
                      {content.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 2, minHeight: 40 }}
                    >
                      {content.description.substring(0, 100)}...
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={content.contentType}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={content.disabilityCategory}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Rating value={content.rating.average} readOnly size="small" />
                      <Typography variant="caption" color="textSecondary">
                        ({content.rating.count})
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Eye fontSize="small" />
                        <Typography variant="caption">{content.views}</Typography>
                      </Box>
                      {content.duration && (
                        <Typography variant="caption">
                          {content.duration} دقيقة
                        </Typography>
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<PlayArrow />}
                      onClick={() => handleOpenContent(content)}
                    >
                      عرض المحتوى
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Content Dialog */}
      {selectedContent && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{selectedContent.title}</DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            {selectedContent.contentType === 'video' && (
              <Box
                component="iframe"
                src={selectedContent.contentUrl}
                sx={{
                  width: '100%',
                  height: 400,
                  border: 'none',
                  borderRadius: 1,
                  mb: 2,
                }}
              />
            )}

            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedContent.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip label={`الفئة: ${selectedContent.disabilityCategory}`} />
              <Chip label={`النوع: ${selectedContent.contentType}`} />
              {selectedContent.duration && (
                <Chip label={`المدة: ${selectedContent.duration} دقيقة`} />
              )}
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              مميزات إمكانية الوصول:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedContent.accessibilityFeatures?.subtitles && (
                <Chip label="ترجمة نصية" size="small" color="success" />
              )}
              {selectedContent.accessibilityFeatures?.audioDescription && (
                <Chip label="وصف صوتي" size="small" color="success" />
              )}
              {selectedContent.accessibilityFeatures?.largeText && (
                <Chip label="نص كبير" size="small" color="success" />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>إغلاق</Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              href={selectedContent.contentUrl}
              target="_blank"
            >
              تحميل
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default EducationalContent;
