import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';

/**
 * EditCase
 * الوصف: نموذج تعديل الحالة الموجودة
 */
function EditCase({ caseData, onSave, onClose }) {
  const [formData, setFormData] = useState(caseData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="ملاحظات"
          multiline
          rows={4}
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, notes: e.target.value }))
          }
        />
        <Stack direction="row" spacing={2}>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            حفظ التغييرات
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default EditCase;
