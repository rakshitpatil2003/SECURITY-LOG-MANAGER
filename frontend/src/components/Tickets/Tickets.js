// frontend/src/components/Tickets/Tickets.js
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  IconButton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  InputAdornment,
  Avatar,
  useTheme,
  CardActionArea,
  Badge,
  Divider
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import api from '../../services/auth';
import { getTickets, updateTicketStatus, assignTicket } from '../../services/tickets';
import ViewTicketDetails from './ViewTicketDetails';

const Tickets = () => {
  const theme = useTheme();
  const { setPageTitle } = useOutletContext();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalTickets, setTotalTickets] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Selected ticket and dialog states
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle('Ticket Management');
    fetchTickets();
    fetchCurrentUser();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, page, pageSize]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1, // API uses 1-based indexing
        limit: pageSize
      };
      
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await getTickets(params);
      setTickets(response.tickets || []);
      setTotalTickets(response.pagination?.total || 0);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError(err.message || 'Failed to load tickets. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/userinfo');
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    setViewDetailsOpen(true);
  };

  const handleOpenUpdateDialog = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatusOpen(true);
  };

  const handleStatusUpdate = async (ticketId, statusData) => {
    try {
      setLoading(true);
      await updateTicketStatus(ticketId, statusData.status, statusData.description);
      setUpdateStatusOpen(false);
      fetchTickets();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      setError(err.message || 'Failed to update ticket status');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async (ticketId, assignedToId) => {
    try {
      setLoading(true);
      await assignTicket(ticketId, assignedToId);
      setAssignDialogOpen(false);
      fetchTickets();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
      setError(err.message || 'Failed to assign ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0); // Reset to first page
    fetchTickets();
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'table' ? 'grid' : 'table');
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'error';
      case 'In Review': return 'warning';
      case 'Closed': return 'success';
      case 'Reopened': return 'primary';
      default: return 'default';
    }
  };

  // Get severity level color
  const getSeverityColor = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 15) return 'error';
    if (numLevel >= 12) return 'error';
    if (numLevel >= 8) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Calculate ticket stats
  const ticketStats = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {});

  // Data grid columns
  const columns = [
    {
      field: 'ticketId',
      headerName: 'Ticket ID',
      width: 140,
      renderCell: (params) => (
        <Typography fontWeight="medium" color="primary">
          {params.value}
        </Typography>
      ),
      flex: 0.8
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value)} 
          size="small" 
          variant="filled"
          sx={{ minWidth: 80, justifyContent: 'center' }}
        />
      ),
      flex: 0.5
    },
    {
      field: 'creator',
      headerName: 'Created By',
      width: 150,
      valueGetter: (params) => params.row?.creator?.name || params.row?.creator?.username || 'N/A',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              width: 24, 
              height: 24, 
              mr: 1, 
              bgcolor: 'primary.main',
              fontSize: '0.75rem'
            }}
          >
            {(params.row?.creator?.name?.charAt(0) || params.row?.creator?.username?.charAt(0) || 'U').toUpperCase()}
          </Avatar>
          <Typography variant="body2" noWrap>
            {params.row?.creator?.name || params.row?.creator?.username || 'N/A'}
          </Typography>
        </Box>
      ),
      flex: 0.8
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      width: 150,
      valueGetter: (params) => params.row?.assignedTo?.name || params.row?.assignedTo?.username || 'Unassigned',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              width: 24, 
              height: 24, 
              mr: 1, 
              bgcolor: params.row?.assignedTo ? 'secondary.main' : 'grey.400',
              fontSize: '0.75rem'
            }}
          >
            {(params.row?.assignedTo?.name?.charAt(0) || params.row?.assignedTo?.username?.charAt(0) || 'U').toUpperCase()}
          </Avatar>
          <Typography variant="body2" noWrap>
            {params.row?.assignedTo?.name || params.row?.assignedTo?.username || 'Unassigned'}
          </Typography>
        </Box>
      ),
      flex: 0.8
    },
    {
      field: 'logSummary',
      headerName: 'Issue Description',
      width: 300,
      renderCell: (params) => (
        <Tooltip title={params.row?.logSummary?.ruleDescription || 'No description'}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              size="small"
              label={params.row?.logSummary?.ruleLevel || 'N/A'}
              color={getSeverityColor(params.row?.logSummary?.ruleLevel || 0)}
              sx={{ mr: 1, minWidth: 32 }}
            />
            <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
              {params.row?.logSummary?.ruleDescription || 'No description'}
            </Typography>
          </Box>
        </Tooltip>
      ),
      flex: 1.2
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 160,
      valueFormatter: (params) => formatDate(params.value),
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTimeIcon fontSize="small" sx={{ mr: 0.75, color: 'text.secondary' }} />
          <Typography variant="body2">
            {formatDate(params.value)}
          </Typography>
        </Box>
      ),
      flex: 0.8
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(params.row);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Update Status">
            <IconButton 
              size="small" 
              color="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenUpdateDialog(params.row);
              }}
              disabled={currentUser?.authority === 'read-only'}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      flex: 0.5
    }
  ];

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'error.light', mr: 1.5 }}>
                  <Badge badgeContent={ticketStats.Open || 0} color="error" />
                </Avatar>
                <Typography color="text.secondary" fontWeight="medium">
                  Open Tickets
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ my: 1, fontWeight: 'bold' }}>
                {ticketStats.Open || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={tickets.length ? ((ticketStats.Open || 0) / tickets.length * 100) : 0} 
                color="error"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'warning.light', mr: 1.5 }}>
                  <Badge badgeContent={ticketStats['In Review'] || 0} color="warning" />
                </Avatar>
                <Typography color="text.secondary" fontWeight="medium">
                  In Review
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ my: 1, fontWeight: 'bold' }}>
                {ticketStats['In Review'] || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={tickets.length ? ((ticketStats['In Review'] || 0) / tickets.length * 100) : 0} 
                color="warning"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'success.light', mr: 1.5 }}>
                  <Badge badgeContent={ticketStats.Closed || 0} color="success" />
                </Avatar>
                <Typography color="text.secondary" fontWeight="medium">
                  Closed
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ my: 1, fontWeight: 'bold' }}>
                {ticketStats.Closed || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={tickets.length ? ((ticketStats.Closed || 0) / tickets.length * 100) : 0} 
                color="success"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 1.5 }}>
                  <Badge badgeContent={totalTickets} color="primary" />
                </Avatar>
                <Typography color="text.secondary" fontWeight="medium">
                  Total Tickets
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ my: 1, fontWeight: 'bold' }}>
                {totalTickets}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={100} 
                color="primary"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ticket Management Header & Controls */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
            <ConfirmationNumberIcon sx={{ mr: 1.5 }} />
            Ticket Management
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton 
                color="primary" 
                onClick={handleRefresh}
                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={`Switch to ${viewMode === 'table' ? 'Grid' : 'Table'} View`}>
              <IconButton 
                color="primary" 
                onClick={toggleViewMode}
                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              >
                {viewMode === 'table' ? <ViewModuleIcon /> : <ViewListIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Toggle Filters">
              <IconButton 
                color="primary" 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              >
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              href="/logs"
              sx={{ ml: 1 }}
            >
              Create Ticket
            </Button>
          </Box>
        </Box>
        
        {/* Expanded Filters */}
        {isFilterExpanded && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <form onSubmit={handleSearch}>
                  <TextField
                    fullWidth
                    placeholder="Search tickets..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <IconButton 
                            size="small" 
                            onClick={() => setSearchQuery('')}
                            edge="end"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </form>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status Filter"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Open">Open</MenuItem>
                    <MenuItem value="In Review">In Review</MenuItem>
                    <MenuItem value="Closed">Closed</MenuItem>
                    <MenuItem value="Reopened">Reopened</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={5}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setPage(0);
                    }}
                    sx={{ mr: 1 }}
                  >
                    Reset Filters
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSearch}
                    startIcon={<SearchIcon />}
                  >
                    Search
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Data Display */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={400}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={4} textAlign="center">
            <Typography color="error" variant="body1" gutterBottom>
              {error}
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Box>
        ) : tickets.length === 0 ? (
          <Box p={4} textAlign="center">
            <ConfirmationNumberIcon color="disabled" sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No tickets found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {statusFilter !== 'all' 
                ? `There are no tickets with status "${statusFilter}".` 
                : "No tickets match your search criteria."}
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
                fetchTickets();
              }}
            >
              Reset Filters
            </Button>
          </Box>
        ) : viewMode === 'table' ? (
          // Table View
          <DataGrid
            rows={tickets}
            columns={columns}
            pagination
            paginationMode="server"
            pageSize={pageSize}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
            page={page}
            rowCount={totalTickets}
            components={{
              Toolbar: GridToolbar,
            }}
            componentsProps={{
              toolbar: {
                showQuickFilter: false,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            disableSelectionOnClick
            getRowId={(row) => row.id}
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderBottom: `2px solid ${theme.palette.divider}`
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${theme.palette.divider}`
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              },
              border: 'none',
              height: 650
            }}
            loading={refreshing}
            onRowClick={(params) => handleViewDetails(params.row)}
          />
        ) : (
          // Grid View
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {tickets.map((ticket) => (
                <Grid item xs={12} sm={6} md={4} key={ticket.id}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardActionArea onClick={() => handleViewDetails(ticket)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" color="primary" fontWeight="medium">
                            {ticket.ticketId}
                          </Typography>
                          <Chip 
                            label={ticket.status} 
                            color={getStatusColor(ticket.status)} 
                            size="small" 
                          />
                        </Box>
                        
                        <Divider sx={{ mb: 2 }} />
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Issue Description
                          </Typography>
                          <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                            {ticket.logSummary?.ruleDescription || 'No description'}
                          </Typography>
                          
                          {ticket.logSummary?.ruleLevel && (
                            <Chip 
                              label={`Level ${ticket.logSummary.ruleLevel}`}
                              color={getSeverityColor(ticket.logSummary.ruleLevel)}
                              size="small"
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Created by</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar 
                                sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  mr: 0.5, 
                                  bgcolor: 'primary.main',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {(ticket.creator?.name?.charAt(0) || ticket.creator?.username?.charAt(0) || 'U').toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" noWrap>
                                {ticket.creator?.name || ticket.creator?.username || 'N/A'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box>
                            <Typography variant="caption" color="text.secondary">Assigned to</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar 
                                sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  mr: 0.5, 
                                  bgcolor: ticket.assignedTo ? 'secondary.main' : 'grey.400',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {(ticket.assignedTo?.name?.charAt(0) || ticket.assignedTo?.username?.charAt(0) || 'U').toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" noWrap>
                                {ticket.assignedTo?.name || ticket.assignedTo?.username || 'Unassigned'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <AccessTimeIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                          Created: {formatDate(ticket.createdAt)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* Ticket Detail View Dialog */}
      {selectedTicket && (
        <ViewTicketDetails
          open={viewDetailsOpen}
          onClose={() => setViewDetailsOpen(false)}
          ticketId={selectedTicket.id}
        />
      )}
      
      {/* Update Ticket Status Dialog */}
      {selectedTicket && (
        <Dialog
          open={updateStatusOpen}
          onClose={() => setUpdateStatusOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Update Ticket Status - {selectedTicket.ticketId}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedTicket.status}
                onChange={(e) => setSelectedTicket({
                  ...selectedTicket,
                  status: e.target.value
                })}
                label="Status"
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Review">In Review</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
                <MenuItem value="Reopened">Reopened</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={selectedTicket.statusDescription || ''}
              onChange={(e) => setSelectedTicket({
                ...selectedTicket,
                statusDescription: e.target.value
              })}
              margin="normal"
              required
              placeholder="Explain why you're changing the status"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateStatusOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleStatusUpdate(selectedTicket.id, {
                status: selectedTicket.status,
                description: selectedTicket.statusDescription
              })} 
              variant="contained" 
              color="primary"
              disabled={!selectedTicket.statusDescription}
            >
              Update Status
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Assign Ticket Dialog */}
      {selectedTicket && (
        <Dialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Assign Ticket - {selectedTicket.ticketId}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={selectedTicket.assigneeId || ''}
                onChange={(e) => setSelectedTicket({
                  ...selectedTicket,
                  assigneeId: e.target.value
                })}
                label="Assign To"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleAssignTicket(selectedTicket.id, selectedTicket.assigneeId)} 
              variant="contained" 
              color="primary"
              disabled={!selectedTicket.assigneeId}
            >
              Assign Ticket
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Tickets;