import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    define: {
      global: "globalThis",
      "process.env.VITE_CONTRACT_ADDRESS": JSON.stringify(env.VITE_CONTRACT_ADDRESS),
    },
  };
});