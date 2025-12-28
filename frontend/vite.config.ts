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
      // 🔐 Tenant API requests - route based on X-Tenant header
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        router: (req) => {
          const xTenant = req.headers['x-tenant'];
          
          // Route to tenant based on X-Tenant header
          if (xTenant && typeof xTenant === 'string') {
            const target = `http://${xTenant.toLowerCase()}.localhost:8000`;
            console.log(`[Vite Proxy] X-Tenant: ${xTenant} -> ${target}`);
            return target;
          }
          
          // Fallback: public schema (no tenant context)
          console.log(`[Vite Proxy] No X-Tenant header -> localhost:8000 (public)`);
          return 'http://localhost:8000';
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
