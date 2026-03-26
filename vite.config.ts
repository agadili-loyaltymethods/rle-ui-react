import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { execSync } from "node:child_process";

const gitBranch = (() => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
})();

export default defineConfig({
  define: {
    __GIT_BRANCH__: JSON.stringify(gitBranch),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    // proxy: {
    //   "/api": {
    //     target: "http://localhost:3000",
    //     changeOrigin: true,
    //   },
    // },

    proxy: {
      '/api': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/login': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
        // Only proxy POST/PUT (API calls). GET navigations serve the React SPA.
        bypass: (req) => {
          if (req.method === 'GET') return '/index.html';
          return null;
        },
      },
      '/power-bi': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/streaks-api': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/get-mode': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/get-member-alert': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/refresh-token': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/serverinfo': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/app': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
      '/member-merge': {
        target: 'https://rcx-ui.qa.rcx-dev7.lmvi.net',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router"],
          query: ["@tanstack/react-query", "@tanstack/react-table"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover"],
        },
      },
    },
  },
});
