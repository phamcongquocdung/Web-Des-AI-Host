// /api/projects.ts
import { sql } from "./db";
import { randomUUID } from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // trả về danh sách (id, name) để hiện trong project picker
      const rows =
        await sql`SELECT id, name, created_at FROM projects_json ORDER BY created_at DESC`;
      return res.json({ items: rows });
    }

    if (req.method === "POST") {
      const { name = "New Project", data = { id: "", name, phases: [] } } =
        JSON.parse(req.body || "{}");
      const id = randomUUID().slice(0, 8); // id ngắn gọn
      data.id = id;
      await sql`
        INSERT INTO projects_json (id, name, data)
        VALUES (${id}, ${name}, ${data as any})
      `;
      return res.status(201).json({ id });
    }

    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
}
