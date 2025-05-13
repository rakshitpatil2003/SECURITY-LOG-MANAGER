import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  CircularProgress
} from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { getLogStats } from '../../services/logs';
import TimeRangeSelector from '../Common/TimeRangeSelector';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    major: 0,
    normal: 0,
    ruleLevels: [],
    dailyLogs: []
  });
  
  const { setPageTitle } = useOutletContext();

  

  useEffect(() => {
    // Set page title
    setPageTitle('Dashboard');
    
    // Load dashboard statistics
    fetchDashboardStats();
  }, [setPageTitle]);

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getLogStats(timeRange);
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for rule level distribution chart
  const ruleLevelData = {
    labels: stats.ruleLevels?.map(level => `Level ${level.level}`) || [],
    datasets: [
      {
        label: 'Rule Levels',
        data: stats.ruleLevels?.map(level => level.count) || [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for daily logs chart
  const dailyLogsData = {
    labels: stats.dailyLogs?.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString();
    }) || [],
    datasets: [
      {
        label: 'Daily Logs',
        data: stats.dailyLogs?.map(day => day.count) || [],
        fill: false,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.1
      }
    ]
  };

  // Severity distribution chart options
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Rule Level Distribution'
      }
    }
  };

  // Daily logs chart options
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Daily Logs'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Typography variant="body1" mt={2}>
          Please try refreshing the page or contact your administrator.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Security Dashboard
      </Typography>
      <TimeRangeSelector 
        value={timeRange}
        onChange={setTimeRange}
        disabled={loading}
      />
      
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card 
            raised 
            sx={{ 
              height: '100%',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Logs
              </Typography>
              <Typography variant="h3">
                {stats.total.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            raised 
            sx={{ 
              height: '100%',
              background: 'linear-gradient(45deg, #FF5722 30%, #FF9800 90%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Major Events
              </Typography>
              <Typography variant="h3">
                {stats.major.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            raised 
            sx={{ 
              height: '100%',
              background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Normal Events
              </Typography>
              <Typography variant="h3">
                {stats.normal.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box height={300}>
              <Doughnut data={ruleLevelData} options={doughnutOptions} />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box height={300}>
              <Line data={dailyLogsData} options={lineOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;