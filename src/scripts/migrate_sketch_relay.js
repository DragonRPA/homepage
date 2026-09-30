const { neon } = require('@neondatabase/serverless');

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Glpfg5n7jVKE@ep-tiny-frost-azxnod0v-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionString);

async function migrate() {
  console.log('Migrating sketch_relay table in Neon DB...');

  await sql.query(`
    CREATE TABLE IF NOT EXISTS sketch_relay (
      pin VARCHAR(10) PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
  console.log('✅ sketch_relay table created/verified');

  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_sketch_relay_expires ON sketch_relay(expires_at);
  `);
  console.log('✅ idx_sketch_relay_expires index created/verified');

  const tables = await sql.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sketch_relay';
  `);
  console.log('Verification in DB:', tables);
}

migrate()
  .then(() => {
    console.log('🎉 sketch_relay migration completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
