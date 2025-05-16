// src/components/ComplianceReports/Tsc.js
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
import BusinessIcon from '@mui/icons-material/Business';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';
import CategoryIcon from '@mui/icons-material/Category';
import AssessmentIcon from '@mui/icons-material/Assessment';
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
import { getTscLogs } from '../../services/logs';

// Vibrant color palette
const COLOR_PALETTE = [
    '#6236FF',   // Purple Blue
    '#41B883',   // Vue Green
    '#FFA07A',   // Light Salmon
    '#00BCD4',   // Cyan
    '#FFD700',   // Gold
    '#FF5252',   // Red
    '#4CAF50',   // Green
    '#7986CB',   // Indigo
    '#FFC107',   // Amber
    '#EC407A'    // Pink
];

// CSV Export utility
const exportToCSV = (logs, fileName = 'tsc_logs.csv') => {
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
            if (log.rule?.tsc) allKeys.add('rule.tsc');
            if (log.rule?.groups) allKeys.add('rule.groups');
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

// TSC control information
const TSC_CONTROLS = [
    {
        id: "CC1.1",
        family: "Control Environment",
        title: "COSO Principle 1",
        description: "The entity demonstrates a commitment to integrity and ethical values.",
        requirements: ["Code of conduct", "Ethics policies"]
    },
    {
        id: "CC2.1",
        family: "Communication and Information",
        title: "Information Requirements",
        description: "The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.",
        requirements: ["Information quality", "Data validation"]
    },
    {
        id: "CC3.1",
        family: "Risk Assessment",
        title: "Risk Identification",
        description: "The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.",
        requirements: ["Objective setting", "Risk identification process"]
    },
    {
        id: "CC4.1",
        family: "Monitoring Activities",
        title: "Evaluation and Communication",
        description: "The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.",
        requirements: ["Monitoring processes", "Control evaluations"]
    },
    {
        id: "CC5.1",
        family: "Control Activities",
        title: "Control Design",
        description: "The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.",
        requirements: ["Control selection", "Risk mitigation"]
    },
    {
        id: "CC6.1",
        family: "Logical and Physical Access Controls",
        title: "Identity and Access Management",
        description: "The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.",
        requirements: ["Access control", "Authentication mechanisms"]
    },
    {
        id: "CC7.1",
        family: "System Operations",
        title: "Change Management",
        description: "The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.",
        requirements: ["Change approvals", "System testing"]
    },
    {
        id: "CC8.1",
        family: "Change Management",
        title: "Change Management Process",
        description: "The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.",
        requirements: ["Change documentation", "Testing procedures"]
    },
    {
        id: "CC9.1",
        family: "Risk Mitigation",
        title: "Risk Identification and Analysis",
        description: "The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.",
        requirements: ["Business continuity", "Disaster recovery"]
    },
    {
        id: "A1.1",
        family: "Additional Criteria for Confidentiality",
        title: "Confidentiality Policies",
        description: "The entity maintains, monitors, and evaluates controls to provide reasonable assurance that access to confidential information is restricted to authorized users.",
        requirements: ["Access restrictions", "Confidentiality agreements"]
    },
    {
        id: "A1.2",
        family: "Additional Criteria for Confidentiality",
        title: "Confidential Information",
        description: "The entity disposes of confidential information to meet the entity's objectives related to confidentiality.",
        requirements: ["Secure disposal", "Data retention"]
    },
    {
        id: "PI1.1",
        family: "Privacy Notice",
        title: "Communication to Individuals",
        description: "The entity provides notice to data subjects about its privacy practices to meet the entity's objectives related to privacy.",
        requirements: ["Privacy notices", "Communication channels"]
    }
];

const Tsc = () => {
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
        setPageTitle('TSC Compliance');
        fetchTscLogs();
    }, [timeRange]);

    useEffect(() => {
        if (tabValue === 1) {
            // If on the Events tab, fetch logs with pagination
            fetchTscLogs(page, pageSize, searchTerm);
        }
    }, [tabValue, page, pageSize]);

    // Fetch logs with TSC information
    const fetchTscLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
        try {
            setLoading(true);
            setError(null);

            // Convert to 1-indexed for API
            const apiPage = currentPage + 1;

            console.log(`Fetching TSC logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);

            const response = await getTscLogs({
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
                console.log("Received TSC stats:", response.stats);
                console.log("Sample log entry:", response.logs && response.logs.length > 0 ? response.logs[0] : "No logs");

                // Check rule.tsc field structure
                if (response.logs && response.logs.length > 0) {
                    console.log("TSC field structure:", response.logs[0].rule?.tsc);
                    console.log("Description:", response.logs[0].rule?.description);
                    console.log("Groups:", response.logs[0].rule?.groups);
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
            console.error('Error fetching TSC logs:', error);
            setError(error.message || 'Failed to fetch TSC logs. Please try again later.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleRefresh = () => {
        fetchTscLogs(page, pageSize, searchTerm);
    };

    const handleExport = () => {
        if (tabValue === 0) {
            // Export dashboard as PDF
            exportReportToPdf(dashboardRef.current, timeRange, new Date(), 'TSC Compliance Analysis');
        } else {
            // Export logs to CSV
            setExportDialogOpen(true);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setPage(0);
        fetchTscLogs(0, pageSize, searchTerm);
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
        // Explicitly call fetchTscLogs with the new page to ensure pagination works
        fetchTscLogs(newPage, pageSize, searchTerm);
    };

    const handlePageSizeChange = (newPageSize) => {
        console.log(`Page size changing from ${pageSize} to ${newPageSize}`);
        setPageSize(newPageSize);
        setPage(0);
        // Fetch with new page size
        fetchTscLogs(0, newPageSize, searchTerm);
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
        const success = exportToCSV(logs, `tsc_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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

            const response = await getTscLogs({
                page: 1,
                limit: maxResults,
                search: searchTerm,
                timeRange
            });

            const success = exportToCSV(
                response.logs || [],
                `all_tsc_logs_${formatDateForFileName(new Date())}.csv`
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
            tscControlsData: [],
            agentData: [],
            descriptionData: [],
            groupsData: [],
            highSeverityCount: 0,
            totalEvents: 0,
            uniqueControls: 0,
            uniqueAgents: 0,
            uniqueDescriptions: 0,
            uniqueGroups: 0
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

        // Format description data
        const descriptionData = [];
        if (stats.byDescription && Array.isArray(stats.byDescription)) {
            stats.byDescription.forEach(item => {
                if (item && item.description) {
                    // Truncate very long description strings for display
                    const displayDesc = item.description.length > 50
                        ? item.description.substring(0, 47) + '...'
                        : item.description;

                    descriptionData.push({
                        name: displayDesc || 'Unknown',
                        fullName: item.description || 'Unknown',
                        value: item.count || 0
                    });
                }
            });
        }

        // Format groups data
        const groupsData = [];
        if (stats.byGroups && Array.isArray(stats.byGroups)) {
            stats.byGroups.forEach(item => {
                if (item && item.group) {
                    groupsData.push({
                        name: item.group || 'Unknown',
                        value: item.count || 0
                    });
                }
            });
        }

        // Log the processed data for debugging
        console.log("Processed chart data:", {
            timelineData: timeData,
            tscControlsData: stats.byTsc || [],
            agentData: stats.byAgent || [],
            ruleLevelData,
            descriptionData,
            groupsData
        });

        return {
            timelineData: timeData,
            ruleLevelData: ruleLevelData,
            tscControlsData: Array.isArray(stats.byTsc) ? stats.byTsc : [],
            agentData: Array.isArray(stats.byAgent) ? stats.byAgent : [],
            descriptionData,
            groupsData,
            highSeverityCount: highSeverityCount,
            totalEvents: stats.total || 0,
            uniqueControls: Array.isArray(stats.byTsc) ? stats.byTsc.length : 0,
            uniqueAgents: Array.isArray(stats.byAgent) ? stats.byAgent.length : 0,
            uniqueDescriptions: descriptionData.length,
            uniqueGroups: groupsData.length
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
                    text: 'TSC Events Timeline (No Data)',
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
                text: 'TSC Events Timeline',
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
                name: 'TSC Events',
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
                        color: COLOR_PALETTE[1],
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
                    type: 'gauge',
                    data: [{ name: 'No Data', value: 0 }]
                }]
            };
        }

        const data = Object.entries(ruleLevelData).map(([name, value]) => ({
            name,
            value
        }));

        // Calculate total to derive percentages
        const total = data.reduce((sum, item) => sum + item.value, 0);

        // Gauge series data
        const gaugeData = [
            {
                value: 0, // Will be set dynamically
                name: 'Risk Level',
                title: { show: false },
                detail: {
                    valueAnimation: true,
                    formatter: '{value}%',
                    color: '#F44336'
                }
            }
        ];

        // Calculate risk score: higher levels contribute more to the risk percentage
        let weightedScore = 0;
        let maxPossibleScore = 0;

        // Apply weights: Critical: 100, High: 75, Medium: 50, Low: 25, Info: 0
        if (ruleLevelData['Critical (15+)']) {
            weightedScore += ruleLevelData['Critical (15+)'] * 100;
            maxPossibleScore += ruleLevelData['Critical (15+)'] * 100;
        }
        if (ruleLevelData['High (12-14)']) {
            weightedScore += ruleLevelData['High (12-14)'] * 75;
            maxPossibleScore += ruleLevelData['High (12-14)'] * 100;
        }
        if (ruleLevelData['Medium (8-11)']) {
            weightedScore += ruleLevelData['Medium (8-11)'] * 50;
            maxPossibleScore += ruleLevelData['Medium (8-11)'] * 100;
        }
        if (ruleLevelData['Low (4-7)']) {
            weightedScore += ruleLevelData['Low (4-7)'] * 25;
            maxPossibleScore += ruleLevelData['Low (4-7)'] * 100;
        }
        if (ruleLevelData['Info (0-3)']) {
            weightedScore += ruleLevelData['Info (0-3)'] * 0;
            maxPossibleScore += ruleLevelData['Info (0-3)'] * 100;
        }

        // Convert to percentage
        const riskPercentage = maxPossibleScore > 0
            ? Math.round((weightedScore / maxPossibleScore) * 100)
            : 0;

        // Set the value
        gaugeData[0].value = riskPercentage;

        return {
            title: {
                text: 'Severity Risk Assessment',
                left: 'center',
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 500
                }
            },
            tooltip: {
                formatter: '{a} <br/>{b} : {c}%'
            },
            legend: {
                data: ['Critical', 'High', 'Medium', 'Low', 'Info'],
                bottom: 10,
                selectedMode: 'multiple',
                textStyle: {
                    color: theme.palette.text.primary
                }
            },
            grid: [
                { top: '10%', height: '45%' },  // Grid for the gauge
                { top: '60%', height: '30%' }   // Grid for the pie chart - POSITIONED LOWER
            ],
            series: [
                {
                    name: 'Risk Meter',
                    type: 'gauge',
                    min: 0,
                    max: 100,
                    splitNumber: 10,
                    radius: '90%',
                    center: ['50%', '50%'], // Position at the top 30%
                    axisLine: {
                        lineStyle: {
                            width: 30,
                            color: [
                                [0.3, '#67C23A'],
                                [0.7, '#E6A23C'],
                                [1, '#F56C6C']
                            ]
                        }
                    },
                    pointer: {
                        itemStyle: {
                            color: 'auto'
                        }
                    },
                    axisTick: {
                        distance: -30,
                        length: 8,
                        lineStyle: {
                            color: '#fff',
                            width: 2
                        }
                    },
                    splitLine: {
                        distance: -30,
                        length: 30,
                        lineStyle: {
                            color: '#fff',
                            width: 4
                        }
                    },
                    axisLabel: {
                        color: 'auto',
                        distance: -40,
                        fontSize: 12
                    },
                    detail: {
                        valueAnimation: true,
                        formatter: '{value}%',
                        color: 'auto',
                        fontSize: 24,
                        fontWeight: 'bold',
                        offsetCenter: [0, '70%']
                    },
                    data: gaugeData
                },
                {
                    name: 'Severity Distribution',
                    type: 'pie',
                    radius: ['20%', '35%'],
                    center: ['50%', '50%'], // Position at the bottom 75%
                    label: {
                        show: true,
                        position: 'outside',
                        formatter: '{b}: {d}%'
                    },
                    labelLine: {
                        show: true,
                        length: 10,
                        length2: 10
                    },
                    emphasis: {
                        focus: 'self',
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    data: [
                        {
                            value: ruleLevelData['Critical (15+)'] || 0,
                            name: 'Critical',
                            itemStyle: { color: '#F56C6C' }
                        },
                        {
                            value: ruleLevelData['High (12-14)'] || 0,
                            name: 'High',
                            itemStyle: { color: '#F89E9E' }
                        },
                        {
                            value: ruleLevelData['Medium (8-11)'] || 0,
                            name: 'Medium',
                            itemStyle: { color: '#E6A23C' }
                        },
                        {
                            value: ruleLevelData['Low (4-7)'] || 0,
                            name: 'Low',
                            itemStyle: { color: '#67C23A' }
                        },
                        {
                            value: ruleLevelData['Info (0-3)'] || 0,
                            name: 'Info',
                            itemStyle: { color: '#909399' }
                        }
                    ]
                }
            ],
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
                    text: 'Top Agents with TSC Events (No Data)',
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

        return {
            title: {
                text: 'Top Agents with TSC Events',
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
                formatter: '{a} <br/>{b} : {c} ({d}%)'
            },
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 'center',
                bottom: 20,
                data: topAgents.map(item => item.name)
            },
            series: [
                {
                    name: 'Agent Events',
                    type: 'pie',
                    radius: '55%',
                    center: ['40%', '50%'],
                    roseType: 'radius',
                    data: topAgents.map((item, index) => ({
                        name: item.name,
                        value: item.count,
                        itemStyle: {
                            color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                        }
                    })),
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    label: {
                        formatter: '{b}: {c} ({d}%)'
                    }
                }
            ],
            backgroundColor: 'transparent'
        };
    };

    // Description Distribution Bubble Chart
    const getDescriptionChartOption = () => {
        const chartData = processChartData();
        const descriptionData = chartData.descriptionData || [];

        if (descriptionData.length === 0) {
            return {
                title: {
                    text: 'Top Rule Descriptions (No Data)',
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
                    data: [{ name: 'No Data', value: 1 }]
                }]
            };
        }

        // Get top descriptions
        const topDescriptions = descriptionData
            .slice(0, 20)
            .sort((a, b) => b.value - a.value);

        return {
            title: {
                text: 'Top Rule Descriptions',
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
                    return `<strong>${info.data.fullName || info.data.name}</strong><br />
                      Event Count: <span style="font-weight:bold">${info.value}</span>`;
                }
            },
            series: [{
                name: 'Rule Descriptions',
                type: 'treemap',
                visibleMin: 1,
                data: topDescriptions.map((item, index) => ({
                    name: item.name,
                    fullName: item.fullName || item.name,
                    value: item.value,
                    itemStyle: {
                        color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                    }
                })),
                breadcrumb: {
                    show: false
                },
                label: {
                    show: true,
                    formatter: '{b}',
                    fontSize: 12
                },
                upperLabel: {
                    show: true,
                    height: 30
                },
                itemStyle: {
                    borderColor: theme.palette.background.paper,
                    borderWidth: 1,
                    gapWidth: 1
                },
                levels: [{
                    itemStyle: {
                        borderWidth: 0,
                        gapWidth: 1
                    }
                }]
            }],
            backgroundColor: 'transparent'
        };
    };

    // Groups Distribution Chart (Nightingale Rose Chart)
    const getGroupsChartOption = () => {
        const chartData = processChartData();
        const groupsData = chartData.groupsData || [];

        if (groupsData.length === 0) {
            return {
                title: {
                    text: 'Top Rule Groups (No Data)',
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
                    data: [0]
                }]
            };
        }

        // Get top groups
        const topGroups = groupsData
            .slice(0, 15)
            .sort((a, b) => b.value - a.value);

        // Polar bar chart data
        const polarData = topGroups.map((item, index) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
                color: COLOR_PALETTE[index % COLOR_PALETTE.length]
            }
        }));

        return {
            title: {
                text: 'Rule Groups Distribution',
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
                },
                formatter: function (params) {
                    const param = params[0];
                    return `<strong>${param.name}</strong><br/>Count: <strong>${param.value}</strong>`;
                },
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#333'
                }
            },
            angleAxis: {
                type: 'category',
                data: polarData.map(item => item.name),
                z: 10,
                axisLine: {
                    show: false
                },
                axisLabel: {
                    margin: 15,
                    fontSize: 10,
                    rotate: 45
                }
            },
            radiusAxis: {
                axisLine: {
                    show: false
                },
                axisLabel: {
                    show: false
                }
            },
            polar: {
                radius: ['15%', '70%']
            },
            series: [{
                type: 'bar',
                data: polarData,
                coordinateSystem: 'polar',
                barWidth: '50%',
                label: {
                    show: true,
                    position: 'middle',
                    formatter: '{c}',
                    color: '#fff',
                    fontWeight: 'bold'
                }
            }],
            backgroundColor: 'transparent'
        };
    };

    // TSC Controls Chart (Horizontal Bar)
    const getTscControlsChartOption = () => {
        const chartData = processChartData();
        const controlsData = chartData.tscControlsData || [];

        if (controlsData.length === 0) {
            return {
                title: {
                    text: 'Top TSC Controls (No Data)',
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

        // Get top 12 TSC controls
        const topControls = controlsData
            .slice(0, 12)
            .sort((a, b) => b.count - a.count);

        const categories = topControls.map(control => control.control);
        const values = topControls.map(control => control.count);

        return {
            title: {
                text: 'Top TSC Controls',
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
                    // Find matching TSC control
                    const controlInfo = TSC_CONTROLS.find(c => c.id === param.name);
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

    // Function to render TSC details in the DataGrid
    const renderTscDetails = (params) => {
        const tscData = params.row.rule?.tsc;

        if (!tscData) {
            return <Typography variant="body2">No TSC data</Typography>;
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
                {/* TSC Controls Section */}
                {Array.isArray(tscData) && tscData.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {tscData.map((control, idx) => {
                            // Find control info if available
                            const controlInfo = TSC_CONTROLS.find(c => c.id === control);

                            return (
                                <Tooltip
                                    key={`control-${idx}`}
                                    title={controlInfo ? `${controlInfo.title}: ${controlInfo.description}` : control}
                                >
                                    <Chip
                                        label={control}
                                        size="small"
                                        sx={{
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(98, 54, 255, 0.2)' : '#eae6ff',
                                            color: '#6236FF',
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
                    // Handle case where tscData is a string or not an array
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Tooltip
                            title={
                                TSC_CONTROLS.find(c => c.id === tscData)?.title || tscData
                            }
                        >
                            <Chip
                                label={tscData}
                                size="small"
                                sx={{
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(98, 54, 255, 0.2)' : '#eae6ff',
                                    color: '#6236FF',
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
            field: 'rule.groups',
            headerName: 'Groups',
            flex: 1,
            minWidth: 150,
            valueGetter: (params) => {
                const groups = params.row.rule?.groups;
                if (Array.isArray(groups)) {
                    return groups.join(', ');
                }
                return groups || 'N/A';
            },
            renderCell: (params) => {
                const groups = params.row.rule?.groups;
                if (!groups) return <Typography variant="body2">N/A</Typography>;

                const displayGroups = Array.isArray(groups) ? groups : [groups];

                return (
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        maxWidth: 150,
                        overflow: 'hidden'
                    }}>
                        {displayGroups.slice(0, 2).map((group, idx) => (
                            <Chip
                                key={idx}
                                label={group}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem'
                                }}
                            />
                        ))}
                        {displayGroups.length > 2 && (
                            <Chip
                                label={`+${displayGroups.length - 2}`}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem'
                                }}
                            />
                        )}
                    </Box>
                );
            }
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
            field: 'tsc',
            headerName: 'TSC Details',
            flex: 1.5,
            minWidth: 250,
            sortable: false,
            renderCell: renderTscDetails
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
                            ? 'linear-gradient(45deg, #6236FF, #41B883)'
                            : 'linear-gradient(45deg, #6236FF, #41B883)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: theme.palette.mode === 'dark'
                            ? '0 2px 10px rgba(255,255,255,0.1)'
                            : '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <BusinessIcon sx={{ mr: 1.5, color: '#6236FF' }} />
                        TSC Compliance Analysis
                    </Typography>
                    <Button
                        component={Link}
                        href="https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/trustservicesframework.html"
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
                        Trust Services Criteria
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
                    aria-label="TSC Compliance tabs"
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
                        id="tsc-tab-0"
                        aria-controls="tsc-tabpanel-0"
                    />
                    <Tab
                        icon={<EventIcon />}
                        iconPosition="start"
                        label="Events"
                        id="tsc-tab-1"
                        aria-controls="tsc-tabpanel-1"
                    />
                    <Tab
                        icon={<ArticleIcon />}
                        iconPosition="start"
                        label="Explore TSC Controls"
                        id="tsc-tab-2"
                        aria-controls="tsc-tabpanel-2"
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
                        id="tsc-tabpanel-0"
                        aria-labelledby="tsc-tab-0"
                        ref={dashboardRef}
                    >
                        {tabValue === 0 && (
                            <>
                                {/* Summary Cards */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(98, 54, 255, 0.8), rgba(98, 54, 255, 0.6))',
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
                                                    Total TSC Events
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
                                                    <BusinessIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(65, 184, 131, 0.8), rgba(65, 184, 131, 0.6))',
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
                                                    Unique TSC Controls
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
                                                    <ShieldIcon sx={{ fontSize: 100 }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(255, 160, 122, 0.8), rgba(255, 160, 122, 0.6))',
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
                                                    Unique Rule Groups
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {processChartData().uniqueGroups || 0}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <CategoryIcon sx={{ fontSize: 100 }} />
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
                                                    <Box component="span" sx={{ ml: 1 }}>TSC Events Timeline</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getTimelineChartOption(), 'TSC Events Timeline')}
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
                                            'Severity Risk Assessment',
                                            <WarningIcon color="error" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                </Grid>

                                {/* Description and Groups Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            getDescriptionChartOption(),
                                            'Top Rule Descriptions',
                                            <DescriptionIcon color="secondary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            getGroupsChartOption(),
                                            'Rule Groups Distribution',
                                            <CategoryIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                </Grid>

                                {/* TSC Controls Chart - Full Width */}
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
                                                    <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top TSC Controls</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getTscControlsChartOption(), 'Top TSC Controls')}
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
                                                    option={getTscControlsChartOption()}
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
                        id="tsc-tabpanel-1"
                        aria-labelledby="tsc-tab-1"
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
                                            TSC Compliance Events
                                        </Typography>
                                    </Box>

                                    <form onSubmit={handleSearch}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            placeholder="Search TSC events by description, agent, control, or groups..."
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
                                                                fetchTscLogs(0, pageSize, '');
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
                                        {loading ? 'Loading TSC events...' : `${totalRows.toLocaleString()} TSC events found`}
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
                                            <BusinessIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No TSC compliance events found
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

                    {/* Explore TSC Controls Tab */}
                    <Box
                        role="tabpanel"
                        hidden={tabValue !== 2}
                        id="tsc-tabpanel-2"
                        aria-labelledby="tsc-tab-2"
                    >
                        {tabValue === 2 && (
                            <Box sx={{ p: 2 }}>
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 3,
                                        mb: 4,
                                        borderRadius: 2,
                                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(66, 66, 66, 0.6)' : 'rgba(236, 236, 255, 0.6)',
                                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(98, 54, 255, 0.12)'}`,
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <InfoIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
                                        <Box>
                                            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>About TSC</Typography>
                                            <Typography variant="body1">
                                                The Trust Services Criteria (TSC) are a set of standards for services auditors use to evaluate controls relevant to security, availability, processing integrity, confidentiality, and privacy. These criteria were developed by the American Institute of Certified Public Accountants (AICPA) to provide a framework for service organizations to ensure they have effective controls in place to manage risks related to information and systems.
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>

                                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>TSC Controls</Typography>

                                {TSC_CONTROLS.map((control) => (
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
                                                    : 'rgba(98, 54, 255, 0.05)',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.mode === 'dark'
                                                        ? 'rgba(0, 0, 0, 0.3)'
                                                        : 'rgba(98, 54, 255, 0.1)',
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <BusinessIcon color="primary" sx={{ mr: 2 }} />
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
                                                                    <ShieldIcon color="primary" fontSize="small" />
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
                    Export TSC Events to CSV
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Choose which TSC events to export:
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
                            Export All TSC Events ({totalRows.toLocaleString()} events)
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

export default Tsc;