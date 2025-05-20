// frontend/src/components/Logs/MajorLogs.js
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Zoom
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
import ErrorIcon from '@mui/icons-material/Error';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import ShieldIcon from '@mui/icons-material/Shield';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { StructuredLogView } from './StructuredLogView';

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
import { Bar, Pie, Line, Doughnut, PolarArea } from 'react-chartjs-2';
import api from '../../services/auth';

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
const exportToCSV = (logs, fileName = 'major_logs.csv') => {
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
      if (log.network) allKeys.add('network.srcIp');
      if (log.network) allKeys.add('network.destIp');
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
          const [parent, child] = key.split('.');
          return log[parent] && log[parent][child] 
            ? `"${String(log[parent][child]).replace(/"/g, '""')}"` 
            : '';
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

const MajorLogs = () => {
  const theme = useTheme();
  const { setPageTitle } = useOutletContext();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
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
  
  const dashboardRef = useRef(null);
  const dataGridRef = useRef(null);

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
    severity: {
      12: 'rgba(255, 159, 64, 0.7)', // Major
      13: 'rgba(255, 99, 132, 0.7)', // High
      14: 'rgba(255, 99, 132, 0.7)', // High
      15: 'rgba(153, 0, 0, 0.7)'     // Critical
    }
  };

  useEffect(() => {
    setPageTitle('Major Security Events');
    fetchMajorLogs();
  }, [timeRange]);

  useEffect(() => {
    if (tabValue === 1) {
      // If on the Events tab, fetch logs with pagination
      fetchMajorLogs(page, pageSize, searchTerm);
    }
  }, [tabValue, page, pageSize]);

  const fetchMajorLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
    try {
      setLoading(true);
      setError(null);
  
      // Convert to 1-indexed for API
      const apiPage = currentPage + 1;
      
      console.log(`Fetching major logs page ${apiPage} with limit ${limit}`); // Add logging
  
      const response = await api.get('/logs/major', {
        params: {
          page: apiPage,
          limit,
          search,
          timeRange
        }
      });
  
      if (response && response.data) {
        setLogs(response.data.logs || []);
        setStats(response.data.stats || null);
        setTotalRows(response.data.pagination?.total || 0);
        console.log(`Received ${response.data.logs?.length} logs, total: ${response.data.pagination?.total}`);
      } else {
        console.error('Invalid response format:', response);
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error fetching major logs:', error);
      setError('Failed to fetch major logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchMajorLogs(page, pageSize, searchTerm);
  };

  const handleExport = () => {
    if (tabValue === 0) {
      // Export dashboard as PDF
      exportReportToPdf(dashboardRef.current, timeRange, new Date(), 'Major Security Events');
    } else {
      // Export logs to CSV
      setExportDialogOpen(true);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchMajorLogs(0, pageSize, searchTerm);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchMajorLogs(newPage, pageSize, searchTerm);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(0);
    fetchMajorLogs(0, newPageSize, searchTerm);
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
    const success = exportToCSV(logs, `major_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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
      
      const response = await api.get('/logs/major', {
        params: {
          page: 1,
          limit: maxResults,
          search: searchTerm,
          timeRange
        }
      });
      
      const success = exportToCSV(
        response.data.logs || [],
        `all_major_logs_${formatDateForFileName(new Date())}.csv`
      );
      
      setSnackbar({
        open: true,
        message: success 
          ? `Exported ${response.data.logs?.length || 0} logs successfully` 
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
    if (numLevel >= 13) return 'error';
    if (numLevel >= 12) return 'warning';
    return 'warning';
  };

  // Helper to get rule level label
  const getRuleLevelLabel = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'Critical';
    if (numLevel >= 13) return 'High';
    if (numLevel === 12) return 'Major';
    return 'Unknown';
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
  const getSeverityData = () => {
    if (!stats?.byLevel) return {
      labels: [],
      datasets: []
    };

    // Group rule levels into severity categories
    const severityGroups = {
      'Critical (Level 15+)': 0,
      'High (Level 13-14)': 0,
      'Major (Level 12)': 0
    };

    stats.byLevel.forEach(level => {
      const levelNum = parseInt(level.level, 10);
      if (levelNum >= 15) {
        severityGroups['Critical (Level 15+)'] += level.count;
      } else if (levelNum >= 13) {
        severityGroups['High (Level 13-14)'] += level.count;
      } else if (levelNum === 12) {
        severityGroups['Major (Level 12)'] += level.count;
      }
    });

    return {
      labels: Object.keys(severityGroups),
      datasets: [
        {
          data: Object.values(severityGroups),
          backgroundColor: [
            'rgba(153, 0, 0, 0.7)',    // Critical - dark red
            'rgba(255, 99, 132, 0.7)', // High - red
            'rgba(255, 159, 64, 0.7)'  // Major - orange
          ],
          borderColor: [
            'rgba(153, 0, 0, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getTimeSeriesData = () => {
    if (!stats?.byTimeInterval) return {
      labels: [],
      datasets: []
    };

    return {
      labels: stats.byTimeInterval.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleDateString();
      }),
      datasets: [
        {
          label: 'Major Events',
          data: stats.byTimeInterval.map(item => item.count),
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

  const getAgentDistributionData = () => {
    if (!stats?.byAgent) return {
      labels: [],
      datasets: []
    };

    return {
      labels: stats.byAgent.map(agent => agent.name).slice(0, 10),
      datasets: [
        {
          label: 'Event Count',
          data: stats.byAgent.map(agent => agent.count).slice(0, 10),
          backgroundColor: chartColors.bar,
          borderColor: chartColors.bar.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  const getMitreTacticsData = () => {
    if (!stats?.mitreCategories?.tactics || stats.mitreCategories.tactics.length === 0) {
      return {
        labels: ['No MITRE data available'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.3)'],
          borderColor: ['rgba(200, 200, 200, 0.5)']
        }]
      };
    }

    return {
      labels: stats.mitreCategories.tactics.slice(0, 8).map(tactic => tactic.key),
      datasets: [
        {
          label: 'Count',
          data: stats.mitreCategories.tactics.slice(0, 8).map(tactic => tactic.doc_count),
          backgroundColor: chartColors.pie.slice(0, 8),
          borderColor: chartColors.pie.slice(0, 8).map(color => color.replace('0.7', '1')),
        }
      ]
    };
  };

  const getMitreTechniquesData = () => {
    if (!stats?.mitreCategories?.techniques || stats.mitreCategories.techniques.length === 0) {
      return {
        labels: ['No techniques data available'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.3)'],
          borderColor: ['rgba(200, 200, 200, 0.5)']
        }]
      };
    }

    return {
      labels: stats.mitreCategories.techniques.slice(0, 8).map(technique => technique.key),
      datasets: [
        {
          label: 'Count',
          data: stats.mitreCategories.techniques.slice(0, 8).map(technique => technique.doc_count),
          backgroundColor: chartColors.pie.slice(1, 9),
          borderColor: chartColors.pie.slice(1, 9).map(color => color.replace('0.7', '1')),
        }
      ]
    };
  };

  const getRuleGroupsData = () => {
    if (!stats?.ruleGroups || stats.ruleGroups.length === 0) {
      return {
        labels: ['No rule groups data available'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.3)'],
          borderColor: ['rgba(200, 200, 200, 0.5)']
        }]
      };
    }

    return {
      labels: stats.ruleGroups.slice(0, 10).map(group => group.name),
      datasets: [
        {
          label: 'Event Count',
          data: stats.ruleGroups.slice(0, 10).map(group => group.count),
          backgroundColor: chartColors.bar.slice(0, 10),
          borderColor: chartColors.bar.slice(0, 10).map(color => color.replace('0.7', '1')),
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

  // DataGrid column definitions
  const columns = [
    {
      field: 'severity',
      headerName: '',
      width: 60,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const level = params.row.rule?.level || 0;
        const color = getRuleLevelColor(level);
        return (
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: theme.palette[color].main,
              boxShadow: `0 0 0 2px ${theme.palette[color].lighter}`
            }} 
          />
        );
      },
      sortable: false
    },
    {
      field: '@timestamp',
      headerName: 'Timestamp',
      flex: 1.2,
      minWidth: 180,
      valueGetter: (params) => formatTimestamp(params.row['@timestamp']),
      renderCell: (params) => (
        <Typography variant="body2">
          {formatTimestamp(params.row['@timestamp'])}
        </Typography>
      )
    },
    {
      field: 'rule.level',
      headerName: 'Severity',
      flex: 0.8,
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
      field: 'network.srcIp',
      headerName: 'Source IP',
      flex: 1,
      minWidth: 130,
      valueGetter: (params) => params.row.network?.srcIp || 'N/A',
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.row.network?.srcIp || 'N/A'}
        </Typography>
      )
    },
    {
      field: 'rule.description',
      headerName: 'Description',
      flex: 2,
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ color: 'error.main', mr: 1.5 }} />
          <Typography variant="h4">
            Major Security Events
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
          aria-label="major logs tabs"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<DashboardIcon />} 
            iconPosition="start" 
            label="Dashboard" 
            id="major-logs-tab-0"
            aria-controls="major-logs-tabpanel-0"
          />
          <Tab 
            icon={<EventIcon />} 
            iconPosition="start" 
            label="Events" 
            id="major-logs-tab-1"
            aria-controls="major-logs-tabpanel-1"
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
            id="major-logs-tabpanel-0"
            aria-labelledby="major-logs-tab-0"
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
                          Total Major Events
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.warning.dark }}>
                          {stats?.total?.toLocaleString() || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2} sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Critical Events (Level 15+)
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.error.dark }}>
                          {stats?.byLevel?.filter(l => parseInt(l.level) >= 15).reduce((acc, curr) => acc + curr.count, 0).toLocaleString() || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2} sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          High Events (Level 13-14)
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                          {stats?.byLevel?.filter(l => parseInt(l.level) >= 13 && parseInt(l.level) < 15).reduce((acc, curr) => acc + curr.count, 0).toLocaleString() || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2} sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Major Events (Level 12)
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                          {stats?.byLevel?.filter(l => parseInt(l.level) === 12).reduce((acc, curr) => acc + curr.count, 0).toLocaleString() || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Charts */}
                <Grid container spacing={3}>
                  {/* Trend over time */}
                  <Grid item xs={12} md={6}>
                    {renderChart(
                      'timeTrend',
                      <Line 
                        data={getTimeSeriesData()} 
                        options={getChartOptions('Major Events Trend Over Time')} 
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
                        data={getSeverityData()} 
                        options={pieOptions} 
                      />,
                      'Severity Distribution',
                      <ErrorIcon color="error" sx={{ mr: 1 }} />
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
                  
                  {/* Rule Groups */}
                  <Grid item xs={12} md={6}>
                    {renderChart(
                      'ruleGroups',
                      <Bar 
                        data={getRuleGroupsData()} 
                        options={getChartOptions('Top 10 Rule Groups', true)} 
                      />,
                      'Top Rule Groups',
                      <SecurityIcon color="warning" sx={{ mr: 1 }} />
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
                      <ShieldIcon color="success" sx={{ mr: 1 }} />
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
                      <ShieldIcon color="secondary" sx={{ mr: 1 }} />
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
            id="major-logs-tabpanel-1"
            aria-labelledby="major-logs-tab-1"
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
                      Major Events Search
                    </Typography>
                  </Box>
                  
                  <form onSubmit={handleSearch}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Search by description, agent, IP address, or any field..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: loading ? (
                          <InputAdornment position="end">
                            <CircularProgress size={20} />
                          </InputAdornment>
                        ) : searchTerm ? (
                          <InputAdornment position="end">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSearchTerm('');
                                fetchMajorLogs(0, pageSize, '');
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
                    {loading ? 'Loading logs...' : `${totalRows.toLocaleString()} major events found`}
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
                      <SecurityIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No major events found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">
                        Try adjusting your search terms or time range to see more results.
                      </Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<RefreshIcon />} 
                        sx={{ mt: 2 }}
                        onClick={() => {
                          setSearchTerm('');
                          fetchMajorLogs();
                        }}
                      >
                        Reset Filters
                      </Button>
                    </Box>
                  ) : (
                    <DataGrid
                      ref={dataGridRef}
                      rows={logs}
                      columns={columns}
                      pagination
                      paginationMode="server"
                      rowCount={totalRows}
                      page={page}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      rowsPerPageOptions={[25, 50, 100]}
                      disableSelectionOnClick
                      loading={loading}
                      getRowId={(row) => row.id || row._id || `row-${Math.random()}`}
                      components={{
                        Toolbar: GridToolbar,
                      }}
                      componentsProps={{
                        toolbar: {
                          showQuickFilter: false,
                          quickFilterProps: { debounceMs: 500 },
                        },
                      }}
                      sx={{
                        border: 'none',
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
              {fullscreenChart === 'timeTrend' && 'Major Events Trend Over Time'}
              {fullscreenChart === 'severityDistribution' && 'Severity Distribution'}
              {fullscreenChart === 'agentDistribution' && 'Top 10 Agents'}
              {fullscreenChart === 'ruleGroups' && 'Top Rule Groups'}
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
                options={getChartOptions('Major Events Trend Over Time')} 
              />
            )}
            {fullscreenChart === 'severityDistribution' && (
              <Doughnut 
                data={getSeverityData()} 
                options={pieOptions} 
              />
            )}
            {fullscreenChart === 'agentDistribution' && (
              <Bar 
                data={getAgentDistributionData()} 
                options={getChartOptions('Top 10 Agents', true)} 
              />
            )}
            {fullscreenChart === 'ruleGroups' && (
              <Bar 
                data={getRuleGroupsData()} 
                options={getChartOptions('Top 10 Rule Groups', true)} 
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
          Export Major Events to CSV
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Choose which logs to export:
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
              Export All Major Events ({totalRows.toLocaleString()} events)
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

export default MajorLogs;