import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_WSL_IP ? `http://${env.VITE_WSL_IP}:8000` : "http://127.0.0.1:8000";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: backendTarget,
          // Do NOT use changeOrigin:true — it rewrites the Origin header from
          // "localhost:8080" to the backend host, which then fails CSRF origin checks.
        },
      },
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Raise the warning threshold slightly — jsPDF alone is ~390KB gzipped
      // and is only loaded on the Cover Letter page (lazy chunk).
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // React core — loaded on every page
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            // Radix UI + Shadcn primitives — shared across all pages
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-label",
              "@radix-ui/react-separator",
              "@radix-ui/react-slot",
              "@radix-ui/react-toast",
              "@radix-ui/react-toggle",
              "@radix-ui/react-toggle-group",
              "@radix-ui/react-tooltip",
            ],
            // Animation + icons — shared across all pages
            "vendor-ui": ["framer-motion", "lucide-react"],
            // Supabase client — only needed for OAuth initiation
            "vendor-supabase": ["@supabase/supabase-js"],
            // React Query — data fetching layer
            "vendor-query": ["@tanstack/react-query"],
            // PDF generation — only loaded on Cover Letter page (already lazy)
            "vendor-pdf": ["jspdf"],
          },
        },
      },
    },
  };
});
