// Applies the idempotent SQL migrations in ./drizzle to the DATABASE_URL target.
// Usage: node scripts/apply-sql.mjs drizzle/0001_....sql drizzle/0002_....sql
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(url);
const files = process.argv.slice(2);
if (!files.length) {
  console.error("Pass one or more .sql files.");
  process.exit(1);
}

const stripComments = (text) => text.replace(/^\s*--.*$/gm, "");
const splitStatements = (text) =>
  stripComments(text)
    .split(";")
    .map(statement => statement.trim())
    .filter(Boolean);

for (const file of files) {
  const contents = readFileSync(resolve(process.cwd(), file), "utf8");
  const statements = splitStatements(contents);
  console.log(`Applying ${file} (${statements.length} statements)…`);
  for (const statement of statements) {
    await sql.query(statement);
  }
}
console.log("Done.");
