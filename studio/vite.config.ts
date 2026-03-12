import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: { outDir: "dist" },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3742",
        changeOrigin: true,
      },
    },
    // CORS headers for embed mode
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:4200',
        'http://localhost:8000',
        'http://localhost:54617',
        'http://168.231.69.92:54617',
      ],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
  },
  preview: {
    port: 4173,
    // CORS headers for preview server (production build preview)
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
});
