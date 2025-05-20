// frontend/src/components/Common/Settings.js
import React, { useState, useContext } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Switch, 
  FormControlLabel, 
  Divider, 
  Card, 
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { ThemeContext } from '../../context/ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PaletteIcon from '@mui/icons-material/Palette';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import ReactECharts from 'echarts-for-react';

const Settings = () => {
  const theme = useTheme();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [showSampleChart, setShowSampleChart] = useState(true);

  // Sample chart data to show how charts look in different themes
  const getSampleChartOption = () => {
    return {
      title: {
        text: 'Sample Chart',
        left: 'center',
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontSize: 16,
          fontWeight: 500
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary
        }
      },
      legend: {
        data: ['Security Events', 'Alerts'],
        bottom: 0,
        textStyle: {
          color: theme.palette.text.secondary
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        axisLabel: {
          color: theme.palette.text.secondary
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme.palette.text.secondary
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          }
        }
      },
      series: [
        {
          name: 'Security Events',
          data: [150, 230, 224, 218, 135, 147, 260],
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#2196F3'
          },
          lineStyle: {
            width: 3,
            color: '#2196F3'
          }
        },
        {
          name: 'Alerts',
          data: [50, 80, 67, 132, 90, 30, 20],
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#FF5722'
          },
          lineStyle: {
            width: 3,
            color: '#FF5722'
          }
        }
      ],
      backgroundColor: 'transparent'
    };
  };

  // Sample pie chart to show distribution
  const getSamplePieChartOption = () => {
    return {
      title: {
        text: 'Event Distribution',
        left: 'center',
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontSize: 16,
          fontWeight: 500
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
        borderColor: theme.palette.divider,
        textStyle: {
          color: theme.palette.text.primary
        }
      },
      legend: {
        orient: 'vertical',
        left: 10,
        top: 'center',
        textStyle: {
          color: theme.palette.text.secondary
        }
      },
      series: [
        {
          name: 'Event Types',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: theme.palette.background.paper,
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 1048, name: 'Authentication' },
            { value: 735, name: 'Network' },
            { value: 580, name: 'System' },
            { value: 484, name: 'Application' },
            { value: 300, name: 'Other' }
          ]
        }
      ],
      backgroundColor: 'transparent'
    };
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card raised elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PaletteIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6" gutterBottom>
                  Appearance
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={darkMode} 
                      onChange={toggleDarkMode} 
                      color="primary" 
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                      </Typography>
                      {darkMode ? 
                        <DarkModeIcon fontSize="small" color="primary" /> : 
                        <LightModeIcon fontSize="small" color="primary" />
                      }
                    </Box>
                  }
                />

                <Tooltip title="Toggle dark/light mode to better visualize charts and UI elements">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 2,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                borderRadius: 1
              }}>
                <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                  Dark mode optimizes visibility for charts and reduces eye strain during night operations.
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={showSampleChart} 
                      onChange={() => setShowSampleChart(!showSampleChart)} 
                      color="primary" 
                      size="small"
                    />
                  }
                  label="Show sample charts"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card raised elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SaveIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="h6" gutterBottom>
                  Preferences
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Typography variant="body1" paragraph>
                Your theme preference is automatically saved and will be applied each time you log in.
              </Typography>
              
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.primary.main}`,
              }}>
                <Typography variant="body2">
                  Currently using: <strong>{theme.palette.mode === 'dark' ? 'Dark Theme' : 'Light Theme'}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showSampleChart && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Line Chart Preview
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 300 }}>
                <ReactECharts 
                  option={getSampleChartOption()} 
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pie Chart Preview
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ height: 300 }}>
                <ReactECharts 
                  option={getSamplePieChartOption()} 
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Settings;