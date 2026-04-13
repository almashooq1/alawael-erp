/**
 * Global Snackbar Context
 * Provides a centralized toast notification system
 * Replaces all native alert() calls with MUI Snackbar + Alert
 */

import { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const SnackbarContext = createContext(null);

/**
 * Hook to show snackbar notifications
 * @returns {function(string, 'success'|'error'|'warning'|'info'): void}
 *
 * Usage:
 *   const showSnackbar = useSnackbar();
 *   showSnackbar('تمت العملية بنجاح', 'success');
 */
export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}

/**
 * Provider — wrap once in App.js
 */
export function SnackbarProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setState({ open: true, message, severity });
  }, []);

  const handleClose = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setState(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={state.severity} sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
