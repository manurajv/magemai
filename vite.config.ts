import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  assertProductionBuildHasNoEmulators,
  missingProductionFirebaseKeys,
  productionFirebaseConfigError,
} from "./src/lib/firebase/env.ts";

const root = path.dirname(fileURLToPath(import.meta.url));

function envFileHasBom(name: string): boolean {
  try {
    const bytes = readFileSync(path.join(root, name));
    return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, root, "VITE_");
  const env = { ...fileEnv };
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("VITE_") && value !== undefined) env[key] = value;
  }
  const useEmulators = env.VITE_USE_FIREBASE_EMULATORS;
  assertProductionBuildHasNoEmulators(mode, useEmulators);
  const missing = missingProductionFirebaseKeys(mode, env);
  const bom =
    envFileHasBom(".env") ||
    envFileHasBom(".env.local") ||
    envFileHasBom(".env.production") ||
    envFileHasBom(".env.production.local") ||
    Object.keys(env).some((key) => key.charCodeAt(0) === 0xfeff);
  const configError = productionFirebaseConfigError(missing, bom);
  if (configError) throw new Error(configError);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
        "@shared": path.resolve(root, "shared"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  };
});
