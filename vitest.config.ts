import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig((env) => {
  const base = typeof viteConfig === "function" ? viteConfig(env) : viteConfig;
  return mergeConfig(
    base,
    defineConfig({
      resolve: {
        alias: {
          "@": path.resolve(root, "src"),
          "@shared": path.resolve(root, "shared"),
        },
      },
      define: {
        "import.meta.env.VITE_USE_FIREBASE_EMULATORS": JSON.stringify("true"),
        "import.meta.env.VITE_FIREBASE_PROJECT_ID": JSON.stringify(
          process.env.VITE_FIREBASE_PROJECT_ID === "magemai" ? "magemai" : "demo-magemai",
        ),
        "import.meta.env.VITE_ALLOW_LIVE_FIREBASE": JSON.stringify(
          process.env.VITE_ALLOW_LIVE_FIREBASE === "true" ? "true" : "false",
        ),
        "import.meta.env.VITE_FIREBASE_EMULATOR_HOST": JSON.stringify("127.0.0.1"),
      },
      test: {
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
        exclude: ["tests/e2e/**", "tests/rules/**"],
      },
    }),
  );
});
