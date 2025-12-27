#!/bin/bash
# Script to fix Vite dependency issues

echo "🔧 Fixing Vite dependency issue..."

# Remove node_modules and lock file
echo "🗑️  Removing node_modules..."
rm -rf node_modules

echo "🗑️  Removing package-lock.json..."
rm -f package-lock.json

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Dependencies reinstalled successfully!"
echo "🚀 You can now run: npm run dev"
