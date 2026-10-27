import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/support_agent';

async function runMigrations() {
  console.log(`Connecting to database: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Create migrations tracker table
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    const migrationsDir = path.resolve(__dirname, '../src/infrastructure/database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`Migrations directory not found at ${migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const existing = await sql`
        SELECT version FROM schema_migrations WHERE version = ${file}
      `;

      if (existing.length > 0) {
        console.log(`  [SKIP] ${file} already applied`);
        continue;
      }

      console.log(`  [APPLY] Executing ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      await sql.begin(async (trx) => {
        await trx.unsafe(sqlContent);
        await trx`INSERT INTO schema_migrations (version) VALUES (${file})`;
      });

      console.log(`  [OK] ${file} applied successfully`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

runMigrations().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
