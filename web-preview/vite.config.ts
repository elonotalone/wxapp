import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@wxapp": path.resolve(__dirname, "../src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3006,
    strictPort: true,
    // p3006.oceandino.com is reverse-proxied by Caddy to 127.0.0.1:3006,
    // so the dev server must allow that Host header.
    allowedHosts: [
      "p3006.oceandino.com",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      // Allow HMR to work behind https reverse proxy.
      clientPort: 443,
      host: "p3006.oceandino.com",
      protocol: "wss",
    },
    // Watch ../src so wxml/wxss/js edits trigger reload.
    watch: {
      ignored: ["!**/../src/**"],
    },
    fs: {
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname, "../src")],
    },
  },
});
