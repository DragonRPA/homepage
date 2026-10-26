import "server-only";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("서버 환경변수 (DATABASE_URL)가 설정되지 않았습니다.");
}

export const sql = neon(connectionString);
