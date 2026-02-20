// Integrations Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import integrationsService from '../../services/integrationsService';

export const fetchIntegrations = createAsyncThunk('integrations/fetchAll', async () => {
  return await integrationsService.getIntegrations();
});

export const connectIntegration = createAsyncThunk(
  'integrations/connect',
  async integrationData => {
    return await integrationsService.connectIntegration(integrationData);
  }
);

export const testIntegration = createAsyncThunk('integrations/test', async integrationId => {
  return await integrationsService.testIntegration(integrationId);
});

export const disconnectIntegration = createAsyncThunk(
  'integrations/disconnect',
  async integrationId => {
    return await integrationsService.disconnectIntegration(integrationId);
  }
);

const integrationsSlice = createSlice({
  name: 'integrations',
  initialState: {
    integrations: [],
    syncHistory: [],
    loading: false,
    testing: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchIntegrations.pending, state => {
        state.loading = true;
      })
      .addCase(fetchIntegrations.fulfilled, (state, action) => {
        state.loading = false;
        state.integrations = action.payload;
      })
      .addCase(fetchIntegrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(connectIntegration.fulfilled, (state, action) => {
        state.integrations.push(action.payload);
      })
      .addCase(testIntegration.pending, state => {
        state.testing = true;
      })
      .addCase(testIntegration.fulfilled, (state, action) => {
        state.testing = false;
        state.syncHistory.push(action.payload);
      })
      .addCase(disconnectIntegration.fulfilled, (state, action) => {
        state.integrations = state.integrations.filter(i => i.id !== action.payload);
      });
  },
});

export const { clearError } = integrationsSlice.actions;
export default integrationsSlice.reducer;
