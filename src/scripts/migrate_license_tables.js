const { neon } = require('@neondatabase/serverless');

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Glpfg5n7jVKE@ep-tiny-frost-azxnod0v-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionString);

async function migrate() {
  console.log('Migrating Database...');
  
  await sql.query(`
    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        plan_type VARCHAR(30) NOT NULL,
        customer_name VARCHAR(100),
        customer_email VARCHAR(100) NOT NULL,
        country_code VARCHAR(10) DEFAULT 'KR' NOT NULL,
        language_code VARCHAR(10) DEFAULT 'ko' NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'KRW' NOT NULL,
        gateway VARCHAR(30) NOT NULL,
        payment_key VARCHAR(100),
        status VARCHAR(20) DEFAULT 'PAID' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  console.log('✅ orders table created/verified');

  await sql.query(`
    CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(50) UNIQUE NOT NULL,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        product_id VARCHAR(50) NOT NULL,
        plan_type VARCHAR(30) NOT NULL,
        customer_name VARCHAR(100),
        customer_email VARCHAR(100) NOT NULL,
        country_code VARCHAR(10) DEFAULT 'KR' NOT NULL,
        language_code VARCHAR(10) DEFAULT 'ko' NOT NULL,
        max_activations INTEGER DEFAULT 1 NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE
    );
  `);
  console.log('✅ licenses table created/verified');

  await sql.query(`
    CREATE TABLE IF NOT EXISTS license_activations (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(50) REFERENCES licenses(license_key) ON DELETE CASCADE,
        machine_id VARCHAR(100) NOT NULL,
        machine_name VARCHAR(100),
        activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(license_key, machine_id)
    );
  `);
  console.log('✅ license_activations table created/verified');

  const tables = await sql.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('orders', 'licenses', 'license_activations');
  `);
  console.log('Verification tables in DB:', tables);
}

migrate()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
