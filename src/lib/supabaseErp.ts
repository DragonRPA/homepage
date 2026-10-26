import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("서버 환경변수 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.");
}

export const supabaseErp = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let pool: Pool | null = null;

export function getErpPool(): Pool {
  if (!pool) {
    const connStr = process.env.SUPABASE_DB_URL;
    if (!connStr) {
      throw new Error("서버 환경변수 (SUPABASE_DB_URL)가 설정되지 않았습니다.");
    }
    const cleanConnStr = connStr.replace('?sslmode=require', '').replace('&sslmode=require', '');
    pool = new Pool({
      connectionString: cleanConnStr,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}
