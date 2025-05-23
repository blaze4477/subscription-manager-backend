// Ultra-simple server for debugging Railway deployment
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting SIMPLE server...');
console.log(`Port: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Simple server running' });
});

// Simple ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Simple Subscription Manager API',
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Simple server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});