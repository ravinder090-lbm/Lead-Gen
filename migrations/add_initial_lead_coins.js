// This migration adds the initial_lead_coins column to the user_subscriptions table
import { pool } from "../server/db.js";

async function runMigration() {
  try {
    console.log(
      "Running migration: Adding initial_lead_coins column to user_subscriptions table...",
    );

    const client = await pool.connect();

    try {
      // Check if the column already exists
      const columnCheckResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' AND column_name = 'initial_lead_coins'
      `);

      // Only add the column if it doesn't exist
      if (columnCheckResult.rows.length === 0) {
        // Add the column
        await client.query(`
          ALTER TABLE user_subscriptions 
          ADD COLUMN initial_lead_coins INTEGER NOT NULL DEFAULT 0
        `);
        console.log(
          "Migration complete: initial_lead_coins column added successfully.",
        );
      } else {
        console.log(
          "Migration skipped: initial_lead_coins column already exists.",
        );
      }
    } finally {
      client.release();
    }

    await pool.end();

    console.log("Migration process completed.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
