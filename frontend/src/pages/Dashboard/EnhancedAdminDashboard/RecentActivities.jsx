

/** Recent activities feed card */
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography
} from '@mui/material';
import ArrowForward from '@mui/icons-material/ArrowForward';
const RecentActivities = ({ recentActivities }) => (
  <Card elevation={3}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          النشاطات الأخيرة
        </Typography>
        <Button size="small" endIcon={<ArrowForward />}>
          عرض الكل
        </Button>
      </Box>
      <List>
        {recentActivities.map((activity) => (
          <ListItem
            key={activity.id}
            disablePadding
            sx={{
              mb: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemButton>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: activity.color }}>
                  {activity.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={activity.title}
                secondary={
                  <>
                    <Typography component="span" variant="body2">
                      {activity.description}
                    </Typography>
                    <br />
                    <Typography component="span" variant="caption" color="text.secondary">
                      {activity.time}
                    </Typography>
                  </>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
);

export default RecentActivities;
