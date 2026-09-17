const { neon } = require("@neondatabase/serverless");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Glpfg5n7jVKE@ep-tiny-frost-azxnod0v-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionString);

async function sync(productId, version, downloadUrl) {
  const pId = productId || "MANUAL_STUDIO";
  const ver = version || "v1.9.2";
  const url =
    downloadUrl ||
    "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudio_latest.exe";

  console.log(`Updating ${pId} -> Version: ${ver}, URL: ${url}`);

  const res = await sql`
    UPDATE products SET
      version = ${ver},
      download_url = ${url},
      updated_at = NOW()
    WHERE id = ${pId}
    RETURNING id, name, version, download_url;
  `;

  console.log("DB Update Result:", res);
}

const args = process.argv.slice(2);
sync(args[0], args[1], args[2]).catch((err) => {
  console.error("DB Sync failed:", err);
  process.exit(1);
});
