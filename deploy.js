const { execSync } = require('child_process');

console.log('🚀 Starting Subscription Manager Backend...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${process.env.PORT || 3001}`);
console.log(`💾 Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

async function deploy() {
  try {
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run database migrations (only if DATABASE_URL is set and looks like PostgreSQL)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
      console.log('🔄 Running database migrations...');
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Migrations completed successfully');
      } catch (migrationError) {
        console.warn('⚠️  Migration failed, but continuing with server start:', migrationError.message);
        // Don't exit - the database might already be set up
      }
    } else {
      console.log('⚠️  No PostgreSQL DATABASE_URL found, skipping migrations');
    }

    // Start the server
    console.log('✅ Starting server...');
    require('./src/server.js');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

deploy();