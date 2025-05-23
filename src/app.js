const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');

// Create Express application
const app = express();

// Trust proxy for deployment behind reverse proxies (Nginx, etc.)
app.set('trust proxy', 1);

// Security middleware - Helmet sets various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for development
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003'
    ];

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject origin
    callback(new Error('Not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  credentials: true, // Allow cookies and auth headers
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Logging middleware
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : 'dev';

app.use(morgan(morganFormat, {
  // Skip logging for health checks in production
  skip: function (req, res) {
    return process.env.NODE_ENV === 'production' && req.url === '/health';
  }
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Request timeout middleware
app.use((req, res, next) => {
  // Set timeout for all requests (30 seconds)
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Request took too long to process'
      });
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    pid: process.pid
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Subscription Manager API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - must be after all routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      subscriptions: {
        list: 'GET /api/subscriptions',
        create: 'POST /api/subscriptions',
        get: 'GET /api/subscriptions/:id',
        update: 'PUT /api/subscriptions/:id',
        delete: 'DELETE /api/subscriptions/:id',
        analytics: 'GET /api/subscriptions/analytics'
      }
    }
  });
});

// Global error handling middleware - must be last
app.use((err, req, res, next) => {
  // Log error for debugging
  console.error('Global error handler:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS error',
      message: 'Cross-origin request blocked by CORS policy'
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  // Handle request entity too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request body exceeds size limit'
    });
  }

  // Handle JWT errors (if they somehow reach here)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Authentication token has expired'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details || []
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(400).json({
        error: 'Unique constraint violation',
        message: 'Resource already exists'
      });
    }
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Resource not found',
        message: 'Requested resource does not exist'
      });
    }

    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while processing your request'
    });
  }

  // Handle database connection errors
  if (err.name === 'PrismaClientInitializationError') {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Database connection failed'
    });
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 && {
      stack: err.stack,
      details: err
    })
  });
});

module.exports = app;