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
      '/api/invites': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/auth/centralized-login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/auth/discover-tenant': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/auth/password-reset': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/auth/logout': {
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
            const xTenant = req.headers['x-tenant'];
            
            // Detectar tenant do hostname (e.g., umc.localhost:5173 -> umc)
            const hostname = req.headers.host || '';
            const subdomain = hostname.split('.')[0];
            const isSubdomain = hostname.includes('.') && subdomain !== 'www' && subdomain !== 'localhost';
            
            if (xTenant && typeof xTenant === 'string') {
              // Use X-Tenant header
              const tenantHost = `${xTenant.toLowerCase()}.localhost:8000`;
              proxyReq.setHeader('Host', tenantHost);
              console.log(`[Vite Proxy] X-Tenant: ${xTenant} -> Host: ${tenantHost}`);
            } else if (isSubdomain) {
              // Use subdomain from URL
              const tenantHost = `${subdomain.toLowerCase()}.localhost:8000`;
              proxyReq.setHeader('Host', tenantHost);
              console.log(`[Vite Proxy] Subdomain: ${subdomain} -> Host: ${tenantHost}`);
            } else {
              // Public schema (localhost sem subdomain)
              proxyReq.setHeader('Host', 'localhost:8000');
              console.log(`[Vite Proxy] No tenant -> Host: localhost:8000 (public)`);
            }
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
