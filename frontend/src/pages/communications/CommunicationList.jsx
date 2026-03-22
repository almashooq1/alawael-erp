/**
 * CommunicationList — Scrollable message list with actions
 */

import { Fragment } from 'react';
import {
  Card,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Chip,
  Tooltip,
  Divider,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import {
  COMMUNICATION_TYPES,
  COMMUNICATION_STATUS,
  PRIORITY_LEVELS,
} from './communicationsConstants';

const CommunicationList = ({
  communications,
  loading,
  setSelectedCommunication,
  handleToggleStar,
  handleArchive,
  handleDelete,
  formatDate,
}) => (
  <Card>
    {loading && <LinearProgress />}
    <List>
      {communications.length === 0 ? (
        <ListItem>
          <ListItemText
            primary="لا توجد مراسلات"
            secondary="ابدأ بإنشاء مراسلة جديدة"
            sx={{ textAlign: 'center', py: 4 }}
          />
        </ListItem>
      ) : (
        communications.map((comm, index) => (
          <Fragment key={comm.id}>
            {index > 0 && <Divider />}
            <ListItem
              button
              onClick={() => setSelectedCommunication(comm)}
              sx={{
                bgcolor: !comm.isRead ? 'action.hover' : 'transparent',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <ListItemAvatar>
                <Badge badgeContent={comm.attachmentsCount} color="primary" invisible={!comm.attachmentsCount}>
                  <Avatar sx={{ bgcolor: COMMUNICATION_TYPES[comm.type]?.color + '.main' || 'grey.500' }}>
                    {COMMUNICATION_TYPES[comm.type]?.icon || <EmailIcon />}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: !comm.isRead ? 'bold' : 'normal', flex: 1 }}
                    >
                      {comm.subject || 'بدون موضوع'}
                    </Typography>
                    {comm.priority !== 'normal' && (
                      <Chip
                        size="small"
                        label={PRIORITY_LEVELS[comm.priority]?.label}
                        color={PRIORITY_LEVELS[comm.priority]?.color}
                      />
                    )}
                    {comm.requiresReply && (
                      <Tooltip title="يتطلب رد">
                        <ReplyIcon fontSize="small" color="warning" />
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {comm.content}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={COMMUNICATION_STATUS[comm.status]?.label}
                        color={COMMUNICATION_STATUS[comm.status]?.color}
                        icon={COMMUNICATION_STATUS[comm.status]?.icon}
                      />
                      <Chip size="small" label={comm.recipientName} variant="outlined" />
                      <Chip size="small" label={formatDate(comm.createdAt)} variant="outlined" />
                      {comm.referenceNumber && (
                        <Chip
                          size="small"
                          label={`#${comm.referenceNumber}`}
                          variant="outlined"
                          color="primary"
                        />
                      )}
                    </Box>
                  </Box>
                }
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                <IconButton size="small" aria-label="تبديل النجمة" onClick={e => { e.stopPropagation(); handleToggleStar(comm.id); }}>
                  {comm.starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                </IconButton>
                <IconButton size="small" aria-label="أرشفة" onClick={e => { e.stopPropagation(); handleArchive(comm.id); }}>
                  <ArchiveIcon />
                </IconButton>
                <IconButton size="small" aria-label="حذف" onClick={e => { e.stopPropagation(); handleDelete(comm.id); }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ListItem>
          </Fragment>
        ))
      )}
    </List>
  </Card>
);

export default CommunicationList;
