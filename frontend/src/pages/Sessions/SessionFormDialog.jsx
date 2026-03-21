/**
 * SessionFormDialog — Create / Edit session dialog
 * Enhanced with date field, recurrence from constants, and status display
 */
import { Fade,
} from '@mui/material';

import { SESSION_TYPES, RECURRENCE_OPTIONS, STATUS_MAP } from './constants';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Person from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const SessionFormDialog = ({
  open, onClose, editingSession, form, setForm, saving, formError, onSave,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" TransitionComponent={Fade}>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h6" fontWeight="bold">
          {editingSession ? 'تعديل الجلسة' : 'إضافة جلسة جديدة'}
        </Typography>
        {editingSession?.status && STATUS_MAP[editingSession.status] && (
          <Chip
            label={STATUS_MAP[editingSession.status].label}
            color={STATUS_MAP[editingSession.status].color}
            size="small"
          />
        )}
      </Box>
      <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
    </DialogTitle>
    <Divider />
    <DialogContent sx={{ pt: 3 }}>
      {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
      <Stack spacing={2.5}>
        <TextField
          label="عنوان الجلسة *" fullWidth
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="مثال: جلسة علاج طبيعي - أحمد"
        />
        <TextField
          select label="نوع الجلسة" fullWidth
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {SESSION_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: t.color }} />
                {t.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* Date */}
        <TextField
          label="التاريخ *" type="date" fullWidth
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><CalendarToday fontSize="small" /></InputAdornment>,
          }}
        />

        {/* Time range */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="وقت البداية *" type="time" fullWidth
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="وقت النهاية" type="time" fullWidth
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <TextField
          label="المشاركون (مفصولين بفواصل)" fullWidth
          value={form.participants}
          onChange={(e) => setForm({ ...form, participants: e.target.value })}
          placeholder="أحمد محمد, د. سارة أحمد"
          InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
        />

        <TextField
          select label="التكرار" fullWidth
          value={form.recurrence}
          onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
        >
          {RECURRENCE_OPTIONS.map((r) => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="ملاحظات" fullWidth multiline rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} color="inherit">إلغاء</Button>
      <Button
        variant="contained" onClick={onSave} disabled={saving}
        startIcon={saving ? null : editingSession ? <EditIcon /> : <AddIcon />}
      >
        {saving ? 'جاري الحفظ...' : editingSession ? 'تحديث' : 'إضافة'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default SessionFormDialog;
