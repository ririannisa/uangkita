import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url?.startsWith("postgres")) {
  console.error(
    "DATABASE_URL belum tersedia. Isi connection string Neon asli; placeholder [SENSITIVE] tidak dapat digunakan.",
  );
  process.exit(1);
}
try {
  const sql = neon(url);
  const directory = new URL("../db/", import.meta.url);
  const files = (await readdir(directory)).filter(file => /^\d+_.*\.sql$/.test(file)).sort();
  const statements = [];
  for (const file of files) {
    const source = await readFile(new URL(file, directory), "utf8");
    statements.push(...source.replace(/--[^\n]*/g, "").split(";").map(s => s.trim()).filter(Boolean));
  }
  await sql.transaction(statements.map((statement) => sql.query(statement)));
  console.log("Schema dompetku berhasil dimigrasikan (idempotent).");
} catch {
  console.error(
    "Migrasi gagal; periksa koneksi dan izin database. Tidak ada perubahan parsial.",
  );
  process.exit(1);
}
