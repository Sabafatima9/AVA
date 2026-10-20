import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND = process.env.SABA_BACKEND_URL ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/v1": { target: BACKEND, changeOrigin: true },
      "/health": { target: BACKEND, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/v1": { target: BACKEND, changeOrigin: true },
      "/health": { target: BACKEND, changeOrigin: true },
    },
  },
});
