import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    proxy: {
      // 🔐 Public endpoints - go directly to public schema (localhost:8000)
      // Order matters! Most specific first.
      '/api/auth/password-reset': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/v2/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // 🔐 Tenant API requests - route based on X-Tenant header OR subdomain
      // Must set Host header to tenant subdomain for django-tenants
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const hostname = req.headers.host || '';
            const hostnameOnly = hostname.split(':')[0];
            const subdomain = hostnameOnly.split('.')[0];
            const isSubdomain =
              hostnameOnly.includes('.') && subdomain !== 'www' && subdomain !== 'localhost';

            const headerTenant =
              typeof req.headers['x-tenant'] === 'string' ? req.headers['x-tenant'] : undefined;
            const tenant = headerTenant || (isSubdomain ? subdomain : undefined);

            if (tenant) {
              proxyReq.setHeader('X-Tenant', tenant);
            }

            const hostTarget = isSubdomain
              ? `${hostnameOnly}:8000`
              : tenant
              ? `${tenant}.localhost:8000`
              : 'localhost:8000';
            proxyReq.setHeader('Host', hostTarget);
            console.log(
              `[Vite Proxy] Host: ${hostTarget}, X-Tenant: ${tenant ?? 'none'}`
            );
          });
        },
      }
    }
  },
  optimizeDeps: {
    include: ['react-pdf', 'pdfjs-dist']
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Don't bundle PDF worker files
        if (id.includes('pdf.worker')) {
          return true;
        }
        return false;
      }
    }
  }
});
