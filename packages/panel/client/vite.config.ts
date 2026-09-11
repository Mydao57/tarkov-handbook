import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PANEL_ORIGIN = process.env.PANEL_DEV_ORIGIN ?? "http://localhost:4786";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: PANEL_ORIGIN, changeOrigin: true },
      "/auth": { target: PANEL_ORIGIN, changeOrigin: true },
    },
  },
});
