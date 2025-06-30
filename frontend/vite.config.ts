import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // proxy all calls starting with /auth to the backend
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // proxy all calls starting with /typing to the backend
      "/typing": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
