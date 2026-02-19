import React from 'react';
import { Box, Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText, Stack } from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';

/**
 * CaseNotes
 * الوصف: لوحة الملاحظات والتعليقات على الحالة
 */
function CaseNotes({ caseData }) {
  const notes = caseData.teamNotes || [];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>📝 الملاحظات الأخيرة</Typography>
        {notes.length > 0 ? (
          <List>
            {notes.slice(-5).reverse().map((note, idx) => (
              <ListItem key={idx} sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemIcon>
                  <CommentIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={note.content}
                  secondary={`${note.author?.name} - ${new Date(note.createdAt).toLocaleDateString('ar-SA')}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            لا توجد ملاحظات
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default CaseNotes;
