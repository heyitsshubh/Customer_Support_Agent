/**
 * Build-time script: generates openapi.json from the live Fastify server.
 *
 * Usage:
 *   npx tsx scripts/generate-openapi.ts
 *
 * Output:
 *   openapi.json  (in the project root — suitable for Redoc, Postman import, etc.)
 *
 * The script spins up the Fastify server in-process (no listen()),
 * calls app.swagger() to get the spec, writes it to disk, then exits.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from '../src/server.js';

async function generateOpenApiSpec(): Promise<void> {
  console.log('⚙️  Generating OpenAPI spec...');

  const app = await createServer();

  // Force route registration so swagger captures all schemas
  await app.ready();

  const spec = app.swagger();
  const outputPath = resolve(process.cwd(), 'openapi.json');

  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');

  console.log(`✅ OpenAPI spec written to: ${outputPath}`);
  console.log(`   - Paths: ${Object.keys((spec as { paths?: object }).paths ?? {}).length}`);
  console.log(`   - Tags:  ${((spec as { tags?: { name: string }[] }).tags ?? []).map((t) => t.name).join(', ')}`);

  await app.close();
}

generateOpenApiSpec().catch((err) => {
  console.error('❌ Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
