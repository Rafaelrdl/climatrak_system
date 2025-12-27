#!/bin/bash

# Clear previous build artifacts

# Clear previous build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf dist/
rm -rf node_modules/.vite/
npm run optimize

npx tsc --noEmit --skipLibC
# Create optimized .env.local if it does
    echo "⚙️ Cre

VITE_DEV_SKIP_ENV_VALIDATION=
EOF
npx tsc --noEmit --skipLibCheck

# Create optimized .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "⚙️ Creating optimized development configuration..."
    cat > .env.local << EOF
# Development optimizations
VITE_DEV_FAST_REFRESH=true
VITE_DEV_SKIP_ENV_VALIDATION=true
NODE_OPTIONS="--max-old-space-size=4096"
EOF
fi

echo "✅ Development environment optimized!"
echo ""
echo "🎯 Performance Tips:"




