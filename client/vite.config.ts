import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite configuration for both dev and prod
export default defineConfig(({ mode }: { mode: string }) => {
  const isDev = mode === 'development';
  // Only import Replit plugins in development
  const replitPlugins: any[] = [];
  
  // Skip Replit plugins in production
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID) {
    // Load Replit plugins synchronously since we can't use top-level await
    try {
      const loadPlugin = (name: string) => {
        try {
          // Use dynamic import with .then() instead of await
          return import(name)
            .then(mod => mod.default || mod)
            .catch(e => {
              console.warn(`Failed to load ${name}:`, e);
              return null;
            });
        } catch (e) {
          console.warn(`Error loading ${name}:`, e);
          return Promise.resolve(null);
        }
      };

      // Load plugins in parallel
      Promise.all([
        loadPlugin('@replit/vite-plugin-cartographer'),
        loadPlugin('@replit/vite-plugin-dev-banner')
      ]).then(([cartographer, devBanner]) => {
        if (cartographer) replitPlugins.push(cartographer);
        if (devBanner) replitPlugins.push(devBanner);
      }).catch(error => {
        console.warn('Failed to load Replit plugins:', error);
      });
    } catch (error) {
      console.warn('Error setting up Replit plugins:', error);
    }
  }

  return {
    base: "/",
    root: path.resolve(__dirname, 'src'),
    publicDir: path.resolve(__dirname, 'public'),
    plugins: [
      react(),
      isDev && runtimeErrorOverlay(),
      ...replitPlugins,
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '..', 'shared'),
        '@assets': path.resolve(__dirname, '..', 'attached_assets'),
      },
    },
    ...(isDev ? {
      server: {
        port: 5173,
        strictPort: true,
        open: true,
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false
          }
        },
        fs: {
          strict: true,
          allow: ['..']
        }
      }
    } : {}),
    build: {
      outDir: path.resolve(__dirname, "..", "dist"),
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: isDev,
      minify: isDev ? false : 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules')) {
              if (id.includes('react-router-dom') || id.includes('@remix-run')) {
                return 'router';
              }
              if (id.includes('@radix-ui')) {
                return 'ui';
              }
              if (id.includes('recharts') || id.includes('d3') || id.includes('victory')) {
                return 'charts';
              }
              return 'vendor';
            }
          }
        },
      },
    },
    define: {
      'process.env': {}
    },
    server: isDev ? {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      },
      hmr: process.env.REPL_ID
        ? {
            clientPort: 443,
          }
        : true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      }
    } : undefined,
  };
});