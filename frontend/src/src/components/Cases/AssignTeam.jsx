import React, { useState } from 'react';
import { Box, Card, CardContent, List, ListItem, ListItemText, Typography, Button, Dialog, DialogTitle, DialogContent, Stack, TextField, Checkbox, FormControlLabel } from '@mui/material';

/**
 * AssignTeam
 * الوصف: واجهة لتعيين أعضاء الفريق الطبي للحالة
 */
function AssignTeam({ caseId, onAssign, onClose }) {
  const [selectedMembers, setSelectedMembers] = useState([]);

  const teamRoles = [
    'case_manager',
    'physical_therapist',
    'occupational_therapist',
    'speech_therapist',
    'psychologist',
    'social_worker',
  ];

  const handleToggleMember = (role) => {
    setSelectedMembers(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>👥 تعيين الفريق الطبي</Typography>
      <Stack spacing={2}>
        {teamRoles.map(role => (
          <FormControlLabel
            key={role}
            control={
              <Checkbox
                checked={selectedMembers.includes(role)}
                onChange={() => handleToggleMember(role)}
              />
            }
            label={role}
          />
        ))}
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={onClose}>إلغاء</Button>
          <Button variant="contained" onClick={() => onAssign(selectedMembers)}>
            تعيين
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default AssignTeam;
