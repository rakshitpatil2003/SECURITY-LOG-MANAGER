// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { getOpenSearchClient } = require('../config/opensearch');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { authenticate, hasRole } = require('../middleware/authMiddleware');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const client = await getOpenSearchClient();
    
    // Find user
    const searchResponse = await client.search({
      index: 'users',
      body: {
        query: {
          term: { username }
        }
      }
    });
    
    if (searchResponse.body.hits.total.value === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = searchResponse.body.hits.hits[0]._source;
    
    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ message: 'Account is disabled' });
    }
    
    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await client.update({
      index: 'users',
      id: searchResponse.body.hits.hits[0]._id,
      body: {
        doc: {
          lastLogin: new Date().toISOString()
        }
      }
    });
    
    // Generate token
    const token = generateToken({
      ...user,
      _id: searchResponse.body.hits.hits[0]._id
    });
    
    res.json({
      token,
      user: {
        id: searchResponse.body.hits.hits[0]._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        authority: user.authority,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user info
router.get('/userinfo', authenticate, async (req, res) => {
  try {
    const client = await getOpenSearchClient();
    
    const response = await client.get({
      index: 'users',
      id: req.user.id
    });
    
    const user = response.body._source;
    
    res.json({
      id: response.body._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      authority: user.authority,
      plan: user.plan,
      planExpiryDate: user.planExpiryDate,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, email, phone, department } = req.body;
    
    const client = await getOpenSearchClient();
    
    await client.update({
      index: 'users',
      id: req.user.id,
      body: {
        doc: {
          fullName,
          email,
          phone,
          department,
          updatedAt: new Date().toISOString()
        }
      }
    });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const client = await getOpenSearchClient();
    
    // Get current user
    const response = await client.get({
      index: 'users',
      id: req.user.id
    });
    
    const user = response.body._source;
    
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await client.update({
      index: 'users',
      id: req.user.id,
      body: {
        doc: {
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        }
      }
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify admin password
router.post('/verify-password', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const client = await getOpenSearchClient();
    
    // Get current user's password hash
    const response = await client.get({
      index: 'users',
      id: req.user.id
    });
    
    const user = response.body._source;
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect password' });
    }
    
    res.json({ message: 'Password verified successfully' });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;