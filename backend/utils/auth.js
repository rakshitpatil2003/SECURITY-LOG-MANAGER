// backend/utils/auth.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
      authority: user.authority,
      plan: user.plan
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

const createDefaultAdmin = async (client) => {
  try {
    // Check if admin already exists
    const searchResponse = await client.search({
      index: 'users',
      body: {
        query: {
          term: { username: 'admin' }
        }
      }
    });
    
    if (searchResponse.body.hits.total.value > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    const hashedPassword = await hashPassword('admin');
    
    const adminUser = {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      email: '',
      phone: '',
      department: '',
      role: 'administrator',
      plan: 'Platinum',
      authority: 'read-write',
      planExpiryDate: expiryDate.toISOString(),
      active: true,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await client.index({
      index: 'users',
      id: 'admin',
      body: adminUser,
      refresh: true
    });
    
    console.log('Default admin user created');
  } catch (error) {
    console.error('Error creating default admin:', error);
    throw error;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  createDefaultAdmin
};