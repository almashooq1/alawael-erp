import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
import { fetchOrganizations } from '../../services/organizationsService';
import { fetchBranches } from '../../services/branchesService';
import { fetchPermissions } from '../../services/permissionsService';

const OrgBranchPermissionDialog = ({ open, onClose, onSave, initial }) => {
  const [organizations, setOrganizations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [orgId, setOrgId] = useState(initial?.organizationId || '');
  const [branchId, setBranchId] = useState(initial?.branchId || '');
  const [selectedPerms, setSelectedPerms] = useState(initial?.permissions || []);

  useEffect(() => { fetchOrganizations().then(setOrganizations); }, []);
  useEffect(() => { if (orgId) fetchBranches(orgId).then(setBranches); else setBranches([]); }, [orgId]);
  useEffect(() => { fetchPermissions().then(setPermissions); }, []);

  const handleSave = () => {
    onSave({ organizationId: orgId, branchId, permissions: selectedPerms });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>تعيين الصلاحيات على مستوى المؤسسة/الفرع</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>المؤسسة</InputLabel>
          <Select value={orgId} onChange={e => setOrgId(e.target.value)} label="المؤسسة">
            <MenuItem value=""><em>اختر المؤسسة</em></MenuItem>
            {organizations.map(org => <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense" disabled={!orgId}>
          <InputLabel>الفرع</InputLabel>
          <Select value={branchId} onChange={e => setBranchId(e.target.value)} label="الفرع">
            <MenuItem value=""><em>اختر الفرع</em></MenuItem>
            {branches.map(branch => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>الصلاحيات</InputLabel>
          <Select
            multiple
            value={selectedPerms}
            onChange={e => setSelectedPerms(e.target.value)}
            input={<OutlinedInput label="الصلاحيات" />}
            renderValue={selected => selected.map(id => permissions.find(p => p.id === id)?.name).join(', ')}
          >
            {permissions.map(perm => (
              <MenuItem key={perm.id} value={perm.id}>
                <Checkbox checked={selectedPerms.includes(perm.id)} />
                <ListItemText primary={perm.name} secondary={perm.description} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="outlined">إلغاء</Button>
        <Button onClick={handleSave} color="success" variant="contained">حفظ</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrgBranchPermissionDialog;
