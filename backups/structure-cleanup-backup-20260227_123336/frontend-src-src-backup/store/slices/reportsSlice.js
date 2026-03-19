// Minimal stub for reportsSlice to fix import error in store/index.js for tests
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reports: [],
  loading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
});

export default reportsSlice.reducer;
