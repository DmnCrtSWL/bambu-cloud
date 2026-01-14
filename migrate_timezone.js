
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('Migrating sales.createdAt to TIMESTAMPTZ...');
    try {
        // We alter the column to type 'timestamptz'
        // This preserves the point in time but adds timezone awareness to the column type definition
        // PostgreSQL effectively stores UTC but knows it's an absolute time.
        await db.execute(sql`ALTER TABLE sales ALTER COLUMN created_at TYPE timestamptz`);
        
        // Also do it for tickets purchaseDate/createdAt as they had similar issues
        await db.execute(sql`ALTER TABLE tickets ALTER COLUMN created_at TYPE timestamptz`);
        await db.execute(sql`ALTER TABLE tickets ALTER COLUMN purchase_date TYPE timestamptz`);

        console.log('Migration successful!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
