// src/components/Logs/Session.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    TextField,
    InputAdornment,
    Chip,
    Alert,
    Zoom,
    Tab,
    Tabs,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import SecurityIcon from '@mui/icons-material/Security';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import RouterIcon from '@mui/icons-material/Router';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import ComputerIcon from '@mui/icons-material/Computer';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import FilterListIcon from '@mui/icons-material/FilterList';
import { DataGrid } from '@mui/x-data-grid';
import { motion, AnimatePresence } from 'framer-motion';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { StructuredLogView } from './StructuredLogView';

// Import export utility
import { exportReportToPdf } from '../Reports/Export';

// Import chart library
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';

// Import service for data fetching
import { getSessionLogs } from '../../services/logs';

// Vibrant color palette
const COLOR_PALETTE = [
    '#4CAF50',   // Green - Success
    '#F44336',   // Red - Failed
    '#2196F3',   // Blue - Firewall
    '#FFA726',   // Orange - Windows
    '#9C27B0',   // Purple - Linux
    '#607D8B',   // Blue Gray - Mac
    '#795548',   // Brown
    '#FF5722',   // Deep Orange
];

// Export to CSV utility 
const exportToCSV = (logs, fileName = 'session_logs.csv') => {
    if (!logs || logs.length === 0) {
        console.error('No logs to export');
        return false;
    }

    try {
        // Get all unique keys for CSV header
        const baseKeys = ['id', '@timestamp', 'agent.name', 'rule.level', 'rule.description'];
        const sessionKeys = [
            'data.dstuser',
            'data.srcuser',
            'data.user',
            'data.win.eventdata.targetUserName',
            'data.action'
        ];

        const headers = [...baseKeys, ...sessionKeys, 'deviceType', 'authResult'];

        // Create CSV header row
        let csv = headers.join(',') + '\n';

        // Add data rows
        logs.forEach(log => {
            // Determine device type and auth result
            const deviceType = getDeviceType(log);
            const authResult = getAuthResult(log);

            const row = headers.map(key => {
                // Handle special computed fields
                if (key === 'deviceType') return `"${deviceType}"`;
                if (key === 'authResult') return `"${authResult}"`;

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

                    // Format dates
                    if (key.includes('time') && value) {
                        try {
                            return `"${new Date(value).toISOString().replace(/"/g, '""')}"`;
                        } catch (e) {
                            return `"${String(value).replace(/"/g, '""')}"`;
                        }
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

// Utility function to determine device type based on rule groups
const getDeviceType = (log) => {
    if (!log.rule || !log.rule.groups || !Array.isArray(log.rule.groups)) {
        return 'Unknown';
    }

    const groups = log.rule.groups.map(g => g.toLowerCase());

    if (groups.includes('firewall')) {
        return 'Firewall';
    } else if (groups.includes('windows')) {
        return 'Windows';
    } else if (groups.includes('syslog') && !groups.includes('firewall')) {
        return 'Linux';
    } else if (groups.includes('mac') || groups.includes('apple')) {
        return 'Mac';
    } else {
        return 'Other';
    }
};

// Utility function to determine auth result based on rule groups
const getAuthResult = (log) => {
    if (!log.rule || !log.rule.groups || !Array.isArray(log.rule.groups)) {
        return 'Unknown';
    }

    const groups = log.rule.groups.map(g => g.toLowerCase());

    if (groups.includes('authentication_success')) {
        return 'Success';
    } else if (groups.includes('authentication_failed')) {
        return 'Failed';
    } else {
        return 'Unknown';
    }
};

// Utility function to get appropriate icon based on device type
const getDeviceIcon = (deviceType) => {
    switch (deviceType.toLowerCase()) {
        case 'firewall':
            return <RouterIcon />;
        case 'windows':
            return <DesktopWindowsIcon />;
        case 'linux':
            return <ComputerIcon />;
        case 'mac':
            return <LaptopMacIcon />;
        default:
            return <DnsIcon />;
    }
};

// Utility function to get appropriate icon based on auth result
const getAuthResultIcon = (authResult) => {
    switch (authResult.toLowerCase()) {
        case 'success':
            return <CheckCircleIcon />;
        case 'failed':
            return <ErrorIcon />;
        default:
            return <EventIcon />;
    }
};

// Utility function to get appropriate color based on device type
const getDeviceColor = (deviceType, theme) => {
    switch (deviceType.toLowerCase()) {
        case 'firewall':
            return COLOR_PALETTE[2]; // Blue
        case 'windows':
            return COLOR_PALETTE[3]; // Orange
        case 'linux':
            return COLOR_PALETTE[4]; // Purple
        case 'mac':
            return COLOR_PALETTE[5]; // Blue Gray
        default:
            return theme.palette.grey[500];
    }
};

// Utility function to get appropriate color based on auth result
const getAuthResultColor = (authResult, theme) => {
    switch (authResult.toLowerCase()) {
        case 'success':
            return COLOR_PALETTE[0]; // Green
        case 'failed':
            return COLOR_PALETTE[1]; // Red
        default:
            return theme.palette.grey[500];
    }
};

// Main Session Component
const Session = () => {
    const theme = useTheme();
    const { setPageTitle } = useOutletContext();
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
    const [fullscreenTitle, setFullscreenTitle] = useState('');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSearching, setIsSearching] = useState(false);
    const [showStructuredView, setShowStructuredView] = useState(false);
    const [tabValue, setTabValue] = useState(0); // 0 = Dashboard, 1 = Events
    const [authFilterValue, setAuthFilterValue] = useState('');
    const [deviceFilterValue, setDeviceFilterValue] = useState('');

    const dashboardRef = useRef(null);

    useEffect(() => {
        setPageTitle('Session Events');
        fetchSessionLogs();
    }, [timeRange]);

    useEffect(() => {
        if (tabValue === 1) { // Only fetch pagination data when on Events tab
            fetchSessionLogs(page, pageSize, searchTerm);
        }
    }, [page, pageSize, tabValue]);

    useEffect(() => {
        if (stats) {
            console.log('Stats updated:', stats);
            console.log('Authentication by device details:', stats.byAuthAndDevice);
            // Specifically log Windows data
            console.log('Windows auth data:', stats.byAuthAndDevice?.windows);
        }
    }, [stats]);

    // Fetch logs with authentication events
    const fetchSessionLogs = async (
        currentPage = 0,
        limit = pageSize,
        search = searchTerm,
        authFilter = authFilterValue,
        deviceFilter = deviceFilterValue
    ) => {
        try {
            setLoading(true);
            setError(null);

            // Convert to 1-indexed for API
            const apiPage = currentPage + 1;

            console.log(`Fetching session logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}, authFilter=${authFilter}, deviceFilter=${deviceFilter}`);

            // Format auth filter for API
            let authParam = '';
            if (authFilter === 'success') {
                authParam = 'success';
            } else if (authFilter === 'failed') {
                authParam = 'failed';
            }

            // Format device filter for API
            let deviceParam = '';
            if (deviceFilter) {
                deviceParam = deviceFilter.toLowerCase();
            }

            const response = await getSessionLogs({
                page: apiPage,
                limit,
                search,
                timeRange,
                authResult: authParam,
                deviceType: deviceParam,
                sortBy: '@timestamp',
                sortOrder: 'desc'
            });

            if (response) {
                setLogs(response.logs || []);
                setStats(response.stats || null);
                setTotalRows(response.pagination?.total || 0);
                console.log(`Received ${response.logs?.length} session events out of ${response.pagination?.total} total`);
                console.log('Stats received:', response.stats);
            } else {
                console.error('Invalid response format');
                setError('Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching session logs:', error);
            setError(error.message || 'Failed to fetch session logs. Please try again later.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleRefresh = () => {
        fetchSessionLogs(page, pageSize, searchTerm);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setPage(0);
        fetchSessionLogs(0, pageSize, searchTerm);
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setShowStructuredView(true);
    };

    const handleCloseStructuredView = () => {
        setShowStructuredView(false);
        setSelectedLog(null);
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

    const openFullscreen = (chartOption, title) => {
        setFullscreenChart(chartOption);
        setFullscreenTitle(title || 'Chart Details');
    };

    const closeFullscreen = () => {
        setFullscreenChart(null);
        setFullscreenTitle('');
    };

    // Handle tab change
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        if (newValue === 1 && logs.length === 0) {
            // Fetch data when switching to Events tab if no logs loaded yet
            fetchSessionLogs();
        }
    };

    // Handle auth filter change
    const handleAuthFilterChange = (event) => {
        const newValue = event.target.value;
        console.log("Setting auth filter to:", newValue);
        setAuthFilterValue(newValue);

        // Fetch immediately without setTimeout
        fetchSessionLogs(0, pageSize, searchTerm, newValue, deviceFilterValue);
    };

    // Handle device filter change
    const handleDeviceFilterChange = (event) => {
        const newValue = event.target.value;
        console.log("Setting device filter to:", newValue);
        setDeviceFilterValue(newValue);

        // Fetch immediately without setTimeout
        fetchSessionLogs(0, pageSize, searchTerm, authFilterValue, newValue);
    };

    // Export current page logs
    const exportCurrentPage = () => {
        setExportDialogOpen(false);
        const success = exportToCSV(logs, `session_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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

            // Format auth filter for API
            let authFilter = '';
            if (authFilterValue === 'success') {
                authFilter = 'success';
            } else if (authFilterValue === 'failed') {
                authFilter = 'failed';
            }

            // Format device filter for API
            let deviceFilter = '';
            if (deviceFilterValue) {
                deviceFilter = deviceFilterValue.toLowerCase();
            }

            const response = await getSessionLogs({
                page: 1,
                limit: maxResults,
                search: searchTerm,
                timeRange,
                authResult: authFilter,
                deviceType: deviceFilter
            });

            const success = exportToCSV(
                response.logs || [],
                `all_session_logs_${formatDateForFileName(new Date())}.csv`
            );

            setSnackbar({
                open: true,
                message: success
                    ? `Exported ${response.logs?.length || 0} session events successfully`
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

    // Export dashboard as PDF
    const handleExport = () => {
        if (tabValue === 0) {
            // Export dashboard as PDF
            exportReportToPdf(dashboardRef.current, timeRange, new Date());
        } else {
            // Open export dialog for CSV when on Events tab
            setExportDialogOpen(true);
        }
    };

    // Process data for charts
    const processChartData = () => {
        if (!stats) return {
            timelineData: [],
            totalEvents: 0,
            byDeviceType: {},
            byAuthResult: {},
            byAuthAndDevice: {}
        };

        // Create timeline data
        const timelineData = (stats.timeDistribution || []).map(item => ({
            date: new Date(item.date).toLocaleDateString(),
            total: item.count,
            success: item.results?.success || 0,
            failed: item.results?.failed || 0
        }));

        return {
            timelineData,
            totalEvents: stats.total || 0,
            byDeviceType: stats.byDeviceType || {},
            byAuthResult: stats.byAuthResult || {},
            byAuthAndDevice: stats.byAuthAndDevice || {}
        };
    };

    // Timeline Chart Option
    const getTimelineChartOption = () => {
        const chartData = processChartData();
        const timelineData = chartData.timelineData || [];

        // If no data, return a simple placeholder chart
        if (timelineData.length === 0) {
            return {
                title: {
                    text: 'Authentication Events Timeline (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 18,
                        fontWeight: 500
                    }
                },
                xAxis: {
                    type: 'category',
                    data: ['No Data']
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    data: [0],
                    type: 'line'
                }]
            };
        }

        const dates = timelineData.map(item => item.date);

        return {
            title: {
                text: 'Authentication Events Timeline',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 18,
                    fontWeight: 500
                }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                },
                formatter: function (params) {
                    let tooltip = `<strong>${params[0].name}</strong><br />`;

                    // Add each series with its color
                    params.forEach(param => {
                        tooltip += `${param.seriesName}: <span style="color:${param.color};font-weight:bold">${param.value}</span><br />`;
                    });

                    return tooltip;
                }
            },
            legend: {
                data: ['Success', 'Failed'],
                bottom: '0%',
                textStyle: {
                    color: theme.palette.text.primary,
                    fontFamily: theme.typography.fontFamily
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: {
                    color: theme.palette.text.secondary,
                    rotate: 45,
                    fontFamily: theme.typography.fontFamily
                },
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: 'Event Count',
                nameLocation: 'middle',
                nameGap: 50,
                nameTextStyle: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 14
                },
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily
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
                    name: 'Success',
                    type: 'line',
                    stack: 'Total',
                    smooth: true,
                    data: timelineData.map(item => item.success || 0),
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: COLOR_PALETTE[0] // Green
                    },
                    itemStyle: {
                        color: COLOR_PALETTE[0]
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLOR_PALETTE[0]}80` },
                            { offset: 1, color: `${COLOR_PALETTE[0]}10` }
                        ])
                    },
                    emphasis: {
                        focus: 'series',
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                },
                {
                    name: 'Failed',
                    type: 'line',
                    stack: 'Total',
                    smooth: true,
                    data: timelineData.map(item => item.failed || 0),
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: COLOR_PALETTE[1] // Red
                    },
                    itemStyle: {
                        color: COLOR_PALETTE[1]
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLOR_PALETTE[1]}80` },
                            { offset: 1, color: `${COLOR_PALETTE[1]}10` }
                        ])
                    },
                    emphasis: {
                        focus: 'series',
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ],
            backgroundColor: 'transparent'
        };
    };

    // Device Distribution Pie Chart
    const getDeviceDistributionChartOption = () => {
        const chartData = processChartData();
        const deviceData = chartData.byDeviceType || {};

        // Prepare data for pie chart
        const pieData = [
            {
                value: deviceData.firewall || 0,
                name: 'Firewall',
                itemStyle: { color: COLOR_PALETTE[2] }
            },
            {
                value: deviceData.windows || 0,
                name: 'Windows',
                itemStyle: { color: COLOR_PALETTE[3] }
            },
            {
                value: deviceData.linux || 0,
                name: 'Linux',
                itemStyle: { color: COLOR_PALETTE[4] }
            },
            {
                value: deviceData.mac || 0,
                name: 'Mac',
                itemStyle: { color: COLOR_PALETTE[5] }
            }
        ].filter(item => item.value > 0);

        // If no data, return simple placeholder chart
        if (pieData.length === 0) {
            return {
                title: {
                    text: 'Device Distribution (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
                        fontWeight: 500
                    }
                },
                series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    data: [{ value: 1, name: 'No Data' }]
                }]
            };
        }

        return {
            title: {
                text: 'Device Distribution',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
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
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                }
            },
            legend: {
                orient: 'vertical',
                left: 10,
                top: 'center',
                textStyle: {
                    color: theme.palette.text.primary,
                    fontFamily: theme.typography.fontFamily
                },
                formatter: (name) => {
                    const item = pieData.find(i => i.name === name);
                    if (!item) return name;
                    const percentage = (item.value / chartData.totalEvents * 100).toFixed(1);
                    return `${name}: ${item.value} (${percentage}%)`;
                }
            },
            series: [
                {
                    name: 'Device',
                    type: 'pie',
                    radius: ['40%', '70%'],
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
                            fontWeight: 'bold',
                            formatter: '{b}\n{c} ({d}%)'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: pieData
                }
            ],
            backgroundColor: 'transparent'
        };
    };

    // Auth Results Distribution Pie Chart
    const getAuthResultsDistributionChartOption = () => {
        const chartData = processChartData();
        const authData = chartData.byAuthResult || {};

        // Prepare data for pie chart
        const pieData = [
            {
                value: authData.success || 0,
                name: 'Success',
                itemStyle: { color: COLOR_PALETTE[0] }
            },
            {
                value: authData.failed || 0,
                name: 'Failed',
                itemStyle: { color: COLOR_PALETTE[1] }
            }
        ].filter(item => item.value > 0);

        // If no data, return simple placeholder chart
        if (pieData.length === 0) {
            return {
                title: {
                    text: 'Authentication Results (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
                        fontWeight: 500
                    }
                },
                series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    data: [{ value: 1, name: 'No Data' }]
                }]
            };
        }

        return {
            title: {
                text: 'Authentication Results',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
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
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                }
            },
            legend: {
                orient: 'vertical',
                left: 10,
                top: 'center',
                textStyle: {
                    color: theme.palette.text.primary,
                    fontFamily: theme.typography.fontFamily
                },
                formatter: (name) => {
                    const item = pieData.find(i => i.name === name);
                    if (!item) return name;
                    const percentage = (item.value / chartData.totalEvents * 100).toFixed(1);
                    return `${name}: ${item.value} (${percentage}%)`;
                }
            },
            series: [
                {
                    name: 'Result',
                    type: 'pie',
                    radius: ['40%', '70%'],
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
                            fontWeight: 'bold',
                            formatter: '{b}\n{c} ({d}%)'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: pieData
                }
            ],
            backgroundColor: 'transparent'
        };
    };

    // Render chart with fullscreen capability
    const renderChart = (chartOption, title, icon) => {
        return (
            <Paper
                elevation={3}
                sx={{
                    p: 2,
                    height: '100%',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 4px 20px 0 rgba(0,0,0,0.5)'
                        : '0 4px 20px 0 rgba(0,0,0,0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                        boxShadow: theme.palette.mode === 'dark'
                            ? '0 8px 25px 0 rgba(0,0,0,0.6)'
                            : '0 8px 25px 0 rgba(0,0,0,0.15)',
                        '& .fullscreen-icon': {
                            opacity: 1
                        }
                    },
                    transition: 'box-shadow 0.3s ease'
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
                            onClick={() => openFullscreen(chartOption, title)}
                            className="fullscreen-icon"
                            sx={{
                                bgcolor: theme.palette.background.paper,
                                boxShadow: 1,
                                opacity: 0.7,
                                transition: 'opacity 0.2s ease',
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
                    <ReactECharts
                        option={chartOption}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                        theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                        notMerge={true}
                        lazyUpdate={true}
                    />
                </Box>
            </Paper>
        );
    };

    // DataGrid column definitions
    const columns = [
        {
            field: '@timestamp',
            headerName: 'Timestamp',
            flex: 1,
            minWidth: 180,
            valueGetter: (params) => {
                try {
                    if (!params.row['@timestamp']) return 'N/A';
                    return new Date(params.row['@timestamp']).toLocaleString();
                } catch (e) {
                    return 'Invalid Date';
                }
            },
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
            field: 'deviceType',
            headerName: 'Device',
            flex: 0.8,
            minWidth: 120,
            valueGetter: (params) => getDeviceType(params.row),
            renderCell: (params) => {
                const deviceType = params.value;
                const icon = getDeviceIcon(deviceType);
                const color = getDeviceColor(deviceType, theme);

                return (
                    <Chip
                        icon={React.cloneElement(icon, { style: { color } })}
                        label={deviceType}
                        size="small"
                        variant="outlined"
                        sx={{
                            height: '24px',
                            fontWeight: 500,
                            color,
                            borderColor: color,
                            '&:hover': {
                                backgroundColor: `${color}10`
                            }
                        }}
                    />
                );
            },
            sortable: true
        },
        {
            field: 'authResult',
            headerName: 'Result',
            flex: 0.7,
            minWidth: 100,
            valueGetter: (params) => getAuthResult(params.row),
            renderCell: (params) => {
                const authResult = params.value;
                const icon = getAuthResultIcon(authResult);
                const color = getAuthResultColor(authResult, theme);

                return (
                    <Chip
                        icon={React.cloneElement(icon, { style: { color: 'inherit' } })}
                        label={authResult}
                        color={authResult.toLowerCase() === 'success' ? 'success' : authResult.toLowerCase() === 'failed' ? 'error' : 'default'}
                        size="small"
                        sx={{
                            height: '24px',
                            fontWeight: 500,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            '&:hover': {
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            }
                        }}
                    />
                );
            },
            sortable: true
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
            field: 'user',
            headerName: 'User',
            flex: 0.8,
            minWidth: 120,
            valueGetter: (params) => {
                // Extract username from various possible fields
                const data = params.row.data || {};
                return data.dstuser ||
                    data.srcuser ||
                    data.user ||
                    (data.win?.eventdata?.targetUserName) ||
                    'N/A';
            },
            renderCell: (params) => (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { color: theme.palette.primary.main }
                }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                    <Typography variant="body2" noWrap>
                        {params.value}
                    </Typography>
                </Box>
            )
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
                        sx={{
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            '&:hover': {
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                backgroundColor: theme.palette.primary.light
                            }
                        }}
                    >
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )
        }
    ];

    // Create a card for authentication statistics by device type
    const renderDeviceAuthCard = (title, data = {}, deviceType, icon) => {
        const successCount = data.success || 0;
        const failedCount = data.failed || 0;
        const totalCount = successCount + failedCount;
        const deviceColor = getDeviceColor(deviceType, theme);

        return (
            <Grid item xs={12} md={6} lg={3}>
                <Card
                    component={motion.div}
                    whileHover={{
                        y: -5,
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
                    }}
                    transition={{ duration: 0.3 }}
                    elevation={3}
                    sx={{
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${deviceColor}15, ${deviceColor}05)`,
                        position: 'relative',
                        overflow: 'hidden',
                        border: `1px solid ${deviceColor}30`
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2
                        }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontWeight: 600,
                                    color: deviceColor
                                }}
                            >
                                {React.cloneElement(icon, { sx: { mr: 1 } })}
                                {title}
                            </Typography>
                            <Chip
                                label={`Total: ${totalCount}`}
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    bgcolor: `${deviceColor}20`,
                                    color: deviceColor,
                                    border: `1px solid ${deviceColor}40`
                                }}
                            />
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        bgcolor: COLOR_PALETTE[0] + '20',
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: `1px solid ${COLOR_PALETTE[0]}30`
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <CheckCircleIcon sx={{ color: COLOR_PALETTE[0], mr: 1, fontSize: 20 }} />
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: COLOR_PALETTE[0] }}
                                        >
                                            Success
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: COLOR_PALETTE[0] }}>
                                        {successCount.toLocaleString()}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mt: 0.5,
                                            color: COLOR_PALETTE[0] + 'CC'
                                        }}
                                    >
                                        {totalCount > 0
                                            ? `${Math.round(successCount / totalCount * 100)}% of total`
                                            : '0% of total'
                                        }
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        bgcolor: COLOR_PALETTE[1] + '20',
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: `1px solid ${COLOR_PALETTE[1]}30`
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <ErrorIcon sx={{ color: COLOR_PALETTE[1], mr: 1, fontSize: 20 }} />
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: COLOR_PALETTE[1] }}
                                        >
                                            Failed
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: COLOR_PALETTE[1] }}>
                                        {failedCount.toLocaleString()}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mt: 0.5,
                                            color: COLOR_PALETTE[1] + 'CC'
                                        }}
                                    >
                                        {totalCount > 0
                                            ? `${Math.round(failedCount / totalCount * 100)}% of total`
                                            : '0% of total'
                                        }
                                    </Typography>
                                </Card>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
        );
    };

    // Process the data for charts and cards
    // Process the data for charts and cards
    const chartData = processChartData();
    const byAuthAndDevice = chartData.byAuthAndDevice || {};

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h4" sx={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600,
                        background: 'linear-gradient(45deg, #4CAF50, #2196F3)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: theme.palette.mode === 'dark'
                            ? '0 2px 10px rgba(255,255,255,0.1)'
                            : '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <LockIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                        Session Events
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 4 }}>
                        Monitor authentication activities across your network
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
                        disabled={loading}
                        sx={{
                            borderRadius: 8,
                            textTransform: 'none',
                            fontWeight: 500,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            '&:hover': {
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }
                        }}
                    >
                        Export Data
                    </Button>
                </Box>
            </Box>

            {/* Tabs Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="session event tabs"
                    sx={{
                        '& .MuiTab-root': {
                            minHeight: 48,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            px: 3
                        }
                    }}
                >
                    <Tab
                        icon={<SecurityIcon sx={{ mr: 1, fontSize: '1.1rem' }} />}
                        iconPosition="start"
                        label="Dashboard"
                    />
                    <Tab
                        icon={<EventIcon sx={{ mr: 1, fontSize: '1.1rem' }} />}
                        iconPosition="start"
                        label="Events"
                    />
                </Tabs>
            </Box>

            {/* Dashboard Tab Content */}
            {tabValue === 0 && (
                <Box ref={dashboardRef}>
                    {/* Authentication Stats by Device Type */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12}>
                            <Typography variant="h6" component="div" gutterBottom sx={{ fontWeight: 500 }}>
                                Authentication Statistics by Device Type
                            </Typography>
                        </Grid>

                        {renderDeviceAuthCard('Firewall', byAuthAndDevice.firewall, 'firewall', <RouterIcon />)}
                        {renderDeviceAuthCard('Windows', byAuthAndDevice.windows, 'windows', <DesktopWindowsIcon />)}
                        {renderDeviceAuthCard('Linux', byAuthAndDevice.linux, 'linux', <ComputerIcon />)}
                        {renderDeviceAuthCard('Mac', byAuthAndDevice.mac, 'mac', <LaptopMacIcon />)}
                    </Grid>

                    {/* Timeline Chart - Full Width */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12}>
                            {renderChart(
                                getTimelineChartOption(),
                                'Authentication Events Timeline',
                                <TimelineIcon color="primary" sx={{ mr: 1 }} />
                            )}
                        </Grid>
                    </Grid>

                    {/* Charts Row */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                            {renderChart(
                                getDeviceDistributionChartOption(),
                                'Device Distribution',
                                <DnsIcon color="info" sx={{ mr: 1 }} />
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            {renderChart(
                                getAuthResultsDistributionChartOption(),
                                'Authentication Results',
                                <LockIcon color="secondary" sx={{ mr: 1 }} />
                            )}
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Events Tab Content */}
            {tabValue === 1 && (
                <Box>
                    {/* Filters */}
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
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                            flexWrap: 'wrap',
                            gap: 2
                        }}>
                            <Typography variant="h6" sx={{
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <FilterListIcon sx={{ mr: 1 }} />
                                Filter Events
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                    <InputLabel id="auth-result-filter-label">Authentication Result</InputLabel>
                                    <Select
                                        labelId="auth-result-filter-label"
                                        id="auth-result-filter"
                                        value={authFilterValue}
                                        label="Authentication Result"
                                        onChange={handleAuthFilterChange}
                                    >
                                        <MenuItem value="">All Results</MenuItem>
                                        <MenuItem value="success">Success</MenuItem>
                                        <MenuItem value="failed">Failed</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel id="device-filter-label">Device Type</InputLabel>
                                    <Select
                                        labelId="device-filter-label"
                                        id="device-filter"
                                        value={deviceFilterValue}
                                        label="Device Type"
                                        onChange={handleDeviceFilterChange}
                                    >
                                        <MenuItem value="">All Devices</MenuItem>
                                        <MenuItem value="firewall">Firewall</MenuItem>
                                        <MenuItem value="windows">Windows</MenuItem>
                                        <MenuItem value="linux">Linux</MenuItem>
                                        <MenuItem value="mac">Mac</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        <form onSubmit={handleSearch}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Search for users, descriptions, agents..."
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
                                                    fetchSessionLogs(0, pageSize, '');
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
                            {loading ? 'Loading session events...' : `${chartData.totalEvents.toLocaleString()} session events found`}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {authFilterValue && (
                                <Chip
                                    label={`Result: ${authFilterValue === 'success' ? 'Success' : 'Failed'}`}
                                    color={authFilterValue === 'success' ? 'success' : 'error'}
                                    size="small"
                                    onDelete={() => {
                                        setAuthFilterValue('');
                                        fetchSessionLogs(0, pageSize, searchTerm, '', deviceFilterValue);
                                    }}
                                    sx={{ fontWeight: 500 }}
                                />
                            )}

                            {deviceFilterValue && (
                                <Chip
                                    label={`Device: ${deviceFilterValue.charAt(0).toUpperCase() + deviceFilterValue.slice(1)}`}
                                    color="primary"
                                    size="small"
                                    onDelete={() => {
                                        setDeviceFilterValue('');
                                        fetchSessionLogs(0, pageSize, searchTerm, authFilterValue, '');
                                    }}
                                    sx={{ fontWeight: 500 }}
                                />
                            )}

                            {(authFilterValue || deviceFilterValue) && (
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setAuthFilterValue('');
                                        setDeviceFilterValue('');
                                        fetchSessionLogs(0, pageSize, searchTerm, '', '');
                                    }}
                                    sx={{ ml: 1 }}
                                >
                                    Clear All Filters
                                </Button>
                            )}
                        </Box>
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
                                <LockIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No session events found
                                </Typography>
                                <Typography variant="body2" color="text.secondary" align="center">
                                    Try adjusting your search terms, filters or time range to see more results.
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
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                rowsPerPageOptions={[50, 100, 1000]}
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
                </Box>
            )}

            {/* StructuredLogView Dialog - Only shown when explicitly opened */}
            {selectedLog && showStructuredView && (
                <StructuredLogView
                    data={selectedLog}
                    onClose={handleCloseStructuredView}
                    open={showStructuredView}
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
                        borderRadius: 2,
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                    }
                }}
                TransitionComponent={Zoom}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 500 }}>
                            {fullscreenTitle}
                        </Typography>
                        <IconButton edge="end" color="inherit" onClick={closeFullscreen}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ height: 'calc(100% - 20px)', width: '100%', p: 2 }}>
                        {fullscreenChart && (
                            <ReactECharts
                                option={fullscreenChart}
                                style={{ height: '100%', width: '100%' }}
                                opts={{ renderer: 'canvas' }}
                                theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                notMerge={true}
                                lazyUpdate={true}
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
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                    }
                }}
            >
                <DialogTitle>
                    Export Session Events to CSV
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Choose which session events to export:
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
                            disabled={chartData.totalEvents > 10000}
                            sx={{ borderRadius: 8, py: 1.2, textTransform: 'none' }}
                        >
                            Export All Session Events ({chartData.totalEvents.toLocaleString()} events)
                        </Button>

                        {chartData.totalEvents > 5000 && chartData.totalEvents <= 10000 && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                                Exporting a large number of events may take a while and affect performance.
                            </Typography>
                        )}

                        {chartData.totalEvents > 10000 && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                Too many events to export at once (maximum 10,000). Please refine your search filters.
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

export default Session;