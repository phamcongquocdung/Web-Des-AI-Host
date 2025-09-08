// /api/setup.ts
import { sql } from "./db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await sql(`
    CREATE TABLE IF NOT EXISTS projects_json (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  res.json({ ok: true });
}
