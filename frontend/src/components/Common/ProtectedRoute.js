// frontend/src/components/Common/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading indicator while authentication state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Always render the protected component - access control happens inside
  return children;
};

export default ProtectedRoute;