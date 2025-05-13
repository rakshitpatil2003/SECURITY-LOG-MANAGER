// frontend/src/components/Common/Settings.js
import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Application Settings
        </Typography>
        <Typography variant="body1">
          Settings content will go here...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Settings;