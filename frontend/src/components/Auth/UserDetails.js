// frontend/src/components/Auth/UserDetails.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Card, CardHeader, CardContent, Grid, CircularProgress,
  Alert, Typography, Box, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Divider, Tabs, Tab, Snackbar, MenuItem, Select,
  FormControl, InputLabel, FormHelperText, IconButton, Paper, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import api from '../../services/auth';
import PasswordVerificationDialog from '../Common/PasswordVerificationDialog';

// TabPanel component for the tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserDetails = () => {
  const theme = useTheme();

  // State variables
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    role: 'L1-Analyst',
    authority: 'read-only',
    plan: 'Privileged',
    planExpiryDate: ''
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Validation states
  const [passwordErrors, setPasswordErrors] = useState({});
  const [createUserErrors, setCreateUserErrors] = useState({});

  const [passwordDialog, setPasswordDialog] = useState({
    open: false,
    title: '',
    action: null
  });

  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    role: '',
    authority: '',
    plan: '',
    planExpiryDate: '',
    active: true
  });

  // FETCH DATA FUNCTIONS
  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/userinfo');
      setUser(response.data);

      // Initialize profile form with user data
      setProfileForm({
        fullName: response.data.fullName || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        department: response.data.department || ''
      });

      setError(null);
    } catch (err) {
      setError('Failed to fetch user data. Please try again later.');
      console.error('Error fetching user data:', err);
    }
  };

  const verifyPassword = async (password) => {
    try {
      await api.post('/auth/verify-password', { password });
      return true;
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Incorrect password',
        severity: 'error'
      });
      return false;
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setSnackbar({
        open: true,
        message: 'Failed to fetch users',
        severity: 'error'
      });
    }
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchUserProfile();
        // Fetch users only for administrator
        if (user?.role === 'administrator') {
          await fetchUsers();
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Watch for user changes to fetch users list if admin
  useEffect(() => {
    if (user?.role === 'administrator') {
      fetchUsers();
    }
  }, [user]);

  // FORM SUBMISSION HANDLERS
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/auth/profile', profileForm);

      // Update user data
      setUser(prev => ({
        ...prev,
        ...profileForm
      }));

      // Close dialog and show success message
      setProfileDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to update profile',
        severity: 'error'
      });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords
    const errors = {};
    if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      // Reset form and close dialog
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordDialogOpen(false);

      // Show success message
      setSnackbar({
        open: true,
        message: 'Password changed successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to change password',
        severity: 'error'
      });
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const errors = {};
    if (!createUserForm.username) errors.username = 'Username is required';
    if (!createUserForm.password) errors.password = 'Password is required';
    if (createUserForm.password && createUserForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!createUserForm.role) errors.role = 'Role is required';
    if (!createUserForm.authority) errors.authority = 'Authority is required';
    if (!createUserForm.plan) errors.plan = 'Plan is required';
    if (!createUserForm.planExpiryDate) errors.planExpiryDate = 'Expiry date is required';

    if (Object.keys(errors).length > 0) {
      setCreateUserErrors(errors);
      return;
    }

    try {
      await api.post('/users', createUserForm);

      // Reset form and close dialog
      setCreateUserForm({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        department: '',
        role: 'L1-Analyst',
        authority: 'read-only',
        plan: 'Privileged',
        planExpiryDate: ''
      });
      setCreateUserDialogOpen(false);

      // Refresh users list
      fetchUsers();

      // Show success message
      setSnackbar({
        open: true,
        message: 'User created successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to create user',
        severity: 'error'
      });
    }
  };

  // UI HANDLERS
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefreshData = async () => {
    setLoading(true);
    try {
      await fetchUserProfile();
      if (user?.role === 'administrator') {
        await fetchUsers();
      }

      setSnackbar({
        open: true,
        message: 'Data refreshed successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to refresh data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle user deletion
  // Replace this function:
  const handleDeleteUser = async (userId) => {
    setPasswordDialog({
      open: true,
      title: 'Confirm User Deletion',
      action: async (password) => {
        const verified = await verifyPassword(password);
        if (verified) {
          try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
            setSnackbar({
              open: true,
              message: 'User deleted successfully',
              severity: 'success'
            });
            setPasswordDialog({ open: false });
          } catch (err) {
            setSnackbar({
              open: true,
              message: err.response?.data?.message || 'Failed to delete user',
              severity: 'error'
            });
          }
        }
      }
    });
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditUserForm({
      role: user.role,
      authority: user.authority,
      plan: user.plan,
      planExpiryDate: user.planExpiryDate ? user.planExpiryDate.split('T')[0] : '',
      active: user.active
    });
    setEditUserDialogOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();

    setPasswordDialog({
      open: true,
      title: 'Confirm User Edit',
      action: async (password) => {
        const verified = await verifyPassword(password);
        if (verified) {
          try {
            await api.put(`/users/${editingUser.id}`, editUserForm);

            // Reset form and close dialog
            setEditUserForm({
              role: '',
              authority: '',
              plan: '',
              planExpiryDate: '',
              active: true
            });
            setEditUserDialogOpen(false);
            setPasswordDialog({ open: false });

            // Refresh users list
            fetchUsers();

            // Show success message
            setSnackbar({
              open: true,
              message: 'User updated successfully',
              severity: 'success'
            });
          } catch (err) {
            setSnackbar({
              open: true,
              message: err.response?.data?.message || 'Failed to update user',
              severity: 'error'
            });
          }
        }
      }
    });
  };

  // User columns with actions
  const userColumns = [
    {
      field: 'avatar',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
          {params.row?.username?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
      )
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 150,
      renderCell: (params) => params.row?.username || 'N/A'
    },
    {
      field: 'fullName',
      headerName: 'Name',
      width: 180,
      renderCell: (params) => params.row?.fullName || 'Not provided'
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.row?.role || 'N/A'}
          size="small"
          color={params.row?.role === 'administrator' ? 'secondary' : 'primary'}
          variant={params.row?.role === 'administrator' ? 'filled' : 'outlined'}
        />
      )
    },
    {
      field: 'plan',
      headerName: 'Plan',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.plan || 'N/A'}
          color={params.row?.plan === 'Platinum' ? 'success' : 'info'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'authority',
      headerName: 'Authority',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.authority || 'N/A'}
          color={params.row?.authority === 'read-write' ? 'success' : 'warning'}
          size="small"
        />
      )
    },
    {
      field: 'planExpiryDate',
      headerName: 'Expires',
      width: 150,
      renderCell: (params) => {
        if (!params.row?.planExpiryDate) return 'N/A';
        try {
          const date = new Date(params.row.planExpiryDate).toLocaleDateString();
          return date;
        } catch (error) {
          return 'Invalid Date';
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit User">
            <IconButton
              color="primary"
              size="small"
              onClick={() => handleEditUser(params.row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete User">
            <IconButton
              color="error"
              size="small"
              onClick={() => handleDeleteUser(params.row.id)}
              disabled={params.row.username === 'admin'}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // If loading, show loading spinner
  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">User Profile</Typography>
        <IconButton
          onClick={handleRefreshData}
          color="primary"
          disabled={loading}
          sx={{
            backgroundColor: theme.palette.background.paper,
            boxShadow: 1,
            '&:hover': {
              backgroundColor: theme.palette.background.paper,
              opacity: 0.9
            }
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {user && (
        <>
          <Card elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        margin: '0 auto 16px',
                        bgcolor: theme.palette.primary.main,
                        fontSize: '2.5rem'
                      }}
                    >
                      {user.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      {user.fullName || user.username}
                    </Typography>
                    <Chip
                      label={user.role}
                      color="primary"
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {user.plan} Plan
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    Account Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <EmailIcon color="primary" sx={{ mr: 1 }} />
                        <Typography>
                          <Box component="span" fontWeight="bold">Email:</Box> {user.email || 'Not provided'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PhoneIcon color="primary" sx={{ mr: 1 }} />
                        <Typography>
                          <Box component="span" fontWeight="bold">Phone:</Box> {user.phone || 'Not provided'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BusinessIcon color="primary" sx={{ mr: 1 }} />
                        <Typography>
                          <Box component="span" fontWeight="bold">Department:</Box> {user.department || 'Not provided'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
                        <Typography>
                          <Box component="span" fontWeight="bold">Plan Expires:</Box> {user.planExpiryDate ? new Date(user.planExpiryDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PersonIcon />}
                      onClick={() => setProfileDialogOpen(true)}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<LockIcon />}
                      onClick={() => setPasswordDialogOpen(true)}
                    >
                      Change Password
                    </Button>
                    {user.role === 'administrator' && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<GroupAddIcon />}
                        onClick={() => setCreateUserDialogOpen(true)}
                      >
                        Create User
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Admin Tab for User Management */}
          {user.role === 'administrator' && (
            <Box sx={{ width: '100%', mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                User Management
              </Typography>

              <Card elevation={2}>
                <CardContent sx={{ p: 0 }}>
                  <DataGrid
                    rows={users}
                    columns={userColumns}
                    pageSize={10}
                    rowsPerPageOptions={[5, 10, 25]}
                    autoHeight
                    disableSelectionOnClick
                    getRowId={(row) => row.id}
                    loading={loading}
                    sx={{
                      '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      },
                      '& .MuiDataGrid-cell:hover': {
                        color: 'primary.main',
                      },
                      border: 'none',
                      '& .MuiDataGrid-cell': {
                        borderBottom: `1px solid ${theme.palette.divider}`
                      },
                      '& .MuiDataGrid-columnHeaders': {
                        borderBottom: `2px solid ${theme.palette.divider}`
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Box>
          )}
        </>
      )}

      {/* Profile Edit Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <form onSubmit={handleProfileSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  margin="normal"
                  required
                  error={!!passwordErrors.newPassword}
                  helperText={passwordErrors.newPassword}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  margin="normal"
                  required
                  error={!!passwordErrors.confirmPassword}
                  helperText={passwordErrors.confirmPassword}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Change Password</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <form onSubmit={handleCreateUserSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={createUserForm.username}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                  margin="normal"
                  required
                  error={!!createUserErrors.username}
                  helperText={createUserErrors.username}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  margin="normal"
                  required
                  error={!!createUserErrors.password}
                  helperText={createUserErrors.password}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={createUserForm.fullName}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, fullName: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={createUserForm.phone}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={createUserForm.department}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, department: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                    label="Role"
                    required
                    error={!!createUserErrors.role}
                  >
                    <MenuItem value="administrator">Administrator</MenuItem>
                    <MenuItem value="L1-Analyst">L1 Analyst</MenuItem>
                    <MenuItem value="L2-Analyst">L2 Analyst</MenuItem>
                    <MenuItem value="L3-Analyst">L3 Analyst</MenuItem>
                  </Select>
                  {createUserErrors.role && <FormHelperText error>{createUserErrors.role}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Authority</InputLabel>
                  <Select
                    value={createUserForm.authority}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, authority: e.target.value })}
                    label="Authority"
                    required
                    error={!!createUserErrors.authority}
                  >
                    <MenuItem value="read-write">Read-Write</MenuItem>
                    <MenuItem value="read-only">Read-Only</MenuItem>
                  </Select>
                  {createUserErrors.authority && <FormHelperText error>{createUserErrors.authority}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={createUserForm.plan}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, plan: e.target.value })}
                    label="Plan"
                    required
                    error={!!createUserErrors.plan}
                  >
                    <MenuItem value="Platinum">Platinum</MenuItem>
                    <MenuItem value="Privileged">Privileged</MenuItem>
                  </Select>
                  {createUserErrors.plan && <FormHelperText error>{createUserErrors.plan}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Plan Expiry Date"
                  type="date"
                  value={createUserForm.planExpiryDate}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, planExpiryDate: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!!createUserErrors.planExpiryDate}
                  helperText={createUserErrors.planExpiryDate}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateUserDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Create User</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onClose={() => setEditUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User - {editingUser?.username}</DialogTitle>
        <form onSubmit={handleEditUserSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    label="Role"
                    required
                  >
                    <MenuItem value="administrator">Administrator</MenuItem>
                    <MenuItem value="L1-Analyst">L1 Analyst</MenuItem>
                    <MenuItem value="L2-Analyst">L2 Analyst</MenuItem>
                    <MenuItem value="L3-Analyst">L3 Analyst</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Authority</InputLabel>
                  <Select
                    value={editUserForm.authority}
                    onChange={(e) => setEditUserForm({ ...editUserForm, authority: e.target.value })}
                    label="Authority"
                    required
                  >
                    <MenuItem value="read-write">Read-Write</MenuItem>
                    <MenuItem value="read-only">Read-Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={editUserForm.plan}
                    onChange={(e) => setEditUserForm({ ...editUserForm, plan: e.target.value })}
                    label="Plan"
                    required
                  >
                    <MenuItem value="Platinum">Platinum</MenuItem>
                    <MenuItem value="Privileged">Privileged</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Plan Expiry Date"
                  type="date"
                  value={editUserForm.planExpiryDate}
                  onChange={(e) => setEditUserForm({ ...editUserForm, planExpiryDate: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">Save Changes</Button>
          </DialogActions>
        </form>
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
      {/* Password Verification Dialog */}
      <PasswordVerificationDialog
        open={passwordDialog.open}
        onClose={() => setPasswordDialog({ open: false })}
        onConfirm={passwordDialog.action}
        title={passwordDialog.title}
      />
    </Container>
  );
};

export default UserDetails;