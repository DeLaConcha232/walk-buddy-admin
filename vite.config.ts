import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimizaciones para producción
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Elimina console.log en producción
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks para mejor caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          'supabase': ['@supabase/supabase-js'],
          'map': ['leaflet'],
        },
      },
    },
    // Optimizar tamaño de chunks
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Desactivar sourcemaps en producción para reducir tamaño
  },
  esbuild: {
    // Eliminar console.log y debugger en desarrollo también si se desea
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
