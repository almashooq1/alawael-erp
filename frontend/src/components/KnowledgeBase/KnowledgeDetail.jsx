import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Rating,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  CircularProgress,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import axios from 'axios';

const KnowledgeDetail = ({ articleId }) => {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingOpen, setRatingOpen] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/knowledge/articles/${articleId}`);
        setArticle(response.data.data);
      } catch (error) {
        console.error('Failed to load article:', error);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const handleSubmitRating = async () => {
    if (rating === 0) return;

    setSubmittingRating(true);
    try {
      await axios.post(`${API_BASE_URL}/knowledge/articles/${articleId}/rate`, {
        rating,
        feedback,
      });

      alert('شكراً على تقييمك!');
      setRatingOpen(false);
      setRating(0);
      setFeedback('');

      // Refresh article
      const response = await axios.get(`${API_BASE_URL}/knowledge/articles/${articleId}`);
      setArticle(response.data.data);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!article) {
    return (
      <Card sx={{ p: 3, textAlign: 'center', color: '#999' }}>
        <p>لم يتم العثور على المقالة</p>
      </Card>
    );
  }

  const getCategoryLabel = (category) => {
    const labels = {
      therapeutic_protocols: '🏥 بروتوكولات علاجية',
      case_studies: '📋 دراسات حالة',
      research_experiments: '🔬 أبحاث وتجارب',
      best_practices: '⭐ أفضل الممارسات',
    };
    return labels[category] || category;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Header */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={getCategoryLabel(article.category)}
                    color="primary"
                    variant="outlined"
                  />
                  {article.tags?.map((tag) => (
                    <Chip key={tag} label={tag} variant="filled" size="small" />
                  ))}
                </Box>

                <h1 style={{ margin: '0 0 8px 0' }}>{article.title}</h1>

                <Box sx={{ color: '#666', mb: 2 }}>
                  <small>
                    بقلم: {article.author?.name} |{' '}
                    {new Date(article.createdAt).toLocaleDateString('ar-SA')}
                  </small>
                </Box>

                <p style={{ color: '#444', fontStyle: 'italic' }}>
                  {article.description}
                </p>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Content */}
              <Box sx={{ mb: 3 }}>
                {article.sections && article.sections.length > 0 ? (
                  <>
                    {article.sections.map((section, idx) => (
                      <Box key={idx} sx={{ mb: 3 }}>
                        <h3 style={{ color: '#333', marginBottom: '12px' }}>
                          {section.title}
                        </h3>
                        <Box sx={{ color: '#555', lineHeight: 1.8 }}>
                          {section.content}
                        </Box>
                      </Box>
                    ))}
                  </>
                ) : (
                  <Box sx={{ color: '#555', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                    {article.content}
                  </Box>
                )}
              </Box>

              {/* References */}
              {article.references && article.references.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <h3>المراجع</h3>
                  <Box component="ul">
                    {article.references.map((ref, idx) => (
                      <li key={idx}>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer">
                          {ref.title}
                        </a>
                        {ref.source && <span> - {ref.source}</span>}
                      </li>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Related Articles */}
              {article.relatedArticles && article.relatedArticles.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <h3>مقالات ذات صلة</h3>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {article.relatedArticles.map((related) => (
                      <Button
                        key={related._id}
                        variant="outlined"
                        onClick={() => window.location.href = `/knowledge/${related.slug}`}
                      >
                        {related.title}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Stats */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>الإحصائيات</h3>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <span>التقييم:</span>
                <Rating value={article.ratings?.average || 0} readOnly />
              </Box>
              <small style={{ color: '#999' }}>
                ({article.ratings?.count || 0} تقييم)
              </small>
            </Box>

            <Box sx={{ mb: 2 }}>
              <div>👁️ المشاهدات: {article.views}</div>
              <div>⬇️ التحميلات: {article.downloads}</div>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Actions */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ThumbUpIcon />}
                onClick={() => setRatingOpen(true)}
              >
                قيّم هذه المقالة
              </Button>
              <Button fullWidth variant="outlined" startIcon={<ShareIcon />}>
                شارك
              </Button>
              {article.author?._id === localStorage.getItem('userId') && (
                <Button fullWidth variant="outlined" startIcon={<EditIcon />}>
                  تعديل
                </Button>
              )}
            </Box>
          </Paper>

          {/* Metadata */}
          <Paper sx={{ p: 3 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>المعلومات</h3>

            <Box sx={{ fontSize: '0.9em', lineHeight: 2 }}>
              <div>
                <strong>الحالة:</strong> {article.status}
              </div>
              <div>
                <strong>التصنيف:</strong> {article.category}
              </div>
              {article.subcategory && (
                <div>
                  <strong>التصنيف الفرعي:</strong> {article.subcategory}
                </div>
              )}
              <div>
                <strong>تاريخ الإنشاء:</strong>{' '}
                {new Date(article.createdAt).toLocaleDateString('ar-SA')}
              </div>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onClose={() => setRatingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>قيّم هذه المقالة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>هل كانت هذه المقالة مفيدة؟</Box>
            <Rating
              value={rating}
              onChange={(e, newValue) => setRating(newValue)}
              size="large"
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="الملاحظات (اختياري)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="شارك ملاحظاتك..."
          />
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={() => setRatingOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmitRating}
            disabled={rating === 0 || submittingRating}
          >
            {submittingRating ? <CircularProgress size={24} /> : 'إرسال'}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default KnowledgeDetail;
