// src/components/Logs/SCA.js
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
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Collapse,
    CardActionArea,
    Table
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
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PolicyIcon from '@mui/icons-material/Policy';
import ArticleIcon from '@mui/icons-material/Article';
import Snackbar from '@mui/material/Snackbar';
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
import { getScaLogs } from '../../services/logs';

// Vibrant color palette
const COLOR_PALETTE = [
    '#4CAF50',   // Green - Passed
    '#F44336',   // Red - Failed
    '#9E9E9E',   // Grey - Not Applicable
    '#FFA726',   // Orange - No Result
    '#2196F3',   // Blue
    '#673AB7',   // Deep Purple
    '#FF5722',   // Deep Orange
    '#607D8B',   // Blue Gray
    '#795548'    // Brown
];

// Export to CSV utility 
const exportToCSV = (logs, fileName = 'sca_logs.csv') => {
    if (!logs || logs.length === 0) {
        console.error('No logs to export');
        return false;
    }

    try {
        // Get all unique keys for CSV header
        const baseKeys = ['id', '@timestamp', 'agent.name', 'rule.level', 'rule.description'];
        const scaKeys = [
            'data.sca.policy',
            'data.sca.check.id',
            'data.sca.check.title',
            'data.sca.check.result',
            'data.sca.check.rationale',
            'data.sca.check.remediation'
        ];

        const headers = [...baseKeys, ...scaKeys];

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

// SCA Details View Component
const ScaDetailsView = ({ data, onClose, onViewFullDetails }) => {
    const theme = useTheme();
    const [expandedSections, setExpandedSections] = useState({
        general: true,
        details: true,
        compliance: true,
        rationale: true,
        remediation: true
    });

    const scaCheck = data?.data?.sca?.check || {};
    const scaPolicy = data?.data?.sca?.policy || 'Unknown Policy';

    // Toggle expanded section
    const toggleSection = (section) => {
        setExpandedSections({
            ...expandedSections,
            [section]: !expandedSections[section]
        });
    };

    // Get result color and icon
    const getResultDetails = (result) => {
        let color, icon, chipColor;

        if (!result) {
            return {
                color: theme.palette.grey[500],
                icon: <HelpIcon />,
                chipColor: 'default'
            };
        }

        switch (result.toLowerCase()) {
            case 'passed':
                color = theme.palette.success.main;
                icon = <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
                chipColor = 'success';
                break;
            case 'failed':
                color = theme.palette.error.main;
                icon = <ErrorIcon sx={{ color: theme.palette.error.main }} />;
                chipColor = 'error';
                break;
            case 'not applicable':
                color = theme.palette.grey[500];
                icon = <InfoIcon sx={{ color: theme.palette.grey[500] }} />;
                chipColor = 'default';
                break;
            default:
                color = theme.palette.warning.main;
                icon = <HelpIcon sx={{ color: theme.palette.warning.main }} />;
                chipColor = 'warning';
        }

        return { color, icon, chipColor };
    };

    const resultDetails = getResultDetails(scaCheck.result);

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
                    <VerifiedUserIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        System Configuration Assessment Check
                    </Typography>
                    <Chip
                        label={scaCheck.result || 'No Result'}
                        color={resultDetails.chipColor}
                        size="small"
                        sx={{ ml: 2, fontWeight: 'bold' }}
                    />
                </Box>
                <IconButton edge="end" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                    <Grid container spacing={3}>
                        {/* General Information */}
                        <Grid item xs={12}>
                            <Paper
                                elevation={2}
                                sx={{
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        '&:hover': {
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        }
                                    }}
                                    onClick={() => toggleSection('general')}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <ArticleIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                        <Typography variant="h6">General Information</Typography>
                                    </Box>
                                    <IconButton size="small">
                                        {expandedSections.general ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                    </IconButton>
                                </Box>

                                <Collapse in={expandedSections.general}>
                                    <Box sx={{ p: 2 }}>
                                        <Table size="small">
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell
                                                        component="th"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            width: '30%',
                                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                                        }}
                                                    >
                                                        Policy
                                                    </TableCell>
                                                    <TableCell>{scaPolicy}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell
                                                        component="th"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                                        }}
                                                    >
                                                        Check ID
                                                    </TableCell>
                                                    <TableCell>{scaCheck.id || 'N/A'}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell
                                                        component="th"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                                        }}
                                                    >
                                                        Result
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            {resultDetails.icon}
                                                            <Typography sx={{ ml: 1, color: resultDetails.color, fontWeight: 'bold' }}>
                                                                {scaCheck.result || 'No Result'}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                                {scaCheck.reason && (
                                                    <TableRow>
                                                        <TableCell
                                                            component="th"
                                                            sx={{
                                                                fontWeight: 'bold',
                                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                                            }}
                                                        >
                                                            Reason
                                                        </TableCell>
                                                        <TableCell>{scaCheck.reason}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Collapse>
                            </Paper>
                        </Grid>

                        {/* Check Details */}
                        <Grid item xs={12}>
                            <Paper
                                elevation={2}
                                sx={{
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        '&:hover': {
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        }
                                    }}
                                    onClick={() => toggleSection('details')}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <SecurityIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
                                        <Typography variant="h6">Check Details</Typography>
                                    </Box>
                                    <IconButton size="small">
                                        {expandedSections.details ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                    </IconButton>
                                </Box>

                                <Collapse in={expandedSections.details}>
                                    <Box sx={{ p: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            {scaCheck.title || 'No Title Available'}
                                        </Typography>

                                        {scaCheck.description && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                    Description
                                                </Typography>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                    {scaCheck.description}
                                                </Typography>
                                            </Box>
                                        )}

                                        {scaCheck.registry && scaCheck.registry.length > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                    Registry Keys
                                                </Typography>
                                                {scaCheck.registry.map((reg, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={reg}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mr: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}
                                                    />
                                                ))}
                                            </Box>
                                        )}

                                        {scaCheck.references && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                    References
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    component="a"
                                                    href={scaCheck.references}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        textDecoration: 'none',
                                                        '&:hover': {
                                                            textDecoration: 'underline'
                                                        }
                                                    }}
                                                >
                                                    {scaCheck.references}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Collapse>
                            </Paper>
                        </Grid>

                        {/* Compliance Information */}
                        {scaCheck.compliance && (
                            <Grid item xs={12}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            '&:hover': {
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            }
                                        }}
                                        onClick={() => toggleSection('compliance')}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <PolicyIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                                            <Typography variant="h6">Compliance Information</Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {expandedSections.compliance ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                        </IconButton>
                                    </Box>

                                    <Collapse in={expandedSections.compliance}>
                                        <Box sx={{ p: 2 }}>
                                            <Grid container spacing={2}>
                                                {Object.entries(scaCheck.compliance || {}).map(([standard, value]) => (
                                                    <Grid item xs={12} sm={6} md={4} key={standard}>
                                                        <Paper
                                                            variant="outlined"
                                                            sx={{
                                                                p: 1.5,
                                                                borderRadius: 1,
                                                                height: '100%'
                                                            }}
                                                        >
                                                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                                {standard.toUpperCase()}
                                                            </Typography>

                                                            {typeof value === 'object' && value !== null ? (
                                                                // Handle nested compliance objects
                                                                Object.entries(value).map(([k, v]) => (
                                                                    <Typography key={k} variant="body2" sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        mb: 0.5,
                                                                        fontFamily: 'monospace',
                                                                        fontSize: '0.75rem'
                                                                    }}>
                                                                        <Box component="span" sx={{
                                                                            width: 8,
                                                                            height: 8,
                                                                            borderRadius: '50%',
                                                                            bgcolor: theme.palette.primary.main,
                                                                            mr: 1,
                                                                            display: 'inline-block'
                                                                        }} />
                                                                        {/* Ensure v is properly rendered as string */}
                                                                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                                    </Typography>
                                                                ))
                                                            ) : (
                                                                // Handle simple values
                                                                <Typography variant="body2" sx={{
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.75rem'
                                                                }}>
                                                                    {/* Ensure value is properly rendered as string */}
                                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                </Typography>
                                                            )}
                                                        </Paper>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    </Collapse>
                                </Paper>
                            </Grid>
                        )}

                        {/* Rationale */}
                        {scaCheck.rationale && (
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        borderRadius: 2,
                                        height: '100%',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            '&:hover': {
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            }
                                        }}
                                        onClick={() => toggleSection('rationale')}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <InfoIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                                            <Typography variant="h6">Rationale</Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {expandedSections.rationale ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                        </IconButton>
                                    </Box>

                                    <Collapse in={expandedSections.rationale}>
                                        <Box sx={{ p: 2 }}>
                                            <Typography variant="body2" sx={{
                                                whiteSpace: 'pre-line',
                                                color: theme.palette.text.secondary
                                            }}>
                                                {scaCheck.rationale}
                                            </Typography>
                                        </Box>
                                    </Collapse>
                                </Paper>
                            </Grid>
                        )}

                        {/* Remediation */}
                        {scaCheck.remediation && (
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        borderRadius: 2,
                                        height: '100%',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            '&:hover': {
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            }
                                        }}
                                        onClick={() => toggleSection('remediation')}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ErrorIcon sx={{ mr: 1, color: theme.palette.error.main }} />
                                            <Typography variant="h6">Remediation</Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {expandedSections.remediation ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                        </IconButton>
                                    </Box>

                                    <Collapse in={expandedSections.remediation}>
                                        <Box sx={{ p: 2 }}>
                                            <Typography variant="body2" sx={{
                                                whiteSpace: 'pre-line',
                                                color: theme.palette.text.secondary
                                            }}>
                                                {scaCheck.remediation}
                                            </Typography>
                                        </Box>
                                    </Collapse>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onViewFullDetails}
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    color="primary"
                >
                    View Complete Log Details
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

// Main SCA Component
const SCA = () => {
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
    const [activeFilters, setActiveFilters] = useState([]);

    const dashboardRef = useRef(null);

    useEffect(() => {
        setPageTitle('System Configuration Assessment');
        fetchScaLogs();
    }, [timeRange]);

    useEffect(() => {
        fetchScaLogs(page, pageSize, searchTerm);
    }, [page, pageSize]);

    // Fetch logs with SCA events
    const fetchScaLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
        try {
            setLoading(true);
            setError(null);

            // Convert to 1-indexed for API
            const apiPage = currentPage + 1;

            console.log(`Fetching SCA logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);

            // Add result filter if active
            let resultFilter = '';
            if (activeFilters.length > 0) {
                resultFilter = activeFilters.join(',');
            }

            const response = await getScaLogs({
                page: apiPage,
                limit,
                search,
                timeRange,
                result: resultFilter,
                sortBy: '@timestamp',
                sortOrder: 'desc'
            });

            if (response) {
                setLogs(response.logs || []);
                setStats(response.stats || null);
                setTotalRows(response.pagination?.total || 0);
                console.log(`Received ${response.logs?.length} SCA events out of ${response.pagination?.total} total`);
            } else {
                console.error('Invalid response format');
                setError('Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching SCA logs:', error);
            setError(error.message || 'Failed to fetch SCA logs. Please try again later.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleRefresh = () => {
        fetchScaLogs(page, pageSize, searchTerm);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setPage(0);
        fetchScaLogs(0, pageSize, searchTerm);
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
    };

    const handleCloseDetails = () => {
        setSelectedLog(null);
    };

    // Open StructuredLogView dialog
    const handleViewFullDetails = () => {
        setShowStructuredView(true);
    };

    // Close StructuredLogView dialog
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
        const success = exportToCSV(logs, `sca_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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

            // Add result filter if active
            let resultFilter = '';
            if (activeFilters.length > 0) {
                resultFilter = activeFilters.join(',');
            }

            const response = await getScaLogs({
                page: 1,
                limit: maxResults,
                search: searchTerm,
                timeRange,
                result: resultFilter
            });

            const success = exportToCSV(
                response.logs || [],
                `all_sca_logs_${formatDateForFileName(new Date())}.csv`
            );

            setSnackbar({
                open: true,
                message: success
                    ? `Exported ${response.logs?.length || 0} SCA events successfully`
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
        // Open export dialog for CSV
        setExportDialogOpen(true);
    };

    // Toggle result filter
    const toggleResultFilter = (result) => {
        let newFilters;

        if (activeFilters.includes(result)) {
            // Remove the filter
            newFilters = activeFilters.filter(f => f !== result);
        } else {
            // Add the filter
            newFilters = [...activeFilters, result];
        }

        setActiveFilters(newFilters);

        // Reset page to 0 and fetch with new filters
        setPage(0);

        // Small delay to allow state to update
        setTimeout(() => {
            fetchScaLogs(0, pageSize, searchTerm);
        }, 100);
    };

    // Process data for charts
    const processChartData = () => {
        if (!stats) return {
            timelineData: [],
            byResultData: [],
            byAgentData: [],
            byPolicyData: [],
            totalChecks: 0,
            passedCount: 0,
            failedCount: 0,
            notApplicableCount: 0,
            noResultCount: 0
        };

        // Calculate counts by result type
        let passedCount = 0;
        let failedCount = 0;
        let notApplicableCount = 0;
        let noResultCount = 0;

        if (stats.byResult && Array.isArray(stats.byResult)) {
            stats.byResult.forEach(result => {
                if (result.result === 'passed') passedCount = result.count || 0;
                else if (result.result === 'failed') failedCount = result.count || 0;
                else if (result.result === 'not applicable') notApplicableCount = result.count || 0;
                else if (result.result === 'No Result') noResultCount = result.count || 0;
            });
        }

        // Convert timeline data to usable format for chart
        const timelineByDate = {};

        if (stats.timeDistribution && Array.isArray(stats.timeDistribution)) {
            stats.timeDistribution.forEach(item => {
                if (!item || !item.date) return;

                try {
                    const date = new Date(item.date).toLocaleDateString();
                    if (!timelineByDate[date]) {
                        timelineByDate[date] = {
                            date,
                            passed: 0,
                            failed: 0,
                            'not applicable': 0,
                            'No Result': 0,
                            total: 0
                        };
                    }

                    if (item.results) {
                        if (item.results.passed) timelineByDate[date].passed = item.results.passed;
                        if (item.results.failed) timelineByDate[date].failed = item.results.failed;
                        if (item.results['not applicable']) timelineByDate[date]['not applicable'] = item.results['not applicable'];
                        if (item.results['No Result']) timelineByDate[date]['No Result'] = item.results['No Result'];
                    }

                    timelineByDate[date].total = item.count || 0;
                } catch (e) {
                    console.error("Error processing timeline data", e);
                }
            });
        }

        // Convert to array and sort by date
        const timelineData = Object.values(timelineByDate).sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });

        return {
            timelineData,
            byResultData: stats.byResult || [],
            byAgentData: Array.isArray(stats.byAgent) ? stats.byAgent : [],
            byPolicyData: Array.isArray(stats.byPolicy) ? stats.byPolicy : [],
            totalChecks: stats.total || 0,
            passedCount,
            failedCount,
            notApplicableCount,
            noResultCount
        };
    };

    // Get the appropriate color for result type
    const getResultTypeColor = (result) => {
        switch (result?.toLowerCase()) {
            case 'passed':
                return COLOR_PALETTE[0]; // Green
            case 'failed':
                return COLOR_PALETTE[1]; // Red
            case 'not applicable':
                return COLOR_PALETTE[2]; // Grey
            default:
                return COLOR_PALETTE[3]; // Orange/Yellow
        }
    };

    // Timeline Chart Option
    const getTimelineChartOption = () => {
        const chartData = processChartData();
        const timelineData = chartData.timelineData || [];

        // If no data, return a simple placeholder chart
        if (timelineData.length === 0) {
            return {
                title: {
                    text: 'SCA Events Timeline (No Data)',
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
                text: 'System Configuration Assessment Over Time',
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
                data: ['Passed', 'Failed', 'Not Applicable', 'No Result'],
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
                name: 'Check Count',
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
                    name: 'Passed',
                    type: 'line',
                    stack: 'Total',
                    smooth: true,
                    data: timelineData.map(item => item.passed || 0),
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
                },
                {
                    name: 'Not Applicable',
                    type: 'line',
                    stack: 'Total',
                    smooth: true,
                    data: timelineData.map(item => item['not applicable'] || 0),
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: COLOR_PALETTE[2] // Grey
                    },
                    itemStyle: {
                        color: COLOR_PALETTE[2]
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLOR_PALETTE[2]}80` },
                            { offset: 1, color: `${COLOR_PALETTE[2]}10` }
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
                    name: 'No Result',
                    type: 'line',
                    stack: 'Total',
                    smooth: true,
                    data: timelineData.map(item => item['No Result'] || 0),
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: COLOR_PALETTE[3] // Orange
                    },
                    itemStyle: {
                        color: COLOR_PALETTE[3]
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLOR_PALETTE[3]}80` },
                            { offset: 1, color: `${COLOR_PALETTE[3]}10` }
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

    // Top Policies Chart
    const getTopPoliciesChartOption = () => {
        const chartData = processChartData();
        const policyData = chartData.byPolicyData || [];

        if (policyData.length === 0) {
            return {
                title: {
                    text: 'Top Policies with SCA Checks (No Data)',
                    left: 'center',
                    textStyle: {
                        color: theme.palette.mode === 'dark' ? '#fff' : '#333',
                        fontFamily: theme.typography.fontFamily,
                        fontSize: 16,
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

        // Get top 7 policies
        const topPolicies = policyData
            .slice(0, 7)
            .sort((a, b) => b.count - a.count);

        const categories = topPolicies.map(policy => policy.policy);
        const values = topPolicies.map(policy => policy.count);

        return {
            title: {
                text: 'Top 7 Compliance Policies',
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
            Checks: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;
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
                data: categories,
                axisLabel: {
                    color: theme.palette.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    width: 120,
                    overflow: 'truncate'
                },
                axisLine: {
                    lineStyle: {
                        color: theme.palette.divider
                    }
                }
            },
            series: [{
                name: 'Checks',
                type: 'bar',
                data: values.map((value, index) => ({
                    value,
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

    // Results Distribution Pie Chart
    const getResultsPieChartOption = () => {
        const chartData = processChartData();

        // Prepare data for pie chart
        const pieData = [
            { value: chartData.passedCount, name: 'Passed', itemStyle: { color: COLOR_PALETTE[0] } },
            { value: chartData.failedCount, name: 'Failed', itemStyle: { color: COLOR_PALETTE[1] } },
            { value: chartData.notApplicableCount, name: 'Not Applicable', itemStyle: { color: COLOR_PALETTE[2] } },
            { value: chartData.noResultCount, name: 'No Result', itemStyle: { color: COLOR_PALETTE[3] } }
        ].filter(item => item.value > 0);

        // If no data, return simple placeholder chart
        if (pieData.length === 0) {
            return {
                title: {
                    text: 'SCA Results Distribution (No Data)',
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
                text: 'SCA Results Distribution',
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
                    const percentage = (item.value / chartData.totalChecks * 100).toFixed(1);
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
            field: 'data.sca.policy',
            headerName: 'Policy',
            flex: 1.5,
            minWidth: 250,
            valueGetter: (params) => params.row.data?.sca?.policy || 'N/A',
            renderCell: (params) => (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': { color: theme.palette.primary.main }
                    }}
                    title={params.row.data?.sca?.policy || 'N/A'}
                >
                    <PolicyIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                    <Typography variant="body2" noWrap>
                        {params.row.data?.sca?.policy || 'N/A'}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'data.sca.check.title',
            headerName: 'Check Title',
            flex: 1.5,
            minWidth: 250,
            valueGetter: (params) => params.row.data?.sca?.check?.title || 'N/A',
            renderCell: (params) => (
                <Tooltip title={params.row.data?.sca?.check?.title || 'N/A'}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                        {params.row.data?.sca?.check?.title || 'N/A'}
                    </Typography>
                </Tooltip>
            )
        },
        {
            field: 'data.sca.check.result',
            headerName: 'Result',
            flex: 0.7,
            minWidth: 120,
            valueGetter: (params) => params.row.data?.sca?.check?.result || 'No Result',
            renderCell: (params) => {
                const result = params.row.data?.sca?.check?.result || 'No Result';
                let icon, color;

                switch (result.toLowerCase()) {
                    case 'passed':
                        icon = <CheckCircleIcon sx={{ fontSize: 16 }} />;
                        color = 'success';
                        break;
                    case 'failed':
                        icon = <ErrorIcon sx={{ fontSize: 16 }} />;
                        color = 'error';
                        break;
                    case 'not applicable':
                        icon = <InfoIcon sx={{ fontSize: 16 }} />;
                        color = 'default';
                        break;
                    default:
                        icon = <HelpIcon sx={{ fontSize: 16 }} />;
                        color = 'warning';
                }

                return (
                    <Chip
                        icon={icon}
                        label={result}
                        color={color}
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
            field: 'rule.level',
            headerName: 'Level',
            flex: 0.5,
            minWidth: 80,
            valueGetter: (params) => params.row.rule?.level || 'N/A',
            renderCell: (params) => (
                <Chip
                    label={params.row.rule?.level || 'N/A'}
                    variant="outlined"
                    size="small"
                    sx={{
                        height: '24px',
                        fontWeight: 500
                    }}
                />
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

    // Create a card for result type metrics
    const renderResultCard = (title, count, color, icon, resultType) => {
        // Create a human-readable name for "not applicable" case
        const displayTitle = resultType === 'not applicable' ? 'Not Applicable' : title;
        const isActive = activeFilters.includes(resultType);

        return (
            <Grid item xs={12} sm={6} md={3}>
                <Card
                    component={motion.div}
                    whileHover={{
                        y: -5,
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
                    }}
                    transition={{ duration: 0.3 }}
                    elevation={isActive ? 8 : 3}
                    sx={{
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${color}85, ${color}60)`,
                        position: 'relative',
                        overflow: 'hidden',
                        border: isActive ? `2px solid ${color}` : 'none',
                        cursor: 'pointer',
                        boxShadow: isActive
                            ? `0 8px 16px ${color}40`
                            : '0 6px 12px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={() => toggleResultFilter(resultType)}
                >
                    <CardActionArea sx={{ position: 'relative', zIndex: 1 }}>
                        <CardContent sx={{ py: 3, position: 'relative' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography
                                    color="white"
                                    gutterBottom
                                    variant="h6"
                                    fontWeight={600}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {React.cloneElement(icon, { sx: { mr: 1, fontSize: 28 } })}
                                    <Box component="span">{displayTitle}</Box>
                                </Typography>

                                {isActive && (
                                    <Chip
                                        label="Filtered"
                                        size="small"
                                        color="primary"
                                        variant="filled"
                                        sx={{
                                            backgroundColor: 'white',
                                            color: color,
                                            fontWeight: 'bold',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                )}
                            </Box>

                            <Typography variant="h3" component="div" sx={{
                                fontWeight: 'bold',
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                mb: 1
                            }}>
                                {count.toLocaleString() || 0}
                            </Typography>

                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                {resultType === 'passed' && 'Checks that have successfully passed security validation'}
                                {resultType === 'failed' && 'Checks that have failed security validation'}
                                {resultType === 'not applicable' && 'Checks that are not applicable to this system'}
                                {resultType === 'No Result' && 'Logs without explicit check results'}
                            </Typography>

                            <Box sx={{
                                position: 'absolute',
                                top: -20,
                                right: -20,
                                opacity: 0.2,
                                transform: 'rotate(10deg)'
                            }}>
                                {React.cloneElement(icon, { sx: { fontSize: 120 } })}
                            </Box>
                        </CardContent>
                    </CardActionArea>
                    {isActive && (
                        <Box sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            bgcolor: 'white',
                            boxShadow: '0 -1px 3px rgba(0,0,0,0.1)'
                        }} />
                    )}
                </Card>
            </Grid>
        );
    };

    const { passedCount, failedCount, notApplicableCount, noResultCount, totalChecks } = processChartData();

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
                        <VerifiedUserIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                        System Configuration Assessment
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 4 }}>
                        Monitor compliance with security benchmarks and standards
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

            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }} ref={dashboardRef}>
                <Grid item xs={12}>
                    <Typography variant="h6" component="div" gutterBottom sx={{ fontWeight: 500 }}>
                        Compliance Summary
                    </Typography>
                </Grid>

                {renderResultCard('Passed', passedCount, COLOR_PALETTE[0], <CheckCircleIcon />, 'passed')}
                {renderResultCard('Failed', failedCount, COLOR_PALETTE[1], <ErrorIcon />, 'failed')}
                {renderResultCard('Not Applicable', notApplicableCount, COLOR_PALETTE[2], <InfoIcon />, 'not applicable')}
                {renderResultCard('No Result', noResultCount, COLOR_PALETTE[3], <HelpIcon />, 'No Result')}
            </Grid>

            {/* Timeline Chart - Full Width */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    {renderChart(
                        getTimelineChartOption(),
                        'System Configuration Assessment Timeline',
                        <TimelineIcon color="primary" sx={{ mr: 1 }} />
                    )}
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    {renderChart(
                        getTopPoliciesChartOption(),
                        'Top Compliance Policies',
                        <PolicyIcon color="info" sx={{ mr: 1 }} />
                    )}
                </Grid>
                <Grid item xs={12} md={4}>
                    {renderChart(
                        getResultsPieChartOption(),
                        'Results Distribution',
                        <VerifiedUserIcon color="secondary" sx={{ mr: 1 }} />
                    )}
                </Grid>
            </Grid>

            {/* Logs Table */}
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
                        System Configuration Assessment Checks
                    </Typography>

                    {activeFilters.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Filtered by:
                            </Typography>
                            {activeFilters.map(filter => (
                                <Chip
                                    key={filter}
                                    label={filter === 'not applicable' ? 'Not Applicable' : filter}
                                    color={filter === 'passed' ? 'success' : filter === 'failed' ? 'error' : filter === 'not applicable' ? 'default' : 'warning'}
                                    size="small"
                                    onDelete={() => toggleResultFilter(filter)}
                                    sx={{ fontWeight: 500 }}
                                />
                            ))}
                            <Button
                                size="small"
                                onClick={() => {
                                    setActiveFilters([]);
                                    setTimeout(() => fetchScaLogs(0, pageSize, searchTerm), 100);
                                }}
                                sx={{ ml: 1 }}
                            >
                                Clear Filters
                            </Button>
                        </Box>
                    )}
                </Box>

                <form onSubmit={handleSearch}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search for policies, checks, agents..."
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
                                            fetchScaLogs(0, pageSize, '');
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
                    {loading ? 'Loading SCA checks...' : `${totalChecks.toLocaleString()} SCA checks found`}
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
                            No SCA checks found
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

            {/* SCA Details View */}
            {selectedLog && (
                <ScaDetailsView
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
                    Export System Configuration Assessment Data to CSV
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        Choose which SCA checks to export:
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={exportCurrentPage}
                            fullWidth
                            sx={{ mb: 2, borderRadius: 8, py: 1.2, textTransform: 'none' }}
                        >
                            Export Current Page ({logs.length} checks)
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<DownloadIcon />}
                            onClick={exportAllLogs}
                            fullWidth
                            disabled={totalChecks > 10000}
                            sx={{ borderRadius: 8, py: 1.2, textTransform: 'none' }}
                        >
                            Export All SCA Checks ({totalChecks.toLocaleString()} checks)
                        </Button>

                        {totalChecks > 5000 && totalChecks <= 10000 && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                                Exporting a large number of checks may take a while and affect performance.
                            </Typography>
                        )}

                        {totalChecks > 10000 && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                Too many checks to export at once (maximum 10,000). Please refine your search filters.
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

export default SCA;