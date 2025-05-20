// src/components/Logs/SentinelAI.js
import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Lottie from 'react-lottie';
import Typewriter from 'typewriter-effect';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  useTheme,
  Divider,
  TextField,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
  useMediaQuery,
  Zoom,
  Fade,
  Alert,
  Snackbar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DnsIcon from '@mui/icons-material/Dns';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DownloadIcon from '@mui/icons-material/Download';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { DataGrid } from '@mui/x-data-grid';
import { motion } from 'framer-motion';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { StructuredLogView } from './StructuredLogView';

// Import Siri animation
import siriAnimation from '../../assets/siri-animation.json';

// Import service for data fetching
import { getSentinelAILogs, getMLAnalysisLogs } from '../../services/logs';

// Import export utility
import { exportReportToPdf } from '../Reports/Export';

// Vibrant color palette
const COLOR_PALETTE = [
  '#3366FF',   // Deep Blue
  '#FF6B6B',   // Vibrant Red
  '#4ECDC4',   // Teal
  '#FFA726',   // Bright Orange
  '#9C27B0',   // Purple
  '#2196F3',   // Bright Blue
  '#4CAF50',   // Green
  '#FF5722',   // Deep Orange
  '#607D8B',   // Blue Gray
  '#795548'    // Brown
];

// CSV Export utility for Sentinel AI
const exportSentinelAIToCSV = (logs, fileName = 'sentinel_ai_logs.csv') => {
  if (!logs || logs.length === 0) {
    console.error('No logs to export');
    return false;
  }

  try {
    // Get all unique keys for CSV header
    const baseKeys = ['id', '@timestamp', 'agent.name', 'agent.ip', 'rule.level', 'rule.description'];
    const aiKeys = ['data.AI_response'];

    const headers = [...baseKeys, ...aiKeys];

    // Create CSV header row
    let csv = headers.join(',') + '\n';

    // Add data rows
    logs.forEach(log => {
      const row = headers.map(key => {
        // Handle nested properties
        if (key.includes('.')) {
          const parts = key.split('.');
          let value = log;
          for (const part of parts) {
            if (!value) return '';
            value = value[part];
          }

          if (Array.isArray(value)) {
            return `"${value.join('; ').replace(/"/g, '""')}"`;
          }

          return value ? `"${String(value).replace(/"/g, '""')}"` : '';
        }

        // Handle regular properties
        if (log[key] === undefined || log[key] === null) return '';
        if (typeof log[key] === 'object') return '';

        // Escape quotes and format as CSV cell
        return `"${String(log[key]).replace(/"/g, '""')}"`;
      }).join(',');

      csv += row + '\n';
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
};

// CSV Export utility for ML Analysis
const exportMLAnalysisToCSV = (logs, fileName = 'ml_analysis_logs.csv') => {
  if (!logs || logs.length === 0) {
    console.error('No logs to export');
    return false;
  }

  try {
    // Get all unique keys for CSV header
    const baseKeys = ['id', '@timestamp', 'agent.name', 'agent.ip', 'rule.level', 'rule.description'];
    const mlKeys = ['data.ML_logs.anomaly_score', 'data.ML_logs.severity', 'data.ML_logs.cluster'];

    const headers = [...baseKeys, ...mlKeys];

    // Create CSV header row
    let csv = headers.join(',') + '\n';

    // Add data rows
    logs.forEach(log => {
      const row = headers.map(key => {
        // Handle nested properties
        if (key.includes('.')) {
          const parts = key.split('.');
          let value = log;
          for (const part of parts) {
            if (!value) return '';
            value = value[part];
          }

          if (Array.isArray(value)) {
            return `"${value.join('; ').replace(/"/g, '""')}"`;
          }

          return value ? `"${String(value).replace(/"/g, '""')}"` : '';
        }

        // Handle regular properties
        if (log[key] === undefined || log[key] === null) return '';
        if (typeof log[key] === 'object') return '';

        // Escape quotes and format as CSV cell
        return `"${String(log[key]).replace(/"/g, '""')}"`;
      }).join(',');

      csv += row + '\n';
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
};

// Format date for file name
const formatDateForFileName = (date) => {
  return date.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
};

// Get severity color based on level or text
const getSeverityColor = (level, severityText = null) => {
  // If severity text is provided, use that first
  if (severityText) {
    const severity = severityText.toLowerCase();
    switch (severity) {
      case 'high':
      case 'severe':
      case 'critical':
        return 'error';
      case 'medium':
      case 'moderate':
      case 'warning':
        return 'warning';
      case 'low':
        return 'info';
      default:
        // Fall through to level-based logic
        break;
    }
  }
  
  // Fallback to level-based logic
  if (typeof level === 'number' || !isNaN(parseInt(level))) {
    const numLevel = parseInt(level);
    if (numLevel >= 10) return 'error';
    if (numLevel >= 7) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  }
  
  return 'default';
};

// Format the ML Anomaly Score
const getAnomalyScoreColor = (score) => {
  if (score >= 70) return 'error';
  if (score >= 40) return 'warning';
  if (score >= 20) return 'info';
  return 'success';
};

// AI Response View Component with typewriter effect
const AIResponseView = ({ data, onClose, onViewFullDetails, isMlResponse = false }) => {
  const theme = useTheme();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [typewriterStarted, setTypewriterStarted] = useState(false);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // Format the timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Options for the Lottie animation
  const defaultOptions = {
    loop: false,
    autoplay: true,
    animationData: siriAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    },
    speed: 2,
  };
  
  // Handle animation complete
  const handleAnimationComplete = () => {
  // Show animation for 1 second (1000ms) then proceed
  setTimeout(() => {
    setAnimationComplete(true);
    setTypewriterStarted(true);
  }, 100); // 1000ms = 1 second
};
  
  // Get the AI response from data
  const getAIResponse = () => {
    if (isMlResponse) {
      // For ML analysis response
      return data?.data?.ML_logs?.ai_ml_logs || 'No ML analysis available';
    } else {
      // For Sentinel AI response
      return data?.data?.AI_response || 'No AI response available';
    }
  };
  
  // Get ML metadata if necessary
  const getMLMetadata = () => {
    if (!isMlResponse || !data?.data?.ML_logs) return null;
    
    return {
      anomalyScore: data.data.ML_logs.anomaly_score,
      severity: data.data.ML_logs.severity,
      cluster: data.data.ML_logs.cluster,
      scoreBreakdown: data.data.ML_logs.score_breakdown,
      timestamp: data.data.ML_logs.timestamp
    };
  };
  
  const mlMetadata = getMLMetadata();
  
  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh',
          borderRadius: 3,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
            : 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
          {isMlResponse ? (
            <PsychologyIcon sx={{ color: theme.palette.primary.main, mr: 1.5, fontSize: 28 }} />
          ) : (
            <SmartToyIcon sx={{ color: theme.palette.primary.main, mr: 1.5, fontSize: 28 }} />
          )}
          <Typography variant="h6" component="div" sx={{ 
            fontWeight: 'bold', 
            background: 'linear-gradient(45deg, #3366FF, #00CCFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {isMlResponse ? 'ML Analysis Response' : 'Sentinel AI Response'}
          </Typography>
        </Box>
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        dividers 
        sx={{ 
          px: { xs: 2, md: 3 }, 
          py: 3, 
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!animationComplete && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <Lottie 
              options={defaultOptions}
              height={200}
              width={200}
              eventListeners={[
                {
                  eventName: 'complete',
                  callback: handleAnimationComplete
                }
              ]}
            />
          </Box>
        )}
        
        <Fade in={animationComplete} timeout={500}>
          <Box sx={{ mt: 1 }}>
            {isMlResponse && mlMetadata && (
              <Box 
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                sx={{ 
                  mb: 4,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Anomaly Score
                      </Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress
                          variant="determinate"
                          value={Math.min(mlMetadata.anomalyScore, 100)}
                          size={80}
                          thickness={5}
                          color={getAnomalyScoreColor(mlMetadata.anomalyScore)}
                          sx={{
                            boxShadow: `0 0 15px ${alpha(theme.palette[getAnomalyScoreColor(mlMetadata.anomalyScore)].main, 0.5)}`
                          }}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="div"
                            color={`${getAnomalyScoreColor(mlMetadata.anomalyScore)}.main`}
                            fontWeight="bold"
                          >
                            {mlMetadata.anomalyScore.toFixed(0)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Severity
                      </Typography>
                      <Chip 
                        label={mlMetadata.severity || 'Unknown'} 
                        color={getSeverityColor(0, mlMetadata.severity)}
                        sx={{ 
                          fontWeight: 'bold', 
                          fontSize: '1rem',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Cluster
                      </Typography>
                      <Chip 
                        icon={<DataObjectIcon />}
                        label={`Cluster ${mlMetadata.cluster || 'Unknown'}`} 
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 'medium' }}
                      />
                    </Box>
                  </Grid>
                  
                  {mlMetadata.scoreBreakdown && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                        Score Breakdown
                      </Typography>
                      <Grid container spacing={2}>
                        {mlMetadata.scoreBreakdown.isolation_forest_score !== undefined && (
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Isolation Forest
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(mlMetadata.scoreBreakdown.isolation_forest_score, 100)}
                              color="secondary"
                              sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                            />
                            <Typography variant="body2">
                              {mlMetadata.scoreBreakdown.isolation_forest_score.toFixed(1)}
                            </Typography>
                          </Grid>
                        )}
                        
                        {mlMetadata.scoreBreakdown.cluster_distance !== undefined && (
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Cluster Distance
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((mlMetadata.scoreBreakdown.cluster_distance / 100) * 100, 100)}
                              color="info"
                              sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                            />
                            <Typography variant="body2">
                              {mlMetadata.scoreBreakdown.cluster_distance.toFixed(1)}
                            </Typography>
                          </Grid>
                        )}
                        
                        {mlMetadata.scoreBreakdown.content_score !== undefined && (
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Content Score
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(mlMetadata.scoreBreakdown.content_score, 100)}
                              color="success"
                              sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                            />
                            <Typography variant="body2">
                              {mlMetadata.scoreBreakdown.content_score.toFixed(1)}
                            </Typography>
                          </Grid>
                        )}
                        
                        {mlMetadata.scoreBreakdown.rule_level_score !== undefined && (
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Rule Level Score
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(mlMetadata.scoreBreakdown.rule_level_score, 100)}
                              color="warning"
                              sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                            />
                            <Typography variant="body2">
                              {mlMetadata.scoreBreakdown.rule_level_score.toFixed(1)}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <EventIcon sx={{ color: 'text.secondary', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        Analysis Time: {formatTimestamp(mlMetadata.timestamp)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.background.paper, 0.8) 
                  : alpha(theme.palette.background.paper, 0.9),
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                mb: 2,
                color: theme.palette.mode === 'dark' ? '#a3e635' : '#4caf50'
              }}>
                {isMlResponse ? (
                  <ElectricBoltIcon sx={{ mr: 1, mt: 0.3 }} />
                ) : (
                  <AutoAwesomeIcon sx={{ mr: 1, mt: 0.3 }} />
                )}
                <Typography 
                  variant="h6" 
                  component="div" 
                  sx={{ 
                    fontWeight: 'medium', 
                    fontFamily: isSmallScreen ? 'inherit' : '"Space Mono", monospace',
                    color: theme.palette.mode === 'dark' ? '#a3e635' : '#4caf50',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    pb: 1,
                    width: '100%'
                  }}
                >
                  {isMlResponse ? 'Machine Learning Analysis' : 'AI Assessment'}
                </Typography>
              </Box>
              
              <Box sx={{ 
                minHeight: '100px', 
                px: 1, 
                opacity: typewriterStarted ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out',
                fontFamily: isSmallScreen ? 'inherit' : '"Space Mono", monospace',
                fontSize: '1rem',
                lineHeight: 1.6
              }}>
                {typewriterStarted && (
                  <Typewriter
                    options={{
                      delay: 10,
                      cursor: '|',
                      cursorClassName: 'custom-typewriter-cursor'
                    }}
                    onInit={(typewriter) => {
                      typewriter.typeString(getAIResponse()).start();
                    }}
                  />
                )}
              </Box>
            </Paper>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {isMlResponse 
                  ? 'This analysis is generated by our machine learning system based on behavior patterns' 
                  : 'This response is generated by our AI system'}
              </Typography>
            </Box>
          </Box>
        </Fade>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
        <Button
          onClick={onViewFullDetails}
          variant="outlined"
          startIcon={<VisibilityIcon />}
          color="primary"
          sx={{ borderRadius: 28 }}
        >
          View Complete Log Details
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          startIcon={<CloseIcon />}
          sx={{ borderRadius: 28 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main SentinelAI Component
const SentinelAI = () => {
  const theme = useTheme();
  const { setPageTitle } = useOutletContext();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSearching, setIsSearching] = useState(false);
  const [showStructuredView, setShowStructuredView] = useState(false);

  useEffect(() => {
    setPageTitle('Sentinel AI');
    fetchLogs();
  }, [timeRange]);

  useEffect(() => {
    fetchLogs(page, pageSize, searchTerm);
  }, [tabValue, page, pageSize]);

  // Fetch logs based on the active tab
  const fetchLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
    try {
      setLoading(true);
      setError(null);

      // Convert to 1-indexed for API
      const apiPage = currentPage + 1;
      
      if (tabValue === 0) {
        // Fetch Sentinel AI logs
        console.log(`Fetching Sentinel AI logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);
        
        const response = await getSentinelAILogs({
          page: apiPage,
          limit,
          search,
          timeRange,
          sortBy: '@timestamp',
          sortOrder: 'desc'
        });
        
        if (response) {
          setLogs(response.logs || []);
          setTotalRows(response.pagination?.total || 0);
          console.log(`Received ${response.logs?.length} Sentinel AI logs out of ${response.pagination?.total} total`);
        } else {
          console.error('Invalid response format');
          setError('Invalid response from server');
        }
      } else {
        // Fetch ML Analysis logs
        console.log(`Fetching ML Analysis logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);
        
        const response = await getMLAnalysisLogs({
          page: apiPage,
          limit,
          search,
          timeRange,
          sortBy: '@timestamp',
          sortOrder: 'desc'
        });
        
        if (response) {
          setLogs(response.logs || []);
          setTotalRows(response.pagination?.total || 0);
          console.log(`Received ${response.logs?.length} ML Analysis logs out of ${response.pagination?.total} total`);
        } else {
          console.error('Invalid response format');
          setError('Invalid response from server');
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.message || 'Failed to fetch logs. Please try again later.');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
    setSearchTerm('');
  };

  const handleRefresh = () => {
    fetchLogs(page, pageSize, searchTerm);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    setPage(0);
    fetchLogs(0, pageSize, searchTerm);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  // Open StructuredLogView dialog
  const handleViewFullDetails = () => {
    setShowStructuredView(true);
  };

  // Close StructuredLogView dialog
  const handleCloseStructuredView = () => {
    setShowStructuredView(false);
  };

  const handlePageChange = (newPage) => {
    console.log(`Page changing from ${page} to ${newPage}`);
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    console.log(`Page size changing from ${pageSize} to ${newPageSize}`);
    setPageSize(newPageSize);
    setPage(0);
  };

  // Handle export
  const handleExport = () => {
    setExportDialogOpen(true);
  };

  // Export current page logs
  const exportCurrentPage = () => {
    setExportDialogOpen(false);
    let success;
    
    if (tabValue === 0) {
      // Export Sentinel AI logs
      success = exportSentinelAIToCSV(logs, `sentinel_ai_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
    } else {
      // Export ML Analysis logs
      success = exportMLAnalysisToCSV(logs, `ml_analysis_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
    }
    
    setSnackbar({
      open: true,
      message: success ? 'Logs exported successfully' : 'Failed to export logs',
      severity: success ? 'success' : 'error'
    });
  };

  // Export all logs for current filters
  const exportAllLogs = async () => {
    setExportDialogOpen(false);
    setLoading(true);

    try {
      // Fetch all logs with current filters but larger page size
      const maxResults = Math.min(totalRows, 5000); // Limit to 5,000 to prevent memory issues
      
      if (tabValue === 0) {
        // Fetch and export Sentinel AI logs
        const response = await getSentinelAILogs({
          page: 1,
          limit: maxResults,
          search: searchTerm,
          timeRange
        });

        const success = exportSentinelAIToCSV(
          response.logs || [],
          `all_sentinel_ai_logs_${formatDateForFileName(new Date())}.csv`
        );

        setSnackbar({
          open: true,
          message: success
            ? `Exported ${response.logs?.length || 0} Sentinel AI logs successfully`
            : 'Failed to export logs',
          severity: success ? 'success' : 'error'
        });
      } else {
        // Fetch and export ML Analysis logs
        const response = await getMLAnalysisLogs({
          page: 1,
          limit: maxResults,
          search: searchTerm,
          timeRange
        });

        const success = exportMLAnalysisToCSV(
          response.logs || [],
          `all_ml_analysis_logs_${formatDateForFileName(new Date())}.csv`
        );

        setSnackbar({
          open: true,
          message: success
            ? `Exported ${response.logs?.length || 0} ML Analysis logs successfully`
            : 'Failed to export logs',
          severity: success ? 'success' : 'error'
        });
      }
    } catch (error) {
      console.error('Error exporting all logs:', error);
      setSnackbar({
        open: true,
        message: 'Failed to export logs',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    } catch(e) {
      return 'Invalid Date';
    }
  };

  // DataGrid column definitions for Sentinel AI tab
  const sentinelAIColumns = [
    {
      field: '@timestamp',
      headerName: 'Timestamp',
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => formatTimestamp(params.row['@timestamp']),
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          '&:hover': { color: theme.palette.primary.main }
        }}>
          <EventIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
          <Typography variant="body2">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'agent.name',
      headerName: 'Agent',
      flex: 0.8,
      minWidth: 130,
      valueGetter: (params) => params.row.agent?.name || 'N/A',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          '&:hover': { color: theme.palette.primary.main }
        }}>
          <DnsIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
          <Typography variant="body2" noWrap>
            {params.row.agent?.name || 'N/A'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'agent.ip',
      headerName: 'Agent IP',
      flex: 0.8,
      minWidth: 130,
      valueGetter: (params) => params.row.agent?.ip || 'N/A',
      renderCell: (params) => (
        <Tooltip title={params.row.agent?.ip || 'N/A'}>
          <Typography variant="body2" noWrap sx={{ 
            maxWidth: 120,
            fontFamily: 'monospace',
            fontSize: '0.75rem'
          }}>
            {params.row.agent?.ip || 'N/A'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'rule.level',
      headerName: 'Level',
      flex: 0.5,
      minWidth: 80,
      valueGetter: (params) => params.row.rule?.level || 0,
      renderCell: (params) => {
        const level = params.row.rule?.level || 0;
        return (
          <Chip
            label={level}
            color={getSeverityColor(level)}
            size="small"
            sx={{
              height: '24px',
              fontWeight: 'bold',
              minWidth: '30px'
            }}
          />
        );
      },
      sortable: true
    },
    {
      field: 'rule.description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 220,
      valueGetter: (params) => params.row.rule?.description || 'N/A',
      renderCell: (params) => (
        <Tooltip title={params.row.rule?.description || 'N/A'}>
          <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
            {params.row.rule?.description || 'N/A'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.5,
      minWidth: 80,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View AI Response">
          <IconButton
            size="small"
            color="primary"
            onClick={(event) => {
              event.stopPropagation();
              handleViewDetails(params.row);
            }}
            sx={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              '&:hover': {
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                backgroundColor: theme.palette.primary.light
              }
            }}
          >
            <SmartToyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  // DataGrid column definitions for ML Analysis tab
  const mlAnalysisColumns = [
    {
      field: '@timestamp',
      headerName: 'Timestamp',
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => formatTimestamp(params.row['@timestamp']),
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          '&:hover': { color: theme.palette.primary.main }
        }}>
          <EventIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
          <Typography variant="body2">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'agent.name',
      headerName: 'Agent',
      flex: 0.8,
      minWidth: 130,
      valueGetter: (params) => params.row.agent?.name || 'N/A',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          '&:hover': { color: theme.palette.primary.main }
        }}>
          <DnsIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
          <Typography variant="body2" noWrap>
            {params.row.agent?.name || 'N/A'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'data.ML_logs.anomaly_score',
      headerName: 'Anomaly Score',
      flex: 0.8,
      minWidth: 130,
      valueGetter: (params) => params.row.data?.ML_logs?.anomaly_score || 0,
      renderCell: (params) => {
        const score = params.row.data?.ML_logs?.anomaly_score || 0;
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%'
          }}>
            <Box sx={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center', 
              width: '100%'
            }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(score, 100)}
                color={getAnomalyScoreColor(score)}
                sx={{ 
                  height: 8, 
                  borderRadius: 4, 
                  width: '100%',
                  bgcolor: alpha(theme.palette.background.paper, 0.3)
                }}
              />
              <Typography
                variant="body2"
                fontWeight="bold"
                color={theme.palette[getAnomalyScoreColor(score)].main}
                sx={{ 
                  ml: 1,
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  px: 1,
                  borderRadius: 1
                }}
              >
                {score.toFixed(1)}
              </Typography>
            </Box>
          </Box>
        );
      },
      sortable: true
    },
    {
      field: 'data.ML_logs.severity',
      headerName: 'Severity',
      flex: 0.6,
      minWidth: 100,
      valueGetter: (params) => params.row.data?.ML_logs?.severity || 'N/A',
      renderCell: (params) => {
        const severity = params.row.data?.ML_logs?.severity || 'Unknown';
        return (
          <Chip
            label={severity}
            color={getSeverityColor(0, severity)}
            size="small"
            sx={{
              height: '24px',
              fontWeight: 'bold'
            }}
          />
        );
      },
      sortable: true
    },
    {
      field: 'rule.description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 220,
      valueGetter: (params) => params.row.rule?.description || 'N/A',
      renderCell: (params) => (
        <Tooltip title={params.row.rule?.description || 'N/A'}>
          <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
            {params.row.rule?.description || 'N/A'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.5,
      minWidth: 80,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View ML Analysis">
          <IconButton
            size="small"
            color="primary"
            onClick={(event) => {
              event.stopPropagation();
              handleViewDetails(params.row);
            }}
            sx={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              '&:hover': {
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                backgroundColor: theme.palette.primary.light
              }
            }}
          >
            <PsychologyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600,
            background: 'linear-gradient(45deg, #3366FF, #00CCFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: theme.palette.mode === 'dark'
              ? '0 2px 10px rgba(255,255,255,0.1)'
              : '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            {tabValue === 0 ? (
              <>
                <SmartToyIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                Sentinel AI
              </>
            ) : (
              <>
                <PsychologyIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                ML Analysis
              </>
            )}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 0.5 }}>
            {tabValue === 0 
              ? 'AI-powered threat analysis and response'
              : 'Machine learning anomaly detection and analysis'
            }
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            disabled={loading}
          />

          <Tooltip title="Refresh Data">
            <IconButton
              color="primary"
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                borderRadius: '50%',
                '&:hover': {
                  bgcolor: theme.palette.action.hover
                }
              }}
            >
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={loading || logs.length === 0}
            sx={{
              borderRadius: 28,
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Sentinel AI tabs"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              fontWeight: 500
            }
          }}
        >
          <Tab
            icon={<SmartToyIcon />}
            iconPosition="start"
            label="Sentinel AI"
            id="sentinel-ai-tab-0"
            aria-controls="sentinel-ai-tabpanel-0"
          />
          <Tab
            icon={<PsychologyIcon />}
            iconPosition="start"
            label="ML Analysis"
            id="sentinel-ai-tab-1"
            aria-controls="sentinel-ai-tabpanel-1"
          />
        </Tabs>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {tabValue === 0 ? 'AI Response Events' : 'ML Analysis Events'}
          </Typography>
        </Box>

        <form onSubmit={handleSearch}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={tabValue === 0 
              ? "Search AI responses, agent names, rule descriptions..." 
              : "Search ML analysis, anomaly scores, agent names..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: isSearching ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : searchTerm ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchTerm('');
                      fetchLogs(0, pageSize, '');
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                borderRadius: 2,
                '&:hover': {
                  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05)'
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.25)'
                }
              }
            }}
          />
        </form>
      </Paper>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 
            `Loading ${tabValue === 0 ? 'AI' : 'ML'} events...` : 
            `${totalRows.toLocaleString()} ${tabValue === 0 ? 'AI' : 'ML'} events found`
          }
        </Typography>
      </Box>

      <Paper
        sx={{
          height: 'calc(100vh - 330px)',
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'background.paper',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}
      >
        {loading && logs.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" p={3}>
            {tabValue === 0 ? (
              <SmartToyIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
            ) : (
              <PsychologyIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
            )}
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No {tabValue === 0 ? 'AI response' : 'ML analysis'} events found
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Try adjusting your search terms or time range to see more results.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Box>
        ) : (
          <DataGrid
            rows={logs}
            columns={tabValue === 0 ? sentinelAIColumns : mlAnalysisColumns}
            pagination
            paginationMode="server"
            rowCount={totalRows}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            rowsPerPageOptions={[50, 100, 500]}
            disableSelectionOnClick
            loading={loading}
            getRowId={(row) => row.id || row._id || `row-${Math.random()}`}
            sx={{
              '& .MuiDataGrid-cell': {
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.palette.divider}`,
                padding: '8px 16px',
                fontSize: '0.875rem'
              },
              '& .MuiDataGrid-columnHeaders': {
                borderBottom: `2px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                fontSize: '0.875rem',
                fontWeight: 600
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              },
              border: 'none',
              '& .MuiDataGrid-columnSeparator': {
                display: 'none'
              },
              '& .MuiDataGrid-virtualScroller': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.01)',
              },
              '& .MuiDataGrid-footer': {
                borderTop: `1px solid ${theme.palette.divider}`
              },
              '& .MuiTablePagination-root': {
                fontSize: '0.875rem'
              }
            }}
            onRowClick={(params) => handleViewDetails(params.row)}
          />
        )}
      </Paper>

      {/* AI Response View with typewriter effect */}
      {selectedLog && (
        <AIResponseView
          data={selectedLog}
          onClose={handleCloseDetails}
          onViewFullDetails={handleViewFullDetails}
          isMlResponse={tabValue === 1}
        />
      )}

      {/* StructuredLogView Dialog - Only shown when explicitly opened */}
      {selectedLog && showStructuredView && (
        <StructuredLogView
          data={selectedLog}
          onClose={handleCloseStructuredView}
          open={showStructuredView}
        />
      )}

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }
        }}
      >
        <DialogTitle>
          Export {tabValue === 0 ? 'Sentinel AI' : 'ML Analysis'} Events to CSV
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Choose which events to export:
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportCurrentPage}
              fullWidth
              sx={{ mb: 2, borderRadius: 8, py: 1.2, textTransform: 'none' }}
            >
              Export Current Page ({logs.length} events)
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={exportAllLogs}
              fullWidth
              disabled={totalRows > 5000}
              sx={{ borderRadius: 8, py: 1.2, textTransform: 'none' }}
            >
              Export All Events ({totalRows.toLocaleString()} events)
            </Button>

            {totalRows > 1000 && totalRows <= 5000 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                Exporting a large number of events may take a while and affect performance.
              </Typography>
            )}

            {totalRows > 5000 && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                Too many events to export at once (maximum 5,000). Please refine your search filters.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)} sx={{ borderRadius: 8 }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SentinelAI;