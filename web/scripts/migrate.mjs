// Applies one SQL file to the Supabase database in a transaction.
// Usage (from web/): node --env-file=../.env.local scripts/migrate.mjs supabase/migrations/0001_waitlist.sql
import fs from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) throw new Error("Pass the SQL file to apply");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await client.connect();
try {
  await client.query("begin");
  await client.query(fs.readFileSync(file, "utf8"));
  await client.query("commit");
  console.log(`Applied ${file}`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
