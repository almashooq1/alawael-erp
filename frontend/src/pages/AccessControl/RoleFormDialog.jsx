/**
 * RoleFormDialog — حوار إنشاء / تعديل دور
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Grid,
  FormControlLabel,
  Checkbox,
  alpha,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { PERMISSION_MODULES, RISK_CONFIG } from './accessControl.constants';

const COLOR_PRESETS = [
  '#1976d2',
  '#7b1fa2',
  '#2e7d32',
  '#c62828',
  '#e65100',
  '#00838f',
  '#4527a0',
  '#37474f',
  '#558b2f',
  '#ad1457',
];

const RoleFormDialog = ({ open, onClose, editingRole, onSave, basePermissions }) => {
  const isClone = editingRole?.clone;
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [selectedPerms, setSelectedPerms] = useState(new Set());

  // Reset on open
  useEffect(() => {
    if (open) {
      if (isClone) {
        setName(`نسخة من ${editingRole.baseRole}`);
        setDesc('');
        setColor('#7b1fa2');
        setSelectedPerms(new Set(basePermissions || []));
      } else if (editingRole) {
        setName(editingRole.name || editingRole.label || '');
        setDesc(editingRole.description || '');
        setColor(editingRole.color || '#1976d2');
        setSelectedPerms(new Set(editingRole.permissions || []));
      } else {
        setName('');
        setDesc('');
        setColor('#1976d2');
        setSelectedPerms(new Set());
      }
    }
  }, [open, editingRole, isClone, basePermissions]);

  const togglePerm = key => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleModule = module => {
    const keys = module.permissions.map(p => p.key);
    const allGranted = keys.every(k => selectedPerms.has(k));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (allGranted) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: desc.trim(),
      color,
      permissions: [...selectedPerms],
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            {isClone ? 'استنساخ دور' : editingRole ? 'تعديل الدور' : 'إنشاء دور جديد'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="اسم الدور"
              value={name}
              onChange={e => setName(e.target.value)}
              fullWidth
              required
              size="small"
              error={!name.trim()}
              helperText={!name.trim() ? 'الاسم مطلوب' : ''}
            />
          </Grid>

          {/* Color */}
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              لون الدور
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map(c => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: color === c ? `3px solid #fff` : '2px solid transparent',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                    transition: 'transform 0.15s',
                    '&:hover': { transform: 'scale(1.2)' },
                  }}
                />
              ))}
            </Box>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              label="وصف الدور (اختياري)"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Grid>

          {/* Permissions */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              الصلاحيات
              <Chip
                label={`${selectedPerms.size} محددة`}
                size="small"
                sx={{ ml: 1, bgcolor: alpha(color, 0.15), color }}
              />
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {PERMISSION_MODULES.map(module => {
                const allGranted = module.permissions.every(p => selectedPerms.has(p.key));
                const someGranted = module.permissions.some(p => selectedPerms.has(p.key));
                return (
                  <Box
                    key={module.key}
                    sx={{
                      border: `1px solid ${alpha(module.color, 0.3)}`,
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: alpha(module.color, 0.02),
                    }}
                  >
                    {/* Module toggle */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={allGranted}
                          indeterminate={someGranted && !allGranted}
                          onChange={() => toggleModule(module)}
                          sx={{ color: module.color, '&.Mui-checked': { color: module.color } }}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" fontWeight={700} color={module.color}>
                          {module.label}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, pl: 4 }}>
                      {module.permissions.map(perm => {
                        const risk = RISK_CONFIG[perm.risk] || RISK_CONFIG.low;
                        const granted = selectedPerms.has(perm.key);
                        return (
                          <Chip
                            key={perm.key}
                            label={perm.label}
                            size="small"
                            onClick={() => togglePerm(perm.key)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: granted ? alpha(risk.color, 0.15) : 'action.hover',
                              color: granted ? risk.color : 'text.secondary',
                              border: `1px solid ${granted ? alpha(risk.color, 0.4) : 'transparent'}`,
                              fontWeight: granted ? 600 : 400,
                              '&:hover': { bgcolor: alpha(risk.color, 0.2) },
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim()}
          sx={{ bgcolor: color, '&:hover': { bgcolor: alpha(color, 0.85) } }}
        >
          {isClone ? 'استنساخ' : editingRole ? 'حفظ' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleFormDialog;
