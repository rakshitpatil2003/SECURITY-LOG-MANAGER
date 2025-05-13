// Global error handler for Express

// Custom error class for API errors
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Error handler middleware
  const errorHandler = (err, req, res, next) => {
    // Log the error details
    console.error(
      `Error [${req.method} ${req.originalUrl}]:`,
      err.message,
      err.stack
    );
  
    // Handle custom API errors
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        details: err.details,
        statusCode: err.statusCode,
      });
    }
  
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        statusCode: 401,
      });
    }
  
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        statusCode: 401,
      });
    }
  
    // Handle validation errors (Joi)
    if (err.isJoi) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        details: err.details,
        statusCode: 400,
      });
    }
  
    // Handle OpenSearch errors
    if (err.name === 'ResponseError' && err.meta && err.meta.body) {
      return res.status(err.meta.statusCode || 500).json({
        success: false,
        message: 'Database Error',
        details: err.meta.body.error,
        statusCode: err.meta.statusCode || 500,
      });
    }
  
    // Handle Kafka errors
    if (err.name === 'KafkaJSError') {
      return res.status(500).json({
        success: false,
        message: 'Messaging System Error',
        details: err.message,
        statusCode: 500,
      });
    }
  
    // Handle Vault errors
    if (err.message && err.message.includes('Vault')) {
      return res.status(500).json({
        success: false,
        message: 'Secret Management Error',
        details: err.message,
        statusCode: 500,
      });
    }
  
    // Default error response
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : err.message;
  
    // Only include stack trace in development
    const errorResponse = {
      success: false,
      message,
      statusCode,
    };
  
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
  
    return res.status(statusCode).json(errorResponse);
  };
  
  module.exports = {
    ApiError,
    errorHandler,
  };