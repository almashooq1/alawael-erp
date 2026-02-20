import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Rating,
  CircularProgress,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewList as ListIcon,
  GridView as GridIcon,
} from '@mui/icons-material';
import axios from 'axios';

const KnowledgeSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [categories, setCategories] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/knowledge/categories`);
        setCategories(response.data.data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const params = {
        q: searchQuery,
        limit: 20,
      };

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const response = await axios.get(`${API_BASE_URL}/knowledge/search`, { params });
      setResults(response.data.data.results);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const CategoryCard = ({ article }) => (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-4px)',
        },
      }}
      onClick={() => window.location.href = `/knowledge/${article.slug}`}
    >
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Chip
            label={article.category.replace('_', ' ').toUpperCase()}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <h3 style={{ margin: '0 0 8px 0', minHeight: '3em' }}>
          {article.title}
        </h3>

        <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '12px' }}>
          {article.description?.substring(0, 100)}...
        </p>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Rating value={article.ratings?.average || 0} readOnly size="small" />
          <span style={{ fontSize: '0.8em', color: '#999' }}>
            👁️ {article.views || 0}
          </span>
        </Box>
      </CardContent>
    </Card>
  );

  const ListItem = ({ article }) => (
    <Card
      sx={{
        marginBottom: 2,
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': { boxShadow: 4 },
      }}
      onClick={() => window.location.href = `/knowledge/${article.slug}`}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ mb: 1 }}>
              <Chip
                label={article.category.replace('_', ' ').toUpperCase()}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <h3 style={{ margin: '8px 0' }}>{article.title}</h3>

            <p style={{ color: '#666', marginBottom: '8px' }}>
              {article.description}
            </p>

            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Rating value={article.ratings?.average || 0} readOnly size="small" />
              <span style={{ fontSize: '0.9em', color: '#999' }}>
                👁️ {article.views || 0} views
              </span>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <h1>📚 مركز المعرفة - Knowledge Base</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          ابحث في بروتوكولاتنا العلاجية وأفضل الممارسات
        </p>
      </Box>

      {/* Search Section */}
      <Card sx={{ mb: 4, p: 3, backgroundColor: '#f5f5f5' }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                placeholder="ابحث عن مقالات، بروتوكولات، دراسات حالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleSearch}
                disabled={loading}
                sx={{ height: '100%' }}
              >
                {loading ? <CircularProgress size={24} /> : 'بحث'}
              </Button>
            </Grid>
          </Grid>

          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Button
              variant={selectedCategory === 'all' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSelectedCategory('all')}
            >
              الكل
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat._id}
                variant={selectedCategory === cat.name ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name.replace('_', ' ')}
              </Button>
            ))}
          </Box>

          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="grid" aria-label="grid view">
                <GridIcon />
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <ListIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </form>
      </Card>

      {/* Results */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : results.length === 0 && searchQuery ? (
        <Card sx={{ p: 3, textAlign: 'center', color: '#999' }}>
          <p>لم يتم العثور على نتائج. جرب كلمات مفتاحية أخرى.</p>
        </Card>
      ) : (
        <>
          <Box sx={{ mb: 2, color: '#666' }}>
            {results.length > 0 && `تم العثور على ${results.length} نتيجة`}
          </Box>

          {viewMode === 'grid' ? (
            <Grid container spacing={3}>
              {results.map((article) => (
                <Grid item xs={12} sm={6} md={4} key={article._id}>
                  <CategoryCard article={article} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box>
              {results.map((article) => (
                <ListItem key={article._id} article={article} />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default KnowledgeSearch;
