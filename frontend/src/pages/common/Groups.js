import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';




import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from 'contexts/SnackbarContext';
import groupsService from 'services/groupsService';
import { gradients } from '../../theme/palette';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';

const Groups = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
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
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load groups and contacts from backend
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, contactsRes] = await Promise.all([
        groupsService.getAll(),
        groupsService.getContacts(),
      ]);
      const groupsList = groupsRes?.data || groupsRes || [];
      const contactsList = contactsRes?.data || contactsRes || [];
      setGroups(groupsList);
      setFilteredGroups(groupsList);
      setContacts(contactsList);
    } catch (err) {
      showSnackbar('خطأ في تحميل المجموعات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter groups based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(
        group =>
          (group.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (group.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  }, [searchTerm, groups]);

  const handleCreateGroup = async () => {
    try {
      const res = await groupsService.create({
        name: newGroup.name,
        description: newGroup.description,
        members: newGroup.members,
      });
      const created = res?.data || res;
      setGroups(prev => [...prev, created]);
      setNewGroup({ name: '', description: '', members: [] });
      setOpenCreateDialog(false);
      showSnackbar('تم إنشاء المجموعة بنجاح', 'success');
    } catch (err) {
      showSnackbar('خطأ في إنشاء المجموعة', 'error');
    }
  };

  const handleViewGroup = group => {
    setSelectedGroup(group);
    setOpenViewDialog(true);
  };

  const handleAddMember = () => {
    if (!newMemberEmail) return;

    const contact = contacts.find(c => c.email === newMemberEmail);
    if (contact && !newGroup.members.some(m => m.email === contact.email)) {
      setNewGroup({
        ...newGroup,
        members: [...newGroup.members, contact],
      });
    }
    setNewMemberEmail('');
  };

  const handleRemoveMember = memberId => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من إزالة هذا العضو من المجموعة؟',
      confirmText: 'إزالة',
      confirmColor: 'error',
      onConfirm: async () => {
        setNewGroup({
          ...newGroup,
          members: newGroup.members.filter(m => (m._id || m.id) !== memberId),
        });
      },
    });
  };

  const handleNavigateToGroup = groupId => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GroupIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة المجموعات
            </Typography>
            <Typography variant="body2">تنظيم وإدارة مجموعات العمل والتأهيل</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          المجموعات
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, py: 1 }}
        >
          مجموعة جديدة
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="البحث في المجموعات..."
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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {filteredGroups.map(group => (
          <Grid item xs={12} sm={6} md={4} key={group._id || group.id}>
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
              onClick={() => handleNavigateToGroup(group._id || group.id)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                    {group.name}
                  </Typography>
                </Box>
                <IconButton
                  aria-label="إجراء"
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

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 'auto',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {Array.isArray(group.members) ? group.members.length : group.members} عضو
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(group.totalExpenses || 0).toFixed(2)} ر.س
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Create Group Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم المجموعة"
            fullWidth
            variant="outlined"
            value={newGroup.name}
            onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="الوصف (اختياري)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newGroup.description}
            onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            إضافة أعضاء
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="member-select-label">اختيار جهة اتصال</InputLabel>
              <Select
                labelId="member-select-label"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                label="اختيار جهة اتصال"
                size="small"
              >
                {contacts
                  .filter(contact => !newGroup.members.some(m => m.email === contact.email))
                  .map(contact => (
                    <MenuItem key={contact._id || contact.id} value={contact.email}>
                      {contact.name} ({contact.email})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleAddMember}
              disabled={!newMemberEmail}
              sx={{ minWidth: '120px' }}
            >
              إضافة
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
                key={member._id || member.id}
                avatar={<Avatar>{(member.name || '?').charAt(0)}</Avatar>}
                label={member.name}
                onDelete={() => handleRemoveMember(member._id || member.id)}
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
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!newGroup.name.trim()}>
            إنشاء المجموعة
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Group Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedGroup && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon color="primary" sx={{ mr: 1 }} />
                  {selectedGroup.name}
                </Box>
                <IconButton aria-label="إغلاق" onClick={() => setOpenViewDialog(false)}>
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
                  أعضاء المجموعة ({(selectedGroup.members || []).length})
                </Typography>
                <List dense>
                  {(selectedGroup.members || []).map((member, idx) => (
                    <ListItem key={member._id || member.user || idx} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar>{(member.name || '?').charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.name}
                        secondary={member.email}
                        primaryTypographyProps={{
                          fontWeight: member.role === 'admin' ? 'medium' : 'regular',
                        }}
                      />
                      {member.role === 'admin' && (
                        <Chip label="مشرف" size="small" color="primary" variant="outlined" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    showSnackbar('سيتم إضافة هذه الميزة قريباً', 'info');
                  }}
                >
                  إضافة أعضاء
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setOpenViewDialog(false);
                    handleNavigateToGroup(selectedGroup._id || selectedGroup.id);
                  }}
                >
                  عرض المجموعة
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
      <ConfirmDialog {...confirmState} />
    </Box>
  );
};

export default Groups;
