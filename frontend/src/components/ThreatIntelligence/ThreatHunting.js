// src/components/ThreatIntelligence/ThreatHunting.js
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
import TimelineIcon from '@mui/icons-material/Timeline';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import LaunchIcon from '@mui/icons-material/Launch';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HuntingIcon from '@mui/icons-material/TravelExplore';
import PublicIcon from '@mui/icons-material/Public';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DirectionsIcon from '@mui/icons-material/Directions';
import MessageIcon from '@mui/icons-material/Message';
import AppsIcon from '@mui/icons-material/Apps';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import Snackbar from '@mui/material/Snackbar';
import { DataGrid } from '@mui/x-data-grid';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { StructuredLogView } from '../Logs/StructuredLogView';

// Import export utility
import { exportReportToPdf } from '../Reports/Export';

// Import chart library
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';

// Import service for data fetching
import { getThreatHuntingLogs } from '../../services/logs';

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

// CSV Export utility
const exportToCSV = (logs, fileName = 'threat_hunting_logs.csv') => {
    if (!logs || logs.length === 0) {
        console.error('No logs to export');
        return false;
    }

    try {
        // Get all unique keys for CSV header
        const baseKeys = ['id', '@timestamp', 'agent.name', 'rule.level', 'rule.description'];
        const threatKeys = [
            'data.action',
            'data.direction',
            'data.msg',
            'data.applist',
            'data.apprisk',
            'data.level',
            'data.srccountry',
            'data.dstcountry'
        ];

        const headers = [...baseKeys, ...threatKeys];

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

                    // Handle 'Reserved' as 'Server' for country fields
                    if ((key === 'data.srccountry' || key === 'data.dstcountry') && value === 'Reserved') {
                        value = 'Server';
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

// ThreatHunting component
const ThreatHunting = () => {
    const theme = useTheme();
    const { setPageTitle } = useOutletContext();
    const [tabValue, setTabValue] = useState(0);
    const [timeRange, setTimeRange] = useState('3d');
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalRows, setTotalRows] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [showStructuredView, setShowStructuredView] = useState(false);
    const [fullscreenChart, setFullscreenChart] = useState(null);
    const [fullscreenTitle, setFullscreenTitle] = useState('');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSearching, setIsSearching] = useState(false);

    const dashboardRef = useRef(null);

    useEffect(() => {
        setPageTitle('Threat Hunting');
        fetchThreatHuntingLogs();
    }, [timeRange]);

    useEffect(() => {
        if (tabValue === 1) {
            // If on the Events tab, fetch logs with pagination
            fetchThreatHuntingLogs(page, pageSize, searchTerm);
        }
    }, [tabValue, page, pageSize]);

    // Fetch logs with threat hunting information
    const fetchThreatHuntingLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
        try {
            setLoading(true);
            setError(null);

            // Convert to 1-indexed for API
            const apiPage = currentPage + 1;

            console.log(`Fetching threat hunting logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);

            const response = await getThreatHuntingLogs({
                page: apiPage,
                limit,
                search,
                timeRange,
                sortBy: '@timestamp',
                sortOrder: 'desc',
                fullStats: tabValue === 0 || (apiPage === 1 && !isSearching) // Request full stats for dashboard tab or initial load
            });

            if (response) {
                setLogs(response.logs || []);
                setStats(response.stats || null);
                setTotalRows(response.pagination?.total || 0);
                console.log(`Received ${response.logs?.length} logs out of ${response.pagination?.total} total`);

                // Debug logs
                console.log("Received threat hunting stats:", response.stats);
                console.log("Sample log entry:", response.logs && response.logs.length > 0 ? response.logs[0] : "No logs");

                // Check data fields structure
                if (response.logs && response.logs.length > 0) {
                    console.log("Action field structure:", response.logs[0].data?.action);
                    console.log("Source country:", response.logs[0].data?.srccountry);
                    console.log("Destination country:", response.logs[0].data?.dstcountry);
                }

                // Log pagination details
                console.log('Pagination details:', response.pagination);

                // If not page 1, log some IDs to confirm they're different
                if (apiPage > 1 && response.logs?.length > 0) {
                    console.log('First few IDs on this page:',
                        response.logs.slice(0, 3).map(log => log.id || log._id));
                }
            } else {
                console.error('Invalid response format');
                setError('Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching threat hunting logs:', error);
            setError(error.message || 'Failed to fetch threat hunting logs. Please try again later.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleRefresh = () => {
        fetchThreatHuntingLogs(page, pageSize, searchTerm);
    };

    const handleExport = () => {
        if (tabValue === 0) {
            // Export dashboard as PDF
            exportReportToPdf(dashboardRef.current, timeRange, new Date(), 'Threat Hunting Analysis');
        } else {
            // Export logs to CSV
            setExportDialogOpen(true);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setPage(0);
        fetchThreatHuntingLogs(0, pageSize, searchTerm);
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
    };

    const handleCloseDetails = () => {
        setSelectedLog(null);
    };

    const handleViewFullDetails = () => {
        setShowStructuredView(true);
    };

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

    const openFullscreen = (chartOption, title) => {
        setFullscreenChart(chartOption);
        setFullscreenTitle(title || 'Chart Details');
    };

    const closeFullscreen = () => {
        setFullscreenChart(null);
        setFullscreenTitle('');
    };

    // Export current page logs
    const exportCurrentPage = () => {
        setExportDialogOpen(false);
        const success = exportToCSV(logs, `threat_hunting_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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
            const maxResults = Math.min(totalRows, 100000); // Limit to 100,000 to prevent memory issues

            const response = await getThreatHuntingLogs({
                page: 1,
                limit: maxResults,
                search: searchTerm,
                timeRange
            });

            const success = exportToCSV(
                response.logs || [],
                `all_threat_hunting_logs_${formatDateForFileName(new Date())}.csv`
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

    // Get formatted country name
    const getFormattedCountry = (country) => {
        if (!country) return 'Unknown';
        return country === 'Reserved' ? 'Server' : country;
    };

    // Get color for action
    const getActionColor = (action) => {
        switch (action?.toLowerCase()) {
            case 'block': return theme.palette.error.main;
            case 'pass': return theme.palette.success.main;
            case 'alert': return theme.palette.warning.main;
            default: return theme.palette.info.main;
        }
    };

    // Get color for app risk
    const getAppRiskColor = (risk) => {
        switch (risk?.toLowerCase()) {
            case 'critical': return theme.palette.error.dark;
            case 'high': return theme.palette.error.main;
            case 'elevated': return theme.palette.warning.main;
            case 'medium': return theme.palette.warning.light;
            case 'low': return theme.palette.success.main;
            default: return theme.palette.info.main;
        }
    };

    // Process data for charts
    const processChartData = () => {
        if (!stats) return {
            timelineData: {},
            byActionData: [],
            byDirectionData: [],
            byMessageData: [],
            byAppListData: [],
            byAppRiskData: [],
            byLevelData: [],
            bySrcCountryData: [],
            byDstCountryData: []
        };

        // Timeline data
        const timeData = {};
        if (stats.timeDistribution && Array.isArray(stats.timeDistribution)) {
            stats.timeDistribution.forEach(item => {
                if (item && item.date) {
                    try {
                        const date = new Date(item.date);
                        if (!isNaN(date.getTime())) {
                            timeData[date.toLocaleDateString()] = item.count || 0;
                        }
                    } catch (e) {
                        console.error("Error formatting date", e);
                    }
                }
            });
        }

        return {
            timelineData: timeData,
            byActionData: Array.isArray(stats.byAction) ? stats.byAction : [],
            byDirectionData: Array.isArray(stats.byDirection) ? stats.byDirection : [],
            byMessageData: Array.isArray(stats.byMessage) ? stats.byMessage : [],
            byAppListData: Array.isArray(stats.byAppList) ? stats.byAppList : [],
            byAppRiskData: Array.isArray(stats.byAppRisk) ? stats.byAppRisk : [],
            byLevelData: Array.isArray(stats.byLevel) ? stats.byLevel : [],
            bySrcCountryData: Array.isArray(stats.bySrcCountry) ? stats.bySrcCountry : [],
            byDstCountryData: Array.isArray(stats.byDstCountry) ? stats.byDstCountry : []
        };
    };

    // Timeline Chart
    const getTimelineChartOption = () => {
        const chartData = processChartData();
        const timelineData = chartData.timelineData || {};

        // If no data, return a simple placeholder chart
        if (Object.keys(timelineData).length === 0) {
            return {
                title: {
                    text: 'Threat Events Timeline (No Data)',
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

        const dates = Object.keys(timelineData);
        const values = Object.values(timelineData);

        return {
            title: {
                text: 'Threat Events Timeline',
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
                    const param = params[0];
                    return `<strong>${param.name}</strong><br />
                  Events: <span style="color:#FF6B6B;font-weight:bold">${param.value}</span>`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
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
            series: [{
                name: 'Threat Events',
                data: values,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: {
                    color: '#FF6B6B'
                },
                lineStyle: {
                    width: 3,
                    color: '#FF6B6B'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(255, 107, 107, 0.5)' },
                        { offset: 1, color: 'rgba(255, 107, 107, 0.1)' }
                    ])
                },
                emphasis: {
                    itemStyle: {
                        color: '#FF6B6B',
                        borderColor: '#FF6B6B',
                        borderWidth: 2,
                        shadowColor: 'rgba(0,0,0,0.3)',
                        shadowBlur: 10
                    }
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // Actions Pie Chart
    const getActionsPieChartOption = () => {
        const chartData = processChartData();
        const actionData = chartData.byActionData || [];

        if (actionData.length === 0) {
            return {
                title: {
                    text: 'Actions Distribution (No Data)',
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
                    data: [{ name: 'No Data', value: 1 }]
                }]
            };
        }

        // Define colors for specific actions
        const getActionColorHex = (action) => {
            switch (action.toLowerCase()) {
                case 'pass': return '#4CAF50'; // Green
                case 'block': return '#F44336'; // Red
                case 'alert': return '#FF9800'; // Orange
                case 'monitor': return '#2196F3'; // Blue
                default: return COLOR_PALETTE[actionData.findIndex(a => a.action === action) % COLOR_PALETTE.length];
            }
        };

        return {
            title: {
                text: 'Actions Distribution',
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
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                },
                formatter: function (params) {
                    return `<strong>${params.name}</strong><br />
                 Count: <span style="color:${params.color};font-weight:bold">${params.value}</span><br />
                 Percentage: <span style="font-weight:bold">${params.percent.toFixed(1)}%</span>`;
                }
            },
            legend: {
                orient: 'vertical',
                right: '5%',
                top: 'center',
                textStyle: {
                    color: theme.palette.text.primary,
                    fontFamily: theme.typography.fontFamily
                }
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['40%', '50%'],
                avoidLabelOverlap: true,
                label: {
                    show: false
                },
                emphasis: {
                    label: {
                        show: true,
                        fontWeight: 'bold',
                        formatter: '{b}: {c} ({d}%)'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                labelLine: {
                    show: false
                },
                data: actionData.map(item => ({
                    name: item.action,
                    value: item.count,
                    itemStyle: {
                        color: getActionColorHex(item.action)
                    }
                }))
            }],
            backgroundColor: 'transparent'
        };
    };

    // App Risk Chart
    const getAppRiskChartOption = () => {
        const chartData = processChartData();
        const appRiskData = chartData.byAppRiskData || [];

        if (appRiskData.length === 0) {
            return {
                title: {
                    text: 'App Risk Distribution (No Data)',
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
                    data: [{ name: 'No Data', value: 1 }]
                }]
            };
        }

        // Define colors for specific risks
        const getRiskColorHex = (risk) => {
            switch (risk.toLowerCase()) {
                case 'critical': return '#d32f2f'; // Deep Red
                case 'high': return '#f44336'; // Red
                case 'elevated': return '#ff9800'; // Orange
                case 'medium': return '#ffc107'; // Amber
                case 'low': return '#4caf50'; // Green
                default: return '#9e9e9e'; // Grey
            }
        };

        // Sort by risk level
        const riskOrder = {
            'critical': 1,
            'high': 2,
            'elevated': 3,
            'medium': 4,
            'low': 5
        };

        const sortedData = [...appRiskData].sort((a, b) => {
            const aOrder = riskOrder[a.risk.toLowerCase()] || 99;
            const bOrder = riskOrder[b.risk.toLowerCase()] || 99;
            return aOrder - bOrder;
        });

        return {
            title: {
                text: 'App Risk Distribution',
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
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                },
                formatter: function (params) {
                    return `<strong>${params.name}</strong><br />
                 Count: <span style="color:${params.color};font-weight:bold">${params.value}</span><br />
                 Percentage: <span style="font-weight:bold">${params.percent.toFixed(1)}%</span>`;
                }
            },
            legend: {
                orient: 'vertical',
                right: '5%',
                top: 'center',
                textStyle: {
                    color: theme.palette.text.primary,
                    fontFamily: theme.typography.fontFamily
                }
            },
            series: [{
                type: 'pie',
                radius: '55%',
                center: ['40%', '50%'],
                avoidLabelOverlap: true,
                label: {
                    show: false
                },
                emphasis: {
                    label: {
                        show: true,
                        fontWeight: 'bold',
                        formatter: '{b}: {c} ({d}%)'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                labelLine: {
                    show: false
                },
                data: sortedData.map(item => ({
                    name: item.risk,
                    value: item.count,
                    itemStyle: {
                        color: getRiskColorHex(item.risk)
                    }
                }))
            }],
            backgroundColor: 'transparent'
        };
    };

    // Direction Bar Chart
    const getDirectionChartOption = () => {
        const chartData = processChartData();
        const directionData = chartData.byDirectionData || [];

        if (directionData.length === 0) {
            return {
                title: {
                    text: 'Traffic Direction (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
                        fontWeight: 500
                    }
                },
                series: [{
                    type: 'bar',
                    data: [{ name: 'No Data', value: 0 }]
                }]
            };
        }

        // Define direction colors
        const getDirectionColor = (direction) => {
            switch (direction.toLowerCase()) {
                case 'incoming': return '#3366FF'; // Blue
                case 'outgoing': return '#FF6B6B'; // Red
                case 'local': return '#4ECDC4'; // Teal
                default: return '#607D8B'; // Blue Gray
            }
        };

        return {
            title: {
                text: 'Traffic Direction',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
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
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                },
                formatter: function (params) {
                    const param = params[0];
                    return `<strong>${param.name}</strong><br />
                 Count: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: directionData.map(item => item.direction),
                axisLabel: {
                    color: theme.palette.text.secondary,
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
            series: [{
                type: 'bar',
                data: directionData.map(item => ({
                    name: item.direction,
                    value: item.count,
                    itemStyle: {
                        color: getDirectionColor(item.direction)
                    }
                })),
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}',
                    fontFamily: theme.typography.fontFamily,
                    color: theme.palette.text.primary
                },
                barWidth: '40%',
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // App List Horizontal Bar Chart
    const getAppListChartOption = () => {
        const chartData = processChartData();
        const appListData = chartData.byAppListData || [];

        if (appListData.length === 0) {
            return {
                title: {
                    text: 'Top App Lists (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
                        fontWeight: 500
                    }
                },
                series: [{
                    type: 'bar',
                    data: []
                }]
            };
        }

        // Get top 10 app lists
        const topAppLists = appListData
            .slice(0, 10)
            .sort((a, b) => b.count - a.count);

        return {
            title: {
                text: 'Top App Lists',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
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
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                },
                formatter: function (params) {
                    const param = params[0];
                    return `<strong>${param.name}</strong><br />
                 Count: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
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
            yAxis: {
                type: 'category',
                data: topAppLists.map(item => item.applist),
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    formatter: function (value) {
                        // Truncate long names
                        return value.length > 20 ? value.substring(0, 18) + '...' : value;
                    }
                },
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                }
            },
            series: [{
                type: 'bar',
                data: topAppLists.map((item, index) => ({
                    name: item.applist,
                    value: item.count,
                    itemStyle: {
                        color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                    }
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}',
                    fontFamily: theme.typography.fontFamily,
                    color: theme.palette.text.primary
                },
                barWidth: '60%',
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // Message Distribution Tree Map
    const getMessageChartOption = () => {
        const chartData = processChartData();
        const messageData = chartData.byMessageData || [];

        if (messageData.length === 0) {
            return {
                title: {
                    text: 'Top Messages (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
                        fontWeight: 500
                    }
                },
                series: [{
                    type: 'treemap',
                    data: []
                }]
            };
        }

        // Get top 20 messages
        const topMessages = messageData
            .slice(0, 20)
            .sort((a, b) => b.count - a.count);

        return {
            title: {
                text: 'Top Messages',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 500
                }
            },
            tooltip: {
                formatter: function (info) {
                    return [
                        `<strong>${info.name}</strong>`,
                        `Count: <span style="font-weight:bold">${info.value}</span>`
                    ].join('<br>');
                },
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                }
            },
            series: [{
                type: 'treemap',
                data: topMessages.map((item, index) => ({
                    name: item.message,
                    value: item.count,
                    itemStyle: {
                        color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                    }
                })),
                breadcrumb: { show: false },
                label: {
                    show: true,
                    formatter: function (params) {
                        const name = params.name;
                        // Truncate long names
                        return name.length > 20 ? name.substring(0, 18) + '...' : name;
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                itemStyle: {
                    borderColor: theme.palette.background.paper,
                    borderWidth: 1,
                    gapWidth: 2
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // Country Distribution Maps
    const getSourceCountriesChartOption = () => {
  const chartData = processChartData();
  const sourceCountryData = chartData.bySrcCountryData || [];
  
  // Filter out "Unknown" entries and limit to top 15
  const filteredData = sourceCountryData
    .filter(item => item.country !== 'Unknown')
    .slice(0, 15)
    .sort((a, b) => b.count - a.count);
  
  return {
    title: {
      text: 'Top Source Countries',
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: 500
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const param = params[0];
        return `<strong>${param.name}</strong><br />
                Events: <span style="color:#91c8ff;font-weight:bold">${param.value}</span>`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: { 
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
    yAxis: {
      type: 'category',
      data: filteredData.map(item => item.country).reverse(),
      axisLabel: {
        color: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily
      },
      axisLine: {
        lineStyle: {
          color: theme.palette.divider
        }
      }
    },
    series: [
      {
        name: 'Events',
        type: 'bar',
        data: filteredData.map(item => item.count).reverse(),
        itemStyle: {
          color: '#91c8ff'  // Light blue color
        },
        emphasis: {
          itemStyle: {
            color: '#4b9eff',
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: theme.palette.text.primary
        }
      }
    ],
    backgroundColor: 'transparent'
  };
};

// Horizontal bar chart for destination countries
const getDestinationCountriesChartOption = () => {
  const chartData = processChartData();
  const destCountryData = chartData.byDstCountryData || [];
  
  // Filter out "Unknown" entries and limit to top 15
  const filteredData = destCountryData
    .filter(item => item.country !== 'Unknown')
    .slice(0, 15)
    .sort((a, b) => b.count - a.count);
  
  return {
    title: {
      text: 'Top Destination Countries',
      left: 'center',
      textStyle: {
        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: 500
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const param = params[0];
        return `<strong>${param.name}</strong><br />
                Events: <span style="color:#ffbb91;font-weight:bold">${param.value}</span>`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: { 
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
    yAxis: {
      type: 'category',
      data: filteredData.map(item => item.country).reverse(),
      axisLabel: {
        color: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily
      },
      axisLine: {
        lineStyle: {
          color: theme.palette.divider
        }
      }
    },
    series: [
      {
        name: 'Events',
        type: 'bar',
        data: filteredData.map(item => item.count).reverse(),
        itemStyle: {
          color: '#ffbb91'  // Light orange color
        },
        emphasis: {
          itemStyle: {
            color: '#ff9b61',
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: theme.palette.text.primary
        }
      }
    ],
    backgroundColor: 'transparent'
  };
};

    // ThreatHunting Details View Component
    const ThreatHuntingDetailsView = ({ data, onClose, onViewFullDetails }) => {
        const theme = useTheme();
        const threatData = data?.data || null;

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            try {
                return new Date(dateString).toLocaleString();
            } catch (e) {
                return dateString;
            }
        };

        return (
            <Dialog
                open={true}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        minHeight: '80vh',
                        maxHeight: '90vh',
                        borderRadius: 2
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <HuntingIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                            Threat Hunting Details
                        </Typography>
                    </Box>
                    <IconButton edge="end" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0 }}>
                    {/* Threat Specific Information */}
                    {threatData ? (
                        <Box sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                            <Grid container spacing={3}>
                                {/* Main Threat Info */}
                                <Grid item xs={12}>
                                    <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: theme.palette.primary.main
                                        }}>
                                            <FilterAltIcon sx={{ mr: 1 }} />
                                            Firewall Action: {threatData.action || 'N/A'}
                                        </Typography>

                                        <Grid container spacing={2} sx={{ mt: 1 }}>
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Action</Typography>
                                                <Chip
                                                    label={threatData.action || 'Unknown'}
                                                    color={threatData.action?.toLowerCase() === 'pass' ? 'success' : 'error'}
                                                    size="small"
                                                    sx={{ mt: 0.5, fontWeight: 'bold' }}
                                                />
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Direction</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                                                    {threatData.direction || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">App</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.app || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">App Risk</Typography>
                                                <Chip
                                                    label={threatData.apprisk || 'Unknown'}
                                                    color={
                                                        threatData.apprisk?.toLowerCase() === 'critical' ? 'error' :
                                                            threatData.apprisk?.toLowerCase() === 'high' ? 'error' :
                                                                threatData.apprisk?.toLowerCase() === 'elevated' ? 'warning' :
                                                                    threatData.apprisk?.toLowerCase() === 'medium' ? 'warning' :
                                                                        'info'
                                                    }
                                                    size="small"
                                                    sx={{ mt: 0.5 }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>

                                {/* Network Info */}
                                <Grid item xs={12} md={6}>
                                    <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <DnsIcon sx={{ mr: 1 }} />
                                            Network Information
                                        </Typography>

                                        <Box sx={{ mt: 2 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">Source IP</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                                                        {threatData.srcip || 'N/A'}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">Source Port</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                        {threatData.srcport || 'N/A'}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">Destination IP</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                        {threatData.dstip || 'N/A'}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">Destination Port</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                        {threatData.dstport || 'N/A'}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">Source Country</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                        {getFormattedCountry(threatData.srccountry)}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">Destination Country</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                        {getFormattedCountry(threatData.dstcountry)}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* Application Info */}
                                <Grid item xs={12} md={6}>
                                    <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <AppsIcon sx={{ mr: 1 }} />
                                            Application Details
                                        </Typography>
                                        <Box sx={{ mt: 2 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" color="textSecondary">App</Typography>
                                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                                                        {threatData.app || 'N/A'}
                                                    </Typography>

                                                    {/* Add Grid container here */}
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="subtitle2" color="textSecondary">App Category</Typography>
                                                            <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                                {threatData.appcat || 'N/A'}
                                                            </Typography>
                                                        </Grid>

                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="subtitle2" color="textSecondary">App ID</Typography>
                                                            <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                                {threatData.appid || 'N/A'}
                                                            </Typography>
                                                        </Grid>

                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="subtitle2" color="textSecondary">App List</Typography>
                                                            <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                                {threatData.applist || 'N/A'}
                                                            </Typography>
                                                        </Grid>

                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="subtitle2" color="textSecondary">Service</Typography>
                                                            <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                                {threatData.service || 'N/A'}
                                                            </Typography>
                                                        </Grid>

                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="subtitle2" color="textSecondary">Filename</Typography>
                                                            <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                                {threatData.filename || 'N/A'}
                                                            </Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Grid> {/* ← This closes the xs={12} sm={6} grid item */}
                                            </Grid>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* Device Info */}
                                <Grid item xs={12}>
                                    <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <SecurityIcon sx={{ mr: 1 }} />
                                            Device & Policy Information
                                        </Typography>
                                        <Grid container spacing={2} sx={{ mt: 1 }}>
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Device Name</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.devname || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Device ID</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.devid || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Policy ID</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.policyid || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Session ID</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.sessionid || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Source Interface</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.srcintf || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Destination Interface</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.dstintf || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Event Type</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.eventtype || 'N/A'}
                                                </Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6} md={3}>
                                                <Typography variant="subtitle2" color="textSecondary">Level</Typography>
                                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                                    {threatData.level || 'N/A'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>

                                {/* Message */}
                                {threatData.msg && (
                                    <Grid item xs={12}>
                                        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                                <MessageIcon sx={{ mr: 1 }} />
                                                Message
                                            </Typography>
                                            <Typography variant="body1" sx={{ mt: 1 }}>
                                                {threatData.msg}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <CircularProgress size={24} sx={{ mb: 2 }} />
                            <Typography>Loading threat data...</Typography>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={onViewFullDetails}
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        color="primary"
                    >
                        View Full Log Details
                    </Button>
                    <Button
                        onClick={onClose}
                        variant="contained"
                        color="primary"
                        startIcon={<CloseIcon />}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
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
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { color: theme.palette.primary.main }
                }}>
                    <EventIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                    <Typography variant="body2">
                        {formatTimestamp(params.row['@timestamp'])}
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
            field: 'data.action',
            headerName: 'Action',
            flex: 0.7,
            minWidth: 100,
            valueGetter: (params) => params.row.data?.action || 'N/A',
            renderCell: (params) => {
                const action = params.row.data?.action || 'N/A';
                const color = getActionColor(action);
                return (
                    <Chip
                        label={action}
                        size="small"
                        sx={{
                            color: 'white',
                            bgcolor: color,
                            fontWeight: 'bold'
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
            field: 'data.srccountry',
            headerName: 'Source',
            flex: 0.8,
            minWidth: 120,
            valueGetter: (params) => getFormattedCountry(params.row.data?.srccountry),
            renderCell: (params) => (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { color: theme.palette.primary.main }
                }}>
                    <PublicIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                    <Typography variant="body2" noWrap>
                        {getFormattedCountry(params.row.data?.srccountry)}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'data.dstcountry',
            headerName: 'Destination',
            flex: 0.8,
            minWidth: 120,
            valueGetter: (params) => getFormattedCountry(params.row.data?.dstcountry),
            renderCell: (params) => (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { color: theme.palette.primary.main }
                }}>
                    <TravelExploreIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                    <Typography variant="body2" noWrap>
                        {getFormattedCountry(params.row.data?.dstcountry)}
                    </Typography>
                </Box>
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

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h4" sx={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600,
                        background: theme.palette.mode === 'dark'
                            ? 'linear-gradient(45deg, #FF6B6B, #FFA726)'
                            : 'linear-gradient(45deg, #FF6B6B, #FFA726)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: theme.palette.mode === 'dark'
                            ? '0 2px 10px rgba(255,255,255,0.1)'
                            : '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <HuntingIcon sx={{ mr: 1.5, color: 'error.main' }} />
                        Threat Hunting
                    </Typography>
                    <Button
                        component={Link}
                        href="https://en.wikipedia.org/wiki/Threat_hunting"
                        target="_blank"
                        rel="noopener"
                        sx={{
                            alignSelf: 'flex-start',
                            mt: 1,
                            borderRadius: 8,
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                        endIcon={<LaunchIcon />}
                        color="primary"
                    >
                        Learn About Threat Hunting
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
                        Export {tabValue === 0 ? 'PDF' : 'CSV'}
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="Threat Hunting tabs"
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
                        icon={<DashboardIcon />}
                        iconPosition="start"
                        label="Dashboard"
                        id="threathunting-tab-0"
                        aria-controls="threathunting-tabpanel-0"
                    />
                    <Tab
                        icon={<EventIcon />}
                        iconPosition="start"
                        label="Events"
                        id="threathunting-tab-1"
                        aria-controls="threathunting-tabpanel-1"
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
                        id="threathunting-tabpanel-0"
                        aria-labelledby="threathunting-tab-0"
                        ref={dashboardRef}
                    >
                        {tabValue === 0 && (
                            <>
                                {/* Summary Cards */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.8), rgba(255, 107, 107, 0.6))',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                            transition: 'transform 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)'
                                            }
                                        }}>
                                            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                                                <Typography color="white" gutterBottom variant="h6" fontWeight={500}>
                                                    Total Events
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {stats?.total?.toLocaleString() || 0}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <HuntingIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(76, 175, 80, 0.6))',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                            transition: 'transform 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)'
                                            }
                                        }}>
                                            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                                                <Typography color="white" gutterBottom variant="h6" fontWeight={500}>
                                                    Pass Actions
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {(stats?.byAction?.find(a => a.action?.toLowerCase() === 'pass')?.count || 0).toLocaleString()}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <FilterAltIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.8), rgba(244, 67, 54, 0.6))',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                            transition: 'transform 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)'
                                            }
                                        }}>
                                            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                                                <Typography color="white" gutterBottom variant="h6" fontWeight={500}>
                                                    Block Actions
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {(stats?.byAction?.find(a => a.action?.toLowerCase() === 'block')?.count || 0).toLocaleString()}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <WarningIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(51, 102, 255, 0.8), rgba(51, 102, 255, 0.6))',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                            transition: 'transform 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)'
                                            }
                                        }}>
                                            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                                                <Typography color="white" gutterBottom variant="h6" fontWeight={500}>
                                                    Unique Countries
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {(stats?.bySrcCountry?.length || 0) + (stats?.byDstCountry?.length || 0)}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <PublicIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>

                                {/* Timeline Chart - Full Width */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
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
                                                    <TimelineIcon color="error" sx={{ mr: 1 }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Threat Events Timeline</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getTimelineChartOption(), 'Threat Events Timeline')}
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
                                            <Box sx={{ height: 300 }}>
                                                <ReactECharts
                                                    option={getTimelineChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                {/* Action, Direction and App Risk Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={4}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <FilterAltIcon sx={{ mr: 1, color: '#FF6B6B' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Actions Distribution</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getActionsPieChartOption(), 'Actions Distribution')}
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
                                            <Box sx={{ height: 300 }}>
                                                <ReactECharts
                                                    option={getActionsPieChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <DirectionsIcon sx={{ mr: 1, color: '#3366FF' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Traffic Direction</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getDirectionChartOption(), 'Traffic Direction')}
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
                                            <Box sx={{ height: 300 }}>
                                                <ReactECharts
                                                    option={getDirectionChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <WarningIcon sx={{ mr: 1, color: '#f44336' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>App Risk Distribution</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getAppRiskChartOption(), 'App Risk Distribution')}
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
                                            <Box sx={{ height: 300 }}>
                                                <ReactECharts
                                                    option={getAppRiskChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                {/* App List and Message Distribution Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <AppsIcon sx={{ mr: 1, color: '#4ECDC4' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top App Lists</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getAppListChartOption(), 'Top App Lists')}
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
                                            <Box sx={{ height: 350 }}>
                                                <ReactECharts
                                                    option={getAppListChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <MessageIcon sx={{ mr: 1, color: '#9C27B0' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top Messages</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getMessageChartOption(), 'Top Messages')}
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
                                            <Box sx={{ height: 350 }}>
                                                <ReactECharts
                                                    option={getMessageChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                {/* App List and Message Distribution Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <AppsIcon sx={{ mr: 1, color: '#4ECDC4' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top App Lists</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getSourceCountriesChartOption(), 'Top App Lists')}
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
                                            <Box sx={{ height: 350 }}>
                                                <ReactECharts
                                                    option={getSourceCountriesChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                borderRadius: 2,
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
                                                    <MessageIcon sx={{ mr: 1, color: '#9C27B0' }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top Messages</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getDestinationCountriesChartOption(), 'Top Messages')}
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
                                            <Box sx={{ height: 350 }}>
                                                <ReactECharts
                                                    option={getDestinationCountriesChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                    notMerge={true}
                                                    lazyUpdate={true}
                                                />
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </>
                        )}
                    </Box>

                    {/* Events Tab */}
                    <Box
                        role="tabpanel"
                        hidden={tabValue !== 1}
                        id="threathunting-tabpanel-1"
                        aria-labelledby="threathunting-tab-1"
                    >
                        {tabValue === 1 && (
                            <>
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
                                            Threat Hunting Events
                                        </Typography>
                                    </Box>

                                    <form onSubmit={handleSearch}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            placeholder="Search threat events by action, direction, country..."
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
                                                                fetchThreatHuntingLogs(0, pageSize, '');
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
                                        {loading ? 'Loading threat events...' : `${totalRows.toLocaleString()} threat events found`}
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
                                            <HuntingIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No threat events found
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
                                            onPageChange={handlePageChange}
                                            onPageSizeChange={handlePageSizeChange}
                                            rowsPerPageOptions={[25, 50, 100]}
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
                            </>
                        )}
                    </Box>
                </>
            )}

            {/* ThreatHuntingDetailsView Dialog */}
            {selectedLog && (
                <ThreatHuntingDetailsView
                    data={selectedLog}
                    onClose={handleCloseDetails}
                    onViewFullDetails={handleViewFullDetails}
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
                    Export Threat Events to CSV
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Choose which Threat events to export:
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
                            disabled={totalRows > 100000}
                            sx={{ borderRadius: 8, py: 1.2, textTransform: 'none' }}
                        >
                            Export All Threat Events ({totalRows.toLocaleString()} events)
                        </Button>

                        {totalRows > 10000 && totalRows <= 100000 && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                                Exporting a large number of events may take a while and affect performance.
                            </Typography>
                        )}

                        {totalRows > 100000 && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                Too many events to export at once (maximum 100,000). Please refine your search filters.
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

export default ThreatHunting;