// Support Slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supportService from '../../services/supportService';

export const fetchTickets = createAsyncThunk('support/fetchTickets', async () => {
  return await supportService.getTickets();
});

export const createTicket = createAsyncThunk('support/create', async ticketData => {
  return await supportService.createTicket(ticketData);
});

export const updateTicket = createAsyncThunk('support/update', async ({ ticketId, ticketData }) => {
  return await supportService.updateTicket(ticketId, ticketData);
});

export const closeTicket = createAsyncThunk('support/close', async ticketId => {
  return await supportService.closeTicket(ticketId);
});

const supportSlice = createSlice({
  name: 'support',
  initialState: {
    tickets: [],
    faqs: [],
    selectedTicket: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedTicket: (state, action) => {
      state.selectedTicket = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchTickets.pending, state => {
        state.loading = true;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.tickets.push(action.payload);
      })
      .addCase(updateTicket.fulfilled, (state, action) => {
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
      })
      .addCase(closeTicket.fulfilled, (state, action) => {
        const ticket = state.tickets.find(t => t.id === action.payload.id);
        if (ticket) {
          ticket.status = 'closed';
        }
      });
  },
});

export const { setSelectedTicket, clearError } = supportSlice.actions;
export default supportSlice.reducer;
