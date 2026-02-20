// Predictions Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import predictionsService from '../../services/predictionsService';

export const fetchSalesPrediction = createAsyncThunk(
  'predictions/fetchSales',
  async historicalData => {
    return await predictionsService.getSalesPrediction(historicalData);
  }
);

export const fetchDemandForecast = createAsyncThunk(
  'predictions/fetchDemand',
  async ({ productId, period }) => {
    return await predictionsService.getDemandForecast(productId, period);
  }
);

export const trainModel = createAsyncThunk(
  'predictions/trainModel',
  async ({ modelType, trainingData }) => {
    return await predictionsService.trainModel(modelType, trainingData);
  }
);

const predictionsSlice = createSlice({
  name: 'predictions',
  initialState: {
    salesPrediction: null,
    demandForecast: null,
    models: [],
    loading: false,
    training: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchSalesPrediction.pending, state => {
        state.loading = true;
      })
      .addCase(fetchSalesPrediction.fulfilled, (state, action) => {
        state.loading = false;
        state.salesPrediction = action.payload;
      })
      .addCase(fetchSalesPrediction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchDemandForecast.fulfilled, (state, action) => {
        state.demandForecast = action.payload;
      })
      .addCase(trainModel.pending, state => {
        state.training = true;
      })
      .addCase(trainModel.fulfilled, (state, action) => {
        state.training = false;
        state.models.push(action.payload);
      })
      .addCase(trainModel.rejected, (state, action) => {
        state.training = false;
        state.error = action.error.message;
      });
  },
});

export const { clearError } = predictionsSlice.actions;
export default predictionsSlice.reducer;
