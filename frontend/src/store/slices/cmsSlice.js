// CMS Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import cmsService from '../../services/cmsService';

export const fetchContent = createAsyncThunk('cms/fetchContent', async () => {
  return await cmsService.getContent();
});

export const createContent = createAsyncThunk('cms/create', async contentData => {
  return await cmsService.createContent(contentData);
});

export const updateContent = createAsyncThunk('cms/update', async ({ contentId, contentData }) => {
  return await cmsService.updateContent(contentId, contentData);
});

export const deleteContent = createAsyncThunk('cms/delete', async contentId => {
  await cmsService.deleteContent(contentId);
  return contentId;
});

const cmsSlice = createSlice({
  name: 'cms',
  initialState: {
    content: [],
    media: [],
    selectedContent: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedContent: (state, action) => {
      state.selectedContent = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchContent.pending, state => {
        state.loading = true;
      })
      .addCase(fetchContent.fulfilled, (state, action) => {
        state.loading = false;
        state.content = action.payload;
      })
      .addCase(fetchContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createContent.fulfilled, (state, action) => {
        state.content.push(action.payload);
      })
      .addCase(updateContent.fulfilled, (state, action) => {
        const index = state.content.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.content[index] = action.payload;
        }
      })
      .addCase(deleteContent.fulfilled, (state, action) => {
        state.content = state.content.filter(c => c.id !== action.payload);
      });
  },
});

export const { setSelectedContent, clearError } = cmsSlice.actions;
export default cmsSlice.reducer;
