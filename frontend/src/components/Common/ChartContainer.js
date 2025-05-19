// src/components/Common/ChartContainer.js
import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography 
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';

const ChartContainer = ({ 
  title, 
  children, 
  height = 300, 
  fullscreenHeight = "calc(100vh - 120px)"
}) => {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box 
        sx={{ 
          position: 'relative', 
          height: height, 
          width: '100%',
          display: fullscreen ? 'none' : 'block'
        }}
      >
        {children}
        <IconButton 
          onClick={toggleFullscreen}
          size="small"
          aria-label="Toggle fullscreen"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)'
            },
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
        >
          <FullscreenIcon />
        </IconButton>
      </Box>

      {/* Fullscreen Dialog */}
      <Dialog
        fullScreen
        open={fullscreen}
        onClose={toggleFullscreen}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton
            aria-label="close"
            onClick={toggleFullscreen}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Box style={{ height: fullscreenHeight, width: '100%' }}>
            {children}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={toggleFullscreen} 
            startIcon={<FullscreenExitIcon />}
            variant="contained"
          >
            Exit Fullscreen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChartContainer;