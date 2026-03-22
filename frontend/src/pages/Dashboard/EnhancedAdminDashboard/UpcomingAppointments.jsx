import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Stack,
} from '@mui/material';
import { Schedule } from '@mui/icons-material';
import { statusColors } from 'theme/palette';

/** Upcoming appointments list card */
const UpcomingAppointments = ({ upcomingAppointments }) => (
  <Card elevation={3}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          المواعيد القادمة
        </Typography>
        <Chip label="اليوم" color="primary" size="small" />
      </Box>
      <List>
        {upcomingAppointments.map((appointment) => (
          <ListItem
            key={appointment.id}
            sx={{
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: statusColors.info }}>
                <Schedule />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={appointment.beneficiary}
              secondary={
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  <Typography variant="body2">
                    {appointment.type} • {appointment.time}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {appointment.therapist}
                  </Typography>
                </Stack>
              }
            />
            <Chip
              label={appointment.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
              color={appointment.status === 'confirmed' ? 'success' : 'warning'}
              size="small"
            />
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
);

export default UpcomingAppointments;
