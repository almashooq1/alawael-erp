import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Mock data - in a real app, this would come from an API
const mockGroups = [
  {
    id: 1,
    name: 'Roommates',
    members: 4,
    totalExpenses: 1250.75,
    description: 'Shared apartment expenses',
    createdBy: 'You',
    createdAt: '2023-01-15',
    membersList: [
      { id: 1, name: 'You', email: 'user@example.com' },
      { id: 2, name: 'Alex Johnson', email: 'alex@example.com' },
      { id: 3, name: 'Maria Garcia', email: 'maria@example.com' },
      { id: 4, name: 'Sam Wilson', email: 'sam@example.com' },
    ],
  },
  {
    id: 2,
    name: 'Trip to Paris',
    members: 6,
    totalExpenses: 3250.2,
    description: 'Summer 2023 trip expenses',
    createdBy: 'Maria Garcia',
    createdAt: '2023-05-22',
    membersList: [
      { id: 1, name: 'You', email: 'user@example.com' },
      { id: 2, name: 'Alex Johnson', email: 'alex@example.com' },
      { id: 3, name: 'Maria Garcia', email: 'maria@example.com' },
      { id: 4, name: 'Sam Wilson', email: 'sam@example.com' },
      { id: 5, name: 'Taylor Smith', email: 'taylor@example.com' },
      { id: 6, name: 'Jordan Lee', email: 'jordan@example.com' },
    ],
  },
  {
    id: 3,
    name: 'Work Team Lunch',
    members: 8,
    totalExpenses: 480.5,
    description: 'Monthly team lunch expenses',
    createdBy: 'Alex Johnson',
    createdAt: '2023-06-10',
    membersList: [
      { id: 1, name: 'You', email: 'user@example.com' },
      { id: 2, name: 'Alex Johnson', email: 'alex@example.com' },
      { id: 3, name: 'Maria Garcia', email: 'maria@example.com' },
      { id: 4, name: 'Sam Wilson', email: 'sam@example.com' },
      { id: 7, name: 'Chris Brown', email: 'chris@example.com' },
      { id: 8, name: 'Jamie Doe', email: 'jamie@example.com' },
      { id: 9, name: 'Riley Taylor', email: 'riley@example.com' },
      { id: 10, name: 'Casey Kim', email: 'casey@example.com' },
    ],
  },
];

// Mock contacts - in a real app, this would come from an API
const mockContacts = [
  { id: 1, name: 'Alex Johnson', email: 'alex@example.com' },
  { id: 2, name: 'Maria Garcia', email: 'maria@example.com' },
  { id: 3, name: 'Sam Wilson', email: 'sam@example.com' },
  { id: 4, name: 'Taylor Smith', email: 'taylor@example.com' },
  { id: 5, name: 'Jordan Lee', email: 'jordan@example.com' },
  { id: 6, name: 'Chris Brown', email: 'chris@example.com' },
  { id: 7, name: 'Jamie Doe', email: 'jamie@example.com' },
  { id: 8, name: 'Riley Taylor', email: 'riley@example.com' },
  { id: 9, name: 'Casey Kim', email: 'casey@example.com' },
];

const Groups = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState(mockGroups);
  const [filteredGroups, setFilteredGroups] = useState(mockGroups);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    members: [],
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [contacts] = useState(mockContacts);

  // Filter groups based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(
        group =>
          group.name.toLowerCase().includes(searchTerm.toLowerCase()) || group.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredGroups(filtered);
    }
  }, [searchTerm, groups]);

  const handleCreateGroup = () => {
    // In a real app, this would be an API call
    const newGroupObj = {
      id: Math.max(...groups.map(g => g.id), 0) + 1,
      name: newGroup.name,
      description: newGroup.description,
      members: newGroup.members.length + 1, // +1 for the current user
      totalExpenses: 0,
      createdBy: 'You',
      createdAt: new Date().toISOString().split('T')[0],
      membersList: [{ id: currentUser.id, name: currentUser.name, email: currentUser.email }, ...newGroup.members],
    };

    setGroups([...groups, newGroupObj]);
    setNewGroup({ name: '', description: '', members: [] });
    setOpenCreateDialog(false);
  };

  const handleViewGroup = group => {
    setSelectedGroup(group);
    setOpenViewDialog(true);
  };

  const handleAddMember = () => {
    if (!newMemberEmail) return;

    const contact = contacts.find(c => c.email === newMemberEmail);
    if (contact && !newGroup.members.some(m => m.id === contact.id)) {
      setNewGroup({
        ...newGroup,
        members: [...newGroup.members, contact],
      });
    }
    setNewMemberEmail('');
  };

  const handleRemoveMember = memberId => {
    setNewGroup({
      ...newGroup,
      members: newGroup.members.filter(m => m.id !== memberId),
    });
  };

  const handleNavigateToGroup = groupId => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, py: 1 }}
        >
          New Group
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
        />
      </Paper>

      <Grid container spacing={3}>
        {filteredGroups.map(group => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => handleNavigateToGroup(group.id)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                    {group.name}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    handleViewGroup(group);
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                {group.description}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                <Typography variant="body2" color="text.secondary">
                  {group.members} {group.members === 1 ? 'member' : 'members'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ${group.totalExpenses.toFixed(2)} total
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Create Group Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={newGroup.name}
            onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newGroup.description}
            onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Add Members
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="member-select-label">Select Contact</InputLabel>
              <Select
                labelId="member-select-label"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                label="Select Contact"
                size="small"
              >
                {contacts
                  .filter(contact => !newGroup.members.some(m => m.id === contact.id))
                  .map(contact => (
                    <MenuItem key={contact.id} value={contact.email}>
                      {contact.name} ({contact.email})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleAddMember} disabled={!newMemberEmail} sx={{ minWidth: '120px' }}>
              Add
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {/* Current User */}
            <Chip
              avatar={<Avatar>{currentUser?.name?.charAt(0) || 'U'}</Avatar>}
              label={currentUser?.name || 'You'}
              color="primary"
              variant="outlined"
              sx={{ height: 'auto', '& .MuiChip-label': { py: 1 } }}
            />

            {/* Added Members */}
            {newGroup.members.map(member => (
              <Chip
                key={member.id}
                avatar={<Avatar>{member.name.charAt(0)}</Avatar>}
                label={member.name}
                onDelete={() => handleRemoveMember(member.id)}
                sx={{ height: 'auto', '& .MuiChip-label': { py: 1 } }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenCreateDialog(false);
              setNewGroup({ name: '', description: '', members: [] });
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!newGroup.name.trim()}>
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Group Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        {selectedGroup && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  {selectedGroup.name}
                </Box>
                <IconButton onClick={() => setOpenViewDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedGroup.description}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Group Members ({selectedGroup.membersList.length})
                </Typography>
                <List dense>
                  {selectedGroup.membersList.map(member => (
                    <ListItem key={member.id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar>{member.name.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.name}
                        secondary={member.email}
                        primaryTypographyProps={{
                          fontWeight: member.id === 1 ? 'medium' : 'regular',
                        }}
                      />
                      {member.id === 1 && <Chip label="You" size="small" color="primary" variant="outlined" />}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    // In a real app, this would open an add member dialog
                    alert('Add member functionality would go here');
                  }}
                >
                  Add Members
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setOpenViewDialog(false);
                    handleNavigateToGroup(selectedGroup.id);
                  }}
                >
                  View Group
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Groups;
