/**
 * Dashboard reducer & initial state
 * Extracted from AdvancedDashboard monolith
 */

/** Lightweight fallback while lazy chunks load */
import { Skeleton } from '@mui/material';
export const SectionSkeleton = ({ height = 200 }) => (
  <Skeleton variant="rounded" animation="wave" sx={{ borderRadius: 4, height, width: '100%' }} />
);

export const initialState = cached => ({
  data: cached,
  loading: !cached,
  error: null,
  lastUpdated: null,
  refreshing: false,
  showScrollTop: false,
  activeSection: 'finance',
  refreshProgress: 0,
  socketToast: null, // 'connected' | 'disconnected' | null
  dataSource: cached ? 'cache' : 'api', // 'cache' | 'api' | 'socket'
  collapsedSections: {}, // { [sectionId]: true }
  sessionStart: Date.now(), // for session duration
  searchQuery: '', // section filter query
});

export const dashboardReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        refreshing: action.isRefresh,
        loading: !action.isRefresh && state.loading,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        data: action.data,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date(),
        dataSource: 'api',
      };
    case 'FETCH_ERROR':
      return { ...state, error: action.error, loading: false, refreshing: false };
    case 'SET_DATA':
      return { ...state, data: action.data };
    case 'SET_DATA_SOURCE':
      return {
        ...state,
        dataSource: action.source,
        ...(action.lastUpdated ? { lastUpdated: action.lastUpdated } : {}),
      };
    case 'SCROLL_UPDATE':
      return { ...state, showScrollTop: action.showScrollTop, activeSection: action.activeSection };
    case 'SET_REFRESH_PROGRESS':
      return { ...state, refreshProgress: action.value };
    case 'SET_SOCKET_TOAST':
      return { ...state, socketToast: action.value };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'TOGGLE_SECTION':
      return {
        ...state,
        collapsedSections: {
          ...state.collapsedSections,
          [action.id]: !state.collapsedSections[action.id],
        },
      };
    case 'TOGGLE_ALL_SECTIONS': {
      const allIds = action.sectionIds || [];
      const allCollapsed = allIds.every(id => state.collapsedSections[id]);
      const next = {};
      allIds.forEach(id => {
        next[id] = !allCollapsed;
      });
      return { ...state, collapsedSections: next };
    }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.value };
    default:
      return state;
  }
};
