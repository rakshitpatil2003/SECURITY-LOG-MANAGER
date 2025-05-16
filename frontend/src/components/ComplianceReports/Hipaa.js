// src/components/ComplianceReports/Hipaa.js
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
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import Snackbar from '@mui/material/Snackbar';
import { DataGrid } from '@mui/x-data-grid';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';

// Import TimeRangeSelector component
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { StructuredLogView } from '../Logs/StructuredLogView';

// Import export utility
import { exportReportToPdf } from '../Reports/Export';

// Import service for data fetching
import { getHipaaLogs } from '../../services/logs';

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
const exportToCSV = (logs, fileName = 'hipaa_logs.csv') => {
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
            if (log.rule?.hipaa) allKeys.add('rule.hipaa');
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

// HIPAA control information - extensive list for the Explorer tab
const HIPAA_CONTROLS = [
    {
        id: "164.312.a.1",
        title: "Access Control",
        description: "Implement technical policies and procedures for electronic information systems that maintain electronic protected health information to allow access only to those persons or software programs that have been granted access rights.",
        requirements: [
            "Unique User Identification (Required)",
            "Emergency Access Procedure (Required)",
            "Automatic Logoff (Addressable)",
            "Encryption and Decryption (Addressable)"
        ]
    },
    {
        id: "164.312.b",
        title: "Audit Controls",
        description: "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information.",
        requirements: []
    },
    {
        id: "164.312.c.1",
        title: "Integrity",
        description: "Implement policies and procedures to protect electronic protected health information from improper alteration or destruction.",
        requirements: [
            "Mechanism to Authenticate Electronic Protected Health Information (Addressable)"
        ]
    },
    {
        id: "164.312.d",
        title: "Person or Entity Authentication",
        description: "Implement procedures to verify that a person or entity seeking access to electronic protected health information is the one claimed.",
        requirements: []
    },
    {
        id: "164.312.e.1",
        title: "Transmission Security",
        description: "Implement technical security measures to guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network.",
        requirements: [
            "Integrity Controls (Addressable)",
            "Encryption (Addressable)"
        ]
    },
    {
        id: "164.308.a.1.i",
        title: "Security Management Process",
        description: "Implement policies and procedures to prevent, detect, contain, and correct security violations.",
        requirements: [
            "Risk Analysis (Required)",
            "Risk Management (Required)",
            "Sanction Policy (Required)",
            "Information System Activity Review (Required)"
        ]
    },
    {
        id: "164.308.a.2",
        title: "Assigned Security Responsibility",
        description: "Identify the security official who is responsible for the development and implementation of the policies and procedures required by this subpart for the covered entity or business associate.",
        requirements: []
    },
    {
        id: "164.308.a.3.i",
        title: "Workforce Security",
        description: "Implement policies and procedures to ensure that all members of its workforce have appropriate access to electronic protected health information.",
        requirements: [
            "Authorization and/or Supervision (Addressable)",
            "Workforce Clearance Procedure (Addressable)",
            "Termination Procedures (Addressable)"
        ]
    },
    {
        id: "164.308.a.4.i",
        title: "Information Access Management",
        description: "Implement policies and procedures for authorizing access to electronic protected health information.",
        requirements: [
            "Isolating Health Care Clearinghouse Functions (Required)",
            "Access Authorization (Addressable)",
            "Access Establishment and Modification (Addressable)"
        ]
    },
    {
        id: "164.308.a.5.i",
        title: "Security Awareness and Training",
        description: "Implement a security awareness and training program for all members of its workforce.",
        requirements: [
            "Security Reminders (Addressable)",
            "Protection from Malicious Software (Addressable)",
            "Log-in Monitoring (Addressable)",
            "Password Management (Addressable)"
        ]
    },
    {
        id: "164.308.a.6.i",
        title: "Security Incident Procedures",
        description: "Implement policies and procedures to address security incidents.",
        requirements: [
            "Response and Reporting (Required)"
        ]
    },
    {
        id: "164.308.a.7.i",
        title: "Contingency Plan",
        description: "Establish policies and procedures for responding to an emergency or other occurrence that damages systems that contain electronic protected health information.",
        requirements: [
            "Data Backup Plan (Required)",
            "Disaster Recovery Plan (Required)",
            "Emergency Mode Operation Plan (Required)",
            "Testing and Revision Procedures (Addressable)",
            "Applications and Data Criticality Analysis (Addressable)"
        ]
    },
    {
        id: "164.308.a.8",
        title: "Evaluation",
        description: "Perform a periodic technical and nontechnical evaluation, based initially upon the standards implemented under this rule and, subsequently, in response to environmental or operational changes affecting the security of electronic protected health information.",
        requirements: []
    },
    {
        id: "164.310.a.1",
        title: "Facility Access Controls",
        description: "Implement policies and procedures to limit physical access to its electronic information systems and the facility or facilities in which they are housed, while ensuring that properly authorized access is allowed.",
        requirements: [
            "Contingency Operations (Addressable)",
            "Facility Security Plan (Addressable)",
            "Access Control and Validation Procedures (Addressable)",
            "Maintenance Records (Addressable)"
        ]
    },
    {
        id: "164.310.b",
        title: "Workstation Use",
        description: "Implement policies and procedures that specify the proper functions to be performed, the manner in which those functions are to be performed, and the physical attributes of the surroundings of a specific workstation or class of workstation that can access electronic protected health information.",
        requirements: []
    },
    {
        id: "164.310.c",
        title: "Workstation Security",
        description: "Implement physical safeguards for all workstations that access electronic protected health information, to restrict access to authorized users.",
        requirements: []
    },
    {
        id: "164.310.d.1",
        title: "Device and Media Controls",
        description: "Implement policies and procedures that govern the receipt and removal of hardware and electronic media that contain electronic protected health information into and out of a facility, and the movement of these items within the facility.",
        requirements: [
            "Disposal (Required)",
            "Media Re-use (Required)",
            "Accountability (Addressable)",
            "Data Backup and Storage (Addressable)"
        ]
    }
];

const Hipaa = () => {
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
        setPageTitle('HIPAA Compliance');
        fetchHipaaLogs();
    }, [timeRange]);

    useEffect(() => {
        if (tabValue === 1) {
            // If on the Events tab, fetch logs with pagination
            fetchHipaaLogs(page, pageSize, searchTerm);
        }
    }, [tabValue, page, pageSize]);

    // Fetch logs with HIPAA information
    const fetchHipaaLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
        try {
            setLoading(true);
            setError(null);

            // Convert to 1-indexed for API
            const apiPage = currentPage + 1;

            console.log(`Fetching HIPAA logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);

            const response = await getHipaaLogs({
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
                // Debug logs
                console.log("Received HIPAA stats:", response.stats);
                console.log("Sample log entry:", response.logs && response.logs.length > 0 ? response.logs[0] : "No logs");

                // Check rule.hipaa field structure
                if (response.logs && response.logs.length > 0) {
                    console.log("HIPAA field structure:", response.logs[0].rule?.hipaa);
                }
                setTotalRows(response.pagination?.total || 0);
                console.log(`Received ${response.logs?.length} logs out of ${response.pagination?.total} total`);

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
            console.error('Error fetching HIPAA logs:', error);
            setError(error.message || 'Failed to fetch HIPAA logs. Please try again later.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleRefresh = () => {
        fetchHipaaLogs(page, pageSize, searchTerm);
    };

    const handleExport = () => {
        if (tabValue === 0) {
            // Export dashboard as PDF
            exportReportToPdf(dashboardRef.current, timeRange, new Date(), 'HIPAA Compliance Analysis');
        } else {
            // Export logs to CSV
            setExportDialogOpen(true);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setPage(0);
        fetchHipaaLogs(0, pageSize, searchTerm);
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
    };

    // Export current page logs
    const exportCurrentPage = () => {
        setExportDialogOpen(false);
        const success = exportToCSV(logs, `hipaa_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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
            const maxResults = Math.min(totalRows, 100000); // Limit to 10,000 to prevent memory issues

            const response = await getHipaaLogs({
                page: 1,
                limit: maxResults,
                search: searchTerm,
                timeRange
            });

            const success = exportToCSV(
                response.logs || [],
                `all_hipaa_logs_${formatDateForFileName(new Date())}.csv`
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
    // Process data for charts
    const processChartData = () => {
        if (!stats) return {
            timelineData: {},
            ruleLevelData: {},
            hipaaControlsData: [],
            agentData: [],
            highSeverityCount: 0,
            totalEvents: 0,
            uniqueControls: 0,
            uniqueAgents: 0
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

        // Log the processed data for debugging
        console.log("Processed chart data:", {
            timelineData: timeData,
            hipaaControlsData: stats.byHipaa || [],
            agentData: stats.byAgent || [],
            ruleLevelData
        });

        return {
            timelineData: timeData,
            ruleLevelData: ruleLevelData,
            hipaaControlsData: Array.isArray(stats.byHipaa) ? stats.byHipaa : [],
            agentData: Array.isArray(stats.byAgent) ? stats.byAgent : [],
            highSeverityCount: highSeverityCount,
            totalEvents: stats.total || 0,
            uniqueControls: Array.isArray(stats.byHipaa) ? stats.byHipaa.length : 0,
            uniqueAgents: Array.isArray(stats.byAgent) ? stats.byAgent.length : 0
        };
    };

    // Chart data and options - Timeline Chart
    const getTimelineChartOption = () => {
        const chartData = processChartData();
        console.log("Timeline chart data:", chartData.timelineData);
        const timelineData = chartData.timelineData || {};

        const dates = Object.keys(timelineData);
        const values = Object.values(timelineData);

        return {
            title: {
                text: 'HIPAA Events Timeline',
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
                  Events: <span style="color:${COLOR_PALETTE[1]};font-weight:bold">${param.value}</span>`;
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
                name: 'HIPAA Events',
                data: values,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: {
                    color: COLOR_PALETTE[1]
                },
                lineStyle: {
                    width: 3,
                    color: COLOR_PALETTE[1]
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: `${COLOR_PALETTE[1]}80` },
                        { offset: 1, color: `${COLOR_PALETTE[1]}10` }
                    ])
                },
                emphasis: {
                    itemStyle: {
                        color: COLOR_PALETTE[0],
                        borderColor: COLOR_PALETTE[1],
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

        // Get top 10 agents
        const topAgents = agentData
            .slice(0, 10)
            .sort((a, b) => b.count - a.count);

        const categories = topAgents.map(agent => agent.name);
        const values = topAgents.map(agent => agent.count);

        return {
            title: {
                text: 'Top Agents with HIPAA Events',
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
                  HIPAA Events: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;
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

    // HIPAA Controls Chart (Horizontal Bar)
    const getHipaaControlsChartOption = () => {
        const chartData = processChartData();
        const controlsData = chartData.hipaaControlsData || [];

        // Get top 10 HIPAA controls
        const topControls = controlsData
            .slice(0, 10)
            .sort((a, b) => b.count - a.count);

        const categories = topControls.map(control => control.control);
        const values = topControls.map(control => control.count);

        return {
            title: {
                text: 'Top HIPAA Controls',
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
                    // Find matching HIPAA control
                    const controlInfo = HIPAA_CONTROLS.find(c => c.id === param.name);
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
                            onClick={() => openFullscreen(chartOption, title)}  // Pass the title here
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
                    />
                </Box>
            </Paper>
        );
    };

    // Function to render HIPAA details in the DataGrid
    const renderHipaaDetails = (params) => {
        const hipaaData = params.row.rule?.hipaa;

        if (!hipaaData) {
            return <Typography variant="body2">No HIPAA data</Typography>;
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
                {/* HIPAA Controls Section */}
                {Array.isArray(hipaaData) && hipaaData.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {hipaaData.map((control, idx) => {
                            // Find control info if available
                            const controlInfo = HIPAA_CONTROLS.find(c => c.id === control);

                            return (
                                <Tooltip
                                    key={`control-${idx}`}
                                    title={controlInfo ? `${controlInfo.title}: ${controlInfo.description}` : control}
                                >
                                    <Chip
                                        label={control}
                                        size="small"
                                        sx={{
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : '#e3f2fd',
                                            color: '#1976d2',
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
                    // Handle case where hipaaData is a string or not an array
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Tooltip
                            title={
                                HIPAA_CONTROLS.find(c => c.id === hipaaData)?.title || hipaaData
                            }
                        >
                            <Chip
                                label={hipaaData}
                                size="small"
                                sx={{
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : '#e3f2fd',
                                    color: '#1976d2',
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
            field: 'hipaa',
            headerName: 'HIPAA Details',
            flex: 1.8,
            minWidth: 250,
            sortable: false,
            renderCell: renderHipaaDetails
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
                            ? 'linear-gradient(45deg, #3366FF, #4ECDC4)'
                            : 'linear-gradient(45deg, #2196F3, #00BCD4)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: theme.palette.mode === 'dark'
                            ? '0 2px 10px rgba(255,255,255,0.1)'
                            : '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <VerifiedUserIcon sx={{ mr: 1.5, color: 'info.main' }} />
                        HIPAA Compliance Analysis
                    </Typography>
                    <Button
                        component={Link}
                        href="https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html"
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
                        HIPAA Security Rule Reference
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
                    aria-label="HIPAA Compliance tabs"
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
                        id="hipaa-tab-0"
                        aria-controls="hipaa-tabpanel-0"
                    />
                    <Tab
                        icon={<EventIcon />}
                        iconPosition="start"
                        label="Events"
                        id="hipaa-tab-1"
                        aria-controls="hipaa-tabpanel-1"
                    />
                    <Tab
                        icon={<ArticleIcon />}
                        iconPosition="start"
                        label="Explore HIPAA Controls"
                        id="hipaa-tab-2"
                        aria-controls="hipaa-tabpanel-2"
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
                        id="hipaa-tabpanel-0"
                        aria-labelledby="hipaa-tab-0"
                        ref={dashboardRef}
                    >
                        {tabValue === 0 && (
                            <>
                                {/* Summary Cards */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Card elevation={3} sx={{
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.8), rgba(33, 150, 243, 0.6))',
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
                                                    Total HIPAA Events
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
                                                    <VerifiedUserIcon sx={{ fontSize: 100 }} />
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
                                                    Unique HIPAA Controls
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
                                            background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.8), rgba(0, 188, 212, 0.6))',
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
                                                    Unique Agent Sources
                                                </Typography>
                                                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                                                    {processChartData().uniqueAgents || 0}
                                                </Typography>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -20,
                                                    right: -20,
                                                    opacity: 0.2,
                                                    transform: 'rotate(-15deg)'
                                                }}>
                                                    <DnsIcon sx={{ fontSize: 100 }} />
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
                                                    <Box component="span" sx={{ ml: 1 }}>HIPAA Events Timeline</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getTimelineChartOption(), 'HIPAA Events Timeline')}
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

                                {/* HIPAA Controls Chart - Full Width */}
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
                                                    <VerifiedUserIcon color="primary" sx={{ mr: 1 }} />
                                                    <Box component="span" sx={{ ml: 1 }}>Top HIPAA Controls</Box>
                                                </Typography>
                                                <Tooltip title="View Fullscreen">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openFullscreen(getHipaaControlsChartOption(), 'Top HIPAA Controls')}
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
                                                    option={getHipaaControlsChartOption()}
                                                    style={{ height: '100%', width: '100%' }}
                                                    opts={{ renderer: 'canvas' }}
                                                    theme={theme.palette.mode === 'dark' ? 'dark' : ''}
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
                        id="hipaa-tabpanel-1"
                        aria-labelledby="hipaa-tab-1"
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
                                            HIPAA Compliance Events
                                        </Typography>
                                    </Box>

                                    <form onSubmit={handleSearch}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            placeholder="Search HIPAA events by description, agent, or control..."
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
                                                                fetchHipaaLogs(0, pageSize, '');
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
                                        {loading ? 'Loading HIPAA events...' : `${totalRows.toLocaleString()} HIPAA events found`}
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
                                            <VerifiedUserIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No HIPAA compliance events found
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

                    {/* Explore HIPAA Controls Tab */}
                    <Box
                        role="tabpanel"
                        hidden={tabValue !== 2}
                        id="hipaa-tabpanel-2"
                        aria-labelledby="hipaa-tab-2"
                    >
                        {tabValue === 2 && (
                            <Box sx={{ p: 2 }}>
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 3,
                                        mb: 4,
                                        borderRadius: 2,
                                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(66, 66, 66, 0.6)' : 'rgba(232, 244, 253, 0.6)',
                                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(25, 118, 210, 0.12)'}`,
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <InfoIcon color="info" sx={{ mr: 2, fontSize: 32 }} />
                                        <Box>
                                            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>About HIPAA Security Rule</Typography>
                                            <Typography variant="body1">
                                                The HIPAA Security Rule establishes national standards to protect individuals' electronic protected health information (ePHI)
                                                that is created, received, used, or maintained by a covered entity. The Security Rule requires appropriate
                                                administrative, physical and technical safeguards to ensure the confidentiality, integrity, and security of ePHI.
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>

                                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>HIPAA Security Rule Controls</Typography>

                                {HIPAA_CONTROLS.map((control) => (
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
                                                    : 'rgba(25, 118, 210, 0.05)',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.mode === 'dark'
                                                        ? 'rgba(0, 0, 0, 0.3)'
                                                        : 'rgba(25, 118, 210, 0.1)',
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <VerifiedUserIcon color="primary" sx={{ mr: 2 }} />
                                                <Box>
                                                    <Typography variant="body1" fontWeight={600}>{control.id} - {control.title}</Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography variant="body1" paragraph>
                                                {control.description}
                                            </Typography>

                                            {control.requirements.length > 0 && (
                                                <>
                                                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1 }}>Implementation Specifications:</Typography>
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
                                notMerge={true}  // Add this to ensure chart redraws properly
                                lazyUpdate={true}  // Add this for better performance
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
                    Export HIPAA Events to CSV
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Choose which HIPAA events to export:
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
                            Export All HIPAA Events ({totalRows.toLocaleString()} events)
                        </Button>

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

export default Hipaa;