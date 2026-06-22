import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process"],
      globals: { Buffer: true, process: true },
    }),
  ],
  optimizeDeps: {
    exclude: ["@xmtp/browser-sdk"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});