import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Replit plugins only in development on Replit; skip on Vercel/Render to avoid build issues
let replitPlugins: any[] = [];
let runtimeOverlay: any = null;
if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
  try {
    runtimeOverlay = (await import("@replit/vite-plugin-runtime-error-modal")).default;
    replitPlugins = [
      (await import("@replit/vite-plugin-cartographer")).cartographer(),
      (await import("@replit/vite-plugin-dev-banner")).devBanner(),
    ];
  } catch {
    // not on Replit or plugins unavailable
  }
}

export default defineConfig({
  plugins: [
    react(),
    ...(runtimeOverlay ? [runtimeOverlay] : []),
    ...replitPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      onwarn(_, warn) {
        // Downgrade rollup warnings so they don't fail the build
        if (warn.code === "UNUSED_EXTERNAL_IMPORT" || warn.code === "CIRCULAR_DEPENDENCY") return;
        console.warn(warn.message);
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
