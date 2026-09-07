import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "app-icon.svg"],
      manifest: {
        name: "TaxiRank",
        short_name: "TaxiRank",
        description: "Book and manage taxi-rank trips with ease.",
        theme_color: "#2f9187",
        background_color: "#eaf0f2",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [{ src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: { navigateFallback: "/index.html", globPatterns: ["**/*.{js,css,html,ico,svg,png}"] },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
