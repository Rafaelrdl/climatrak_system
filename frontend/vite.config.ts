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
      // 🔐 Proxy API requests to backend (enables cookie sharing)
      // Frontend (localhost:5173) → Backend (umc.localhost:8000)
      // This way cookies work because both are on same origin from browser's perspective
      '/api': {
        target: 'http://umc.localhost:8000',
        changeOrigin: true, // Change host header to match target
        secure: false,
        // Use router to dynamically set target based on request host
        router: (req) => {
          const host = req.headers.host || 'localhost:5173';
          const subdomain = host.split('.')[0];
          
          // Se for um subdomínio específico (não localhost), usar subdomínio no backend
          if (subdomain && subdomain !== 'localhost' && !subdomain.includes(':')) {
            return `http://${subdomain}.localhost:8000`;
          }
          // Caso contrário, usar tenant padrão (umc)
          return 'http://umc.localhost:8000';
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
