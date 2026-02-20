// Users Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import usersService from '../../services/usersService';

export const fetchUsers = createAsyncThunk('users/fetchAll', async params => {
  return await usersService.getUsers(params);
});

export const createUser = createAsyncThunk('users/create', async userData => {
  return await usersService.createUser(userData);
});

export const updateUser = createAsyncThunk('users/update', async ({ userId, userData }) => {
  return await usersService.updateUser(userId, userData);
});

export const deleteUser = createAsyncThunk('users/delete', async userId => {
  await usersService.deleteUser(userId);
  return userId;
});

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    selectedUser: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchUsers.pending, state => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.push(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload);
      });
  },
});

export const { setSelectedUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;
