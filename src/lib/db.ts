import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Glpfg5n7jVKE@ep-tiny-frost-azxnod0v-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export const sql = neon(connectionString);
