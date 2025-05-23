import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Alert
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/Warning';
import LaptopIcon from '@mui/icons-material/Laptop';
import StorageIcon from '@mui/icons-material/Storage';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';

const ManualRemediation = () => {
  // Access the setPageTitle function from outlet context
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  
  // Get Jump Server URL from environment variable or construct from current host
  const getJumpServerUrl = () => {
    // Try to get from environment variable first
    if (process.env.REACT_APP_JUMP_SERVER_URL) {
      return process.env.REACT_APP_JUMP_SERVER_URL;
    }
    
    // If not available, construct from current hostname/IP
    const currentHost = window.location.hostname;
    return `http://${currentHost}:80/`;
  };
  
  const remediationConsoleUrl = getJumpServerUrl();
  
  // Set page title when component mounts
  useEffect(() => {
    setPageTitle('Manual Remediation');
  }, [setPageTitle]);
  
  const handleOpenConsole = () => {
    window.open(remediationConsoleUrl, '_blank');
  };
  
  // Common remediation commands
  const remediationCommands = {
    linux: [
      {
        title: 'Isolate Compromised Host',
        command: 'iptables -I INPUT -j DROP && iptables -I OUTPUT -j DROP',
        description: 'Emergency isolation: Blocks all incoming and outgoing traffic'
      },
      {
        title: 'Identify Running Processes',
        command: 'ps -aux --forest | grep -i [suspicious process]',
        description: 'Lists all running processes in tree format to find suspicious activity'
      },
      {
        title: 'Check for Connections',
        command: 'netstat -tupan | grep ESTABLISHED',
        description: 'Shows all established network connections and the associated processes'
      },
      {
        title: 'View Recent Logins',
        command: 'last -a | head -20',
        description: 'Displays most recent login attempts including source IP addresses'
      },
      {
        title: 'Check System Logs',
        command: 'tail -f /var/log/syslog | grep -i error',
        description: 'Monitor system logs for error messages in real-time'
      },
      {
        title: 'Find Large Files',
        command: 'find / -type f -size +100M -exec ls -lh {} \\; 2>/dev/null',
        description: 'Locate files larger than 100MB that might be suspicious'
      }
    ],
    windows: [
      {
        title: 'Check for Suspicious Connections',
        command: 'netstat -nao | findstr ESTABLISHED',
        description: 'Lists all established connections with associated process IDs'
      },
      {
        title: 'Kill Suspicious Process',
        command: 'taskkill /F /PID [process-id]',
        description: 'Forcefully terminates a process by its ID'
      },
      {
        title: 'View Running Services',
        command: 'Get-Service | Where-Object {$_.Status -eq "Running"}',
        description: 'PowerShell command to list all running services'
      },
      {
        title: 'Network Isolation',
        command: 'netsh advfirewall set allprofiles firewallpolicy blockinbound,blockoutbound',
        description: 'Blocks all inbound and outbound network traffic'
      },
      {
        title: 'Check Event Logs',
        command: 'Get-EventLog -LogName Security -Newest 50 | Where-Object {$_.EntryType -eq "FailureAudit"}',
        description: 'PowerShell command to check recent security failures'
      },
      {
        title: 'List Startup Programs',
        command: 'Get-CimInstance Win32_StartupCommand | Select-Object Name, command, Location',
        description: 'List all programs that start automatically with Windows'
      }
    ]
  };
  
  // Best practices
  const bestPractices = [
    {
      title: 'Document Everything',
      icon: <CheckCircleOutlineIcon color="primary" />,
      description: 'Record all actions taken, findings, and changes made during remediation for later analysis and reporting.'
    },
    {
      title: 'Minimal Changes',
      icon: <WarningIcon color="warning" />,
      description: 'Make the minimum changes necessary to contain the threat while preserving evidence for forensic analysis.'
    },
    {
      title: 'Verify Isolation',
      icon: <WifiOffIcon color="error" />,
      description: 'Always confirm that compromised systems are properly isolated before beginning remediation to prevent threat spread.'
    },
    {
      title: 'Backup Before Removal',
      icon: <CloudSyncIcon color="success" />,
      description: 'Create forensic backups of malicious files or evidence before removal for later analysis.'
    }
  ];
  
  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: theme.palette.primary.main, color: 'white' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom fontWeight="500">
              CyberSentinel Manual Remediation
            </Typography>
            <Typography variant="subtitle1">
              Securely access and remediate compromised endpoints with advanced privilege controls
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<TerminalIcon />}
              onClick={handleOpenConsole}
              sx={{ 
                bgcolor: 'white', 
                color: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: theme.palette.grey[100]
                },
                py: 1.5,
                px: 3
              }}
            >
              Launch Console
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Note:</strong> Use the CyberSentinel Manual Remediation Console only for authorized remediation activities. All actions are logged and monitored.
        </Typography>
      </Alert>
      
      {/* Console Access Info */}
      <Paper sx={{ p: 2, mb: 4, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Console Access Information
        </Typography>
        <Typography variant="body2">
          <strong>URL:</strong> {remediationConsoleUrl}
        </Typography>
        <Typography variant="body2">
          <strong>Default Credentials:</strong> admin / ChangeMe
        </Typography>
        <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
          Please change the default password after first login for security purposes.
        </Typography>
      </Paper>
      
      {/* Best Practices Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 3, fontWeight: 500 }}>
        Best Practices for Effective Remediation
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {bestPractices.map((practice, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {practice.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {practice.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {practice.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Common Commands Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 3, fontWeight: 500 }}>
        Common Remediation Commands
      </Typography>
      
      <Grid container spacing={3}>
        {/* Linux Commands */}
        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="linux-commands-content"
              id="linux-commands-header"
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StorageIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Linux Systems</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List disablePadding>
                {remediationCommands.linux.map((cmd, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider variant="middle" component="li" />}
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <TerminalIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.title}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                display: 'inline',
                                fontFamily: 'monospace',
                                bgcolor: 'grey.100',
                                p: 0.5,
                                borderRadius: 1
                              }}
                            >
                              {cmd.command}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {cmd.description}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>
        
        {/* Windows Commands */}
        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="windows-commands-content"
              id="windows-commands-header"
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LaptopIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Windows Systems</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List disablePadding>
                {remediationCommands.windows.map((cmd, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider variant="middle" component="li" />}
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <TerminalIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.title}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                display: 'inline',
                                fontFamily: 'monospace',
                                bgcolor: 'grey.100',
                                p: 0.5,
                                borderRadius: 1
                              }}
                            >
                              {cmd.command}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {cmd.description}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
      
      {/* Advanced Remediation Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ mr: 1 }} color="secondary" />
          <Typography variant="h6">Advanced Remediation</Typography>
        </Box>
        
        <Typography paragraph>
          For complex security incidents, use the CyberSentinel Manual Remediation Console to:
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Isolate compromised systems from the network while maintaining administrative access"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Extract forensic evidence for further analysis"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Deploy remediation scripts with elevated privileges"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Perform memory analysis to identify persistent threats"
            />
          </ListItem>
        </List>
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<TerminalIcon />}
            onClick={handleOpenConsole}
            sx={{ py: 1.5, px: 3 }}
          >
            Launch Manual Remediation Console
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ManualRemediation;