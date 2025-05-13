import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get return URL from location state or default to dashboard
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!username) return setError('Username is required');
    if (!password) return setError('Password is required');
    
    try {
      setError('');
      setLoading(true);
      
      // Login
      await login(username, password);
      
      // Navigate to return URL
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box 
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: '50%',
            p: 1,
            mb: 1
          }}
        >
          <LockOutlinedIcon />
        </Box>
        
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Security Log Manager
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Default credentials: admin / admin
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;