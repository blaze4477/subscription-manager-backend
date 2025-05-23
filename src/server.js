const app = require('./app');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Get port from environment or default to 3001
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Graceful shutdown
  console.log('Shutting down due to uncaught exception...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Graceful shutdown
  console.log('Shutting down due to unhandled promise rejection...');
  process.exit(1);
});

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    if (server) {
      console.log('Closing HTTP server...');
      server.close(() => {
        console.log('HTTP server closed.');
      });
    }

    // Disconnect from database
    console.log('Disconnecting from database...');
    await prisma.$disconnect();
    console.log('Database disconnected.');

    console.log('Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Database connection test
const testDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.warn('⚠️  Continuing without database connection - server will start anyway');
    return false;
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log('🚀 Server started successfully!');
      console.log(`📍 Server running on: http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📚 API docs: http://${HOST}:${PORT}/api/docs`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET  /health                 - Health check');
      console.log('  GET  /                       - API information');
      console.log('  POST /api/auth/register      - User registration');
      console.log('  POST /api/auth/login         - User login');
      console.log('  GET  /api/auth/me            - Get current user');
      console.log('  POST /api/auth/refresh       - Refresh tokens');
      console.log('  POST /api/auth/logout        - User logout');
      console.log('  GET  /api/subscriptions      - List subscriptions');
      console.log('  POST /api/subscriptions      - Create subscription');
      console.log('  GET  /api/subscriptions/:id  - Get subscription');
      console.log('  PUT  /api/subscriptions/:id  - Update subscription');
      console.log('  DELETE /api/subscriptions/:id - Delete subscription');
      console.log('  GET  /api/subscriptions/analytics - Get analytics');
      console.log('');
      console.log('Press Ctrl+C to stop the server');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log('Please try:');
        console.log(`  - Use a different port: PORT=3002 npm run dev`);
        console.log(`  - Kill the process using port ${PORT}`);
        process.exit(1);
      } else if (error.code === 'EACCES') {
        console.error(`❌ Permission denied for port ${PORT}`);
        console.log('Please try:');
        console.log(`  - Use a port above 1024: PORT=3001 npm run dev`);
        console.log(`  - Run with sudo (not recommended for development)`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Store server reference for graceful shutdown
    global.server = server;

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle environment variables
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set. Using default (not secure for production)');
  process.env.JWT_SECRET = 'dev-secret-key-please-change-in-production';
}

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set. Some features may not work properly');
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

// Export for testing
module.exports = { app, prisma };