// /api/db.ts
import { neon } from "@neondatabase/serverless";

// NHỚ cấu hình biến môi trường DATABASE_URL ở Vercel
export const sql = neon(process.env.DATABASE_URL as string);
