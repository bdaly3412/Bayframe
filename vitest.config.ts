import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", ...(process.env.BAYFRAME_LIVE_TESTS === "1" ? [] : ["src/auth/integration.test.ts"])],
  },
});
