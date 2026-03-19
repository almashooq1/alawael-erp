import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box } from '@material-ui/core';

const ProtectedRoute = ({ children, requiredPortal }) => {
  const { isAuthenticated, portal, loading } = useSelector((state) => state.auth);

  // Check authentication status from localStorage as fallback
  const token = localStorage.getItem('authToken');
  const userPortal = localStorage.getItem('userPortal');

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Allow access if authenticated and portal matches
  if ((isAuthenticated || token) && (portal === requiredPortal || userPortal === requiredPortal)) {
    return children;
  }

  // Redirect to login if not authenticated
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
