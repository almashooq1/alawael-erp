/**
 * @deprecated This file is part of an older split implementation.
 * The active version is the monolithic ../DocumentsMgmt.js which takes
 * priority in webpack module resolution over this directory index.
 * Do NOT use or maintain this file — all changes go to ../DocumentsMgmt.js.
 */

/**
 * DocumentsListTab — Search/filter bar & documents grid
 * تبويب قائمة المستندات: شريط البحث والفلترة وعرض المستندات
 */

import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Chip,
  InputAdornment,
  MenuItem,
  LinearProgress,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Visibility as ViewIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { getStatusColor } from 'utils/statusColors';
import { formatFileSize } from './useDocumentsPage';

const DocumentsListTab = ({
  documents,
  categories,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  fetchDocuments,
  setSelectedDocument,
  setDetailsDialogOpen,
}) => (
  <Box>
    {/* Search and Filter Bar */}
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="البحث في المستندات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>التصنيف</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="التصنيف"
            >
              <MenuItem value="">الكل</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={fetchDocuments}>
            بحث
          </Button>
        </Grid>
      </Grid>
    </Paper>

    {/* Documents Grid */}
    {loading ? (
      <LinearProgress />
    ) : (
      <Grid container spacing={2}>
        {documents.map((doc) => (
          <Grid item xs={12} sm={6} md={4} key={doc.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="start" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DocumentIcon color="primary" />
                    {doc.confidential && (
                      <Tooltip title="سري">
                        <LockIcon fontSize="small" color="error" />
                      </Tooltip>
                    )}
                  </Box>
                  <Chip label={doc.status} size="small" color={getStatusColor(doc.status)} />
                </Box>

                <Typography variant="h6" gutterBottom noWrap>
                  {doc.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {doc.description}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  {(doc.tags || []).slice(0, 3).map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(doc.size)} • {doc.format.toUpperCase()}
                </Typography>

                <Box display="flex" gap={1} mt={1}>
                  <Chip icon={<ViewIcon />} label={doc.views} size="small" variant="outlined" />
                  <Chip
                    icon={<DownloadIcon />}
                    label={doc.downloads}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => {
                    setSelectedDocument(doc);
                    setDetailsDialogOpen(true);
                  }}
                >
                  عرض
                </Button>
                <Button size="small" startIcon={<DownloadIcon />}>
                  تحميل
                </Button>
                <Button size="small" startIcon={<ShareIcon />}>
                  مشاركة
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

export default DocumentsListTab;
