import { defineConfig } from 'vite'; // <--- BARIS INI YANG SEBELUMNYA HILANG
import path from "path";
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Saya tambahkan __dirname agar path lebih aman
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'sw-assets.json', dest: '' }
      ]
    })
  ]
});