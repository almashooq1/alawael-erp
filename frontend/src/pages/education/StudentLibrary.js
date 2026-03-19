/**
 * Student Digital Library Page
 * صفحة المكتبة الرقمية للطالب
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Stack,
  Avatar,
  Paper,
  IconButton,
  Alert,
  LinearProgress,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MenuBook as BookIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Visibility as ViewIcon,
  Category as CategoryIcon,
  AutoStories as ReadIcon,
  PictureAsPdf as PdfIcon,
  VideoLibrary as VideoIcon,
  Audiotrack as AudioIcon,
} from '@mui/icons-material';
import { placeholderImage } from 'utils/placeholderImage';
import { gradients, statusColors } from 'theme/palette';
import lmsService from 'services/lmsService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const StudentLibrary = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedBook, setSelectedBook] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [books, setBooks] = useState([]);
  const showSnackbar = useSnackbar();

  const categories = [
    'الكل',
    'كتب دراسية',
    'مراجع علمية',
    'قصص وروايات',
    'فيديوهات تعليمية',
    'ملفات صوتية',
    'أوراق عمل',
  ];

  const mockBooks = [
    {
      id: 1,
      title: 'كتاب الرياضيات - الصف الثالث',
      author: 'وزارة التربية والتعليم',
      category: 'كتب دراسية',
      subject: 'رياضيات',
      type: 'PDF',
      pages: 250,
      size: '15 MB',
      description: 'كتاب الرياضيات المنهجي للصف الثالث الابتدائي',
      coverImage: placeholderImage('رياضيات', '667eea', 'ffffff'),
      rating: 4.5,
      downloads: 1250,
    },
    {
      id: 2,
      title: 'مرجع اللغة العربية',
      author: 'د. أحمد محمود',
      category: 'مراجع علمية',
      subject: 'لغة عربية',
      type: 'PDF',
      pages: 180,
      size: '12 MB',
      description: 'مرجع شامل لقواعد اللغة العربية والنحو',
      coverImage: placeholderImage('عربي', '764ba2', 'ffffff'),
      rating: 4.8,
      downloads: 980,
    },
    {
      id: 3,
      title: 'العلوم والتجارب العملية',
      author: 'فريق المناهج العلمية',
      category: 'كتب دراسية',
      subject: 'علوم',
      type: 'PDF',
      pages: 200,
      size: '25 MB',
      description: 'كتاب العلوم مع تجارب عملية مصورة',
      coverImage: placeholderImage('علوم', '4CAF50', 'ffffff'),
      rating: 4.7,
      downloads: 1100,
    },
    {
      id: 4,
      title: 'دروس الرياضيات التفاعلية',
      author: 'أ. سارة أحمد',
      category: 'فيديوهات تعليمية',
      subject: 'رياضيات',
      type: 'فيديو',
      duration: '45 دقيقة',
      size: '250 MB',
      description: 'سلسلة فيديوهات تعليمية لشرح دروس الرياضيات',
      coverImage: placeholderImage('فيديو', 'FF9800', 'ffffff'),
      rating: 4.9,
      downloads: 2300,
    },
    {
      id: 5,
      title: 'قصص القرآن للأطفال',
      author: 'د. محمد الصالح',
      category: 'قصص وروايات',
      subject: 'تربية إسلامية',
      type: 'PDF',
      pages: 120,
      size: '8 MB',
      description: 'قصص من القرآن الكريم بأسلوب مبسط للأطفال',
      coverImage: placeholderImage('قصص', '2196F3', 'ffffff'),
      rating: 5.0,
      downloads: 3500,
    },
    {
      id: 6,
      title: 'دروس الإنجليزية المسموعة',
      author: 'مركز اللغات',
      category: 'ملفات صوتية',
      subject: 'لغة إنجليزية',
      type: 'صوتي',
      duration: '30 دقيقة',
      size: '45 MB',
      description: 'دروس صوتية لتحسين النطق والاستماع',
      coverImage: placeholderImage('صوتي', '9C27B0', 'ffffff'),
      rating: 4.6,
      downloads: 1800,
    },
  ];

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lmsService.getMedia();
      const data = res?.data || res?.media || res || [];
      if (Array.isArray(data) && data.length > 0) {
        setBooks(data);
      } else {
        setBooks(mockBooks);
      }
    } catch {
      setBooks(mockBooks);
      showSnackbar('تعذر تحميل المكتبة، تم استخدام بيانات محلية', 'warning');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnackbar]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filteredBooks = books.filter(book => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'الكل' || book.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = book => {
    setSelectedBook(book);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBook(null);
  };

  const toggleFavorite = bookId => {
    setFavorites(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const getTypeIcon = type => {
    switch (type) {
      case 'PDF':
        return <PdfIcon sx={{ color: statusColors.error }} />;
      case 'فيديو':
        return <VideoIcon sx={{ color: statusColors.info }} />;
      case 'صوتي':
        return <AudioIcon sx={{ color: statusColors.purple }} />;
      default:
        return <BookIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          جاري التحميل...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          background: gradients.primary,
          borderRadius: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative' }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 60, height: 60 }}>
            <BookIcon sx={{ fontSize: 35 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              المكتبة الرقمية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              مكتبة شاملة من الكتب والمراجع والمواد التعليمية
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Search and Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="ابحث عن كتاب، مؤلف، أو مادة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {categories.map(category => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: gradients.primary, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {books.length}
                  </Typography>
                  <Typography variant="body1">إجمالي المواد</Typography>
                </Box>
                <BookIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: gradients.greenStatus, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {favorites.length}
                  </Typography>
                  <Typography variant="body1">المفضلة</Typography>
                </Box>
                <FavoriteIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: gradients.orangeStatus, color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {categories.length - 1}
                  </Typography>
                  <Typography variant="body1">التصنيفات</Typography>
                </Box>
                <CategoryIcon sx={{ fontSize: 50, opacity: 0.7 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Books Grid */}
      <Grid container spacing={3}>
        {filteredBooks.map((book, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                },
                animation: 'fadeIn 0.5s ease-in',
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'scale(0.9)' },
                  to: { opacity: 1, transform: 'scale(1)' },
                },
              }}
            >
              <CardMedia component="img" height="200" image={book.coverImage} alt={book.title} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                      {book.title}
                    </Typography>
                    <IconButton
                      aria-label="إجراء"
                      size="small"
                      onClick={() => toggleFavorite(book.id)}
                      sx={{ color: favorites.includes(book.id) ? statusColors.error : 'inherit' }}
                    >
                      {favorites.includes(book.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {book.author}
                  </Typography>

                  <Chip
                    icon={getTypeIcon(book.type)}
                    label={book.type}
                    size="small"
                    variant="outlined"
                  />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <DownloadIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {book.downloads} تنزيل
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ViewIcon />}
                  onClick={() => handleOpenDialog(book)}
                  sx={{
                    background: gradients.primary,
                  }}
                >
                  عرض التفاصيل
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredBooks.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          لا توجد نتائج تطابق بحثك. حاول تغيير معايير البحث.
        </Alert>
      )}

      {/* Book Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedBook && (
          <>
            <DialogTitle
              sx={{
                background: gradients.primary,
                color: 'white',
              }}
            >
              {selectedBook.title}
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box
                    component="img"
                    src={selectedBook.coverImage}
                    alt={selectedBook.title}
                    sx={{ width: '100%', borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        المؤلف
                      </Typography>
                      <Typography variant="body1">{selectedBook.author}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        التصنيف
                      </Typography>
                      <Chip label={selectedBook.category} size="small" />
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        المادة الدراسية
                      </Typography>
                      <Typography variant="body1">{selectedBook.subject}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        الوصف
                      </Typography>
                      <Typography variant="body1">{selectedBook.description}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        التفاصيل
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>{getTypeIcon(selectedBook.type)}</ListItemIcon>
                          <ListItemText primary={`النوع: ${selectedBook.type}`} />
                        </ListItem>
                        {selectedBook.pages && (
                          <ListItem>
                            <ListItemIcon>
                              <ReadIcon />
                            </ListItemIcon>
                            <ListItemText primary={`عدد الصفحات: ${selectedBook.pages}`} />
                          </ListItem>
                        )}
                        <ListItem>
                          <ListItemIcon>
                            <DownloadIcon />
                          </ListItemIcon>
                          <ListItemText primary={`الحجم: ${selectedBook.size}`} />
                        </ListItem>
                      </List>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>إغلاق</Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                sx={{
                  background: gradients.primary,
                }}
              >
                تحميل
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default StudentLibrary;
