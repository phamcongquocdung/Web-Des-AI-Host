// src/lib/jsonStore.ts
import { neon, neonConfig } from "@neondatabase/serverless";
neonConfig.fetchConnectionCache = true;

// Codesandbox/CRA: dùng REACT_APP_DATABASE_URL
const DB_URL = (process.env as any).REACT_APP_DATABASE_URL as string;
if (!DB_URL) {
  throw new Error(
    "Missing REACT_APP_DATABASE_URL. Add it to your .env or Codesandbox Secrets."
  );
}

export const sql = neon(DB_URL);

/* ================= Types ================= */
export type DbRow = {
  id: string;
  owner_id: string;
  name: string;
  data: any; // lưu full project JSON
  created_at: string; // hoặc Date
};

type ListRow = Pick<DbRow, "id" | "name" | "created_at">;

/* ================ Helpers ================ */
// Sinh ID an toàn cho TEXT PRIMARY KEY (vì DB không có DEFAULT)
function genId(): string {
  // Ưu tiên crypto.randomUUID (trả về chuỗi dài -> ok vì TEXT)
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  // Fallback
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ================== API ================== */

// Tạo bảng nếu chưa có
export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS projects_json (
      id         TEXT PRIMARY KEY,
      owner_id   TEXT NOT NULL,
      name       TEXT NOT NULL,
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // đảm bảo owner_id tồn tại (nếu hệ thống bạn trước đây chưa có cột này)
  await sql`
    ALTER TABLE projects_json
    ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT ''
  `;
}

// Danh sách project của 1 user
export async function listProjects(ownerId: string) {
  const rows = await sql<ListRow[]>`
    SELECT id, name, created_at
    FROM projects_json
    WHERE owner_id = ${ownerId}
    ORDER BY created_at DESC
  `;
  return rows;
}

// Lấy chi tiết 1 project (ràng buộc owner)
export async function getProject(id: string, ownerId: string) {
  const rows = await sql<DbRow[]>`
    SELECT id, owner_id, name, data, created_at
    FROM projects_json
    WHERE id = ${id} AND owner_id = ${ownerId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Tạo project MỚI (chèn kèm id để tránh lỗi PRIMARY KEY TEXT không có DEFAULT)
 * @returns id vừa tạo
 */
export async function createProject(
  name: string,
  data: any,
  ownerId: string,
  id?: string
) {
  const newId = id ?? genId();
  await sql`
    INSERT INTO projects_json (id, owner_id, name, data)
    VALUES (${newId}, ${ownerId}, ${name}, ${data})
  `;
  return newId;
}

// Lưu (update) project hiện có
export async function saveProject(
  id: string,
  name: string,
  data: any,
  ownerId: string
) {
  await sql`
    UPDATE projects_json
    SET name = ${name}, data = ${data}
    WHERE id = ${id} AND owner_id = ${ownerId}
  `;
}

// Xoá project
export async function deleteProject(id: string, ownerId: string) {
  await sql`
    DELETE FROM projects_json
    WHERE id = ${id} AND owner_id = ${ownerId}
  `;
}

export async function ping(): Promise<boolean> {
  try {
    // query nhẹ để kiểm tra kết nối (Neon sẽ trả về mảng rows)
    const rows: any[] = await sql`SELECT 1 AS ok`;
    return !!rows?.[0]?.ok;
  } catch (e) {
    console.error('[jsonStore.ping] failed:', e);
    return false;
  }
}
