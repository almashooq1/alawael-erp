import {
  Avatar,
  Box,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  alpha
} from '@mui/material';

/**
 * TimelineList — Vertical activity timeline.
 *
 * @param {Array}  items — [{id, title, subtitle?, time?, icon?, color?, chip?}]
 * @param {number} [maxItems] — Max items to show
 */
const TimelineList = ({ items = [], maxItems }) => {
  const visibleItems = maxItems ? items.slice(0, maxItems) : items;

  return (
    <List disablePadding>
      {visibleItems.map((item, i) => (
        <ListItem
          key={item.id || i}
          disablePadding
          sx={{
            mb: 1.5,
            position: 'relative',
            pl: 1,
            '&::before': i < visibleItems.length - 1 ? {
              content: '""',
              position: 'absolute',
              left: 23,
              top: 42,
              bottom: -12,
              width: 2,
              backgroundColor: alpha(item.color || '#1E88E5', 0.15),
            } : {},
          }}
        >
          <ListItemAvatar sx={{ minWidth: 44 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: alpha(item.color || '#1E88E5', 0.1),
                color: item.color || '#1E88E5',
              }}
            >
              {item.icon || <DotIcon sx={{ fontSize: 12 }} />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.title}</Typography>
                {item.chip && <Chip label={item.chip} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />}
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', gap: 1, mt: 0.3 }}>
                {item.subtitle && <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>}
                {item.time && <Typography variant="caption" sx={{ color: 'text.disabled' }}>• {item.time}</Typography>}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default TimelineList;
