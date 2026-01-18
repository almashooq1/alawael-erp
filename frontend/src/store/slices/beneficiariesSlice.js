// Redux Slice للمستفيدين - Beneficiaries Slice

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// جلب قائمة المستفيدين
export const fetchBeneficiaries = createAsyncThunk('beneficiaries/fetchBeneficiaries', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get('/beneficiaries', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// جلب مستفيد واحد
export const fetchBeneficiaryById = createAsyncThunk('beneficiaries/fetchBeneficiaryById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/beneficiaries/${id}`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// إضافة مستفيد جديد
export const createBeneficiary = createAsyncThunk('beneficiaries/createBeneficiary', async (beneficiaryData, { rejectWithValue }) => {
  try {
    const response = await api.post('/beneficiaries', beneficiaryData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// تحديث مستفيد
export const updateBeneficiary = createAsyncThunk('beneficiaries/updateBeneficiary', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/beneficiaries/${id}`, data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// حذف مستفيد
export const deleteBeneficiary = createAsyncThunk('beneficiaries/deleteBeneficiary', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/beneficiaries/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

// جلب إحصائيات مستفيد
export const fetchBeneficiaryStats = createAsyncThunk('beneficiaries/fetchBeneficiaryStats', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/beneficiaries/${id}/stats`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message);
  }
});

const initialState = {
  beneficiaries: [],
  currentBeneficiary: null,
  stats: null,
  pagination: {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const beneficiariesSlice = createSlice({
  name: 'beneficiaries',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearCurrentBeneficiary: state => {
      state.currentBeneficiary = null;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch Beneficiaries
      .addCase(fetchBeneficiaries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBeneficiaries.fulfilled, (state, action) => {
        state.loading = false;
        state.beneficiaries = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBeneficiaries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Beneficiary By ID
      .addCase(fetchBeneficiaryById.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBeneficiaryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBeneficiary = action.payload.data;
      })
      .addCase(fetchBeneficiaryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Beneficiary
      .addCase(createBeneficiary.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBeneficiary.fulfilled, (state, action) => {
        state.loading = false;
        state.beneficiaries.unshift(action.payload.data);
      })
      .addCase(createBeneficiary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Beneficiary
      .addCase(updateBeneficiary.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBeneficiary.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.beneficiaries.findIndex(b => b.id === action.payload.data.id);
        if (index !== -1) {
          state.beneficiaries[index] = action.payload.data;
        }
        state.currentBeneficiary = action.payload.data;
      })
      .addCase(updateBeneficiary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Beneficiary
      .addCase(deleteBeneficiary.fulfilled, (state, action) => {
        state.beneficiaries = state.beneficiaries.filter(b => b.id !== action.payload);
      })

      // Fetch Stats
      .addCase(fetchBeneficiaryStats.fulfilled, (state, action) => {
        state.stats = action.payload.data;
      });
  },
});

export const { clearError, clearCurrentBeneficiary } = beneficiariesSlice.actions;
export default beneficiariesSlice.reducer;
