/**
 * Licenses Redux Slice - Mobile App
 * شريحة الرخص Redux - تطبيق الهاتف الذكي
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import mobileApiService from '../../services/mobileApiService';

export const fetchLicenses = createAsyncThunk('licenses/fetchLicenses', async (_, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.get('/licenses', { cache: true });
    return response;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchLicenseDetail = createAsyncThunk('licenses/fetchLicenseDetail', async (licenseId, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.get(`/licenses/${licenseId}`);
    return response;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const renewLicense = createAsyncThunk('licenses/renewLicense', async (licenseId, { rejectWithValue }) => {
  try {
    const response = await mobileApiService.post(`/licenses/${licenseId}/renew`, {});
    return response;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  data: [],
  selectedLicense: null,
  loading: false,
  error: null,
  filters: {
    status: 'all',
    type: 'all',
    sortBy: 'expiryDate',
  },
};

const licensesSlice = createSlice({
  name: 'licenses',
  initialState,
  reducers: {
    setLicenses: (state, action) => {
      state.data = action.payload;
    },
    setSelectedLicense: (state, action) => {
      state.selectedLicense = action.payload;
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchLicenses.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLicenses.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchLicenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLicenseDetail.pending, state => {
        state.loading = true;
      })
      .addCase(fetchLicenseDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedLicense = action.payload;
      })
      .addCase(fetchLicenseDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(renewLicense.pending, state => {
        state.loading = true;
      })
      .addCase(renewLicense.fulfilled, (state, action) => {
        state.loading = false;
        // Update the license in the data array
        const index = state.data.findIndex(l => l.id === action.payload.id);
        if (index !== -1) {
          state.data[index] = action.payload;
        }
        state.selectedLicense = action.payload;
      })
      .addCase(renewLicense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setLicenses, setSelectedLicense, updateFilters, clearError } = licensesSlice.actions;
export default licensesSlice.reducer;
