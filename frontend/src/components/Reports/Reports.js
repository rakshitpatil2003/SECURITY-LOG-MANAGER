// frontend/src/components/Reports/Reports.js
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
import api from '../../services/auth';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';

// Import export utility
import { exportReportToPdf } from './Export';

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
import { Bar, Pie, Line, Doughnut, Radar } from 'react-chartjs-2';
import * as d3 from 'd3';

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

const Reports = () => {
  const theme = useTheme();
  const { setPageTitle } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [reportData, setReportData] = useState(null);
  const [topAgents, setTopAgents] = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const reportSectionRef = useRef(null);

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
  };

  useEffect(() => {
    setPageTitle('Security Reports');
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch log statistics
      const logsResponse = await api.get('/logs/stats/overview', {
        params: { timeRange }
      });

      // Fetch ticket statistics
      const ticketsResponse = await api.get('/tickets', {
        params: {
          page: 1,
          limit: 1000
        }
      });

      // Process results to get top agents and IPs
      const agentCounts = processTopAgents(logsResponse.data);
      const ipCounts = processTopIPs(logsResponse.data);
      
      setReportData({
        logs: logsResponse.data,
        tickets: ticketsResponse.data.tickets
      });
      
      setTopAgents(agentCounts);
      setTopIPs(ipCounts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process data to get top 10 agents
  const processTopAgents = (logsData) => {
    // This is a placeholder - your actual implementation will depend on your log data structure
    // For demonstration, we'll generate some mock data
    const mockAgents = [
      { name: "Agent_001", count: 145 },
      { name: "Win_Security", count: 122 },
      { name: "Linux_Server_1", count: 109 },
      { name: "DB_Server", count: 94 },
      { name: "FW_Endpoint", count: 78 },
      { name: "Auth_Server", count: 67 },
      { name: "Web_Proxy", count: 61 },
      { name: "DMZ_Host", count: 52 },
      { name: "IDS_System", count: 43 },
      { name: "SIEM_Agent", count: 35 }
    ];
    
    return mockAgents;
  };

  // Process data to get top 10 source IPs
  const processTopIPs = (logsData) => {
    // This is a placeholder - your actual implementation will depend on your log data structure
    // For demonstration, we'll generate some mock data
    const mockIPs = [
      { ip: "192.168.1.135", count: 208 },
      { ip: "10.0.0.23", count: 172 },
      { ip: "172.16.8.14", count: 165 },
      { ip: "192.168.0.5", count: 124 },
      { ip: "10.10.43.18", count: 97 },
      { ip: "192.168.55.2", count: 86 },
      { ip: "172.16.45.12", count: 72 },
      { ip: "10.1.6.88", count: 65 },
      { ip: "192.168.3.179", count: 58 },
      { ip: "172.16.100.45", count: 52 }
    ];
    
    return mockIPs;
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  const handleExport = () => {
    exportReportToPdf(reportSectionRef.current, timeRange, lastUpdated);
  };

  const openFullscreen = (chartId) => {
    setFullscreenChart(chartId);
  };

  const closeFullscreen = () => {
    setFullscreenChart(null);
  };

  // Chart data and options
  const getSeverityData = () => {
    if (!reportData?.logs?.ruleLevels) return {
      labels: [],
      datasets: []
    };

    return {
      labels: reportData.logs.ruleLevels.map(item => `Level ${item.level}`),
      datasets: [
        {
          label: 'Severity Distribution',
          data: reportData.logs.ruleLevels.map(item => item.count),
          backgroundColor: chartColors.pie,
          borderColor: chartColors.pie.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  const getDailyLogsData = () => {
    if (!reportData?.logs?.dailyLogs) return {
      labels: [],
      datasets: []
    };

    return {
      labels: reportData.logs.dailyLogs.map(item => new Date(item.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Daily Logs',
          data: reportData.logs.dailyLogs.map(item => item.count),
          borderColor: chartColors.line,
          backgroundColor: chartColors.lineBackground,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: chartColors.line.replace('0.7', '1'),
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  const getTicketStatusData = () => {
    if (!reportData?.tickets) return {
      labels: [],
      datasets: []
    };

    const statusCounts = reportData.tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: chartColors.pie.slice(0, Object.keys(statusCounts).length),
          borderColor: chartColors.pie.slice(0, Object.keys(statusCounts).length).map(color => color.replace('0.7', '1')),
          borderWidth: 1,
          hoverOffset: 15,
        },
      ],
    };
  };

  const getTopAgentsData = () => {
    return {
      labels: topAgents.map(agent => agent.name),
      datasets: [
        {
          label: 'Event Count',
          data: topAgents.map(agent => agent.count),
          backgroundColor: chartColors.bar,
          borderColor: chartColors.bar.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  const getTopIPsData = () => {
    return {
      labels: topIPs.map(ip => ip.ip),
      datasets: [
        {
          label: 'Event Count',
          data: topIPs.map(ip => ip.count),
          backgroundColor: chartColors.bar.slice(1, 6),
          borderColor: chartColors.bar.slice(1, 6).map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
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
        text: 'Ticket Status Distribution',
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <EqualizerIcon sx={{ mr: 1.5 }} />
          Security Reports Dashboard
        </Typography>
        
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
            Export Report
          </Button>
        </Box>
      </Box>

      {loading && !reportData ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      ) : (
        <Box ref={reportSectionRef}>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Logs
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {reportData?.logs?.total?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Major Events
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                    {reportData?.logs?.major?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tickets
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {reportData?.tickets?.length?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Open Tickets
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                    {reportData?.tickets?.filter(t => t.status === 'Open')?.length?.toLocaleString() || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Charts */}
          <Grid container spacing={3}>
            {/* Daily Logs Trend */}
            <Grid item xs={12} md={6}>
              {renderChart(
                'dailyLogs',
                <Line 
                  data={getDailyLogsData()} 
                  options={getChartOptions('Daily Logs Trend')} 
                />,
                'Daily Logs Trend',
                <TimelineIcon color="primary" sx={{ mr: 1 }} />
              )}
            </Grid>
            
            {/* Ticket Status Distribution */}
            <Grid item xs={12} md={6}>
              {renderChart(
                'ticketStatus',
                <Doughnut 
                  data={getTicketStatusData()} 
                  options={pieOptions} 
                />,
                'Ticket Status Distribution',
                <PieChartIcon color="secondary" sx={{ mr: 1 }} />
              )}
            </Grid>
            
            {/* Severity Distribution */}
            <Grid item xs={12} md={6}>
              {renderChart(
                'severityDistribution',
                <Pie 
                  data={getSeverityData()} 
                  options={getChartOptions('Severity Distribution')} 
                />,
                'Severity Distribution',
                <EqualizerIcon color="error" sx={{ mr: 1 }} />
              )}
            </Grid>
            
            {/* Top 10 Agents */}
            <Grid item xs={12} md={6}>
              {renderChart(
                'topAgents',
                <Bar 
                  data={getTopAgentsData()} 
                  options={getChartOptions('Top 10 Agents by Event Count', true)} 
                />,
                'Top 10 Agents',
                <EqualizerIcon color="info" sx={{ mr: 1 }} />
              )}
            </Grid>
            
            {/* Top 10 Source IPs */}
            <Grid item xs={12} md={6}>
              {renderChart(
                'topIPs',
                <Bar 
                  data={getTopIPsData()} 
                  options={getChartOptions('Top 10 Source IPs by Event Count', true)} 
                />,
                'Top 10 Source IPs',
                <EqualizerIcon color="success" sx={{ mr: 1 }} />
              )}
            </Grid>
          </Grid>
        </Box>
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
              {fullscreenChart === 'dailyLogs' && 'Daily Logs Trend'}
              {fullscreenChart === 'ticketStatus' && 'Ticket Status Distribution'}
              {fullscreenChart === 'severityDistribution' && 'Severity Distribution'}
              {fullscreenChart === 'topAgents' && 'Top 10 Agents'}
              {fullscreenChart === 'topIPs' && 'Top 10 Source IPs'}
            </Typography>
            <IconButton edge="end" color="inherit" onClick={closeFullscreen}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ height: 'calc(100% - 20px)', width: '100%', p: 2 }}>
            {fullscreenChart === 'dailyLogs' && (
              <Line 
                data={getDailyLogsData()} 
                options={getChartOptions('Daily Logs Trend')} 
              />
            )}
            {fullscreenChart === 'ticketStatus' && (
              <Doughnut 
                data={getTicketStatusData()} 
                options={pieOptions} 
              />
            )}
            {fullscreenChart === 'severityDistribution' && (
              <Pie 
                data={getSeverityData()} 
                options={getChartOptions('Severity Distribution')} 
              />
            )}
            {fullscreenChart === 'topAgents' && (
              <Bar 
                data={getTopAgentsData()} 
                options={getChartOptions('Top 10 Agents by Event Count', true)} 
              />
            )}
            {fullscreenChart === 'topIPs' && (
              <Bar 
                data={getTopIPsData()} 
                options={getChartOptions('Top 10 Source IPs by Event Count', true)} 
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
    </Box>
  );
};

export default Reports;