import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = ReturnType<typeof create>;

function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }
  return drizzle(neon(connectionString), { schema });
}

let instance: Database | undefined;

/**
 * Connected on first use rather than at import, so `next build` (which loads
 * every route module) doesn't need database credentials.
 *
 * The neon-http driver has no interactive transactions — use `db.batch([...])`
 * when several statements must land together; Neon runs a batch atomically.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    instance ??= create();
    const value = Reflect.get(instance, property);
    // Bind to the real instance so `this` is never the proxy.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
