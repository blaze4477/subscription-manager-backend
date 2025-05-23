const { execSync } = require('child_process');

console.log('🚀 Starting Subscription Manager Backend...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${process.env.PORT || 3001}`);
console.log(`🏠 Host: ${process.env.HOST || '0.0.0.0'}`);
console.log(`💾 Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

// Check if running in Railway
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
  console.log(`🚂 Railway Service: ${process.env.RAILWAY_SERVICE_NAME || 'unknown'}`);
}

async function deploy() {
  try {
    // Try to skip complex operations first and just start the server
    console.log('⚡ Quick start mode - starting server directly...');
    require('./src/server.js');
  } catch (error) {
    console.error('❌ Quick start failed, trying full deployment:', error.message);
    
    try {
      // Generate Prisma client
      console.log('📦 Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });

      // Skip migrations for now to test basic server startup
      console.log('⚠️  Skipping migrations for debugging');

      // Start the server
      console.log('✅ Starting server after Prisma generation...');
      require('./src/server.js');
    } catch (fullError) {
      console.error('❌ Full deployment failed:', fullError.message);
      console.error('Stack trace:', fullError.stack);
      console.error('Environment variables:');
      console.error('- PORT:', process.env.PORT);
      console.error('- NODE_ENV:', process.env.NODE_ENV);
      console.error('- DATABASE_URL present:', !!process.env.DATABASE_URL);
      process.exit(1);
    }
  }
}

deploy();