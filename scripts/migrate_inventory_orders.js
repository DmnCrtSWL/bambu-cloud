
import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
    console.log('Migrating inventory_usage table...');
    try {
        await db.execute(sql`ALTER TABLE inventory_usage ADD COLUMN IF NOT EXISTS order_id integer REFERENCES orders(id);`);
        await db.execute(sql`ALTER TABLE inventory_usage ALTER COLUMN sale_id DROP NOT NULL;`);
        console.log('✅ Migration successful');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

run();
