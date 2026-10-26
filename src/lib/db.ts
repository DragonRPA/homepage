import "server-only";
import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@ep-dummy.aws.neon.tech/neondb";

export const sql = neon(connectionString);
