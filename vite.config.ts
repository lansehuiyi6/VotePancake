import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async () => {
  // Only import Replit plugins in development
  const replitPlugins = [];
  
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID) {
    try {
      // Handle both ESM and CommonJS modules
      const loadPlugin = async (name: string) => {
        try {
          const mod = await import(name);
          return mod.default || mod;
        } catch (e) {
          console.warn(`Failed to load ${name}:`, e);
          return null;
        }
      };

      const [cartographer, devBanner] = await Promise.all([
        loadPlugin('@replit/vite-plugin-cartographer'),
        loadPlugin('@replit/vite-plugin-dev-banner')
      ]);

      if (cartographer) replitPlugins.push(cartographer());
      if (devBanner) replitPlugins.push(devBanner());
    } catch (error) {
      console.warn('Failed to load Replit plugins:', error);
    }
  }

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...replitPlugins,
    ],
    base: "/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      target: 'es2020',
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libraries into separate chunks
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // Split UI components
            ui: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
            ],
            // Split charting libraries if used
            charts: ['recharts', 'd3', 'victory'],
          },
        },
      },
    },
    define: {
      'process.env': {}
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      hmr: process.env.REPL_ID
        ? {
            clientPort: 443,
          }
        : undefined,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});