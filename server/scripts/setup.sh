#!/bin/bash

# ARIS Server Setup Script
# This script helps set up the server after cloning the repo

set -e  # Exit on error

echo "🚀 ARIS Server Setup"
echo "===================="
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed!"
    echo "Please install Bun from https://bun.sh"
    exit 1
fi

echo "✅ Bun is installed"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env file from template..."
    echo ""
    
    cat > .env << 'EOF'
# Database Connection (REQUIRED - Update with your database URL)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Blockchain RPC (Optional - has default)
# RPC_URL="https://eth.llamarpc.com"
EOF
    
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and set your DATABASE_URL!"
    echo "   The server will not start without a valid database connection."
    echo ""
    read -p "Press Enter after you've updated DATABASE_URL in .env..."
else
    echo "✅ .env file exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
bun install

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
bun run prisma:generate

# Check if DATABASE_URL is set (basic check)
if grep -q 'postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DATABASE>' .env 2>/dev/null; then
    echo ""
    echo "⚠️  WARNING: DATABASE_URL appears to be the default template value!"
    echo "   Please update it with your actual database connection string."
    echo ""
    read -p "Do you want to continue with database setup? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup paused. Please update DATABASE_URL in .env and run:"
        echo "  bun run prisma:push"
        echo "  bun run dev"
        exit 0
    fi
fi

# Push database schema
echo ""
echo "🗄️  Pushing database schema..."
bun run prisma:push

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "  bun run dev"
echo ""
echo "The server will start on http://localhost:8000"



