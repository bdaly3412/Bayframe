import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./scripts/db/schema.ts", "./scripts/db/workflow-schema.ts"],
  out: "./drizzle",
  schemaFilter: ["app"],
});
