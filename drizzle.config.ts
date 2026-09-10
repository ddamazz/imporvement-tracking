import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local; drizzle-kit does not, so load it here too.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
