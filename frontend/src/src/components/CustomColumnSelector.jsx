import React from 'react';
import { Checkbox, FormControlLabel, FormGroup, Button, Box } from '@mui/material';

/**
 * مكون اختيار الأعمدة المخصصة للجدول
 * @param {Array} columns - جميع الأعمدة المتاحة [{id, label, alwaysVisible}]
 * @param {Array} selected - الأعمدة المختارة حالياً (ids)
 * @param {Function} onChange - دالة عند تغيير الأعمدة المختارة
 * @param {Function} onClose - دالة عند إغلاق نافذة الاختيار
 */
const CustomColumnSelector = ({ columns, selected, onChange, onClose }) => {
  const handleToggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(col => col !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Box sx={{ p: 2, minWidth: 220 }}>
      <FormGroup>
        {columns.map(col => (
          <FormControlLabel
            key={col.id}
            control={
              <Checkbox
                checked={selected.includes(col.id) || col.alwaysVisible}
                onChange={() => handleToggle(col.id)}
                disabled={col.alwaysVisible}
              />
            }
            label={col.label}
          />
        ))}
      </FormGroup>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="contained" color="primary" onClick={onClose}>تم</Button>
      </Box>
    </Box>
  );
};

export default CustomColumnSelector;
