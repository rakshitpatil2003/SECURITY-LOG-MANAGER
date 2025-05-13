// backend/routes/users.js
const express = require('express');
const router = express.Router();
const { getOpenSearchClient } = require('../config/opensearch');
const { hashPassword } = require('../utils/auth');
const { authenticate, hasRole } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticate);

// Get all users (Admin only)
router.get('/', hasRole(['administrator']), async (req, res) => {
  try {
    const client = await getOpenSearchClient();
    
    const response = await client.search({
      index: 'users',
      body: {
        query: { match_all: {} },
        size: 1000
      }
    });
    
    const users = response.body.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source,
      password: undefined // Don't send password
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user (Admin only)
router.post('/', hasRole(['administrator']), async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      email,
      phone,
      department,
      role,
      plan,
      authority,
      planExpiryDate
    } = req.body;
    
    if (!username || !password || !role || !plan || !authority || !planExpiryDate) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }
    
    const client = await getOpenSearchClient();
    
    // Check if username already exists
    const existingUser = await client.search({
      index: 'users',
      body: {
        query: {
          term: { username }
        }
      }
    });
    
    if (existingUser.body.hits.total.value > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const newUser = {
      username,
      password: hashedPassword,
      fullName: fullName || '',
      email: email || '',
      phone: phone || '',
      department: department || '',
      role,
      plan,
      authority,
      planExpiryDate,
      active: true,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const response = await client.index({
      index: 'users',
      body: newUser,
      refresh: true
    });
    
    res.status(201).json({
      message: 'User created successfully',
      userId: response.body._id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (Admin only)
router.put('/:id', hasRole(['administrator']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const client = await getOpenSearchClient();
    
    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.createdAt;
    
    updates.updatedAt = new Date().toISOString();
    
    await client.update({
      index: 'users',
      id,
      body: {
        doc: updates
      }
    });
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', hasRole(['administrator']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting the last admin user
    if (id === 'admin') {
      return res.status(400).json({ message: 'Cannot delete the default admin user' });
    }
    
    const client = await getOpenSearchClient();
    
    await client.delete({
      index: 'users',
      id
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;