import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
  build: {
    rollupOptions: {
      output: {
        // Split framework/vendor code (changes rarely) from app code (changes every
        // deploy) so a deploy doesn't force every returning visitor to re-download
        // React/Radix/router again — those chunks stay cached across releases.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          // recharts (plus its own charting-specific dependency graph) was landing
          // inside whichever feature chunk first imported it — Rollup's automatic
          // splitting still isolates it into a shared chunk since many routes pull
          // it in, but that chunk's hash changes on almost every deploy along with
          // the app code it happens to get named after, forcing a ~375KB re-download
          // of a large, rarely-changing chart library that most portal dashboards
          // load on first visit. Same fix as vendor-react/vendor-radix: pin it to
          // its own stable chunk so it only invalidates when recharts itself bumps.
          if (/[\\/](recharts|recharts-scale|victory-vendor|react-smooth|d3-[a-z-]+)[\\/]/.test(id)) {
            return "vendor-recharts";
          }
        },
      },
    },
  },
});
