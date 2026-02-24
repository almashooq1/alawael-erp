import React, { useState } from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, Avatar, AvatarGroup, Chip, Button 
} from '@mui/material';
import { AccessTime, CalendarToday } from '@mui/icons-material';

const mockGroups = [
  { id: 1, name: 'Social Skills - Juniors', type: 'SOCIAL', count: 5, time: 'Mon/Wed 10:00 AM' },
  { id: 2, name: 'Vocational Training A', type: 'VOCATIONAL', count: 8, time: 'Sun/Thu 01:00 PM' },
  { id: 3, name: 'Anger Management', type: 'BEHAVIORAL', count: 4, time: 'Tue 11:00 AM' },
];

function GroupProgramsList() {
  return (
    <Grid container spacing={3}>
      {mockGroups.map((group) => (
        <Grid item xs={12} md={6} lg={4} key={group.id}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Chip label={group.type} color="primary" variant="outlined" size="small" />
                <Typography variant="caption" color="text.secondary">ID: {group.id}</Typography>
              </Box>
              
              <Typography variant="h6" gutterBottom>{group.name}</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                <CalendarToday fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">{group.time}</Typography>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <AvatarGroup max={4}>
                  <Avatar sx={{ bgcolor: 'orange' }}>A</Avatar>
                  <Avatar sx={{ bgcolor: 'purple' }}>B</Avatar>
                  <Avatar sx={{ bgcolor: 'green' }}>C</Avatar>
                  <Avatar>+{group.count - 3}</Avatar>
                </AvatarGroup>
                <Button size="small" variant="outlined">Manage</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default GroupProgramsList;
