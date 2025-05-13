// Updated StructuredLogView.js with Assign Ticket functionality
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  Button,
  Tooltip,
  Alert,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import SecurityIcon from '@mui/icons-material/Security';
import DnsIcon from '@mui/icons-material/Dns';
import EventIcon from '@mui/icons-material/Event';
import CodeIcon from '@mui/icons-material/Code';
import ShieldIcon from '@mui/icons-material/Shield';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { generateTicket } from '../../services/logs';
import api from '../../services/auth';

// StructuredLogView component - displays detailed log information in a dialog
export const StructuredLogView = ({ data, onClose, open }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticketSnackbar, setTicketSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const textAreaRef = useRef(null);

  // Fetch users for assign dialog
  useEffect(() => {
    if (assignDialogOpen) {
      fetchUsers();
    }
  }, [assignDialogOpen]);

  // Fetch available users for assignment
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setTicketSnackbar({
        open: true,
        message: 'Failed to load users',
        severity: 'error'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Generate ticket
  const handleGenerateTicket = async () => {
    try {
      setLoadingTicket(true);

      if (!data) {
        setTicketSnackbar({
          open: true,
          message: 'No log selected',
          severity: 'error'
        });
        return;
      }

      const result = await generateTicket(
        data,
        'Ticket generated from log view'
      );

      setTicketSnackbar({
        open: true,
        message: `Ticket ${result.ticket.ticketId} generated successfully!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating ticket:', error);
      setTicketSnackbar({
        open: true,
        message: error.message || 'Failed to generate ticket',
        severity: 'error'
      });
    } finally {
      setLoadingTicket(false);
    }
  };

  // Assign ticket functionality
  const handleAssignTicket = async () => {
    try {
      setAssignLoading(true);

      // First generate a ticket if not already a ticket
      let ticketId;
      if (!data.ticketId) {
        const result = await generateTicket(
          data,
          'Ticket generated for assignment'
        );
        ticketId = result.ticket.id;
      } else {
        ticketId = data.id;
      }

      // Then assign the ticket
      await api.patch(`/tickets/${ticketId}/assign`, { 
        assignedToId: selectedUser 
      });

      setAssignDialogOpen(false);
      setTicketSnackbar({
        open: true,
        message: 'Ticket assigned successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      setTicketSnackbar({
        open: true,
        message: error.message || 'Failed to assign ticket',
        severity: 'error'
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    try {
      // Use Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        });
      } else {
        // Fallback method
        if (!textAreaRef.current) {
          const textarea = document.createElement('textarea');
          textarea.style.position = 'fixed';
          textarea.style.right = '-9999px';
          textarea.style.top = '0';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textAreaRef.current = textarea;
        }

        textAreaRef.current.value = text;
        textAreaRef.current.focus();
        textAreaRef.current.select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error during copy operation:', err);
    }
  };

  // Get severity color based on rule level
  const getSeverityColor = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'error';
    if (numLevel >= 12) return 'error';
    if (numLevel >= 8) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  };

  // Get severity text based on rule level
  const getSeverityText = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 12) return 'High';
    if (numLevel >= 8) return 'Medium';
    if (numLevel >= 4) return 'Low';
    return 'Info';
  };

  // Format timestamp to be more readable
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Render MITRE ATT&CK information
  const renderMitreSection = () => {
    if (!data || !data.rule || !data.rule.mitre) return null;
    
    // Check if there's any MITRE data
    const hasMitreData = 
      (data.rule.mitre.id && data.rule.mitre.id.length > 0) ||
      (data.rule.mitre.tactic && data.rule.mitre.tactic.length > 0) ||
      (data.rule.mitre.technique && data.rule.mitre.technique.length > 0);
    
    if (!hasMitreData) return null;

    const mitreCategories = [
      { name: 'Techniques', items: data.rule.mitre.technique || [] },
      { name: 'Tactics', items: data.rule.mitre.tactic || [] },
      { name: 'IDs', items: data.rule.mitre.id || [] }
    ];

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1, color: '#d32f2f' }}>
          <ShieldIcon sx={{ mr: 1 }} />
          MITRE ATT&CK
        </Typography>
        <Box sx={{ pl: 2 }}>
          {mitreCategories.map(category => {
            if (!category.items || category.items.length === 0) return null;
            return (
              <Box key={category.name} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {category.name}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 1 }}>
                  {category.items.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={item}
                      size="small"
                      sx={{
                        bgcolor: '#ffebee',
                        color: '#d32f2f',
                        fontWeight: 500
                      }}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render compliance frameworks in a grouped format
  const renderComplianceFrameworks = () => {
    if (!data || !data.rule) return null;

    const frameworks = [
      { name: 'HIPAA', items: data.rule.hipaa, color: '#4caf50' },
      { name: 'PCI DSS', items: data.rule.pci_dss, color: '#ff9800' },
      { name: 'GDPR', items: data.rule.gdpr, color: '#2196f3' },
      { name: 'NIST 800-53', items: data.rule.nist, color: '#9c27b0' },
      { name: 'TSC', items: data.rule.tsc, color: '#795548' },
      { name: 'GPG13', items: data.rule.gpg13, color: '#607d8b' }
    ];

    return (
      <Box>
        {frameworks.map(framework => {
          if (!framework.items || framework.items.length === 0) return null;
          return (
            <Box key={framework.name} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                {framework.name}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 1 }}>
                {framework.items.map((item, idx) => (
                  <Chip
                    key={idx}
                    label={item}
                    size="small"
                    sx={{ bgcolor: `${framework.color}15`, color: framework.color }}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render network flow details
  const renderNetworkInfo = () => {
    if (!data || !data.network) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DnsIcon sx={{ mr: 1 }} />
          Network Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Source IP</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {data.network.srcIp || 'N/A'}
                {data.network.srcPort && `:${data.network.srcPort}`}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Destination IP</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {data.network.destIp || 'N/A'}
                {data.network.destPort && `:${data.network.destPort}`}
              </Typography>
            </Paper>
          </Grid>
          
          {data.network.protocol && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Protocol</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={data.network.protocol}
                    size="small"
                    sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  // Render structured log data
  const renderStructuredView = () => {
    if (!data) return null;
    
    return (
      <Box sx={{ p: 2 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EventIcon sx={{ mr: 1.5 }} color="primary" />
                Basic Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatTimestamp(data['@timestamp'])}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Event ID</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body1" fontWeight="medium" sx={{ mr: 1 }}>
                        {data.id || 'N/A'}
                      </Typography>
                      <Tooltip title="Copy ID">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(data.id)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Rule ID</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.rule?.id || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                    <Chip
                      label={`${data.rule?.level || '0'} - ${getSeverityText(data.rule?.level || '0')}`}
                      color={getSeverityColor(data.rule?.level || '0')}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Rule Description</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {data.rule?.description || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Agent Information */}
          <Grid item xs={12}>
            <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1.5 }} color="primary" />
                Agent Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Agent Name</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {data.agent?.name || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Agent ID</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {data.agent?.id || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Agent IP</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {data.agent?.ip || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Network Information */}
          {data.network && Object.keys(data.network).length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <DnsIcon sx={{ mr: 1.5 }} color="primary" />
                  Network Information
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Source IP</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.network.srcIp || 'N/A'}
                      {data.network.srcPort && `:${data.network.srcPort}`}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Destination IP</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.network.destIp || 'N/A'}
                      {data.network.destPort && `:${data.network.destPort}`}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Protocol</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.network.protocol || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
          
          {/* MITRE ATT&CK Information */}
          {renderMitreSection() && (
            <Grid item xs={12}>
              <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <ShieldIcon sx={{ mr: 1.5 }} color="error" />
                  MITRE ATT&CK
                </Typography>
                {renderMitreSection()}
              </Paper>
            </Grid>
          )}
          
          {/* Rule Groups */}
          {data.rule?.groups && data.rule.groups.length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1.5 }} color="primary" />
                  Rule Groups
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                  {data.rule.groups.map((group, idx) => (
                    <Chip 
                      key={idx} 
                      label={group} 
                      size="small"
                      sx={{ 
                        bgcolor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.08)'
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  // Render raw JSON data
  const renderJsonView = () => {
    if (!data) return null;
    
    return (
      <Box sx={{ p: 2, position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
          <Tooltip title="Copy JSON">
            <IconButton 
              onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
              size="small"
              sx={{ 
                bgcolor: theme.palette.background.paper, 
                boxShadow: 1,
                '&:hover': { bgcolor: theme.palette.action.hover }
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', 
            maxHeight: '70vh', 
            overflow: 'auto',
            borderRadius: 2,
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '0.875rem',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          <pre style={{ margin: 0, overflow: 'visible' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Paper>
      </Box>
    );
  };

  // Render compliance view
  const renderComplianceView = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <ShieldIcon sx={{ mr: 1.5 }} color="primary" />
            Compliance Information
          </Typography>
          
          {renderComplianceFrameworks() || (
            <Typography variant="body1" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No compliance framework information available for this log.
            </Typography>
          )}
        </Paper>
      </Box>
    );
  };

  // If no data, return null
  if (!data) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { 
          maxHeight: '90vh',
          height: 'auto',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        pb: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div" sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 1.5 }} />
            {data.rule?.description || 'Log Details'}
          </Typography>
          <Chip
            label={`Level ${data.rule?.level || '0'} - ${getSeverityText(data.rule?.level || '0')}`}
            color={getSeverityColor(data.rule?.level || '0')}
            size="small"
            icon={<WarningIcon />}
          />
        </Box>
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={onClose} 
          aria-label="close"
          sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="log details tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Overview" />
          <Tab icon={<ShieldIcon />} iconPosition="start" label="MITRE & Compliance" />
          <Tab icon={<CodeIcon />} iconPosition="start" label="Raw Data" />
        </Tabs>
      </Box>
      
      <DialogContent dividers sx={{ p: 0 }}>
        {/* Overview Tab */}
        <Box hidden={tabValue !== 0} role="tabpanel">
          {tabValue === 0 && renderStructuredView()}
        </Box>
        
        {/* MITRE & Compliance Tab */}
        <Box hidden={tabValue !== 1} role="tabpanel">
          {tabValue === 1 && renderComplianceView()}
        </Box>
        
        {/* Raw Data Tab */}
        <Box hidden={tabValue !== 2} role="tabpanel">
          {tabValue === 2 && renderJsonView()}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          startIcon={<DescriptionIcon />}
          onClick={handleGenerateTicket}
          disabled={loadingTicket}
        >
          {loadingTicket ? <CircularProgress size={24} /> : 'Generate Ticket'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          onClick={() => setAssignDialogOpen(true)}
          color="secondary"
        >
          Assign Ticket
        </Button>
        <Button
          variant="contained"
          startIcon={<AssignmentIcon />}
          onClick={onClose}
          color="primary"
        >
          Close
        </Button>
      </DialogActions>
      
      {/* Assign Ticket Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => !assignLoading && setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Assign Ticket
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            {data.id ? 
              'Select a user to assign this ticket to:' : 
              'A new ticket will be generated and assigned to the selected user:'
            }
          </Typography>
          
          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="Assign To"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={assignLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignTicket} 
            variant="contained" 
            color="primary"
            disabled={!selectedUser || assignLoading}
          >
            {assignLoading ? <CircularProgress size={24} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success message for copy operation */}
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
          Copied to clipboard
        </Alert>
      )}
      
      {/* Ticket generation feedback */}
      {ticketSnackbar.open && (
        <Alert 
          severity={ticketSnackbar.severity} 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            zIndex: 9999,
            boxShadow: 4
          }}
          onClose={() => setTicketSnackbar({ ...ticketSnackbar, open: false })}
        >
          {ticketSnackbar.message}
        </Alert>
      )}
    </Dialog>
  );
};