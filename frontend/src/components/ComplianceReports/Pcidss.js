// src/components/ComplianceReports/Pcidss.js
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
    Stack,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails
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
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DnsIcon from '@mui/icons-material/Dns';
import DownloadIcon from '@mui/icons-material/Download';
import LaunchIcon from '@mui/icons-material/Launch';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShieldIcon from '@mui/icons-material/Shield';
import InfoIcon from '@mui/icons-material/Info';
import PaymentIcon from '@mui/icons-material/Payment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import MessageIcon from '@mui/icons-material/Message';
import AppsIcon from '@mui/icons-material/Apps';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LockIcon from '@mui/icons-material/Lock';
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
import { getPciDssLogs } from '../../services/logs';

// Vibrant color palette
const COLOR_PALETTE = [
    '#FF5722',   // Deep Orange
    '#E91E63',   // Pink
    '#9C27B0',   // Purple
    '#673AB7',   // Deep Purple
    '#3F51B5',   // Indigo
    '#2196F3',   // Blue 
    '#00BCD4',   // Cyan
    '#009688',   // Teal
    '#4CAF50',   // Green
    '#8BC34A'    // Light Green
];

// CSV Export utility
const exportToCSV = (logs, fileName = 'pci_dss_logs.csv') => {
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
            if (log.rule?.pci_dss) allKeys.add('rule.pci_dss');
            if (log.data?.msg) allKeys.add('data.msg');
            if (log.data?.applist) allKeys.add('data.applist');
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

// PCI DSS control information
const PCI_DSS_CONTROLS = [
    {
        id: "1.1",
        family: "Build and Maintain a Secure Network",
        title: "Firewall Configuration",
        description: "Install and maintain a firewall configuration to protect cardholder data.",
        requirements: ["Firewall standards", "Configuration documentation"]
    },
    {
        id: "1.4",
        family: "Build and Maintain a Secure Network",
        title: "Personal Firewall Software",
        description: "Install personal firewall software or equivalent functionality on any portable computing devices that connect to the internet when outside the network.",
        requirements: ["Mobile device protection", "Personal firewall configuration"]
    },
    {
        id: "2.2",
        family: "Build and Maintain a Secure Network",
        title: "System Configuration Standards",
        description: "Develop configuration standards for all system components that address all known security vulnerabilities and are consistent with industry-accepted system hardening standards.",
        requirements: ["System hardening", "Configuration standards"]
    },
    {
        id: "4.1",
        family: "Protect Cardholder Data",
        title: "Strong Cryptography",
        description: "Use strong cryptography and security protocols to safeguard sensitive cardholder data during transmission over open, public networks.",
        requirements: ["TLS implementation", "Strong encryption"]
    },
    {
        id: "5.1",
        family: "Maintain a Vulnerability Management Program",
        title: "Anti-virus Protection",
        description: "Deploy anti-virus software on all systems commonly affected by malicious software.",
        requirements: ["Anti-virus deployment", "Malware protection"]
    },
    {
        id: "5.2",
        family: "Maintain a Vulnerability Management Program",
        title: "Updated Anti-virus",
        description: "Ensure that all anti-virus mechanisms are maintained, current, actively running, and generating audit logs.",
        requirements: ["Regular updates", "Active scanning"]
    },
    {
        id: "6.5",
        family: "Maintain a Vulnerability Management Program",
        title: "Secure Development",
        description: "Address common coding vulnerabilities in software development processes.",
        requirements: ["Secure coding", "Developer training"]
    },
    {
        id: "8.1",
        family: "Implement Strong Access Control Measures",
        title: "User Account Management",
        description: "Define and implement policies and procedures to ensure proper user identification management for users and administrators.",
        requirements: ["User identification", "Unique credentials"]
    },
    {
        id: "10.2",
        family: "Regularly Monitor and Test Networks",
        title: "Log System Activity",
        description: "Implement automated audit trails for all system components to reconstruct events.",
        requirements: ["Audit logging", "Activity tracking"]
    },
    {
        id: "10.6",
        family: "Regularly Monitor and Test Networks",
        title: "Log Review",
        description: "Review logs and security events for all system components to identify anomalies or suspicious activity.",
        requirements: ["Regular review", "Security monitoring"]
    },
    {
        id: "10.6.1",
        family: "Regularly Monitor and Test Networks",
        title: "Daily Log Review",
        description: "Review security event logs daily to identify anomalies or suspicious activities.",
        requirements: ["Daily review", "Security alerts"]
    },
    {
        id: "11.4",
        family: "Regularly Monitor and Test Networks",
        title: "Intrusion Detection",
        description: "Use intrusion-detection and/or intrusion-prevention techniques to detect and/or prevent intrusions into the network.",
        requirements: ["IDS/IPS deployment", "Intrusion monitoring"]
    }
];

const Pcidss = () => {
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
    const [fullscreenChart, setFullscreenChart] = useState(null);
    const [fullscreenTitle, setFullscreenTitle] = useState('');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSearching, setIsSearching] = useState(false);

    const dashboardRef = useRef(null);

    useEffect(() => {
        setPageTitle('PCI DSS Compliance');
        fetchPciDssLogs();
    }, [timeRange]);

    useEffect(() => {
        if (tabValue === 1) {
            // If on the Events tab, fetch logs with pagination
            fetchPciDssLogs(page, pageSize, searchTerm);
        }
    }, [tabValue, page, pageSize]);

    // Fetch logs with PCI DSS information
    const fetchPciDssLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
        try {
            setLoading(true);
            setError(null);

            // Convert to 1-indexed for API
            const apiPage = currentPage + 1;

            console.log(`Fetching PCI DSS logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);

            const response = await getPciDssLogs({
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
                console.log("Received PCI DSS stats:", response.stats);
                console.log("Sample log entry:", response.logs && response.logs.length > 0 ? response.logs[0] : "No logs");

                // Check rule.pci_dss field structure
                if (response.logs && response.logs.length > 0) {
                    console.log("PCI DSS field structure:", response.logs[0].rule?.pci_dss);
                    console.log("Message:", response.logs[0].data?.msg);
                    console.log("Applist:", response.logs[0].data?.applist);
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
            console.error('Error fetching PCI DSS logs:', error);
            setError(error.message || 'Failed to fetch PCI DSS logs. Please try again later.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleRefresh = () => {
        fetchPciDssLogs(page, pageSize, searchTerm);
    };

    const handleExport = () => {
        if (tabValue === 0) {
            // Export dashboard as PDF
            exportReportToPdf(dashboardRef.current, timeRange, new Date(), 'PCI DSS Compliance Analysis');
        } else {
            // Export logs to CSV
            setExportDialogOpen(true);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setPage(0);
        fetchPciDssLogs(0, pageSize, searchTerm);
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
        // Explicitly call fetchPciDssLogs with the new page to ensure pagination works
        fetchPciDssLogs(newPage, pageSize, searchTerm);
    };

    const handlePageSizeChange = (newPageSize) => {
        console.log(`Page size changing from ${pageSize} to ${newPageSize}`);
        setPageSize(newPageSize);
        setPage(0);
        // Fetch with new page size
        fetchPciDssLogs(0, newPageSize, searchTerm);
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
        const success = exportToCSV(logs, `pci_dss_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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

            const response = await getPciDssLogs({
                page: 1,
                limit: maxResults,
                search: searchTerm,
                timeRange
            });

            const success = exportToCSV(
                response.logs || [],
                `all_pci_dss_logs_${formatDateForFileName(new Date())}.csv`
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

    // Process data for charts
    const processChartData = () => {
        if (!stats) return {
            timelineData: {},
            ruleLevelData: {},
            pciDssControlsData: [],
            agentData: [],
            messageData: [],
            applistData: [],
            highSeverityCount: 0,
            totalEvents: 0,
            uniqueControls: 0,
            uniqueAgents: 0,
            uniqueMessages: 0,
            uniqueApplists: 0
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

        // Rule Level data
        const ruleLevelData = {};
        if (stats.byRuleLevel && Array.isArray(stats.byRuleLevel)) {
            // Group levels into severity categories
            const severityGroups = {
                'Critical (15+)': 0,
                'High (12-14)': 0,
                'Medium (8-11)': 0,
                'Low (4-7)': 0,
                'Info (0-3)': 0
            };

            stats.byRuleLevel.forEach(item => {
                if (item && item.level !== undefined) {
                    const level = parseInt(item.level, 10);
                    if (!isNaN(level)) {
                        if (level >= 15) {
                            severityGroups['Critical (15+)'] += (item.count || 0);
                        } else if (level >= 12) {
                            severityGroups['High (12-14)'] += (item.count || 0);
                        } else if (level >= 8) {
                            severityGroups['Medium (8-11)'] += (item.count || 0);
                        } else if (level >= 4) {
                            severityGroups['Low (4-7)'] += (item.count || 0);
                        } else {
                            severityGroups['Info (0-3)'] += (item.count || 0);
                        }
                    }
                }
            });

            Object.entries(severityGroups).forEach(([key, value]) => {
                if (value > 0) ruleLevelData[key] = value;
            });
        }

        // Count high severity events (level 12+)
        let highSeverityCount = 0;
        if (stats.byRuleLevel && Array.isArray(stats.byRuleLevel)) {
            stats.byRuleLevel.forEach(item => {
                if (item && item.level !== undefined) {
                    const level = parseInt(item.level, 10);
                    if (!isNaN(level) && level >= 12) {
                        highSeverityCount += (item.count || 0);
                    }
                }
            });
        }

        // Format message data
        const messageData = [];
        if (stats.byMessage && Array.isArray(stats.byMessage)) {
            stats.byMessage.forEach(item => {
                if (item && item.message) {
                    // Truncate very long message strings for display
                    const displayMessage = item.message.length > 50
                        ? item.message.substring(0, 47) + '...'
                        : item.message;

                    messageData.push({
                        name: displayMessage || 'Unknown',
                        fullName: item.message || 'Unknown',
                        value: item.count || 0
                    });
                }
            });
        }
        else if (stats.byMessage && Array.isArray(stats.byMessage)) {
            stats.byMessage.forEach(item => {
                // Debug log to see the structure
                console.log("Message item structure:", item);

                if (item) {
                    // Try different property names that might contain the message
                    const message = item.message || item.msg || item.key || '';
                    const count = item.count || item.doc_count || 0;

                    // Truncate very long message strings for display
                    const displayMessage = message.length > 50
                        ? message.substring(0, 47) + '...'
                        : message;

                    messageData.push({
                        name: displayMessage || 'Unknown',
                        fullName: message || 'Unknown',
                        value: count
                    });
                }
            });
        }

        // Format applist data
        const applistData = [];
        if (stats.byApplist && Array.isArray(stats.byApplist)) {
            stats.byApplist.forEach(item => {
                if (item && item.applist) {
                    applistData.push({
                        name: item.applist || 'Unknown',
                        value: item.count || 0
                    });
                }
            });
        }

        // Log the processed data for debugging
        console.log("Processed chart data:", {
            timelineData: timeData,
            pciDssControlsData: stats.byPciDss || [],
            agentData: stats.byAgent || [],
            ruleLevelData,
            messageData,
            applistData
        });

        return {
            timelineData: timeData,
            ruleLevelData: ruleLevelData,
            pciDssControlsData: Array.isArray(stats.byPciDss) ? stats.byPciDss : [],
            agentData: Array.isArray(stats.byAgent) ? stats.byAgent : [],
            messageData,
            applistData,
            highSeverityCount: highSeverityCount,
            totalEvents: stats.total || 0,
            uniqueControls: Array.isArray(stats.byPciDss) ? stats.byPciDss.length : 0,
            uniqueAgents: Array.isArray(stats.byAgent) ? stats.byAgent.length : 0,
            uniqueMessages: messageData.length,
            uniqueApplists: applistData.length
        };
    };

    // Chart data and options - Timeline Chart
    const getTimelineChartOption = () => {
        const chartData = processChartData();
        console.log("Timeline chart data:", chartData.timelineData);

        const timelineData = chartData.timelineData || {};

        // If no data, return a simple placeholder chart
        if (Object.keys(timelineData).length === 0) {
            return {
                title: {
                    text: 'PCI DSS Events Timeline (No Data)',
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
                text: 'PCI DSS Events Timeline',
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
                  Events: <span style="color:${COLOR_PALETTE[0]};font-weight:bold">${param.value}</span>`;
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
                name: 'PCI DSS Events',
                data: values,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: {
                    color: COLOR_PALETTE[0]
                },
                lineStyle: {
                    width: 3,
                    color: COLOR_PALETTE[0]
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${COLOR_PALETTE[0]}80` },
                        { offset: 1, color: `${COLOR_PALETTE[0]}10` }
                    ])
                },
                emphasis: {
                    itemStyle: {
                        color: COLOR_PALETTE[0],
                        borderColor: COLOR_PALETTE[0],
                        borderWidth: 2,
                        shadowColor: 'rgba(0,0,0,0.3)',
                        shadowBlur: 10
                    }
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // Rule Level Distribution Chart
    const getRuleLevelChartOption = () => {
        const chartData = processChartData();
        const ruleLevelData = chartData.ruleLevelData || {};

        if (Object.keys(ruleLevelData).length === 0) {
            return {
                title: {
                    text: 'Severity Distribution (No Data)',
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

        const data = Object.entries(ruleLevelData).map(([name, value], index) => ({
            name,
            value,
            itemStyle: {
                color: [
                    '#d32f2f', // Critical
                    '#f44336', // High
                    '#ff9800', // Medium
                    '#2196f3', // Low
                    '#4caf50'  // Info
                ][index]
            }
        }));

        return {
            title: {
                text: 'Severity Distribution',
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
                data: data
            }],
            backgroundColor: 'transparent'
        };
    };

    // Agent Distribution Chart
    const getAgentDistributionChartOption = () => {
        const chartData = processChartData();
        const agentData = chartData.agentData || [];

        if (agentData.length === 0) {
            return {
                title: {
                    text: 'Top Agents with PCI DSS Events (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
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
                    type: 'bar'
                }]
            };
        }

        // Get top 10 agents
        const topAgents = agentData
            .slice(0, 10)
            .sort((a, b) => b.count - a.count);

        const categories = topAgents.map(agent => agent.name);
        const values = topAgents.map(agent => agent.count);

        return {
            title: {
                text: 'Top Agents with PCI DSS Events',
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
                  PCI DSS Events: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;
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
                data: categories,
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    rotate: 45,
                    formatter: function (value) {
                        // Truncate long agent names
                        return value.length > 15 ? value.substring(0, 12) + '...' : value;
                    }
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
                name: 'Events',
                type: 'bar',
                data: values.map((value, index) => ({
                    value,
                    itemStyle: {
                        color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                    }
                })),
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}',
                    fontFamily: theme.typography.fontFamily,
                    color: theme.palette.text.primary
                },
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

    // Messages Distribution Chart (Word Cloud)
    // Replace the existing getMessagesChartOption function in Pcidss.js with this new version
    const getMessagesChartOption = () => {
        const chartData = processChartData();

        // Log the raw data to debug
        console.log("Raw message data before processing:", stats.byMessage);

        // More robust data extraction
        let messageData = [];
        if (stats.byMessage && Array.isArray(stats.byMessage)) {
            // Standard format
            messageData = stats.byMessage.map(item => ({
                name: item.message || item.msg || item.key || 'Unknown',
                value: item.count || item.doc_count || 0
            }));
        } else if (stats.messages && Array.isArray(stats.messages)) {
            // Alternative format
            messageData = stats.messages.map(item => ({
                name: item.message || item.msg || item.key || 'Unknown',
                value: item.count || item.doc_count || 0
            }));
        }

        console.log("Processed message data:", messageData);

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
                xAxis: {
                    type: 'category',
                    data: ['No Data']
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    data: [0],
                    type: 'bar'
                }]
            };
        }

        // Get top messages
        const topMessages = messageData
            .slice(0, 12)
            .sort((a, b) => b.value - a.value);

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
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: topMessages.map(item => {
                    // Truncate long messages
                    const name = item.name || '';
                    return name.length > 15 ? name.substring(0, 12) + '...' : name;
                }),
                axisLabel: {
                    interval: 0,
                    rotate: 45,
                    textStyle: {
                        fontSize: 10
                    }
                }
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                name: 'Count',
                type: 'bar',
                barWidth: '60%',
                data: topMessages.map((item, index) => ({
                    value: item.value,
                    itemStyle: {
                        color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                    }
                })),
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}'
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // Applist Distribution Chart (Sunburst)
    const getApplistChartOption = () => {
        const chartData = processChartData();
        const applistData = chartData.applistData || [];

        if (applistData.length === 0) {
            return {
                title: {
                    text: 'Top Application Lists (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
                        fontWeight: 500
                    }
                },
                series: [{
                    type: 'sunburst',
                    data: [{ name: 'No Data', value: 1, itemStyle: { color: COLOR_PALETTE[0] } }]
                }]
            };
        }

        // Get top applists
        const topApplists = applistData
            .slice(0, 15)
            .sort((a, b) => b.value - a.value);

        // Transform data for sunburst chart
        const sunburstData = [{
            name: 'Application Lists',
            itemStyle: {
                color: 'transparent'
            },
            children: topApplists.map((item, index) => ({
                name: item.name === '' ? 'Unknown' : item.name,
                value: item.value,
                itemStyle: {
                    color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                }
            }))
        }];

        return {
            title: {
                text: 'Application Lists',
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
                formatter: function (params) {
                    const value = params.value;
                    if (!value) return 'No data';
                    return `${params.name}: ${value} events`;
                },
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                }
            },
            series: [{
                name: 'Application Lists',
                type: 'sunburst',
                radius: ['15%', '80%'],
                center: ['50%', '50%'],
                data: sunburstData,
                nodeClick: false,
                sort: null,
                emphasis: {
                    focus: 'ancestor',
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                label: {
                    show: true,
                    rotate: 'radial',
                    fontFamily: theme.typography.fontFamily,
                    color: theme.palette.text.primary
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // PCI DSS Controls Chart (Horizontal Bar)
    const getPciDssControlsChartOption = () => {
        const chartData = processChartData();
        const controlsData = chartData.pciDssControlsData || [];

        if (controlsData.length === 0) {
            return {
                title: {
                    text: 'Top PCI DSS Controls (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 18,
                        fontWeight: 500
                    }
                },
                xAxis: {
                    type: 'value'
                },
                yAxis: {
                    type: 'category',
                    data: ['No Data']
                },
                series: [{
                    data: [0],
                    type: 'bar'
                }]
            };
        }

        // Get top 10 PCI DSS controls
        const topControls = controlsData
            .slice(0, 10)
            .sort((a, b) => b.count - a.count);

        const categories = topControls.map(control => control.control);
        const values = topControls.map(control => control.count);

        return {
            title: {
                text: 'Top PCI DSS Controls',
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
                    // Find matching PCI DSS control
                    const controlInfo = PCI_DSS_CONTROLS.find(c => c.id === param.name);
                    let tipContent = `<strong>${param.name}</strong><br />
                           Count: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;

                    if (controlInfo) {
                        tipContent += `<br /><br /><strong>${controlInfo.title}</strong><br />
                          ${controlInfo.description.substring(0, 100)}...`;
                    }

                    return tipContent;
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
                name: 'Event Count',
                nameLocation: 'middle',
                nameGap: 40,
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
            yAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    formatter: function (value) {
                        // Add ellipsis if needed
                        return value.length > 12 ? value.substring(0, 10) + '...' : value;
                    }
                },
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                }
            },
            series: [{
                name: 'Events',
                type: 'bar',
                data: values.map((value, index) => ({
                    value,
                    itemStyle: {
                        color: COLOR_PALETTE[(index + 4) % COLOR_PALETTE.length]
                    }
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}',
                    fontFamily: theme.typography.fontFamily,
                    color: theme.palette.text.primary
                },
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

    // Function to render PCI DSS details in the DataGrid
    const renderPciDssDetails = (params) => {
        const pciDssData = params.row.rule?.pci_dss;

        if (!pciDssData) {
            return <Typography variant="body2">No PCI DSS data</Typography>;
        }

        // Create a more structured display with scrollable container
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                maxWidth: '100%',
                maxHeight: 100,
                overflow: 'auto',
                p: 0.5
            }}>
                {/* PCI DSS Controls Section */}
                {Array.isArray(pciDssData) && pciDssData.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {pciDssData.map((control, idx) => {
                            // Find control info if available
                            const controlInfo = PCI_DSS_CONTROLS.find(c => c.id === control);

                            return (
                                <Tooltip
                                    key={`control-${idx}`}
                                    title={controlInfo ? `${controlInfo.title}: ${controlInfo.description}` : control}
                                >
                                    <Chip
                                        label={control}
                                        size="small"
                                        sx={{
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(233, 30, 99, 0.2)' : '#fce4ec',
                                            color: '#e91e63',
                                            fontWeight: 500,
                                            fontSize: '0.7rem',
                                            height: 20
                                        }}
                                    />
                                </Tooltip>
                            );
                        })}
                    </Box>
                ) : (
                    // Handle case where pciDssData is a string or not an array
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Tooltip
                            title={
                                PCI_DSS_CONTROLS.find(c => c.id === pciDssData)?.title || pciDssData
                            }
                        >
                            <Chip
                                label={pciDssData}
                                size="small"
                                sx={{
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(233, 30, 99, 0.2)' : '#fce4ec',
                                    color: '#e91e63',
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                    height: 20
                                }}
                            />
                        </Tooltip>
                    </Box>
                )}
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
            flex: 1,
            minWidth: 150,
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
            field: 'data.msg',
            headerName: 'Message',
            flex: 1,
            minWidth: 150,
            valueGetter: (params) => params.row.data?.msg || 'N/A',
            renderCell: (params) => (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { color: theme.palette.primary.main }
                }}>
                    <MessageIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                    <Tooltip title={params.row.data?.msg || 'N/A'}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                            {params.row.data?.msg || 'N/A'}
                        </Typography>
                    </Tooltip>
                </Box>
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
                            fontWeight: 500,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            '&:hover': {
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            }
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
            field: 'pci_dss',
            headerName: 'PCI DSS Details',
            flex: 1.5,
            minWidth: 250,
            sortable: false,
            renderCell: renderPciDssDetails
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
                            ? 'linear-gradient(45deg, #FF5722, #E91E63)'
                            : 'linear-gradient(45deg, #FF5722, #E91E63)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: theme.palette.mode === 'dark'
                            ? '0 2px 10px rgba(255,255,255,0.1)'
                            : '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <CreditCardIcon sx={{ mr: 1.5, color: '#e91e63' }} />
                        PCI DSS Compliance Analysis
                    </Typography>
                    <Button
                        component={Link}
                        href="https://www.pcisecuritystandards.org/document_library"
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
                        PCI DSS Standards
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
                    aria-label="PCI DSS Compliance tabs"
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
                        id="pcidss-tab-0"
                        aria-controls="pcidss-tabpanel-0"
                    />
                    <Tab
                        icon={<EventIcon />}
                        iconPosition="start"
                        label="Events"
                        id="pcidss-tab-1"
                        aria-controls="pcidss-tabpanel-1"
                    />
                    <Tab
                        icon={<ArticleIcon />}
                        iconPosition="start"
                        label="Explore PCI DSS Controls"
                        id="pcidss-tab-2"
                        aria-controls="pcidss-tabpanel-2"
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
                        id="pcidss-tabpanel-0"
                        aria-labelledby="pcidss-tab-0"
                        ref={dashboardRef}
                    >
                        {tabValue === 0 && (
                            <>
                                {/* Summary Cards */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(255, 87, 34, 0.8), rgba(255, 87, 34, 0.6))',
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
                                                    Total PCI DSS Events
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {processChartData().totalEvents?.toLocaleString() || 0}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <CreditCardIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(233, 30, 99, 0.8), rgba(233, 30, 99, 0.6))',
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
                                                    Unique PCI DSS Controls
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {processChartData().uniqueControls || 0}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <LockIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.8), rgba(156, 39, 176, 0.6))',
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
                                                    Unique App Lists
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {processChartData().uniqueApplists || 0}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <AppsIcon sx={{ fontSize: 100 }} />
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
                                                    High Severity Events
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {processChartData().highSeverityCount || 0}
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
                                </Grid>

                                {/* Timeline Chart - Full Width */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                                position: 'relative',
                                                minHeight: '350px',
                                                '&:hover': {
                                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                                                    '& .fullscreen-icon': {
                                                        opacity: 1
                                                    }
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <TimelineIcon color="primary" sx={{ mr: 1 }} />
                                                    <Box component="span" sx={{ ml: 1 }}>PCI DSS Events Timeline</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getTimelineChartOption(), 'PCI DSS Events Timeline')}
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

                                {/* Agent and Severity Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            getAgentDistributionChartOption(),
                                            'Events by Agent',
                                            <DnsIcon color="info" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            getRuleLevelChartOption(),
                                            'Events by Severity Level',
                                            <WarningIcon color="error" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                </Grid>

                                {/* Messages and Applist Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            getMessagesChartOption(),
                                            'Top Messages',
                                            <MessageIcon color="secondary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            getApplistChartOption(),
                                            'Application Lists',
                                            <AppsIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                </Grid>

                                {/* PCI DSS Controls Chart - Full Width */}
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                                                position: 'relative',
                                                minHeight: '350px',
                                                '&:hover': {
                                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                                                    '& .fullscreen-icon': {
                                                        opacity: 1
                                                    }
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <CreditCardIcon color="secondary" sx={{ mr: 1 }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top PCI DSS Controls</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getPciDssControlsChartOption(), 'Top PCI DSS Controls')}
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
                                                    option={getPciDssControlsChartOption()}
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
                        id="pcidss-tabpanel-1"
                        aria-labelledby="pcidss-tab-1"
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
                                            PCI DSS Compliance Events
                                        </Typography>
                                    </Box>

                                    <form onSubmit={handleSearch}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            placeholder="Search PCI DSS events by description, agent, control, or message..."
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
                                                                fetchPciDssLogs(0, pageSize, '');
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
                                        {loading ? 'Loading PCI DSS events...' : `${totalRows.toLocaleString()} PCI DSS events found`}
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
                                            <CreditCardIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No PCI DSS compliance events found
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
                                            keepNonExistentRowsSelected={false}
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

                    {/* Explore PCI DSS Controls Tab */}
                    <Box
                        role="tabpanel"
                        hidden={tabValue !== 2}
                        id="pcidss-tabpanel-2"
                        aria-labelledby="pcidss-tab-2"
                    >
                        {tabValue === 2 && (
                            <Box sx={{ p: 2 }}>
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 3,
                                        mb: 4,
                                        borderRadius: 2,
                                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(66, 66, 66, 0.6)' : 'rgba(255, 226, 236, 0.6)',
                                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(233, 30, 99, 0.12)'}`,
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <InfoIcon color="secondary" sx={{ mr: 2, fontSize: 32 }} />
                                        <Box>
                                            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>About PCI DSS</Typography>
                                            <Typography variant="body1">
                                                The Payment Card Industry Data Security Standard (PCI DSS) is a set of security standards designed to ensure that all companies that accept, process, store or transmit credit card information maintain a secure environment. The PCI DSS was created to increase controls around cardholder data to reduce credit card fraud.
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>

                                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>PCI DSS Controls</Typography>

                                {PCI_DSS_CONTROLS.map((control) => (
                                    <Accordion
                                        key={control.id}
                                        sx={{
                                            mb: 2,
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            '&:before': { display: 'none' },
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            sx={{
                                                backgroundColor: theme.palette.mode === 'dark'
                                                    ? 'rgba(0, 0, 0, 0.2)'
                                                    : 'rgba(233, 30, 99, 0.05)',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.mode === 'dark'
                                                        ? 'rgba(0, 0, 0, 0.3)'
                                                        : 'rgba(233, 30, 99, 0.1)',
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <CreditCardIcon color="secondary" sx={{ mr: 2 }} />
                                                <Box>
                                                    <Typography variant="body1" fontWeight={600}>{control.id} - {control.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {control.family}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography variant="body1" paragraph>
                                                {control.description}
                                            </Typography>

                                            {control.requirements.length > 0 && (
                                                <>
                                                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1 }}>Key Requirements:</Typography>
                                                    <List disablePadding>
                                                        {control.requirements.map((requirement, index) => (
                                                            <ListItem key={index} sx={{ py: 0.5 }}>
                                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                                    <ShieldIcon color="secondary" fontSize="small" />
                                                                </ListItemIcon>
                                                                <ListItemText primary={requirement} />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </>
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
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
                    Export PCI DSS Events to CSV
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Choose which PCI DSS events to export:
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
                            Export All PCI DSS Events ({totalRows.toLocaleString()} events)
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

export default Pcidss;