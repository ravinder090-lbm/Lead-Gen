// This migration adds the last_login_at column to the users table

// Import with ES modules since our server uses ESM imports
import { pool } from "../server/db.js";

async function runMigration() {
  try {
    console.log(
      "Running migration: Adding last_login_at column to users table...",
    );

    // Connect to the database
    const client = await pool.connect();

    try {
      // Check if the column already exists
      const columnCheckResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login_at'
      `);

      // Only add the column if it doesn't exist
      if (columnCheckResult.rows.length === 0) {
        // Add the column
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN last_login_at TIMESTAMP
        `);
        console.log(
          "Migration complete: last_login_at column added successfully.",
        );
      } else {
        console.log("Migration skipped: last_login_at column already exists.");
      }
    } finally {
      // Release the client back to the pool
      client.release();
    }

    // Close the pool
    await pool.end();

    console.log("Migration process completed.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
