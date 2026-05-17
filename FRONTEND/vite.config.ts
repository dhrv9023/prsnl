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
          changeOrigin: true,
          // Rewrite cookie domain so the browser on :8080 accepts cookies set by :8000.
          // Without this, Set-Cookie headers from the backend are silently dropped.
          cookieDomainRewrite: {
            "*": "",   // strip domain → browser uses the current page's domain (localhost)
          },
          // Also strip the Secure flag locally so cookies work over plain HTTP
          cookiePathRewrite: {
            "*": "/",
          },
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
