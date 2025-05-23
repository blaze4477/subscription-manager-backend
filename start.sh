#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting Subscription Manager Backend..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Start the server
echo "✅ Starting server..."
node src/server.js