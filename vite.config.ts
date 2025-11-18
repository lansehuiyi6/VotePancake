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
      const { default: cartographer } = await import("@replit/vite-plugin-cartographer");
      const { default: devBanner } = await import("@replit/vite-plugin-dev-banner");
      replitPlugins.push(cartographer(), devBanner());
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