// frontend/src/components/Common/TimeRangeSelector.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Typography,
  Popover,
  Paper,
  Grid,
  TextField,
  IconButton,
  Divider,
  ListItemIcon,
  ListItemText,
  ButtonGroup,
  Tooltip
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import EventIcon from '@mui/icons-material/Event';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckIcon from '@mui/icons-material/Check';

const TimeRangeSelector = ({ value = '24h', onChange, disabled }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tabValue, setTabValue] = useState(1); // 0 = Absolute, 1 = Relative
  const open = Boolean(anchorEl);
  const buttonRef = useRef(null);
  
  // Form state for absolute dates
  const [absoluteDates, setAbsoluteDates] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Initialize absolute dates when opening
  useEffect(() => {
    if (open && tabValue === 0) {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      setAbsoluteDates({
        startDate: formatDateForInput(yesterday),
        endDate: formatDateForInput(now)
      });
    }
  }, [open, tabValue]);
  
  // Helper to format dates for HTML input
  const formatDateForInput = (date) => {
    return date.toISOString().substring(0, 16);
  };
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleApply = () => {
    if (tabValue === 0) {
      // Absolute time range
      if (absoluteDates.startDate && absoluteDates.endDate) {
        onChange(`custom:${absoluteDates.startDate}:${absoluteDates.endDate}`);
      }
    }
    handleClose();
  };
  
  const handleSelectPreset = (range) => {
    onChange(range);
    handleClose();
  };
  
  // Format displayed time range
  const formatTimeRange = () => {
    if (value.startsWith('custom:')) {
      // Format absolute dates
      const parts = value.split(':');
      if (parts.length === 3) {
        return 'Custom Range';
      }
      return 'Custom';
    }
    
    switch (value) {
      case '15m':
        return 'Last 15 minutes';
      case '1h':
        return 'Last hour';
      case '4h':
        return 'Last 4 hours';
      case '12h':
        return 'Last 12 hours';
      case '24h':
        return 'Last 24 hours';
      case '3d':
        return 'Last 3 days';
      case '7d':
        return 'Last 7 days';
      case '15d':
        return 'Last 15 days';
      case '30d':
        return 'Last 30 days';
      case '90d':
        return 'Last 90 days';
      default:
        return 'Last 24 hours';
    }
  };
  
  // Quick presets
  const quickPresets = [
    { label: 'Last 15 minutes', value: '15m', icon: <ScheduleIcon /> },
    { label: 'Last hour', value: '1h', icon: <AccessTimeIcon /> },
    { label: 'Last 4 hours', value: '4h', icon: <AccessTimeIcon /> },
    { label: 'Last 12 hours', value: '12h', icon: <AccessTimeIcon /> },
    { label: 'Last 24 hours', value: '24h', icon: <TodayIcon /> },
    { label: 'Last 3 days', value: '3d', icon: <TodayIcon /> },
    { label: 'Last 7 days', value: '7d', icon: <DateRangeIcon /> },
    { label: 'Last 15 days', value: '15d', icon: <DateRangeIcon /> },
    { label: 'Last 30 days', value: '30d', icon: <CalendarMonthIcon /> },
    { label: 'Last 90 days', value: '90d', icon: <CalendarMonthIcon /> }
  ];
  
  return (
    <Box>
      <Button
        ref={buttonRef}
        variant="outlined"
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
        disabled={disabled}
        sx={{ 
          minWidth: 180,
          justifyContent: 'space-between',
          borderRadius: '8px',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover'
          },
          fontWeight: 500
        }}
        startIcon={<EventIcon />}
      >
        {formatTimeRange()}
      </Button>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 400, 
            maxHeight: 500,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Paper sx={{ p: 0 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              p: 2, 
              pb: 0, 
              fontWeight: 600,
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            Time Range
          </Typography>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              sx={{ px: 2 }}
            >
              <Tab label="Absolute" />
              <Tab label="Relative" />
            </Tabs>
          </Box>
          
          {tabValue === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Set specific start and end dates
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start"
                    type="datetime-local"
                    value={absoluteDates.startDate}
                    onChange={(e) => setAbsoluteDates({...absoluteDates, startDate: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End"
                    type="datetime-local"
                    value={absoluteDates.endDate}
                    onChange={(e) => setAbsoluteDates({...absoluteDates, endDate: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  onClick={handleApply} 
                  variant="contained" 
                  color="primary"
                  startIcon={<CheckIcon />}
                >
                  Apply Range
                </Button>
              </Box>
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box sx={{ p: 0, maxHeight: 400, overflowY: 'auto' }}>
              <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>
                Common time ranges
              </Typography>
              
              <Box>
                {quickPresets.map((preset) => (
                  <MenuItem 
                    key={preset.value} 
                    onClick={() => handleSelectPreset(preset.value)}
                    selected={value === preset.value}
                    sx={{
                      py: 1.5,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        color: 'primary.dark'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: value === preset.value ? 'primary.main' : 'text.secondary' }}>
                      {preset.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={preset.label} 
                      primaryTypographyProps={{ 
                        fontWeight: value === preset.value ? 600 : 400
                      }}
                    />
                    {value === preset.value && (
                      <CheckIcon color="primary" fontSize="small" />
                    )}
                  </MenuItem>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Popover>
    </Box>
  );
};

export default TimeRangeSelector;