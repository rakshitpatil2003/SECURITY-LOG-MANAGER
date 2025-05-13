// Create a new file: frontend/src/components/Common/AccessControl.js
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

const AccessControl = ({ requiredRoles, children }) => {
  const { currentUser } = useAuth();
  const [open, setOpen] = React.useState(false);

  // Check if user has any of the required roles
  const hasAccess = () => {
    if (!currentUser || !currentUser.roles) return false;
    return requiredRoles.some(role => 
      currentUser.roles.includes(role) || 
      (currentUser.clientRoles && currentUser.clientRoles.includes(role))
    );
  };

  React.useEffect(() => {
    // Show dialog if user doesn't have access
    if (!hasAccess()) {
      setOpen(true);
    }
  }, [currentUser]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {hasAccess() ? children : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body1">
            You need higher permissions to access this feature.
          </Typography>
        </Box>
      )}
      
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <LockIcon color="warning" sx={{ mr: 1 }} />
          Premium Feature Access
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This feature requires higher access privileges. You currently do not have the required roles to access this functionality.
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Required roles: {requiredRoles.join(', ')}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
            Please upgrade to our Platinum Plan to gain access to this premium feature.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
          <Button variant="contained" color="primary">
            Upgrade Plan
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AccessControl;