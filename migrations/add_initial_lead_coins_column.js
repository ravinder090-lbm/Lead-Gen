
async function up(client) {
  await client.query(`
    ALTER TABLE subscriptions 
    ADD COLUMN IF NOT EXISTS initial_lead_coins INTEGER NOT NULL DEFAULT 0;
  `);
}

async function down(client) {
  await client.query(`
    ALTER TABLE subscriptions 
    DROP COLUMN IF EXISTS initial_lead_coins;
  `);
}

module.exports = { up, down };
