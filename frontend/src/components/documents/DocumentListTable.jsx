/**
 * DocumentListTable — Document table with sortable headers and row rendering
 * جدول المستندات مع رؤوس قابلة للفرز وعرض الصفوف
 */

import {
  Paper,
} from '@mui/material';


import documentService from 'services/documentService';
import { gradients, surfaceColors, brandColors, neutralColors } from 'theme/palette';
import { getCategoryColor } from './documentListConstants';

const DocumentListTable = ({
  paginatedDocs,
  visibleCols,
  filters,
  selection,
  dialogs,
  actions,
  loading,
  onSelectAll,
  onSelectOne,
}) => (
  <TableContainer
    component={Paper}
    sx={{
      boxShadow: 2,
      borderRadius: 2,
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    {loading && (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <CircularProgress />
      </Box>
    )}
    <Table>
      <TableHead sx={{ background: gradients.primary }}>
        <TableRow>
          <TableCell padding="checkbox" sx={{ color: 'white' }}>
            <Checkbox
              indeterminate={
                selection.selected.length > 0 &&
                selection.selected.length < paginatedDocs.length
              }
              checked={
                paginatedDocs.length > 0 && selection.selected.length === paginatedDocs.length
              }
              onChange={onSelectAll}
              sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
            />
            <Tooltip title="خيارات التحديد">
              <IconButton
                size="small"
                onClick={selection.openSelectionMenu}
                sx={{ ml: 0.5, color: 'white' }}
                aria-label="خيارات التحديد"
              >
                <SelectAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </TableCell>
          {visibleCols.type && (
            <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
              النوع
            </TableCell>
          )}
          {visibleCols.title && (
            <TableCell
              sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => filters.handleSort('title')}
            >
              العنوان {filters.sortBy === 'title' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </TableCell>
          )}
          {visibleCols.category && (
            <TableCell
              sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => filters.handleSort('category')}
            >
              الفئة {filters.sortBy === 'category' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </TableCell>
          )}
          {visibleCols.size && (
            <TableCell
              sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => filters.handleSort('size')}
            >
              الحجم {filters.sortBy === 'size' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </TableCell>
          )}
          {visibleCols.date && (
            <TableCell
              sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => filters.handleSort('date')}
            >
              التاريخ {filters.sortBy === 'date' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </TableCell>
          )}
          {visibleCols.actions && (
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">
              الإجراءات
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {paginatedDocs && paginatedDocs.length > 0 ? (
          paginatedDocs.map((doc, index) => {
            const isSelected = selection.isSelected(doc._id);
            return (
              <TableRow
                key={doc._id}
                hover
                selected={isSelected}
                sx={{
                  transition: 'all 0.3s ease',
                  bgcolor: isSelected ? 'action.selected' : 'inherit',
                  '&:hover': {
                    backgroundColor: isSelected ? 'action.selected' : surfaceColors.brandTint,
                    transform: 'scale(1.005)',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                  },
                  animation: `fadeIn 0.5s ease ${index * 0.05}s both`,
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox checked={isSelected} onChange={() => onSelectOne(doc._id)} />
                </TableCell>
                {visibleCols.type && (
                  <TableCell align="center" sx={{ fontSize: '24px' }}>
                    {documentService.getFileIcon(doc.fileType)}
                  </TableCell>
                )}
                {visibleCols.title && (
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {doc.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      📎 {doc.originalFileName}
                    </Typography>
                  </TableCell>
                )}
                {visibleCols.category && (
                  <TableCell>
                    <Chip
                      label={doc.category}
                      size="small"
                      color={getCategoryColor(doc.category)}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                )}
                {visibleCols.size && (
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {documentService.formatFileSize(doc.fileSize)}
                    </Typography>
                  </TableCell>
                )}
                {visibleCols.date && (
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(doc.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  </TableCell>
                )}
                {visibleCols.actions && (
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="معاينة" arrow>
                        <IconButton
                          size="small"
                          onClick={() => dialogs.openDetails(doc)}
                          color="info"
                          aria-label="عرض"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تحرير" arrow>
                        <IconButton
                          size="small"
                          onClick={() => dialogs.openEdit(doc)}
                          color="primary"
                          aria-label="تحرير"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="المزيد" arrow>
                        <IconButton
                          size="small"
                          onClick={e => actions.openMenu(e, doc)}
                          aria-label="المزيد"
                          sx={{
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: brandColors.primaryStart,
                              color: 'white',
                              transform: 'rotate(90deg)',
                            },
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
              <Box sx={{ textAlign: 'center' }}>
                <FolderOpenIcon sx={{ fontSize: 80, color: neutralColors.placeholder, mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  {filters.searchQuery || filters.categoryFilter !== 'الكل'
                    ? '🔍 لا توجد نتائج'
                    : 'لا توجد مستندات'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {filters.searchQuery || filters.categoryFilter !== 'الكل'
                    ? 'جرب تغيير معايير البحث'
                    : 'ابدأ برفع أول مستند لك'}
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

export default DocumentListTable;
