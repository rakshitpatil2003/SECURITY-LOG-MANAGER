// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const session = require('express-session');
const newsRoutes = require('./routes/news');

// Import services
const { startLogIngestion } = require('./services/logIngestor');
const { initializeVault } = require('./config/vault');
const { createIndexTemplates , checkOpenSearchStatus } = require('./config/opensearch');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const ticketRoutes = require('./routes/tickets');

// Create Express application
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Initialize middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Initialize system
(async () => {
  try {
    // Initialize Vault
    await initializeVault();
    console.log('Vault initialized successfully');

    // Initialize OpenSearch with new indexes
    await createIndexTemplates();
    console.log('OpenSearch indexes initialized successfully');

    // Check OpenSearch status
    await checkOpenSearchStatus();

    // Start log ingestion from Kafka to OpenSearch
    await startLogIngestion();
    console.log('Log ingestion service started');
  } catch (error) {
    console.error('Initialization error:', error);
    console.log('Continuing with limited functionality');
  }
})();

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/news', newsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});