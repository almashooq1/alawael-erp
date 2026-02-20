// RBAC Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import rbacService from '../../services/rbacService';

export const fetchRoles = createAsyncThunk('rbac/fetchRoles', async () => {
  return await rbacService.getRoles();
});

export const createRole = createAsyncThunk('rbac/create', async roleData => {
  return await rbacService.createRole(roleData);
});

export const updateRole = createAsyncThunk('rbac/update', async ({ roleId, roleData }) => {
  return await rbacService.updateRole(roleId, roleData);
});

export const deleteRole = createAsyncThunk('rbac/delete', async roleId => {
  await rbacService.deleteRole(roleId);
  return roleId;
});

const rbacSlice = createSlice({
  name: 'rbac',
  initialState: {
    roles: [],
    permissions: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchRoles.pending, state => {
        state.loading = true;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.roles.push(action.payload);
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        const index = state.roles.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.roles[index] = action.payload;
        }
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.roles = state.roles.filter(r => r.id !== action.payload);
      });
  },
});

export const { clearError } = rbacSlice.actions;
export default rbacSlice.reducer;
