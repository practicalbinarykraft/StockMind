import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@/app": path.resolve(import.meta.dirname, "client", "src", "app"),
      "@/pages": path.resolve(import.meta.dirname, "client", "src", "pages"),
      "@/layouts": path.resolve(import.meta.dirname, "client", "src", "layouts"),
      "@/features": path.resolve(import.meta.dirname, "client", "src", "features"),
      "@/widgets": path.resolve(import.meta.dirname, "client", "src", "widgets"),
      "@/shared": path.resolve(import.meta.dirname, "client", "src", "shared"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize bundle size
    rollupOptions: {
      output: {
        // Code splitting strategy
        manualChunks: {
          // Vendor chunk - React ecosystem
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],

          // UI library chunk - Radix components
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-slot'
          ],

          // Data fetching chunk
          'vendor-query': ['@tanstack/react-query'],

          // Form handling chunk
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Routing chunk
          'vendor-router': ['wouter'],

          // Utils chunk
          'vendor-utils': ['clsx', 'tailwind-merge', 'date-fns']
        }
      }
    },
    // Increase chunk size warning limit (we use code splitting now)
    chunkSizeWarningLimit: 600
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
