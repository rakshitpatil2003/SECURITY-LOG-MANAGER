import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert
} from '@mui/material';

const PasswordVerificationDialog = ({ open, onClose, onConfirm, title }) => {
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(password);
    setPassword(''); // Reset password field
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title || 'Verify Your Password'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Admin Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={!password}>
            Confirm
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PasswordVerificationDialog;