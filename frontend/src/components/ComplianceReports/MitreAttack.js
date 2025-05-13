// src/components/ComplianceReports/MitreAttack.js
import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Chip,
  Link,
  Alert,
  Zoom,
  Stack
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import EventIcon from '@mui/icons-material/Event';
import ShieldIcon from '@mui/icons-material/Shield';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import LaunchIcon from '@mui/icons-material/Launch';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Snackbar from '@mui/material/Snackbar';
import { DataGrid } from '@mui/x-data-grid';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { StructuredLogView } from '../Logs/StructuredLogView';

// Import export utility
import { exportReportToPdf } from '../Reports/Export';

// Import chart libraries
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { getMitreLogs } from '../../services/logs';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Filler
);

// CSV Export utility
const exportToCSV = (logs, fileName = 'mitre_logs.csv') => {
  if (!logs || logs.length === 0) {
    console.error('No logs to export');
    return false;
  }

  try {
    // Get all unique keys from the logs
    const allKeys = new Set();
    logs.forEach(log => {
      Object.keys(log).forEach(key => {
        if (key !== '_score' && key !== 'raw_log' && typeof log[key] !== 'object') {
          allKeys.add(key);
        }
      });
      
      // Add common nested properties
      if (log.rule) allKeys.add('rule.description');
      if (log.rule) allKeys.add('rule.level');
      if (log.agent) allKeys.add('agent.name');
      if (log.rule?.mitre?.id) allKeys.add('rule.mitre.id');
      if (log.rule?.mitre?.tactic) allKeys.add('rule.mitre.tactic');
      if (log.rule?.mitre?.technique) allKeys.add('rule.mitre.technique');
    });

    // Convert Set to Array and sort
    const headers = Array.from(allKeys).sort();
    
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

const MitreAttack = () => {
  const theme = useTheme();
  const { setPageTitle } = useOutletContext();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSearching, setIsSearching] = useState(false);
  
  const dashboardRef = useRef(null);

  // Define chart colors
  const chartColors = {
    bar: [
      'rgba(75, 192, 192, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(255, 99, 132, 0.7)',
    ],
    pie: [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(201, 203, 207, 0.7)',
      'rgba(255, 159, 243, 0.7)',
      'rgba(99, 255, 132, 0.7)',
      'rgba(139, 101, 243, 0.7)',
    ],
    line: 'rgba(75, 192, 192, 0.7)',
    lineBackground: 'rgba(75, 192, 192, 0.2)',
    mitre: {
      tactic: 'rgba(255, 99, 132, 0.7)',
      technique: 'rgba(54, 162, 235, 0.7)',
      id: 'rgba(255, 159, 64, 0.7)'
    }
  };

  useEffect(() => {
    setPageTitle('MITRE ATT&CK');
    fetchMitreLogs();
  }, [timeRange]);

  useEffect(() => {
    if (tabValue === 1) {
      // If on the Events tab, fetch logs with pagination
      fetchMitreLogs(page, pageSize, searchTerm);
    }
  }, [tabValue, page, pageSize]);

  // Fetch logs with MITRE ATT&CK information
  const fetchMitreLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
    try {
      setLoading(true);
      setError(null);

      // Convert to 1-indexed for API
      const apiPage = currentPage + 1;
      
      console.log(`Fetching MITRE logs page ${apiPage} with limit ${limit}`);

      const response = await getMitreLogs({
        page: apiPage,
        limit,
        search,
        timeRange
      });

      if (response) {
        setLogs(response.logs || []);
        setStats(response.stats || null);
        setTotalRows(response.pagination?.total || 0);
        console.log(`Received ${response.logs?.length} logs, total: ${response.pagination?.total}`);
      } else {
        console.error('Invalid response format');
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error fetching MITRE logs:', error);
      setError(error.message || 'Failed to fetch MITRE logs. Please try again later.');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchMitreLogs(page, pageSize, searchTerm);
  };

  const handleExport = () => {
    if (tabValue === 0) {
      // Export dashboard as PDF
      exportReportToPdf(dashboardRef.current, timeRange, new Date(), 'MITRE ATT&CK Analysis');
    } else {
      // Export logs to CSV
      setExportDialogOpen(true);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    setPage(0);
    fetchMitreLogs(0, pageSize, searchTerm);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  const handlePageChange = (newPage) => {
    console.log(`Page changing from ${page} to ${newPage}`);
    setPage(newPage);
    fetchMitreLogs(newPage, pageSize, searchTerm);
  };

  const handlePageSizeChange = (newPageSize) => {
    console.log(`Page size changing from ${pageSize} to ${newPageSize}`);
    setPageSize(newPageSize);
    setPage(0);
    fetchMitreLogs(0, newPageSize, searchTerm);
  };

  const openFullscreen = (chartId) => {
    setFullscreenChart(chartId);
  };

  const closeFullscreen = () => {
    setFullscreenChart(null);
  };

  // Export current page logs
  const exportCurrentPage = () => {
    setExportDialogOpen(false);
    const success = exportToCSV(logs, `mitre_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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
      const maxResults = Math.min(totalRows, 10000); // Limit to 10,000 to prevent memory issues
      
      const response = await getMitreLogs({
        page: 1,
        limit: maxResults,
        search: searchTerm,
        timeRange
      });
      
      const success = exportToCSV(
        response.logs || [],
        `all_mitre_logs_${formatDateForFileName(new Date())}.csv`
      );
      
      setSnackbar({
        open: true,
        message: success 
          ? `Exported ${response.logs?.length || 0} logs successfully` 
          : 'Failed to export logs',
        severity: success ? 'success' : 'error'
      });
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

  // Helper to get rule level color
  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'error';
    if (numLevel >= 12) return 'error';
    if (numLevel >= 8) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  };

  // Helper to get rule level label
  const getRuleLevelLabel = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 12) return 'High';
    if (numLevel >= 8) return 'Medium';
    if (numLevel >= 4) return 'Low';
    return 'Info';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Chart data and options
  const getTimeSeriesData = () => {
    if (!stats?.timeDistribution) return {
      labels: [],
      datasets: []
    };

    return {
      labels: stats.timeDistribution.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString();
      }),
      datasets: [
        {
          label: 'MITRE Events',
          data: stats.timeDistribution.map(item => item.count),
          borderColor: 'rgba(255, 99, 132, 0.8)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.4,
         fill: true,
         pointBackgroundColor: 'rgba(255, 99, 132, 1)',
         pointRadius: 3,
         pointHoverRadius: 5,
       }
     ],
   };
 };

 const getRuleLevelData = () => {
   if (!stats?.byRuleLevel) return {
     labels: [],
     datasets: []
   };

   // Group levels into severity categories
   const severityGroups = {
     'Critical (15+)': 0,
     'High (12-14)': 0,
     'Medium (8-11)': 0,
     'Low (4-7)': 0,
     'Info (0-3)': 0
   };

   stats.byRuleLevel.forEach(item => {
     const level = parseInt(item.level, 10);
     if (level >= 15) {
       severityGroups['Critical (15+)'] += item.count;
     } else if (level >= 12) {
       severityGroups['High (12-14)'] += item.count;
     } else if (level >= 8) {
       severityGroups['Medium (8-11)'] += item.count;
     } else if (level >= 4) {
       severityGroups['Low (4-7)'] += item.count;
     } else {
       severityGroups['Info (0-3)'] += item.count;
     }
   });

   return {
     labels: Object.keys(severityGroups),
     datasets: [
       {
         data: Object.values(severityGroups),
         backgroundColor: [
           'rgba(153, 0, 0, 0.7)',    // Critical
           'rgba(255, 99, 132, 0.7)', // High
           'rgba(255, 159, 64, 0.7)', // Medium
           'rgba(75, 192, 192, 0.7)', // Low
           'rgba(54, 162, 235, 0.7)'  // Info
         ],
         borderColor: [
           'rgba(153, 0, 0, 1)',
           'rgba(255, 99, 132, 1)',
           'rgba(255, 159, 64, 1)',
           'rgba(75, 192, 192, 1)',
           'rgba(54, 162, 235, 1)'
         ],
         borderWidth: 1,
       },
     ],
   };
 };

 const getAgentDistributionData = () => {
   if (!stats?.byAgent) return {
     labels: [],
     datasets: []
   };

   // Get top 10 agents
   const topAgents = stats.byAgent.slice(0, 10);

   return {
     labels: topAgents.map(agent => agent.name),
     datasets: [
       {
         label: 'MITRE Events',
         data: topAgents.map(agent => agent.count),
         backgroundColor: chartColors.bar,
         borderColor: chartColors.bar.map(color => color.replace('0.7', '1')),
         borderWidth: 1,
       },
     ],
   };
 };

 const getMitreTacticsData = () => {
   if (!stats?.byTactic || stats.byTactic.length === 0) {
     return {
       labels: ['No tactics data available'],
       datasets: [{
         data: [1],
         backgroundColor: ['rgba(200, 200, 200, 0.3)'],
         borderColor: ['rgba(200, 200, 200, 0.5)']
       }]
     };
   }

   // Get top 10 tactics
   const topTactics = stats.byTactic.slice(0, 10);

   return {
     labels: topTactics.map(tactic => tactic.name),
     datasets: [
       {
         label: 'Count',
         data: topTactics.map(tactic => tactic.count),
         backgroundColor: chartColors.pie.slice(0, 10),
         borderColor: chartColors.pie.slice(0, 10).map(color => color.replace('0.7', '1')),
       }
     ]
   };
 };

 const getMitreTechniquesData = () => {
   if (!stats?.byTechnique || stats.byTechnique.length === 0) {
     return {
       labels: ['No techniques data available'],
       datasets: [{
         data: [1],
         backgroundColor: ['rgba(200, 200, 200, 0.3)'],
         borderColor: ['rgba(200, 200, 200, 0.5)']
       }]
     };
   }

   // Get top 10 techniques
   const topTechniques = stats.byTechnique.slice(0, 10);

   return {
     labels: topTechniques.map(technique => technique.name),
     datasets: [
       {
         label: 'Count',
         data: topTechniques.map(technique => technique.count),
         backgroundColor: chartColors.pie.slice(1, 11),
         borderColor: chartColors.pie.slice(1, 11).map(color => color.replace('0.7', '1')),
       }
     ]
   };
 };

 const getMitreIdsData = () => {
   if (!stats?.byMitreId || stats.byMitreId.length === 0) {
     return {
       labels: ['No MITRE IDs available'],
       datasets: [{
         data: [1],
         backgroundColor: ['rgba(200, 200, 200, 0.3)'],
         borderColor: ['rgba(200, 200, 200, 0.5)']
       }]
     };
   }

   // Get top 10 MITRE IDs
   const topIds = stats.byMitreId.slice(0, 10);

   return {
     labels: topIds.map(id => id.id),
     datasets: [
       {
         label: 'Count',
         data: topIds.map(id => id.count),
         backgroundColor: chartColors.bar.slice(2, 12),
         borderColor: chartColors.bar.slice(2, 12).map(color => color.replace('0.7', '1')),
         borderWidth: 1,
       }
     ]
   };
 };

 // Chart options
 const getChartOptions = (title, isHorizontal = false) => {
   return {
     responsive: true,
     maintainAspectRatio: false,
     plugins: {
       legend: {
         position: 'top',
         labels: {
           font: {
             family: theme.typography.fontFamily,
             size: 12
           },
           color: theme.palette.text.primary
         }
       },
       title: {
         display: true,
         text: title,
         font: {
           family: theme.typography.fontFamily,
           size: 16,
           weight: 'bold'
         },
         color: theme.palette.text.primary,
         padding: {
           top: 10,
           bottom: 20
         }
       },
       tooltip: {
         backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
         titleColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
         bodyColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
         bodyFont: {
           family: theme.typography.fontFamily
         },
         titleFont: {
           family: theme.typography.fontFamily
         },
         padding: 10,
         boxPadding: 5,
         borderColor: theme.palette.divider,
         borderWidth: 1
       }
     },
     scales: isHorizontal ? {
       x: {
         beginAtZero: true,
         grid: {
           color: theme.palette.divider,
           drawBorder: false
         },
         ticks: {
           color: theme.palette.text.secondary,
           font: {
             family: theme.typography.fontFamily
           }
         }
       },
       y: {
         grid: {
           color: theme.palette.divider,
           drawBorder: false
         },
         ticks: {
           color: theme.palette.text.secondary,
           font: {
             family: theme.typography.fontFamily
           }
         }
       }
     } : {
       x: {
         grid: {
           color: theme.palette.divider,
           drawBorder: false
         },
         ticks: {
           color: theme.palette.text.secondary,
           font: {
             family: theme.typography.fontFamily
           }
         }
       },
       y: {
         beginAtZero: true,
         grid: {
           color: theme.palette.divider,
           drawBorder: false
         },
         ticks: {
           color: theme.palette.text.secondary,
           font: {
             family: theme.typography.fontFamily
           }
         }
       }
     }
   };
 };

 const pieOptions = {
   responsive: true,
   maintainAspectRatio: false,
   plugins: {
     legend: {
       position: 'right',
       labels: {
         font: {
           family: theme.typography.fontFamily,
           size: 12
         },
         color: theme.palette.text.primary
       }
     },
     title: {
       display: true,
       text: 'Severity Distribution',
       font: {
         family: theme.typography.fontFamily,
         size: 16,
         weight: 'bold'
       },
       color: theme.palette.text.primary,
       padding: {
         top: 10,
         bottom: 20
       }
     },
     tooltip: {
       backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
       titleColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
       bodyColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
       bodyFont: {
         family: theme.typography.fontFamily
       },
       titleFont: {
         family: theme.typography.fontFamily
       },
       padding: 10,
       boxPadding: 5,
       borderColor: theme.palette.divider,
       borderWidth: 1
     }
   }
 };

 // Render chart component with fullscreen capability
 const renderChart = (chartId, chartComponent, title, icon) => {
   return (
     <Paper 
       elevation={2} 
       sx={{ 
         p: 2, 
         height: '100%', 
         borderRadius: 2,
         display: 'flex',
         flexDirection: 'column'
       }}
     >
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
         <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
           {icon}
           <Box component="span" sx={{ ml: 1 }}>{title}</Box>
         </Typography>
         <Tooltip title="View Fullscreen">
           <IconButton 
             size="small" 
             onClick={() => openFullscreen(chartId)}
             sx={{ 
               bgcolor: theme.palette.background.paper, 
               boxShadow: 1,
               '&:hover': {
                 bgcolor: theme.palette.action.hover
               }
             }}
           >
             <FullscreenIcon fontSize="small" />
           </IconButton>
         </Tooltip>
       </Box>
       <Divider sx={{ mb: 2 }} />
       <Box sx={{ flexGrow: 1, height: 'calc(100% - 40px)', minHeight: '300px' }}>
         {chartComponent}
       </Box>
     </Paper>
   );
 };

 // Function to render MITRE details in the DataGrid
 const renderMitreDetails = (params) => {
   const mitreData = params.row.rule?.mitre;
   
   if (!mitreData) {
     return <Typography variant="body2">No MITRE data</Typography>;
   }
   
   return (
     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 300 }}>
       {mitreData.id && mitreData.id.map((id, idx) => (
         <Chip
           key={`id-${idx}`}
           label={id}
           size="small"
           sx={{ bgcolor: '#f5f5f5', color: '#d32f2f', fontWeight: 500 }}
         />
       ))}
       
       {mitreData.tactic && mitreData.tactic.map((tactic, idx) => (
         <Chip
           key={`tactic-${idx}`}
           label={tactic}
           size="small"
           sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 500 }}
         />
       ))}
       
       {mitreData.technique && mitreData.technique.map((technique, idx) => (
         <Chip
           key={`technique-${idx}`}
           label={technique}
           size="small"
           sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 500 }}
         />
       ))}
     </Box>
   );
 };

 // DataGrid column definitions
 const columns = [
   {
     field: '@timestamp',
     headerName: 'Timestamp',
     flex: 1,
     minWidth: 180,
     valueGetter: (params) => formatTimestamp(params.row['@timestamp']),
     renderCell: (params) => (
       <Typography variant="body2">
         {formatTimestamp(params.row['@timestamp'])}
       </Typography>
     )
   },
   {
     field: 'agent.name',
     headerName: 'Agent',
     flex: 1,
     minWidth: 150,
     valueGetter: (params) => params.row.agent?.name || 'N/A',
     renderCell: (params) => (
       <Typography variant="body2" noWrap>
         {params.row.agent?.name || 'N/A'}
       </Typography>
     )
   },
   {
     field: 'rule.level',
     headerName: 'Severity',
     flex: 0.7,
     minWidth: 120,
     valueGetter: (params) => params.row.rule?.level || 0,
     renderCell: (params) => {
       const level = params.row.rule?.level || 0;
       return (
         <Chip
           label={`${level} - ${getRuleLevelLabel(level)}`}
           color={getRuleLevelColor(level)}
           size="small"
           sx={{
             height: '24px',
             fontWeight: 500
           }}
         />
       );
     }
   },
   {
     field: 'rule.description',
     headerName: 'Description',
     flex: 1.5,
     minWidth: 250,
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
     field: 'mitre',
     headerName: 'MITRE Details',
     flex: 1.8,
     minWidth: 300,
     sortable: false,
     renderCell: renderMitreDetails
   },
   {
     field: 'actions',
     headerName: 'Actions',
     flex: 0.5,
     minWidth: 80,
     sortable: false,
     renderCell: (params) => (
       <Tooltip title="View Details">
         <IconButton
           size="small"
           color="primary"
           onClick={(event) => {
             event.stopPropagation();
             handleViewDetails(params.row);
           }}
         >
           <VisibilityIcon fontSize="small" />
         </IconButton>
       </Tooltip>
     )
   }
 ];

 return (
   <Box>
     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
       <Box sx={{ display: 'flex', flexDirection: 'column' }}>
         <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
           <ShieldIcon sx={{ mr: 1.5, color: 'error.main' }} />
           MITRE ATT&CK Framework Analysis
         </Typography>
         <Button
           component={Link}
           href="https://attack.mitre.org/#"
           target="_blank"
           rel="noopener"
           sx={{ alignSelf: 'flex-start', mt: 1 }}
           endIcon={<LaunchIcon />}
           color="primary"
         >
           Explore MITRE ATT&CK Framework
         </Button>
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
           disabled={loading}
         >
           Export {tabValue === 0 ? 'PDF' : 'CSV'}
         </Button>
       </Box>
     </Box>

     <Paper sx={{ mb: 3 }}>
       <Tabs
         value={tabValue}
         onChange={handleTabChange}
         aria-label="MITRE ATT&CK tabs"
         indicatorColor="primary"
         textColor="primary"
         sx={{ borderBottom: 1, borderColor: 'divider' }}
       >
         <Tab 
           icon={<DashboardIcon />} 
           iconPosition="start" 
           label="Dashboard" 
           id="mitre-tab-0"
           aria-controls="mitre-tabpanel-0"
         />
         <Tab 
           icon={<EventIcon />} 
           iconPosition="start" 
           label="Events" 
           id="mitre-tab-1"
           aria-controls="mitre-tabpanel-1"
         />
       </Tabs>
     </Paper>

     {loading && !logs.length && !stats ? (
       <Box display="flex" justifyContent="center" alignItems="center" height={400}>
         <CircularProgress />
       </Box>
     ) : error ? (
       <Alert severity="error" sx={{ mb: 3 }}>
         {error}
       </Alert>
     ) : (
       <>
         {/* Dashboard Tab */}
         <Box
           role="tabpanel"
           hidden={tabValue !== 0}
           id="mitre-tabpanel-0"
           aria-labelledby="mitre-tab-0"
           ref={dashboardRef}
         >
           {tabValue === 0 && (
             <>
               {/* Summary Cards */}
               <Grid container spacing={3} sx={{ mb: 3 }}>
                 <Grid item xs={12} sm={6} md={3}>
                   <Card elevation={2} sx={{ borderRadius: 2 }}>
                     <CardContent>
                       <Typography color="text.secondary" gutterBottom>
                         Total MITRE Events
                       </Typography>
                       <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                         {stats?.total?.toLocaleString() || 0}
                       </Typography>
                     </CardContent>
                   </Card>
                 </Grid>
                 
                 <Grid item xs={12} sm={6} md={3}>
                   <Card elevation={2} sx={{ borderRadius: 2 }}>
                     <CardContent>
                       <Typography color="text.secondary" gutterBottom>
                         Unique MITRE IDs
                       </Typography>
                       <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                         {stats?.byMitreId?.length || 0}
                       </Typography>
                     </CardContent>
                   </Card>
                 </Grid>
                 
                 <Grid item xs={12} sm={6} md={3}>
                   <Card elevation={2} sx={{ borderRadius: 2 }}>
                     <CardContent>
                       <Typography color="text.secondary" gutterBottom>
                         Unique Tactics
                       </Typography>
                       <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                         {stats?.byTactic?.length || 0}
                       </Typography>
                     </CardContent>
                   </Card>
                 </Grid>
                 
                 <Grid item xs={12} sm={6} md={3}>
                   <Card elevation={2} sx={{ borderRadius: 2 }}>
                     <CardContent>
                       <Typography color="text.secondary" gutterBottom>
                         Unique Techniques
                       </Typography>
                       <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                         {stats?.byTechnique?.length || 0}
                       </Typography>
                     </CardContent>
                   </Card>
                 </Grid>
               </Grid>

               {/* Charts */}
               <Grid container spacing={3}>
                 {/* MITRE Events Trend */}
                 <Grid item xs={12} md={6}>
                   {renderChart(
                     'timeTrend',
                     <Line 
                       data={getTimeSeriesData()} 
                       options={getChartOptions('MITRE Events Over Time')} 
                     />,
                     'Event Trend',
                     <TimelineIcon color="primary" sx={{ mr: 1 }} />
                   )}
                 </Grid>
                 
                 {/* Severity Distribution */}
                 <Grid item xs={12} md={6}>
                   {renderChart(
                     'severityDistribution',
                     <Doughnut 
                       data={getRuleLevelData()} 
                       options={pieOptions} 
                     />,
                     'Severity Distribution',
                     <WarningIcon color="error" sx={{ mr: 1 }} />
                   )}
                 </Grid>
                 
                 {/* Top Agents */}
                 <Grid item xs={12} md={6}>
                   {renderChart(
                     'agentDistribution',
                     <Bar 
                       data={getAgentDistributionData()} 
                       options={getChartOptions('Top 10 Agents', true)} 
                     />,
                     'Top 10 Agents',
                     <DnsIcon color="info" sx={{ mr: 1 }} />
                   )}
                 </Grid>
                 
                 {/* Top MITRE IDs */}
                 <Grid item xs={12} md={6}>
                   {renderChart(
                     'mitreIds',
                     <Bar 
                       data={getMitreIdsData()} 
                       options={getChartOptions('Top 10 MITRE ATT&CK IDs', true)} 
                     />,
                     'Top MITRE IDs',
                     <ShieldIcon color="secondary" sx={{ mr: 1 }} />
                   )}
                 </Grid>
                 
                 {/* MITRE ATT&CK Tactics */}
                 <Grid item xs={12} md={6}>
                   {renderChart(
                     'mitreTactics',
                     <Pie 
                       data={getMitreTacticsData()} 
                       options={getChartOptions('MITRE ATT&CK Tactics')} 
                     />,
                     'MITRE Tactics',
                     <ShieldIcon color="error" sx={{ mr: 1 }} />
                   )}
                 </Grid>
                 
                 {/* MITRE ATT&CK Techniques */}
                 <Grid item xs={12} md={6}>
                   {renderChart(
                     'mitreTechniques',
                     <Pie 
                       data={getMitreTechniquesData()} 
                       options={getChartOptions('MITRE ATT&CK Techniques')} 
                     />,
                     'MITRE Techniques',
                     <ShieldIcon color="success" sx={{ mr: 1 }} />
                   )}
                 </Grid>
               </Grid>
             </>
           )}
         </Box>

         {/* Events Tab */}
         <Box
           role="tabpanel"
           hidden={tabValue !== 1}
           id="mitre-tabpanel-1"
           aria-labelledby="mitre-tab-1"
         >
           {tabValue === 1 && (
             <>
               <Paper 
                 elevation={0} 
                 sx={{ 
                   p: 2, 
                   mb: 3, 
                   borderRadius: 2,
                   bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
                   border: '1px solid',
                   borderColor: 'divider'
                 }}
               >
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                   <Typography variant="h6" sx={{ fontWeight: 500 }}>
                     MITRE ATT&CK Events
                   </Typography>
                 </Box>
                 
                 <form onSubmit={handleSearch}>
                   <TextField
                     fullWidth
                     variant="outlined"
                     placeholder="Search MITRE events by description, agent, tactic, technique, or ID..."
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
                               fetchMitreLogs(0, pageSize, '');
                             }}
                           >
                             <CloseIcon fontSize="small" />
                           </IconButton>
                         </InputAdornment>
                       ) : null
                     }}
                   />
                 </form>
               </Paper>

               <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Typography variant="body2" color="text.secondary">
                   {loading ? 'Loading MITRE events...' : `${totalRows.toLocaleString()} MITRE events found`}
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
                 }}
               >
                 {loading && logs.length === 0 ? (
                   <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                     <CircularProgress />
                   </Box>
                 ) : logs.length === 0 ? (
                   <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" p={3}>
                     <ShieldIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                     <Typography variant="h6" color="text.secondary" gutterBottom>
                       No MITRE ATT&CK events found
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
                     columns={columns}
                     pagination
                     paginationMode="server"
                     rowCount={totalRows}
                     page={page}
                     pageSize={pageSize}
                     onPageChange={(newPage) => {
                       console.log(`DataGrid requesting page change to: ${newPage}`);
                       handlePageChange(newPage);
                     }}
                     onPageSizeChange={(newSize) => {
                       console.log(`DataGrid requesting page size change to: ${newSize}`);
                       handlePageSizeChange(newSize);
                     }}
                     rowsPerPageOptions={[25, 50, 100]}
                     disableSelectionOnClick
                     loading={loading}
                     getRowId={(row) => row.id || row._id || `row-${Math.random()}`}
                     sx={{
                       '& .MuiDataGrid-cell': {
                         cursor: 'pointer',
                         borderBottom: `1px solid ${theme.palette.divider}`
                       },
                       '& .MuiDataGrid-columnHeaders': {
                         borderBottom: `2px solid ${theme.palette.divider}`,
                         backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                       },
                       '& .MuiDataGrid-row:hover': {
                         backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                       },
                       border: 'none'
                     }}
                     onRowClick={(params) => handleViewDetails(params.row)}
                   />
                 )}
               </Paper>
             </>
           )}
         </Box>
       </>
     )}
     
     {/* Log Details View */}
     {selectedLog && (
       <StructuredLogView
         data={selectedLog}
         onClose={handleCloseDetails}
         open={!!selectedLog}
       />
     )}
     
     {/* Fullscreen Chart Dialog */}
     <Dialog
       open={!!fullscreenChart}
       onClose={closeFullscreen}
       maxWidth="lg"
       fullWidth
       PaperProps={{
         sx: {
           height: '90vh',
           maxHeight: '90vh',
           borderRadius: 2
         }
       }}
       TransitionComponent={Zoom}
     >
       <DialogTitle>
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <Typography variant="h6">
             {fullscreenChart === 'timeTrend' && 'MITRE Events Over Time'}
             {fullscreenChart === 'severityDistribution' && 'Severity Distribution'}
             {fullscreenChart === 'agentDistribution' && 'Top 10 Agents'}
             {fullscreenChart === 'mitreIds' && 'Top 10 MITRE ATT&CK IDs'}
             {fullscreenChart === 'mitreTactics' && 'MITRE ATT&CK Tactics'}
             {fullscreenChart === 'mitreTechniques' && 'MITRE ATT&CK Techniques'}
           </Typography>
           <IconButton edge="end" color="inherit" onClick={closeFullscreen}>
             <CloseIcon />
           </IconButton>
         </Box>
       </DialogTitle>
       <DialogContent dividers>
         <Box sx={{ height: 'calc(100% - 20px)', width: '100%', p: 2 }}>
           {fullscreenChart === 'timeTrend' && (
             <Line 
               data={getTimeSeriesData()} 
               options={getChartOptions('MITRE Events Over Time')} 
             />
           )}
           {fullscreenChart === 'severityDistribution' && (
             <Doughnut 
               data={getRuleLevelData()} 
               options={pieOptions} 
             />
           )}
           {fullscreenChart === 'agentDistribution' && (
             <Bar 
               data={getAgentDistributionData()} 
               options={getChartOptions('Top 10 Agents', true)} 
             />
           )}
           {fullscreenChart === 'mitreIds' && (
             <Bar 
               data={getMitreIdsData()} 
               options={getChartOptions('Top 10 MITRE ATT&CK IDs', true)} 
             />
           )}
           {fullscreenChart === 'mitreTactics' && (
             <Pie 
               data={getMitreTacticsData()} 
               options={getChartOptions('MITRE ATT&CK Tactics')} 
             />
           )}
           {fullscreenChart === 'mitreTechniques' && (
             <Pie 
               data={getMitreTechniquesData()} 
               options={getChartOptions('MITRE ATT&CK Techniques')} 
             />
           )}
         </Box>
       </DialogContent>
       <DialogActions>
         <Button onClick={closeFullscreen} startIcon={<FullscreenExitIcon />}>
           Exit Fullscreen
         </Button>
       </DialogActions>
     </Dialog>
     
     {/* Export Dialog */}
     <Dialog
       open={exportDialogOpen}
       onClose={() => setExportDialogOpen(false)}
       maxWidth="sm"
       fullWidth
     >
       <DialogTitle>
         Export MITRE Events to CSV
       </DialogTitle>
       <DialogContent>
         <Typography variant="body1" paragraph>
           Choose which MITRE events to export:
         </Typography>
         
         <Box sx={{ mt: 2 }}>
           <Button
             variant="outlined"
             startIcon={<DownloadIcon />}
             onClick={exportCurrentPage}
             fullWidth
             sx={{ mb: 2 }}
           >
             Export Current Page ({logs.length} events)
           </Button>
           
           <Button
             variant="contained"
             color="primary"
             startIcon={<DownloadIcon />}
             onClick={exportAllLogs}
             fullWidth
             disabled={totalRows > 10000}
           >
             Export All MITRE Events ({totalRows.toLocaleString()} events)
           </Button>
           
           {totalRows > 10000 && (
             <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
               Too many events to export at once (maximum 10,000). Please refine your search filters.
             </Typography>
           )}
         </Box>
       </DialogContent>
       <DialogActions>
         <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
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

export default MitreAttack;