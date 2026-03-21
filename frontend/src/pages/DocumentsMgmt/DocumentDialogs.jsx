/**
 * @deprecated This file is part of an older split implementation.
 * The active version is the monolithic ../DocumentsMgmt.js which takes
 * priority in webpack module resolution over this directory index.
 * Do NOT use or maintain this file — all changes go to ../DocumentsMgmt.js.
 */

/**
 * DocumentDialogs — Upload & Details dialogs
 * حوارات رفع المستندات وعرض التفاصيل
 */


import { getStatusColor } from 'utils/statusColors';
import { formatFileSize } from './useDocumentsPage';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';

export const UploadDialog = ({ open, onClose, categories, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <form onSubmit={onSubmit}>
      <DialogTitle>رفع مستند جديد</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField name="title" label="عنوان المستند" fullWidth required />
          </Grid>
          <Grid item xs={12}>
            <TextField name="description" label="الوصف" fullWidth multiline rows={3} />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>التصنيف</InputLabel>
              <Select name="category" label="التصنيف">
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="tags"
              label="الوسوم (مفصولة بفواصل)"
              fullWidth
              placeholder="عقد, مورد, مهم"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" component="label" fullWidth startIcon={<UploadIcon />}>
              اختر الملف
              <input type="file" hidden aria-label="اختيار ملف للرفع" />
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button type="submit" variant="contained">
          رفع
        </Button>
      </DialogActions>
    </form>
  </Dialog>
);

export const DetailsDialog = ({ open, onClose, document: doc }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    {doc && (
      <>
        <DialogTitle>{doc.title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body1">{doc.description}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                الحجم
              </Typography>
              <Typography>{formatFileSize(doc.size)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                النوع
              </Typography>
              <Typography>{doc.format.toUpperCase()}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                تاريخ الإنشاء
              </Typography>
              <Typography>{doc.createdDate}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                الحالة
              </Typography>
              <Chip label={doc.status} color={getStatusColor(doc.status)} size="small" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                الوسوم
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                {(doc.tags || []).map((tag, index) => (
                  <Chip key={index} label={tag} size="small" />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إغلاق</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            تحميل
          </Button>
        </DialogActions>
      </>
    )}
  </Dialog>
);
