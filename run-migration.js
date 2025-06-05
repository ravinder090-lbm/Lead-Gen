
const { neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const { Pool } = require('pg');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const migrationModule = require(process.argv[2]);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running migration...');
    await migrationModule.up(client);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

runMigration();
