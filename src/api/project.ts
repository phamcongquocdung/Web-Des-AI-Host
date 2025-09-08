// /api/project.ts
import { sql } from "./db";

export default async function handler(req, res) {
  try {
    const id = (req.query.id || "").toString();
    if (!id) return res.status(400).json({ error: "missing id" });

    if (req.method === "GET") {
      const rows =
        await sql`SELECT id, name, data FROM projects_json WHERE id = ${id} LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: "not_found" });
      return res.json(rows[0]);
    }

    if (req.method === "PUT") {
      const body = JSON.parse(req.body || "{}");
      const { name, data } = body; // data chính là object project đầy đủ
      if (!data) return res.status(400).json({ error: "missing data" });

      await sql`
        UPDATE projects_json SET
          name = COALESCE(${name}, name),
          data = ${data as any}
        WHERE id = ${id}
      `;
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      await sql`DELETE FROM projects_json WHERE id = ${id}`;
      return res.json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
}
