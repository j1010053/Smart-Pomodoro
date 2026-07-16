import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Smart Pomodoro",
        short_name: "Focus",
        description: "幫助你低摩擦開始工作的個人工作助理",
        theme_color: "#f6f2ea",
        background_color: "#f6f2ea",
        display: "standalone",
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
  },
});
