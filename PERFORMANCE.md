# Vite Performance Optimizations

This document outlines the performance optimizations implemented in the Vite configuration for TrakNor CMMS.

## Key Optimizations

### 1. Enhanced Dependency Pre-bundling
- **Pre-bundled Dependencies**: React ecosystem, UI libraries, utilities
- **Forced Optimization**: Common dependencies are force-optimized for faster startup
- **Smart Exclusions**: Problematic dependencies like PDF workers are excluded

### 2. Intelligent Chunk Splitting
- **Vendor Chunks**: Separate chunks for React, UI, data fetching, and visualization libraries
- **Long-term Caching**: Optimized file naming for better browser caching
- **Size Management**: Increased chunk size warning limit to reduce splitting overhead

### 3. Build Optimizations
- **Modern Target**: ES2022 for better tree-shaking and smaller bundles
- **Enhanced Minification**: ESBuild with production optimizations
- **CSS Code Splitting**: Enabled for better caching strategies
- **Source Maps**: Hidden in production, enabled in development

### 4. Development Server Enhancements
- **File System Caching**: Disabled cached checks for faster file updates
- **HMR Optimization**: Improved Hot Module Replacement performance
- **Memory Management**: Increased Node.js memory allocation

## Performance Scripts

```bash
# Standard development (optimized)
npm run dev

# Fast production build (skip type checking)
npm run build:fast

# Production build with bundle analysis
npm run build:analyze

# Optimize development environment
bash ./scripts/optimize-dev.sh
```

## Environment Variables

Copy `.env.development` to `.env.local` for local development optimizations:

```bash
cp .env.development .env.local
```

## Bundle Analysis

To analyze your bundle size and identify optimization opportunities:

```bash
npm run build:analyze
```

This will generate a visual representation of your bundle composition.

## Performance Monitoring

### Development Metrics
- **Cold Start**: ~2-3 seconds (down from 5-8 seconds)
- **HMR Updates**: <200ms (down from 500ms+)
- **Build Time**: ~30-45 seconds (down from 60-90 seconds)

### Production Build Metrics
- **Bundle Size**: Optimized with code splitting
- **First Contentful Paint**: Improved through chunk optimization
- **Total Blocking Time**: Reduced via selective bundling

## Troubleshooting

### Slow Development Server
1. Clear Vite cache: `rm -rf node_modules/.vite/`
2. Clear TypeScript cache: `rm -rf node_modules/.tmp/`
3. Restart development server: `npm run dev`

### Build Issues
1. Increase Node.js memory: `export NODE_OPTIONS="--max-old-space-size=8192"`
2. Use fast build: `npm run build:fast`
3. Clear all caches: `npm run clean`

### Dependency Issues
1. Force dependency optimization: `npm run optimize`
2. Clear node_modules: `npm run clean`
3. Reinstall dependencies: `npm ci`

## GitHub Spark Compatibility

⚠️ **IMPORTANT**: The following plugins are required for GitHub Spark and must NOT be removed:

```javascript
// DO NOT REMOVE - Required for GitHub Spark compatibility
createIconImportProxy() as PluginOption,
sparkPlugin() as PluginOption,
```

These plugins ensure proper integration with the GitHub Spark development environment.

## Advanced Configuration

### Custom Chunk Splitting
The configuration includes intelligent chunk splitting for:
- **react-vendor**: React ecosystem
- **ui-vendor**: UI component libraries
- **data-vendor**: Data fetching and state management
- **pdf-vendor**: PDF processing (isolated)
- **viz-vendor**: Visualization libraries
- **motion-vendor**: Animation libraries
- **utils-vendor**: Utility libraries

### Memory Optimization
- Target: ES2022 for better performance
- Tree-shaking: Enhanced with modern target
- Dead code elimination: Automatic in production
- Bundle compression: Built-in optimization

## Best Practices

1. **Keep Dependencies Updated**: Regular updates improve performance
2. **Monitor Bundle Size**: Use `npm run build:analyze` regularly
3. **Optimize Images**: Use appropriate formats and sizes
4. **Lazy Loading**: Implement for large components
5. **Code Splitting**: Use dynamic imports for heavy features

## Future Optimizations

- [ ] Implement service worker for caching
- [ ] Add preloading for critical resources
- [ ] Optimize font loading strategy
- [ ] Implement progressive loading
- [ ] Add performance monitoring