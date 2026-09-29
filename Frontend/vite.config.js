import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the browser talks to Vite (5173) and Vite forwards /api/* to the Express
    // server, so there are no CORS problems. Change the port here if your backend uses another one.
    proxy: {
      "/api": "http://localhost:5000",
      "/socket.io": { target: "http://localhost:5000", ws: true },
    },
  },
});
