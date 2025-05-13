// src/components/Tickets/ViewTicketDetails.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Chip,
  Grid,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import DnsIcon from '@mui/icons-material/Dns';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../../services/auth';

const ViewTicketDetails = ({ open, onClose, ticketId }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (open && ticketId) {
      fetchTicketDetails();
    }
  }, [open, ticketId]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'error';
      case 'In Review': return 'warning';
      case 'Closed': return 'success';
      case 'Reopened': return 'primary';
      default: return 'default';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get rule level color
  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'error';
    if (numLevel >= 12) return 'error';
    if (numLevel >= 8) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  };

  // Get rule level label
  const getRuleLevelLabel = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 12) return 'High';
    if (numLevel >= 8) return 'Medium';
    if (numLevel >= 4) return 'Low';
    return 'Info';
  };

  // Render ticket overview
  const renderOverview = () => {
    if (!ticket) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ mr: 1 }} />
                Ticket Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={ticket.status} 
                    color={getStatusColor(ticket.status)} 
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {ticket.description || 'No description provided'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                    <EventIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    {formatDate(ticket.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                    <EventIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    {formatDate(ticket.updatedAt)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Assignment Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 1, bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {ticket.creator?.name?.charAt(0) || ticket.creator?.username?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                      <Typography variant="body2">
                        {ticket.creator?.name || ticket.creator?.username || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 1, bgcolor: ticket.assignedTo ? 'secondary.main' : 'grey.400', width: 32, height: 32 }}>
                      {ticket.assignedTo?.name?.charAt(0) || ticket.assignedTo?.username?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Assigned To</Typography>
                      <Typography variant="body2">
                        {ticket.assignedTo?.name || ticket.assignedTo?.username || 'Unassigned'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Log Summary */}
          {ticket.logSummary && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1 }} />
                  Security Event Details
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Event ID</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        {ticket.logSummary.originalLogId || 'N/A'}
                      </Typography>
                      <Tooltip title="Copy ID">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(ticket.logSummary.originalLogId)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Rule ID</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {ticket.logSummary.ruleId || 'N/A'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {formatDate(ticket.logSummary.timestamp)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                    <Chip 
                      label={`Level ${ticket.logSummary.ruleLevel} - ${getRuleLevelLabel(ticket.logSummary.ruleLevel)}`}
                      color={getRuleLevelColor(ticket.logSummary.ruleLevel)}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Rule Description</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {ticket.logSummary.ruleDescription || 'No description available'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Agent Information</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        <DnsIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        Name: {ticket.logSummary.agentName || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <DnsIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        IP: {ticket.logSummary.agentIp || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  // Render history tab
  const renderHistory = () => {
    if (!ticket || !ticket.statusHistory || ticket.statusHistory.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No history available for this ticket.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 0 }}>
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {ticket.statusHistory.map((history, index) => (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getStatusColor(history.status) + '.main' }}>
                      <HistoryIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={history.status} 
                            color={getStatusColor(history.status)} 
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            by {history.changedBy?.username || 'Unknown'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(history.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        sx={{ display: 'inline', mt: 1 }}
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {history.description || 'No description provided'}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < ticket.statusHistory.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
    );
  };

  // Render raw log data
  const renderRawLog = () => {
    if (!ticket || !ticket.originalLog) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No raw log data available for this ticket.
          </Typography>
        </Box>
      );
    }

    const rawLogJson = JSON.stringify(ticket.originalLog, null, 2);

    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 3, position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <Tooltip title="Copy Raw Log">
              <IconButton 
                onClick={() => copyToClipboard(rawLogJson)}
                size="small"
                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'grey.100', 
              borderRadius: 1, 
              maxHeight: '500px', 
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#555',
              },
            }}
          >
            <pre style={{ margin: 0 }}>
              {rawLogJson}
            </pre>
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: { 
          maxHeight: '90vh'
        }
      }}
    >
      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : ticket && (
        <>
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            pb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1.5 }} />
              <Typography variant="h6" component="div">
                {ticket.ticketId}
              </Typography>
              <Chip 
                label={ticket.status} 
                color={getStatusColor(ticket.status)} 
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
            <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="ticket details tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<InfoIcon />} iconPosition="start" label="Overview" />
              <Tab icon={<HistoryIcon />} iconPosition="start" label="History" />
              <Tab icon={<CodeIcon />} iconPosition="start" label="Raw Log" />
            </Tabs>
          </Box>
          
          <DialogContent dividers>
            {tabValue === 0 && renderOverview()}
            {tabValue === 1 && renderHistory()}
            {tabValue === 2 && renderRawLog()}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} variant="outlined">Close</Button>
          </DialogActions>
        </>
      )}
      
      {/* Copy success snackbar */}
      {copySuccess && (
        <Alert 
          severity="success" 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            zIndex: 9999,
            boxShadow: 4
          }}
        >
          Copied to clipboard!
        </Alert>
      )}
    </Dialog>
  );
};

export default ViewTicketDetails;