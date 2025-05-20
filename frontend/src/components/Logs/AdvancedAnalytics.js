// src/components/Logs/AdvancedAnalytics.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    Divider,
    CircularProgress,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    useTheme,
    Zoom,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar,
    Chip
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import TimeRangeSelector from '../Common/TimeRangeSelector';
import { exportReportToPdf } from '../Reports/Export';

// Icons
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RouterIcon from '@mui/icons-material/Router';
import SecurityIcon from '@mui/icons-material/Security';
import DnsIcon from '@mui/icons-material/Dns';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import LaptopIcon from '@mui/icons-material/Laptop';
import StorageIcon from '@mui/icons-material/Storage';

// Services
import { getAdvancedAnalytics, getEndpointAnalytics } from '../../services/logs';

const AdvancedAnalytics = () => {
    const theme = useTheme();
    const { setPageTitle } = useOutletContext();
    const [tabValue, setTabValue] = useState(0);
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fullscreenChart, setFullscreenChart] = useState(null);
    const [fullscreenTitle, setFullscreenTitle] = useState('');
    const [analytics, setAnalytics] = useState({
        summary: {
            total: 0,
            warnings: 0,
            critical: 0,
            normal: 0
        },
        timeline: [],
        ruleLevels: [],
        ruleDescriptions: [],
        topAgents: [],
        topProtocols: [],
        networkFlows: []
    });

    // Endpoint Analysis State
    const [selectedEndpoint, setSelectedEndpoint] = useState('');
    const [endpoints, setEndpoints] = useState([]);
    const [endpointLoading, setEndpointLoading] = useState(false);
    const [endpointData, setEndpointData] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Refs for exporting
    const analyticsRef = useRef(null);
    const endpointAnalyticsRef = useRef(null);

    // Initialize component
    useEffect(() => {
        setPageTitle('Advanced Security Analytics');
        fetchAnalyticsData();
    }, [timeRange]);

    // Fetch analytics data based on time range
    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await getAdvancedAnalytics(timeRange);
            setAnalytics(data);

            // Set available endpoints
            if (data.topAgents && Array.isArray(data.topAgents)) {
                setEndpoints(data.topAgents.map(agent => ({ name: agent.name, count: agent.count })));
            }

            // Reset selected endpoint when time range changes
            setSelectedEndpoint('');
            setEndpointData(null);

        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch endpoint specific analytics
    const fetchEndpointData = async (endpoint) => {
        if (!endpoint) return;

        try {
            setEndpointLoading(true);
            const data = await getEndpointAnalytics(endpoint, timeRange);
            setEndpointData(data);
        } catch (error) {
            console.error('Error fetching endpoint data:', error);
            setSnackbar({
                open: true,
                message: `Failed to load data for ${endpoint}`,
                severity: 'error'
            });
        } finally {
            setEndpointLoading(false);
        }
    };

    // Handle endpoint change
    const handleEndpointChange = (event) => {
        const endpointName = event.target.value;
        setSelectedEndpoint(endpointName);
        fetchEndpointData(endpointName);
    };

    // Handle tab change
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchAnalyticsData();
        if (selectedEndpoint) {
            fetchEndpointData(selectedEndpoint);
        }
    };

    // Handle export
    const handleExport = () => {
        const exportRef = tabValue === 0 ? analyticsRef : endpointAnalyticsRef;

        if (exportRef.current) {
            exportReportToPdf(
                exportRef.current,
                timeRange,
                new Date(),
                tabValue === 0 ? 'Advanced Security Analytics' : `Endpoint Analysis: ${selectedEndpoint}`
            );

            setSnackbar({
                open: true,
                message: 'Report exported successfully',
                severity: 'success'
            });
        } else {
            setSnackbar({
                open: true,
                message: 'Unable to export report',
                severity: 'error'
            });
        }
    };

    // Fullscreen chart handling
    const openFullscreen = (chartOption, title) => {
        setFullscreenChart(chartOption);
        setFullscreenTitle(title);
    };

    const closeFullscreen = () => {
        setFullscreenChart(null);
        setFullscreenTitle('');
    };

    // Chart color and style configuration
    const chartColors = useMemo(() => ({
        // Primary colors for gradients
        primary: {
            main: theme.palette.primary.main,
            light: theme.palette.primary.light,
            dark: theme.palette.primary.dark,
        },
        secondary: {
            main: theme.palette.secondary.main,
            light: theme.palette.secondary.light,
            dark: theme.palette.secondary.dark,
        },
        success: {
            main: theme.palette.success.main,
            light: theme.palette.success.light,
            dark: theme.palette.success.dark,
        },
        warning: {
            main: theme.palette.warning.main,
            light: theme.palette.warning.light,
            dark: theme.palette.warning.dark,
        },
        error: {
            main: theme.palette.error.main,
            light: theme.palette.error.light,
            dark: theme.palette.error.dark,
        },
        info: {
            main: theme.palette.info.main,
            light: theme.palette.info.light,
            dark: theme.palette.info.dark,
        },
        // Severity specific colors
        severity: {
            normal: theme.palette.info.main,
            warning: theme.palette.warning.main,
            critical: theme.palette.error.main
        },
        // Text colors
        text: {
            primary: theme.palette.text.primary,
            secondary: theme.palette.text.secondary,
        },
        // Background colors
        background: {
            paper: theme.palette.background.paper,
            default: theme.palette.background.default,
        },
        // Chart color sequences
        categorical: [
            '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
            '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6'
        ],
        // Rainbow palette for treemap and sunburst
        rainbow: [
            '#d94e2a', '#ebc844', '#da621e', '#e9a448', '#ad36cc',
            '#4cb04c', '#4474d3', '#d63a69', '#339795', '#ca45be'
        ],
        // Gradient for multi-level charts
        gradient: (color, reverse = false) => {
            return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: reverse ? 1 : 0, color: color + 'ff' },
                { offset: reverse ? 0 : 1, color: color + '50' }
            ]);
        }
    }), [theme]);

    // Chart common options for consistent styling
    const getChartBaseOptions = (showLegend = true) => {
        return {
            textStyle: {
                fontFamily: theme.typography.fontFamily,
                color: theme.palette.text.primary
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)',
                borderColor: theme.palette.divider,
                textStyle: {
                    color: theme.palette.text.primary,
                    fontFamily: theme.typography.fontFamily
                },
                extraCssText: 'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);'
            },
            legend: showLegend ? {
                type: 'scroll',
                orient: 'horizontal',
                bottom: 10,
                textStyle: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily
                },
                pageIconColor: theme.palette.text.secondary,
                pageTextStyle: {
                    color: theme.palette.text.secondary
                }
            } : undefined,
            grid: {
                top: 40,
                bottom: showLegend ? 60 : 30,
                left: 40,
                right: 20,
                containLabel: true
            },
            xAxis: {
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                },
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                },
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily
                },
                splitLine: {
                    lineStyle: {
                        color: theme.palette.divider,
                        opacity: 0.3
                    }
                }
            },
            backgroundColor: 'transparent'
        };
    };

    // Summary bar chart
    const getSummaryChartOption = () => {
        const summaryData = [
            { name: 'Normal Events', value: analytics.summary.normal, itemStyle: { color: chartColors.severity.normal } },
            { name: 'Warning Events', value: analytics.summary.warnings, itemStyle: { color: chartColors.severity.warning } },
            { name: 'Critical Events', value: analytics.summary.critical, itemStyle: { color: chartColors.severity.critical } }
        ];

        return {
            ...getChartBaseOptions(),
            title: {
                text: 'Event Severity Summary',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            xAxis: {
                type: 'category',
                data: summaryData.map(item => item.name),
                axisTick: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: 'Event Count',
                nameTextStyle: {
                    fontWeight: 'bold'
                }
            },
            series: [
                {
                    type: 'bar',
                    data: summaryData,
                    barWidth: '60%',
                    label: {
                        show: true,
                        position: 'top',
                        color: theme.palette.text.primary,
                        formatter: '{c}'
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        }
                    }
                }
            ],
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
                return idx * 200;
            }
        };
    };

    // Timeline chart option
    const getTimelineChartOption = () => {
        if (!analytics.timeline || analytics.timeline.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No timeline data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const timeData = analytics.timeline.map(item => ({
            date: new Date(item.timestamp).toLocaleDateString(),
            total: item.total,
            warning: item.warning,
            critical: item.critical
        }));

        return {
            ...getChartBaseOptions(),
            title: {
                text: 'Security Events Timeline',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    crossStyle: {
                        color: theme.palette.divider
                    }
                }
            },
            legend: {
                data: ['Total Events', 'Warning Events', 'Critical Events'],
                bottom: 10
            },
            xAxis: {
                type: 'category',
                data: timeData.map(item => item.date),
                axisPointer: {
                    type: 'shadow'
                }
            },
            yAxis: {
                type: 'value',
                name: 'Event Count',
                min: 0,
                nameTextStyle: {
                    fontWeight: 'bold'
                }
            },
            series: [
                {
                    name: 'Total Events',
                    type: 'line',
                    smooth: true,
                    data: timeData.map(item => item.total),
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: chartColors.info.main
                    },
                    itemStyle: {
                        color: chartColors.info.main
                    },
                    areaStyle: {
                        color: chartColors.gradient(chartColors.info.main)
                    },
                    z: 1
                },
                {
                    name: 'Warning Events',
                    type: 'bar',
                    stack: 'events',
                    data: timeData.map(item => item.warning),
                    itemStyle: {
                        color: chartColors.severity.warning
                    },
                    emphasis: {
                        focus: 'series'
                    },
                    z: 2
                },
                {
                    name: 'Critical Events',
                    type: 'bar',
                    stack: 'events',
                    data: timeData.map(item => item.critical),
                    itemStyle: {
                        color: chartColors.severity.critical
                    },
                    emphasis: {
                        focus: 'series'
                    },
                    z: 3
                }
            ],
            animationEasing: 'cubicInOut',
            animationDuration: 2000
        };
    };

    // Rule level distribution chart
    const getRuleLevelChartOption = () => {
        if (!analytics.ruleLevels || analytics.ruleLevels.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No rule level data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        // Color mapping based on rule level
        const getColorByLevel = (level) => {
            level = parseInt(level);
            if (level >= 12) return chartColors.error.main;
            if (level >= 9) return chartColors.warning.main;
            if (level >= 5) return chartColors.info.main;
            return chartColors.success.main;
        };

        // Sort by rule level
        const sortedLevels = [...analytics.ruleLevels].sort((a, b) =>
            parseInt(a.level) - parseInt(b.level)
        );

        return {
            ...getChartBaseOptions(),
            title: {
                text: 'Rule Level Distribution',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                formatter: function (params) {
                    const level = params.data.level;
                    const count = params.data.count;
                    const percentage = params.percent || 0;

                    let severity = 'Info';
                    if (level >= 12) severity = 'Critical';
                    else if (level >= 9) severity = 'Warning';
                    else if (level >= 5) severity = 'Notice';

                    return `<div style="font-weight:bold">Level ${level} (${severity})</div>
            <div>Count: ${count.toLocaleString()}</div>
            <div>Percentage: ${percentage.toFixed(2)}%</div>`;
                }
            },
            series: [
                {
                    name: 'Rule Level',
                    type: 'bar',
                    data: sortedLevels.map(level => ({
                        value: level.count,
                        level: level.level,
                        count: level.count,
                        itemStyle: {
                            color: getColorByLevel(level.level)
                        }
                    })),
                    label: {
                        show: true,
                        formatter: '{b}: {c}',
                        position: 'right',
                        color: theme.palette.text.primary
                    },
                    emphasis: {
                        focus: 'self',
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    barWidth: '60%'
                }
            ],
            grid: {
                left: '3%',
                right: '15%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value'
            },
            yAxis: {
                type: 'category',
                data: sortedLevels.map(level => `Level ${level.level}`),
                inverse: true
            },
            animationDelay: function (idx) {
                return idx * 100;
            }
        };
    };

    // Rule descriptions treemap/sunburst
    const getRuleDescriptionChartOption = () => {
        if (!analytics.ruleDescriptions || analytics.ruleDescriptions.length === 0) {
            return {
                ...getChartBaseOptions(false),
                title: {
                    text: 'No rule description data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        // Prepare data for treemap/sunburst transition
        // Group descriptions by category
        const descriptions = analytics.ruleDescriptions;
        const categories = {};

        descriptions.forEach(desc => {
            const parts = desc.description.split(':');
            let category = 'Other';

            if (parts.length > 1) {
                category = parts[0].trim();
            }

            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    value: 0,
                    children: []
                };
            }

            categories[category].value += desc.count;
            categories[category].children.push({
                name: desc.description,
                value: desc.count
            });
        });

        // Convert to array and sort by value
        const treeData = Object.values(categories)
            .sort((a, b) => b.value - a.value)
            .map((category, index) => ({
                ...category,
                // Sort children by value
                children: category.children
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 20), // Limit to prevent overloading
                itemStyle: {
                    color: chartColors.rainbow[index % chartColors.rainbow.length]
                }
            }));

        return {
            ...getChartBaseOptions(false),
            title: {
                text: 'Rule Description Analysis',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                formatter: function (params) {
                    const name = params.data.name;
                    const value = params.data.value;
                    return `<div style="font-weight:bold">${name}</div>
            <div>Count: ${value.toLocaleString()}</div>
            <div>Percentage: ${params.percent ? params.percent.toFixed(2) : '0.00'}%</div>`;
                }
            },
            series: [
                {
                    type: 'treemap',
                    id: 'treemap',
                    animationDurationUpdate: 1000,
                    roam: false,
                    nodeClick: false,
                    breadcrumb: {
                        show: true,
                        itemStyle: {
                            color: theme.palette.background.paper,
                            borderColor: theme.palette.divider,
                            textStyle: {
                                color: theme.palette.text.primary
                            }
                        }
                    },
                    label: {
                        show: true,
                        formatter: '{b}: {c}',
                        ellipsis: true
                    },
                    upperLabel: {
                        show: true,
                        height: 30
                    },
                    itemStyle: {
                        borderColor: theme.palette.background.paper,
                        borderWidth: 2,
                        gapWidth: 2
                    },
                    levels: [
                        {
                            itemStyle: {
                                borderWidth: 3,
                                borderColor: theme.palette.background.paper,
                                gapWidth: 3
                            },
                            upperLabel: {
                                show: false
                            }
                        },
                        {
                            colorSaturation: [0.3, 0.6],
                            itemStyle: {
                                borderWidth: 2,
                                gapWidth: 2,
                                borderColorSaturation: 0.7
                            }
                        }
                    ],
                    data: treeData
                }
            ]
        };
    };

    // Top agents chart
    const getTopAgentsChartOption = () => {
        if (!analytics.topAgents || analytics.topAgents.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No agent data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const agentData = analytics.topAgents
            .slice(0, 10) // Top 10
            .sort((a, b) => b.count - a.count);

        return {
            ...getChartBaseOptions(),
            title: {
                text: 'Top 10 Agents',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            xAxis: {
                type: 'value'
            },
            yAxis: {
                type: 'category',
                data: agentData.map(agent => agent.name),
                inverse: true
            },
            series: [
                {
                    name: 'Event Count',
                    type: 'bar',
                    data: agentData.map((agent, index) => ({
                        value: agent.count,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                                {
                                    offset: 0,
                                    color: chartColors.categorical[index % chartColors.categorical.length] + 'ff'
                                },
                                {
                                    offset: 1,
                                    color: chartColors.categorical[index % chartColors.categorical.length] + '80'
                                }
                            ])
                        }
                    })),
                    label: {
                        show: true,
                        position: 'right',
                        formatter: '{c}',
                        color: theme.palette.text.primary
                    },
                    barWidth: '60%'
                }
            ],
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
                return idx * 100;
            }
        };
    };

    // Network flow Sankey chart
    const getNetworkFlowChartOption = () => {
        if (!analytics.networkFlows || analytics.networkFlows.length === 0) {
            return {
                ...getChartBaseOptions(false),
                title: {
                    text: 'No network flow data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        // Process the data to create nodes and links
        const nodes = new Map();
        const links = [];

        // Add all source and target nodes
        analytics.networkFlows.forEach(flow => {
            if (!nodes.has(flow.source)) {
                nodes.set(flow.source, { name: flow.source });
            }
            if (!nodes.has(flow.target)) {
                nodes.set(flow.target, { name: flow.target });
            }

            // Only add connection if not creating a cycle (source !== target)
            if (flow.source !== flow.target) {
                links.push({
                    source: flow.source,
                    target: flow.target,
                    value: flow.value
                });
            }
        });

        return {
            ...getChartBaseOptions(false),
            title: {
                text: 'Network Connection Flows',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b0}: {c0}'
            },
            series: [
                {
                    type: 'sankey',
                    left: '5%',
                    right: '5%',
                    top: 50,
                    bottom: 50,
                    emphasis: {
                        focus: 'adjacency'
                    },
                    nodeAlign: 'right',
                    layoutIterations: 64,
                    orient: 'horizontal',
                    draggable: true,
                    label: {
                        show: true,
                        position: 'right',
                        color: theme.palette.text.primary,
                        formatter: '{b}'
                    },
                    lineStyle: {
                        color: 'gradient',
                        curveness: 0.5
                    },
                    itemStyle: {
                        color: '#1f78b4',
                        borderColor: theme.palette.background.paper,
                        borderWidth: 1
                    },
                    data: Array.from(nodes.values()),
                    links: links
                }
            ],
            animationDuration: 1000,
            animationEasing: 'cubicOut'
        };
    };

    // Top protocols chart
    const getTopProtocolsChartOption = () => {
        if (!analytics.topProtocols || analytics.topProtocols.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No protocol data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const protocolData = analytics.topProtocols
            .slice(0, 10) // Top 10
            .sort((a, b) => b.count - a.count);

        return {
            ...getChartBaseOptions(),
            title: {
                text: 'Top 10 Network Protocols',
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            series: [
                {
                    name: 'Protocol',
                    type: 'pie',
                    radius: ['40%', '75%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: theme.palette.background.paper,
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}: {c} ({d}%)',
                        color: theme.palette.text.primary,
                        fontWeight: 'bold'
                    },
                    emphasis: {
                        label: {
                            fontSize: 14,
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    data: protocolData.map((protocol, index) => ({
                        name: protocol.name,
                        value: protocol.count,
                        itemStyle: {
                            color: chartColors.categorical[index % chartColors.categorical.length]
                        }
                    }))
                }
            ],
            animationDelay: function (idx) {
                return idx * 100;
            }
        };
    };

    // ENDPOINT ANALYSIS CHARTS

    // Endpoint rule level distribution
    const getEndpointRuleLevelChartOption = () => {
        if (!endpointData?.ruleLevels || endpointData.ruleLevels.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No endpoint rule level data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const ruleLevelData = endpointData.ruleLevels
            .sort((a, b) => parseInt(a.level) - parseInt(b.level));

        return {
            ...getChartBaseOptions(),
            title: {
                text: `Rule Level Distribution for ${selectedEndpoint}`,
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            radar: {
                indicator: ruleLevelData.map(level => ({
                    name: `Level ${level.level}`,
                    max: Math.max(...ruleLevelData.map(l => l.count)) * 1.2
                })),
                center: ['50%', '55%'],
                radius: '70%',
                axisName: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 12
                },
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: [theme.palette.divider]
                    }
                },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: theme.palette.mode === 'dark'
                            ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.05)']
                            : ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.05)']
                    }
                }
            },
            series: [
                {
                    name: 'Rule Levels',
                    type: 'radar',
                    data: [
                        {
                            value: ruleLevelData.map(level => level.count),
                            name: 'Event Count',
                            symbol: 'circle',
                            symbolSize: 8,
                            areaStyle: {
                                color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                                    {
                                        offset: 0,
                                        color: chartColors.primary.main + 'AA'
                                    },
                                    {
                                        offset: 1,
                                        color: chartColors.primary.main + '22'
                                    }
                                ])
                            },
                            lineStyle: {
                                width: 3,
                                color: chartColors.primary.main
                            },
                            itemStyle: {
                                color: chartColors.primary.main
                            },
                            label: {
                                show: true,
                                formatter: '{c}',
                                color: theme.palette.text.primary
                            }
                        }
                    ]
                }
            ],
            animationDuration: 1500
        };
    };

    // Endpoint rule groups chart
    const getEndpointRuleGroupsChartOption = () => {
        if (!endpointData?.ruleGroups || endpointData.ruleGroups.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No endpoint rule groups data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const ruleGroupData = endpointData.ruleGroups
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 rule groups

        return {
            ...getChartBaseOptions(),
            title: {
                text: `Top Rule Groups for ${selectedEndpoint}`,
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 'center',
                textStyle: {
                    color: theme.palette.text.secondary
                }
            },
            series: [
                {
                    name: 'Rule Group',
                    type: 'pie',
                    radius: '65%',
                    center: ['40%', '50%'],
                    data: ruleGroupData.map((group, index) => ({
                        name: group.name,
                        value: group.count,
                        itemStyle: {
                            color: chartColors.categorical[index % chartColors.categorical.length]
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
                        formatter: '{b}: {c} ({d}%)',
                        color: theme.palette.text.primary
                    },
                    labelLine: {
                        smooth: true
                    }
                }
            ],
            animationEasing: 'cubicInOut',
            animationDuration: 1500
        };
    };

    // Endpoint rule descriptions chart
    const getEndpointRuleDescriptionsChartOption = () => {
        if (!endpointData?.ruleDescriptions || endpointData.ruleDescriptions.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No endpoint rule descriptions data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const descriptionsData = endpointData.ruleDescriptions
            .sort((a, b) => b.count - a.count)
            .slice(0, 15); // Top 15 descriptions

        return {
            ...getChartBaseOptions(),
            title: {
                text: `Top Rule Descriptions for ${selectedEndpoint}`,
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            grid: {
                left: '3%',
                right: '15%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'Count',
                nameLocation: 'middle',
                nameGap: 30
            },
            yAxis: {
                type: 'category',
                data: descriptionsData.map(d => {
                    // Truncate long descriptions
                    const desc = d.description;
                    return desc.length > 40 ? desc.substring(0, 37) + '...' : desc;
                }),
                inverse: true,
                axisLabel: {
                    width: 250,
                    overflow: 'truncate'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: function (params) {
                    const data = params[0].data;
                    return `<div style="font-weight:bold">${data.description}</div>
                 <div>Count: ${data.value}</div>`;
                }
            },
            series: [
                {
                    name: 'Rule Description',
                    type: 'bar',
                    data: descriptionsData.map((d, index) => ({
                        value: d.count,
                        description: d.description,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                                {
                                    offset: 0,
                                    color: chartColors.categorical[index % chartColors.categorical.length] + 'ff'
                                },
                                {
                                    offset: 1,
                                    color: chartColors.categorical[index % chartColors.categorical.length] + '80'
                                }
                            ])
                        }
                    })),
                    label: {
                        show: true,
                        position: 'right',
                        formatter: '{c}',
                        color: theme.palette.text.primary
                    }
                }
            ],
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
                return idx * 50;
            }
        };
    };

    // Endpoint timeline chart
    const getEndpointTimelineChartOption = () => {
        if (!endpointData?.timeline || endpointData.timeline.length === 0) {
            return {
                ...getChartBaseOptions(),
                title: {
                    text: 'No endpoint timeline data available',
                    left: 'center',
                    textStyle: {
                        fontFamily: theme.typography.fontFamily,
                        color: theme.palette.text.secondary
                    }
                }
            };
        }

        const timeData = endpointData.timeline.map(item => ({
            date: new Date(item.timestamp).toLocaleDateString(),
            value: item.count
        }));

        return {
            ...getChartBaseOptions(),
            title: {
                text: `Event Timeline for ${selectedEndpoint}`,
                left: 'center',
                textStyle: {
                    fontFamily: theme.typography.fontFamily,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'line',
                    animation: false,
                    lineStyle: {
                        color: theme.palette.primary.main
                    }
                },
                formatter: function (params) {
                    return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}`;
                }
            },
            xAxis: {
                type: 'category',
                data: timeData.map(item => item.date),
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                name: 'Event Count',
                nameTextStyle: {
                    fontWeight: 'bold'
                }
            },
            visualMap: {
                show: false,
                dimension: 1,
                pieces: [
                    {
                        lte: 10,
                        color: chartColors.success.main
                    },
                    {
                        gt: 10,
                        lte: 50,
                        color: chartColors.info.main
                    },
                    {
                        gt: 50,
                        lte: 100,
                        color: chartColors.warning.main
                    },
                    {
                        gt: 100,
                        color: chartColors.error.main
                    }
                ]
            },
            series: [
                {
                    name: 'Events',
                    type: 'line',
                    data: timeData.map(item => item.value),
                    smooth: true,
                    showSymbol: true,
                    symbol: 'emptyCircle',
                    symbolSize: 8,
                    sampling: 'average',
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            {
                                offset: 0,
                                color: theme.palette.primary.main + '80'
                            },
                            {
                                offset: 1,
                                color: theme.palette.primary.main + '20'
                            }
                        ])
                    },
                    itemStyle: {
                        borderWidth: 2
                    },
                    emphasis: {
                        scale: true
                    }
                }
            ],
            animationEasing: 'quadraticInOut',
            animationDuration: 1000
        };
    };

    // Render chart component with fullscreen capability
    const renderChart = (chartId, option, title, icon, height = 400) => {
        return (
            <Paper
                elevation={2}
                sx={{
                    p: 2,
                    height: '100%',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.3s ease',
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
                        {icon}
                        <Box component="span" sx={{ ml: 1 }}>{title}</Box>
                    </Typography>
                    <Tooltip title="View Fullscreen">
                        <IconButton
                            size="small"
                            onClick={() => openFullscreen(option, title)}
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
                <Box sx={{ flexGrow: 1, minHeight: height }}>
                    <ReactECharts
                        option={option}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                        theme={theme.palette.mode === 'dark' ? 'dark' : undefined}
                        notMerge={true}
                        lazyUpdate={true}
                    />
                </Box>
            </Paper>
        );
    };

    // Summary cards for dashboard metrics
    const renderSummaryCards = () => {
        return (
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(66, 165, 245, 0.1)' : 'rgba(66, 165, 245, 0.1)',
                            height: '100%',
                            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.2)'
                            }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                                        Total Events
                                    </Typography>
                                    <Typography variant="h4" color="textPrimary" sx={{ fontWeight: 'bold' }}>
                                        {analytics?.summary?.total?.toLocaleString() || 0}
                                    </Typography>
                                </Box>
                                <StorageIcon sx={{ color: theme.palette.info.main, fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                            height: '100%',
                            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.2)'
                            }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                                        Normal Events
                                    </Typography>
                                    <Typography variant="h4" color="textPrimary" sx={{ fontWeight: 'bold' }}>
                                        {analytics?.summary?.normal?.toLocaleString() || 0}
                                    </Typography>
                                </Box>
                                <InfoIcon sx={{ color: theme.palette.success.main, fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                            height: '100%',
                            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.2)'
                            }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                                        Warning Events
                                    </Typography>
                                    <Typography variant="h4" color="textPrimary" sx={{ fontWeight: 'bold' }}>
                                        {analytics?.summary?.warnings?.toLocaleString() || 0}
                                    </Typography>
                                </Box>
                                <WarningIcon sx={{ color: theme.palette.warning.main, fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            height: '100%',
                            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.2)'
                            }
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                                        Critical Events
                                    </Typography>
                                    <Typography variant="h4" color="textPrimary" sx={{ fontWeight: 'bold' }}>
                                        {analytics?.summary?.critical?.toLocaleString() || 0}
                                    </Typography>
                                </Box>
                                <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    <BarChartIcon sx={{ mr: 1.5, fontSize: 32 }} />
                    Advanced Security Analytics
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
                        startIcon={<DownloadIcon />}
                        onClick={handleExport}
                        disabled={loading || (tabValue === 1 && !selectedEndpoint)}
                    >
                        Export PDF
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="analytics tabs"
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab
                        icon={<BarChartIcon />}
                        iconPosition="start"
                        label="Security Overview"
                        id="tab-0"
                        aria-controls="tabpanel-0"
                    />
                    <Tab
                        icon={<LaptopIcon />}
                        iconPosition="start"
                        label="Endpoint Analysis"
                        id="tab-1"
                        aria-controls="tabpanel-1"
                    />
                </Tabs>
            </Paper>

            {loading && (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                    <CircularProgress />
                </Box>
            )}

            {error && !loading && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Security Overview Tab */}
            <Box
                role="tabpanel"
                hidden={tabValue !== 0}
                id="tabpanel-0"
                aria-labelledby="tab-0"
            >
                {!loading && !error && tabValue === 0 && (
                    <Box ref={analyticsRef}>
                        {/* Summary Cards */}
                        {renderSummaryCards()}

                        {/* Summary Chart & Timeline */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={5}>
                                {renderChart(
                                    'summaryChart',
                                    getSummaryChartOption(),
                                    'Event Severity Summary',
                                    <BarChartIcon color="primary" sx={{ mr: 1 }} />
                                )}
                            </Grid>
                            <Grid item xs={12} md={7}>
                                {renderChart(
                                    'timelineChart',
                                    getTimelineChartOption(),
                                    'Security Events Timeline',
                                    <TimelineIcon color="primary" sx={{ mr: 1 }} />
                                )}
                            </Grid>
                        </Grid>

                        {/* Rule Description Treemap */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12}>
                                {renderChart(
                                    'ruleDescriptionsChart',
                                    getRuleDescriptionChartOption(),
                                    'Rule Description Analysis',
                                    <DonutLargeIcon color="primary" sx={{ mr: 1 }} />,
                                    500 // Taller height for this chart
                                )}
                            </Grid>
                        </Grid>

                        {/* Rule Level, Top Agents & Top Protocols */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                {renderChart(
                                    'ruleLevelChart',
                                    getRuleLevelChartOption(),
                                    'Rule Level Distribution',
                                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                {renderChart(
                                    'topAgentsChart',
                                    getTopAgentsChartOption(),
                                    'Top 10 Agents',
                                    <DnsIcon color="primary" sx={{ mr: 1 }} />
                                )}
                            </Grid>
                        </Grid>

                        {/* Network Flow & Protocols */}
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={8}>
                                {renderChart(
                                    'networkFlowChart',
                                    getNetworkFlowChartOption(),
                                    'Network Connection Flows',
                                    <AccountTreeIcon color="primary" sx={{ mr: 1 }} />,
                                    500 // Taller height for network flow chart
                                )}
                            </Grid>
                            <Grid item xs={12} md={4}>
                                {renderChart(
                                    'topProtocolsChart',
                                    getTopProtocolsChartOption(),
                                    'Top 10 Network Protocols',
                                    <RouterIcon color="primary" sx={{ mr: 1 }} />
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Box>

            {/* Endpoint Analysis Tab */}
            <Box
                role="tabpanel"
                hidden={tabValue !== 1}
                id="tabpanel-1"
                aria-labelledby="tab-1"
            >
                {!loading && !error && tabValue === 1 && (
                    <Box>
                        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Select Endpoint for Analysis
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                                Choose an endpoint to view detailed security analytics for that specific device.
                            </Typography>

                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="endpoint-select-label">Endpoint</InputLabel>
                                <Select
                                    labelId="endpoint-select-label"
                                    id="endpoint-select"
                                    value={selectedEndpoint}
                                    onChange={handleEndpointChange}
                                    label="Endpoint"
                                    disabled={endpointLoading}
                                >
                                    <MenuItem value="">
                                        <em>Select an endpoint</em>
                                    </MenuItem>
                                    {endpoints.map((endpoint) => (
                                        <MenuItem key={endpoint.name} value={endpoint.name}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                <Typography>{endpoint.name}</Typography>
                                                <Chip
                                                    label={`${endpoint.count} events`}
                                                    size="small"
                                                    sx={{ ml: 2 }}
                                                />
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Paper>

                        {endpointLoading && (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
                                <CircularProgress />
                            </Box>
                        )}

                        {!endpointLoading && selectedEndpoint && endpointData && (
                            <Box ref={endpointAnalyticsRef}>
                                <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
                                    <LaptopIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Endpoint Analysis: {selectedEndpoint}
                                </Typography>

                                {/* Endpoint Charts */}
                                <Grid container spacing={3} sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            'endpointRuleLevelChart',
                                            getEndpointRuleLevelChartOption(),
                                            `Rule Level Distribution for ${selectedEndpoint}`,
                                            <SecurityIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        {renderChart(
                                            'endpointTimelineChart',
                                            getEndpointTimelineChartOption(),
                                            `Event Timeline for ${selectedEndpoint}`,
                                            <TimelineIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                </Grid>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={5}>
                                        {renderChart(
                                            'endpointRuleGroupsChart',
                                            getEndpointRuleGroupsChartOption(),
                                            `Top Rule Groups for ${selectedEndpoint}`,
                                            <DonutLargeIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                    <Grid item xs={12} md={7}>
                                        {renderChart(
                                            'endpointRuleDescriptionsChart',
                                            getEndpointRuleDescriptionsChartOption(),
                                            `Top Rule Descriptions for ${selectedEndpoint}`,
                                            <BarChartIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {!endpointLoading && !selectedEndpoint && (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh" flexDirection="column">
                                <LaptopIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
                                <Typography variant="h6" color="textSecondary" gutterBottom>
                                    No endpoint selected
                                </Typography>
                                <Typography variant="body2" color="textSecondary" align="center">
                                    Select an endpoint from the dropdown above to view detailed analysis.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

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
                        overflow: 'hidden'
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
                                theme={theme.palette.mode === 'dark' ? 'dark' : undefined}
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

export default AdvancedAnalytics;