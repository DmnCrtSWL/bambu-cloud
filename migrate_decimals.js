
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('Migrating ticket_items table to support 6 decimal places...');
    try {
        await db.execute(sql`ALTER TABLE ticket_items ALTER COLUMN quantity TYPE numeric(15, 6)`);
        await db.execute(sql`ALTER TABLE ticket_items ALTER COLUMN unit_price TYPE numeric(15, 6)`);
        await db.execute(sql`ALTER TABLE ticket_items ALTER COLUMN discount TYPE numeric(15, 6)`);
        await db.execute(sql`ALTER TABLE ticket_items ALTER COLUMN total TYPE numeric(15, 6)`);
        console.log('Migration successful!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
