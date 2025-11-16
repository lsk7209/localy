import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'localy-db',
  },
} as any);

