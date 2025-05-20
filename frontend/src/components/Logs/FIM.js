// src/components/Logs/FIM.js
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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Snackbar from '@mui/material/Snackbar';
import FolderIcon from '@mui/icons-material/Folder';
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
import { getFimLogs } from '../../services/logs';

// Vibrant color palette
const COLOR_PALETTE = [
  '#3366FF',   // Deep Blue - Modified
  '#FF6B6B',   // Vibrant Red - Deleted
  '#4ECDC4',   // Teal - Added
  '#FFA726',   // Bright Orange
  '#9C27B0',   // Purple
  '#2196F3',   // Bright Blue
  '#4CAF50',   // Green
  '#FF5722',   // Deep Orange
  '#607D8B',   // Blue Gray
  '#795548'    // Brown
];

// Export to CSV utility 
const exportToCSV = (logs, fileName = 'fim_logs.csv') => {
  if (!logs || logs.length === 0) {
    console.error('No logs to export');
    return false;
  }

  try {
    // Get all unique keys for CSV header
    const baseKeys = ['id', '@timestamp', 'agent.name', 'rule.level', 'rule.description'];
    const fimKeys = [
      'syscheck.path',
      'syscheck.event',
      'syscheck.mode',
      'syscheck.size_before',
      'syscheck.size_after',
      'syscheck.mtime_before',
      'syscheck.mtime_after',
      'syscheck.uname_after'
    ];

    const headers = [...baseKeys, ...fimKeys];

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

// Diff Viewer Component with syntax highlighting
const DiffViewer = ({ diff }) => {
  const theme = useTheme();

  // Parse diff content
  const parseDiff = (diffText) => {
    if (!diffText) return { before: [], after: [] };
    
    const parts = diffText.split('---\n');
    if (parts.length !== 2) return { before: [], after: [] };
    
    // Parse before part (lines starting with <)
    const beforeLines = parts[0]
      .split('\n')
      .filter(line => line.startsWith('<'))
      .map(line => line.substring(2)); // Remove "< " prefix
    
    // Parse after part (lines starting with >)
    const afterLines = parts[1]
      .split('\n')
      .filter(line => line.startsWith('>'))
      .map(line => line.substring(2)); // Remove "> " prefix
      
    return { 
      before: beforeLines,
      after: afterLines
    };
  };
  
  // Get the highlighted diff to show what changed 
  const getHighlightedDiff = () => {
    const { before, after } = parseDiff(diff);
    
    // Find changes between lines
    let beforeHighlighted = [...before];
    let afterHighlighted = [...after];
    
    // Simple "diff" algorithm to highlight changes
    for (let i = 0; i < Math.min(before.length, after.length); i++) {
      if (before[i] !== after[i]) {
        // Find the differences character by character
        const beforeChars = before[i].split('');
        const afterChars = after[i].split('');
        
        let beforeHtml = '';
        let afterHtml = '';
        let j = 0;
        
        // Simple character-by-character comparison
        while (j < Math.max(beforeChars.length, afterChars.length)) {
          if (j >= beforeChars.length) {
            // Addition in after
            afterHtml += `<span style="background-color:${theme.palette.success.light};color:${theme.palette.success.contrastText}">${afterChars.slice(j).join('')}</span>`;
            break;
          } else if (j >= afterChars.length) {
            // Deletion in before
            beforeHtml += `<span style="background-color:${theme.palette.error.light};color:${theme.palette.error.contrastText}">${beforeChars.slice(j).join('')}</span>`;
            break;
          } else if (beforeChars[j] !== afterChars[j]) {
            // Difference found
            let diffEndBefore = j;
            let diffEndAfter = j;
            
            // Find where the difference ends
            while (diffEndBefore < beforeChars.length && diffEndAfter < afterChars.length &&
                   beforeChars[diffEndBefore] !== afterChars[diffEndAfter]) {
              diffEndBefore++;
              diffEndAfter++;
            }
            
            // Highlight the difference
            beforeHtml += `<span style="background-color:${theme.palette.error.light};color:${theme.palette.error.contrastText}">${beforeChars.slice(j, diffEndBefore).join('')}</span>`;
            afterHtml += `<span style="background-color:${theme.palette.success.light};color:${theme.palette.success.contrastText}">${afterChars.slice(j, diffEndAfter).join('')}</span>`;
            
            j = diffEndBefore;
          } else {
            // Same character
            beforeHtml += beforeChars[j];
            afterHtml += afterChars[j];
            j++;
          }
        }
        
        beforeHighlighted[i] = beforeHtml;
        afterHighlighted[i] = afterHtml;
      }
    }
    
    return { beforeHighlighted, afterHighlighted };
  };
  
  const { beforeHighlighted, afterHighlighted } = getHighlightedDiff();
  
  if (!diff) {
    return (
      <Typography variant="body2" color="text.secondary">
        No content changes available
      </Typography>
    );
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      backgroundColor: theme.palette.background.paper, 
      borderRadius: 1,
      overflow: 'hidden'
    }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, height: '100%' }}>
            <Box sx={{ 
              mb: 1, 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.error.main 
            }}>
              <DeleteIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="subtitle2" fontWeight="bold">Previous Content</Typography>
            </Box>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                minHeight: 100,
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              {beforeHighlighted.map((line, i) => (
                <Box key={i} sx={{ mb: 0.5 }} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              ))}
            </Paper>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, height: '100%' }}>
            <Box sx={{ 
              mb: 1, 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.success.main 
            }}>
              <AddCircleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="subtitle2" fontWeight="bold">Modified Content</Typography>
            </Box>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                minHeight: 100,
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              {afterHighlighted.map((line, i) => (
                <Box key={i} sx={{ mb: 0.5 }} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              ))}
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

// FIM Details View Component
const FimDetailsView = ({ data, onClose, onViewFullDetails }) => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    pathInfo: true,
    changes: true,
    timeInfo: true,
    hashInfo: true,
    userInfo: true,
    diffInfo: true
  });

  const syschecks = data?.syscheck || {};
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Get event icon based on event type
  const getEventIcon = (event) => {
    if (!event) return <EventIcon />;
    
    switch(event.toLowerCase()) {
      case 'added':
        return <AddCircleOutlineIcon sx={{ color: COLOR_PALETTE[2] }} />;
      case 'modified':
        return <EditIcon sx={{ color: COLOR_PALETTE[0] }} />;
      case 'deleted':
        return <DeleteIcon sx={{ color: COLOR_PALETTE[1] }} />;
      default:
        return <EventIcon />;
    }
  };
  
  // Get event color based on event type
  const getEventColor = (event) => {
    if (!event) return 'default';
    
    switch(event.toLowerCase()) {
      case 'added':
        return 'success';
      case 'modified':
        return 'primary';
      case 'deleted':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Toggle expanded section
  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };
  
  // Get the size difference with a readable format
  const getSizeDifference = () => {
    if (!syschecks.size_before || !syschecks.size_after) return null;
    
    const sizeBefore = parseInt(syschecks.size_before, 10);
    const sizeAfter = parseInt(syschecks.size_after, 10);
    
    if (isNaN(sizeBefore) || isNaN(sizeAfter)) return null;
    
    const diff = sizeAfter - sizeBefore;
    return {
      diff,
      text: diff > 0 ? `+${diff} bytes` : `${diff} bytes`,
      color: diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.primary'
    };
  };
  
  // Check if hash has changed
  const hasHashChanged = (hashType) => {
    return syschecks[`${hashType}_before`] && 
           syschecks[`${hashType}_after`] && 
           syschecks[`${hashType}_before`] !== syschecks[`${hashType}_after`];
  };
  
  // Check what attributes have changed
  const changedAttributes = syschecks.changed_attributes || [];
  const sizeDifference = getSizeDifference();

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
          {getEventIcon(syschecks.event)}
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', ml: 1 }}>
            File Integrity Event: {syschecks.event || 'Unknown'}
          </Typography>
          <Chip 
            label={syschecks.event || 'Unknown'} 
            color={getEventColor(syschecks.event)}
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
            {/* Path Information */}
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
                  onClick={() => toggleSection('pathInfo')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FolderIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    <Typography variant="h6">File Information</Typography>
                  </Box>
                  <IconButton size="small">
                    {expandedSections.pathInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={expandedSections.pathInfo}>
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
                            File Path
                          </TableCell>
                          <TableCell>
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                overflowX: 'auto',
                                py: 0.5
                              }}
                            >
                              <FolderIcon fontSize="small" sx={{ mr: 1, color: 'info.main', flexShrink: 0 }} />
                              {syschecks.path || 'Unknown'}
                            </Box>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell 
                            component="th" 
                            sx={{ 
                              fontWeight: 'bold',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                            }}
                          >
                            Event Type
                          </TableCell>
                          <TableCell>
                            <Chip 
                              icon={getEventIcon(syschecks.event)}
                              label={syschecks.event || 'Unknown'} 
                              color={getEventColor(syschecks.event)}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell 
                            component="th" 
                            sx={{ 
                              fontWeight: 'bold',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                            }}
                          >
                            Monitoring Mode
                          </TableCell>
                          <TableCell>{syschecks.mode || 'Unknown'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>
                </Collapse>
              </Paper>
            </Grid>
            
            {/* Changed Attributes */}
            {changedAttributes.length > 0 && (
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
                    onClick={() => toggleSection('changes')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CompareArrowsIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                      <Typography variant="h6">Changed Attributes</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.changes ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.changes}>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {changedAttributes.map((attr, index) => (
                          <Chip 
                            key={index}
                            label={attr}
                            color="warning"
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>
                      
                      {syschecks.event === 'modified' && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            The file was modified with changes to {changedAttributes.length} attributes
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            )}
            
            {/* Size Information */}
            {(syschecks.size_before || syschecks.size_after) && (
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
                    onClick={() => toggleSection('sizeInfo')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FileCopyIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                      <Typography variant="h6">Size Information</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.sizeInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.sizeInfo}>
                    <Box sx={{ p: 2 }}>
                      <Table size="small">
                        <TableBody>
                          {syschecks.size_before && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Previous Size
                              </TableCell>
                              <TableCell>{syschecks.size_before} bytes</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.size_after && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Current Size
                              </TableCell>
                              <TableCell>{syschecks.size_after} bytes</TableCell>
                            </TableRow>
                          )}
                          
                          {sizeDifference && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Size Change
                              </TableCell>
                              <TableCell sx={{ color: sizeDifference.color }}>
                                {sizeDifference.text}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            )}
            
            {/* Time Information */}
            {(syschecks.mtime_before || syschecks.mtime_after) && (
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
                    onClick={() => toggleSection('timeInfo')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTimeIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                      <Typography variant="h6">Timestamp Information</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.timeInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.timeInfo}>
                    <Box sx={{ p: 2 }}>
                      <Table size="small">
                        <TableBody>
                          {syschecks.mtime_before && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Previous Modification Time
                              </TableCell>
                              <TableCell>{formatDate(syschecks.mtime_before)}</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.mtime_after && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Current Modification Time
                              </TableCell>
                              <TableCell>{formatDate(syschecks.mtime_after)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            )}
            
            {/* Hash Information */}
            {(syschecks.md5_before || syschecks.md5_after || 
              syschecks.sha1_before || syschecks.sha1_after || 
              syschecks.sha256_before || syschecks.sha256_after) && (
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
                    onClick={() => toggleSection('hashInfo')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SecurityIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
                      <Typography variant="h6">Hash Information</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.hashInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.hashInfo}>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {/* MD5 Hashes */}
                        {(syschecks.md5_before || syschecks.md5_after) && (
                          <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                MD5 Checksums
                              </Typography>
                              
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableBody>
                                    {syschecks.md5_before && (
                                      <TableRow>
                                        <TableCell 
                                          component="th" 
                                          sx={{ 
                                            fontWeight: 'bold', 
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                          }}
                                        >
                                          Previous MD5
                                        </TableCell>
                                        <TableCell sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.8rem',
                                          ...(hasHashChanged('md5') && { 
                                            color: theme.palette.error.main,
                                            bgcolor: theme.palette.error.light + '22'
                                          })
                                        }}>
                                          {syschecks.md5_before}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    
                                    {syschecks.md5_after && (
                                      <TableRow>
                                        <TableCell 
                                          component="th" 
                                          sx={{ 
                                            fontWeight: 'bold',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                          }}
                                        >
                                          Current MD5
                                        </TableCell>
                                        <TableCell sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.8rem',
                                          ...(hasHashChanged('md5') && { 
                                            color: theme.palette.success.main,
                                            bgcolor: theme.palette.success.light + '22'
                                          })
                                        }}>
                                          {syschecks.md5_after}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Grid>
                        )}
                        
                        {/* SHA1 Hashes */}
                        {(syschecks.sha1_before || syschecks.sha1_after) && (
                          <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                SHA1 Checksums
                              </Typography>
                              
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableBody>
                                    {syschecks.sha1_before && (
                                      <TableRow>
                                        <TableCell 
                                          component="th" 
                                          sx={{ 
                                            fontWeight: 'bold',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                          }}
                                        >
                                          Previous SHA1
                                        </TableCell>
                                        <TableCell sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.8rem',
                                          ...(hasHashChanged('sha1') && { 
                                            color: theme.palette.error.main,
                                            bgcolor: theme.palette.error.light + '22'
                                          })
                                        }}>
                                          {syschecks.sha1_before}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    
                                    {syschecks.sha1_after && (
                                      <TableRow>
                                        <TableCell 
                                          component="th" 
                                          sx={{ 
                                            fontWeight: 'bold',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                          }}
                                        >
                                          Current SHA1
                                        </TableCell>
                                        <TableCell sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.8rem',
                                          ...(hasHashChanged('sha1') && { 
                                            color: theme.palette.success.main,
                                            bgcolor: theme.palette.success.light + '22'
                                          })
                                        }}>
                                          {syschecks.sha1_after}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Grid>
                        )}
                        
                        {/* SHA256 Hashes */}
                        {(syschecks.sha256_before || syschecks.sha256_after) && (
                          <Grid item xs={12}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                SHA256 Checksums
                              </Typography>
                              
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableBody>
                                    {syschecks.sha256_before && (
                                      <TableRow>
                                        <TableCell 
                                          component="th" 
                                          sx={{ 
                                            fontWeight: 'bold',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                          }}
                                        >
                                          Previous SHA256
                                        </TableCell>
                                        <TableCell sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.8rem',
                                          ...(hasHashChanged('sha256') && { 
                                            color: theme.palette.error.main,
                                            bgcolor: theme.palette.error.light + '22'
                                          })
                                        }}>
                                          {syschecks.sha256_before}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    
                                    {syschecks.sha256_after && (
                                      <TableRow>
                                        <TableCell 
                                          component="th" 
                                          sx={{ 
                                            fontWeight: 'bold',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                          }}
                                        >
                                          Current SHA256
                                        </TableCell>
                                        <TableCell sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.8rem',
                                          ...(hasHashChanged('sha256') && { 
                                            color: theme.palette.success.main,
                                            bgcolor: theme.palette.success.light + '22'
                                          })
                                        }}>
                                          {syschecks.sha256_after}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            )}
            
            {/* User Information */}
            {(syschecks.uname_before || syschecks.uname_after || 
              syschecks.uid_before || syschecks.uid_after || 
              syschecks.gid_before || syschecks.gid_after || 
              (syschecks.audit && syschecks.audit.user)) && (
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
                    onClick={() => toggleSection('userInfo')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SecurityIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                      <Typography variant="h6">User Information</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.userInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.userInfo}>
                    <Box sx={{ p: 2 }}>
                      <Table size="small">
                        <TableBody>
                          {syschecks.uname_before && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Previous Username
                              </TableCell>
                              <TableCell>{syschecks.uname_before}</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.uname_after && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Current Username
                              </TableCell>
                              <TableCell>{syschecks.uname_after}</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.uid_before && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Previous UID
                              </TableCell>
                              <TableCell>{syschecks.uid_before}</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.uid_after && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Current UID
                              </TableCell>
                              <TableCell>{syschecks.uid_after}</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.audit && syschecks.audit.user && syschecks.audit.user.name && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Audit Username
                              </TableCell>
                              <TableCell>{syschecks.audit.user.name}</TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.audit && syschecks.audit.user && syschecks.audit.user.id && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Audit User ID
                              </TableCell>
                              <TableCell>{syschecks.audit.user.id}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            )}
            
            {/* Process Information */}
            {syschecks.audit && syschecks.audit.process && (
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
                    onClick={() => toggleSection('processInfo')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CodeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      <Typography variant="h6">Process Information</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.processInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.processInfo}>
                    <Box sx={{ p: 2 }}>
                      <Table size="small">
                        <TableBody>
                          {syschecks.audit.process.name && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Process Name
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {syschecks.audit.process.name}
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {syschecks.audit.process.id && (
                            <TableRow>
                              <TableCell 
                                component="th" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                                }}
                              >
                                Process ID
                              </TableCell>
                              <TableCell>{syschecks.audit.process.id}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            )}
            
            {/* Content Diff */}
            {syschecks.diff && (
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
                    onClick={() => toggleSection('diffInfo')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CompareArrowsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      <Typography variant="h6">Content Changes</Typography>
                    </Box>
                    <IconButton size="small">
                      {expandedSections.diffInfo ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedSections.diffInfo}>
                    <Box sx={{ p: 2 }}>
                      <Alert 
                        severity="info" 
                        icon={<CompareArrowsIcon />}
                        sx={{ mb: 2 }}
                      >
                        This section shows the content changes in the file
                      </Alert>
                      
                      <DiffViewer diff={syschecks.diff} />
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

// Main FIM Component
const FIM = () => {
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
    setPageTitle('File Integrity Monitoring');
    fetchFimLogs();
  }, [timeRange]);
  
  useEffect(() => {
    fetchFimLogs(page, pageSize, searchTerm);
  }, [page, pageSize]);

  // Fetch logs with FIM events
  const fetchFimLogs = async (currentPage = 0, limit = pageSize, search = searchTerm) => {
    try {
      setLoading(true);
      setError(null);

      // Convert to 1-indexed for API
      const apiPage = currentPage + 1;

      console.log(`Fetching FIM logs with params: page=${apiPage}, limit=${limit}, search="${search}", timeRange=${timeRange}`);

      // Add event type filter if active
      let eventFilter = '';
      if (activeFilters.length > 0) {
        eventFilter = activeFilters.join(',');
      }

      const response = await getFimLogs({
        page: apiPage,
        limit,
        search,
        timeRange,
        eventType: eventFilter,
        sortBy: '@timestamp',
        sortOrder: 'desc'
      });

      if (response) {
        setLogs(response.logs || []);
        setStats(response.stats || null);
        setTotalRows(response.pagination?.total || 0);
        console.log(`Received ${response.logs?.length} FIM events out of ${response.pagination?.total} total`);
      } else {
        console.error('Invalid response format');
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error fetching FIM logs:', error);
      setError(error.message || 'Failed to fetch FIM logs. Please try again later.');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleRefresh = () => {
    fetchFimLogs(page, pageSize, searchTerm);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    setPage(0);
    fetchFimLogs(0, pageSize, searchTerm);
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
    const success = exportToCSV(logs, `fim_logs_page_${page + 1}_${formatDateForFileName(new Date())}.csv`);
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
      
      // Add event type filter if active
      let eventFilter = '';
      if (activeFilters.length > 0) {
        eventFilter = activeFilters.join(',');
      }

      const response = await getFimLogs({
        page: 1,
        limit: maxResults,
        search: searchTerm,
        timeRange,
        eventType: eventFilter
      });

      const success = exportToCSV(
        response.logs || [],
        `all_fim_logs_${formatDateForFileName(new Date())}.csv`
      );

      setSnackbar({
        open: true,
        message: success
          ? `Exported ${response.logs?.length || 0} FIM events successfully`
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

  // Toggle event type filter
  const toggleEventFilter = (eventType) => {
    let newFilters;
    
    if (activeFilters.includes(eventType)) {
      // Remove the filter
      newFilters = activeFilters.filter(f => f !== eventType);
    } else {
      // Add the filter
      newFilters = [...activeFilters, eventType];
    }
    
    setActiveFilters(newFilters);
    
    // Reset page to 0 and fetch with new filters
    setPage(0);
    
    // Small delay to allow state to update
    setTimeout(() => {
      fetchFimLogs(0, pageSize, searchTerm);
    }, 100);
  };

  // Process data for charts
  const processChartData = () => {
    if (!stats) return {
      timelineData: [],
      byEventData: [],
      byAgentData: [],
      totalEvents: 0,
      addedCount: 0,
      modifiedCount: 0,
      deletedCount: 0
    };

    // Calculate counts by event type
    let addedCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;

    if (stats.byEvent && Array.isArray(stats.byEvent)) {
      stats.byEvent.forEach(event => {
        if (event.event === 'added') addedCount = event.count || 0;
        else if (event.event === 'modified') modifiedCount = event.count || 0;
        else if (event.event === 'deleted') deletedCount = event.count || 0;
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
              added: 0,
              modified: 0,
              deleted: 0,
              total: 0
            };
          }
          
          if (item.events) {
            if (item.events.added) timelineByDate[date].added = item.events.added;
            if (item.events.modified) timelineByDate[date].modified = item.events.modified;
            if (item.events.deleted) timelineByDate[date].deleted = item.events.deleted;
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
      byEventData: stats.byEvent || [],
      byAgentData: Array.isArray(stats.byAgent) ? stats.byAgent : [],
      totalEvents: stats.total || 0,
      addedCount,
      modifiedCount,
      deletedCount
    };
  };

  // Get the appropriate color for event type
  const getEventTypeColor = (event) => {
    switch(event?.toLowerCase()) {
      case 'added':
        return COLOR_PALETTE[2]; // Teal
      case 'modified':
        return COLOR_PALETTE[0]; // Blue
      case 'deleted':
        return COLOR_PALETTE[1]; // Red
      default:
        return COLOR_PALETTE[3]; // Orange
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
          text: 'FIM Events Timeline (No Data)',
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
        text: 'File Integrity Events Over Time',
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
        data: ['Added', 'Modified', 'Deleted'],
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
          name: 'Added',
          type: 'line',
          stack: 'Total',
          smooth: true,
          data: timelineData.map(item => item.added || 0),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: COLOR_PALETTE[2] // Teal
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
          name: 'Modified',
          type: 'line',
          stack: 'Total',
          smooth: true,
          data: timelineData.map(item => item.modified || 0),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: COLOR_PALETTE[0] // Blue
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
          name: 'Deleted',
          type: 'line',
          stack: 'Total',
          smooth: true,
          data: timelineData.map(item => item.deleted || 0),
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

  // Top Agents Chart
  const getTopAgentsChartOption = () => {
    const chartData = processChartData();
    const agentData = chartData.byAgentData || [];

    if (agentData.length === 0) {
      return {
        title: {
          text: 'Top Agents with FIM Events (No Data)',
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

    // Get top 7 agents
    const topAgents = agentData
      .slice(0, 7)
      .sort((a, b) => b.count - a.count);

    const categories = topAgents.map(agent => agent.name);
    const values = topAgents.map(agent => agent.count);

    return {
      title: {
        text: 'Top 7 Agents with FIM Events',
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
            Events: <span style="color:${param.color};font-weight:bold">${param.value}</span>`;
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
        } catch(e) {
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
      field: 'syscheck.path',
      headerName: 'File Path',
      flex: 1.5,
      minWidth: 250,
      valueGetter: (params) => params.row.syscheck?.path || 'N/A',
      renderCell: (params) => (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            '&:hover': { color: theme.palette.primary.main }
          }}
          title={params.row.syscheck?.path || 'N/A'}
        >
          <FolderIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
          <Typography variant="body2" noWrap>
            {params.row.syscheck?.path || 'N/A'}
          </Typography>
        </Box>
      )
    },
    {
      field: 'syscheck.event',
      headerName: 'Event',
      flex: 0.7,
      minWidth: 120,
      valueGetter: (params) => params.row.syscheck?.event || 'N/A',
      renderCell: (params) => {
        const event = params.row.syscheck?.event || 'unknown';
        let icon, color;
        
        switch(event.toLowerCase()) {
          case 'added':
            icon = <AddCircleOutlineIcon sx={{ fontSize: 16 }} />;
            color = 'success';
            break;
          case 'modified':
            icon = <EditIcon sx={{ fontSize: 16 }} />;
            color = 'primary';
            break;
          case 'deleted':
            icon = <DeleteIcon sx={{ fontSize: 16 }} />;
            color = 'error';
            break;
          default:
            icon = <EventIcon sx={{ fontSize: 16 }} />;
            color = 'default';
        }
        
        return (
          <Chip
            icon={icon}
            label={event}
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
      field: 'syscheck.mode',
      headerName: 'Mode',
      flex: 0.6,
      minWidth: 100,
      valueGetter: (params) => params.row.syscheck?.mode || 'N/A',
      renderCell: (params) => (
        <Chip
          label={params.row.syscheck?.mode || 'N/A'}
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

  // Create a card for event type metrics
  const renderEventTypeCard = (title, count, color, icon, eventType) => {
    const isActive = activeFilters.includes(eventType);
    
    return (
      <Grid item xs={12} sm={4}>
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
            overflow: 'hidden',
            position: 'relative',
            border: isActive ? `2px solid ${color}` : 'none',
            cursor: 'pointer'
          }}
          onClick={() => toggleEventFilter(eventType)}
        >
          <CardActionArea>
            <CardContent sx={{ position: 'relative', zIndex: 1, py: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography 
                  color="textSecondary" 
                  gutterBottom 
                  variant="h6" 
                  fontWeight={500}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: isActive ? color : 'inherit'
                  }}
                >
                  {icon}
                  <Box component="span" sx={{ ml: 1 }}>{title}</Box>
                </Typography>
                
                {isActive && (
                  <Chip
                    label="Filtered"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              
              <Typography variant="h3" component="div" sx={{ 
                fontWeight: 'bold', 
                color: isActive ? color : 'inherit'
              }}>
                {count.toLocaleString() || 0}
              </Typography>
              
              <Box sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                opacity: 0.1,
                transform: 'rotate(10deg)'
              }}>
                {React.cloneElement(icon, { sx: { fontSize: 100 } })}
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    );
  };

  const { addedCount, modifiedCount, deletedCount, totalEvents } = processChartData();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600,
            background: 'linear-gradient(45deg, #3366FF, #4ECDC4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: theme.palette.mode === 'dark'
              ? '0 2px 10px rgba(255,255,255,0.1)'
              : '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <SecurityIcon sx={{ mr: 1.5, color: 'primary.main' }} />
            File Integrity Monitoring
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 4 }}>
            Track and monitor changes to critical files and directories
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

      {/* Key Metrics */}{/* Key Metrics */}
<Grid container spacing={3} sx={{ mb: 4 }} ref={dashboardRef}>
  <Grid item xs={12}>
    <Typography variant="h6" component="div" gutterBottom sx={{ fontWeight: 500 }}>
      Key Metrics
    </Typography>
  </Grid>
  
  <Grid item xs={12} sm={4}>
    <Card 
      component={motion.div}
      whileHover={{ 
        y: -5,
        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
      }}
      transition={{ duration: 0.3 }}
      elevation={isActive => activeFilters.includes('added') ? 8 : 3} 
      sx={{
        borderRadius: 2,
        background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.85), rgba(78, 205, 196, 0.6))',
        position: 'relative',
        overflow: 'hidden',
        border: activeFilters.includes('added') ? `2px solid ${COLOR_PALETTE[2]}` : 'none',
        cursor: 'pointer',
        boxShadow: activeFilters.includes('added') 
          ? '0 8px 16px rgba(78, 205, 196, 0.4)' 
          : '0 6px 12px rgba(0, 0, 0, 0.1)'
      }}
      onClick={() => toggleEventFilter('added')}
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
              <AddCircleOutlineIcon sx={{ mr: 1, fontSize: 28 }} />
              <Box component="span">Added Files</Box>
            </Typography>
            
            {activeFilters.includes('added') && (
              <Chip
                label="Filtered"
                size="small"
                color="primary"
                variant="filled"
                sx={{ 
                  backgroundColor: 'white', 
                  color: COLOR_PALETTE[2], 
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
            {addedCount.toLocaleString() || 0}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Files that have been newly added to the system
          </Typography>
          
          <Box sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            opacity: 0.2,
            transform: 'rotate(10deg)'
          }}>
            <AddCircleOutlineIcon sx={{ fontSize: 120 }} />
          </Box>
        </CardContent>
      </CardActionArea>
      {activeFilters.includes('added') && (
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
  
  <Grid item xs={12} sm={4}>
    <Card 
      component={motion.div}
      whileHover={{ 
        y: -5,
        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
      }}
      transition={{ duration: 0.3 }}
      elevation={activeFilters.includes('modified') ? 8 : 3} 
      sx={{
        borderRadius: 2,
        background: 'linear-gradient(135deg, rgba(51, 102, 255, 0.85), rgba(51, 102, 255, 0.6))',
        position: 'relative',
        overflow: 'hidden',
        border: activeFilters.includes('modified') ? `2px solid ${COLOR_PALETTE[0]}` : 'none',
        cursor: 'pointer',
        boxShadow: activeFilters.includes('modified') 
          ? '0 8px 16px rgba(51, 102, 255, 0.4)' 
          : '0 6px 12px rgba(0, 0, 0, 0.1)'
      }}
      onClick={() => toggleEventFilter('modified')}
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
              <EditIcon sx={{ mr: 1, fontSize: 28 }} />
              <Box component="span">Modified Files</Box>
            </Typography>
            
            {activeFilters.includes('modified') && (
              <Chip
                label="Filtered"
                size="small"
                color="primary"
                variant="filled"
                sx={{ 
                  backgroundColor: 'white', 
                  color: COLOR_PALETTE[0], 
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
            {modifiedCount.toLocaleString() || 0}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Files that have been changed or updated
          </Typography>
          
          <Box sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            opacity: 0.2,
            transform: 'rotate(10deg)'
          }}>
            <EditIcon sx={{ fontSize: 120 }} />
          </Box>
        </CardContent>
      </CardActionArea>
      {activeFilters.includes('modified') && (
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
  
  <Grid item xs={12} sm={4}>
    <Card 
      component={motion.div}
      whileHover={{ 
        y: -5,
        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
      }}
      transition={{ duration: 0.3 }}
      elevation={activeFilters.includes('deleted') ? 8 : 3} 
      sx={{
        borderRadius: 2,
        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.85), rgba(255, 107, 107, 0.6))',
        position: 'relative',
        overflow: 'hidden',
        border: activeFilters.includes('deleted') ? `2px solid ${COLOR_PALETTE[1]}` : 'none',
        cursor: 'pointer',
        boxShadow: activeFilters.includes('deleted') 
          ? '0 8px 16px rgba(255, 107, 107, 0.4)' 
          : '0 6px 12px rgba(0, 0, 0, 0.1)'
      }}
      onClick={() => toggleEventFilter('deleted')}
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
              <DeleteIcon sx={{ mr: 1, fontSize: 28 }} />
              <Box component="span">Deleted Files</Box>
            </Typography>
            
            {activeFilters.includes('deleted') && (
              <Chip
                label="Filtered"
                size="small"
                color="primary"
                variant="filled"
                sx={{ 
                  backgroundColor: 'white', 
                  color: COLOR_PALETTE[1], 
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
            {deletedCount.toLocaleString() || 0}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Files that have been removed from the system
          </Typography>
          
          <Box sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            opacity: 0.2,
            transform: 'rotate(10deg)'
          }}>
            <DeleteIcon sx={{ fontSize: 120 }} />
          </Box>
        </CardContent>
      </CardActionArea>
      {activeFilters.includes('deleted') && (
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
</Grid>

      {/* Timeline Chart - Full Width */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          {renderChart(
            getTimelineChartOption(),
            'File Integrity Events Timeline',
            <TimelineIcon color="primary" sx={{ mr: 1 }} />
          )}
        </Grid>
      </Grid>

      {/* Agents Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          {renderChart(
            getTopAgentsChartOption(),
            'Top Agents with FIM Events',
            <DnsIcon color="info" sx={{ mr: 1 }} />
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
            File Integrity Events
          </Typography>
          
          {activeFilters.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Filtered by:
              </Typography>
              {activeFilters.map(filter => (
                <Chip
                  key={filter}
                  label={filter}
                  color={filter === 'added' ? 'success' : filter === 'modified' ? 'primary' : 'error'}
                  size="small"
                  onDelete={() => toggleEventFilter(filter)}
                  sx={{ fontWeight: 500 }}
                />
              ))}
              <Button 
                size="small" 
                onClick={() => {
                  setActiveFilters([]);
                  setTimeout(() => fetchFimLogs(0, pageSize, searchTerm), 100);
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
            placeholder="Search for file paths, agents, event types..."
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
                      fetchFimLogs(0, pageSize, '');
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
          {loading ? 'Loading FIM events...' : `${totalRows.toLocaleString()} FIM events found`}
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
            <SecurityIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary', opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No FIM events found
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

      {/* FIM Details View */}
      {selectedLog && (
        <FimDetailsView
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
          Export File Integrity Events to CSV
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Choose which FIM events to export:
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
              disabled={totalRows > 10000}
              sx={{ borderRadius: 8, py: 1.2, textTransform: 'none' }}
            >
              Export All FIM Events ({totalRows.toLocaleString()} events)
            </Button>

            {totalRows > 5000 && totalRows <= 10000 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                Exporting a large number of events may take a while and affect performance.
              </Typography>
            )}

            {totalRows > 10000 && (
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

export default FIM;