import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Creating inventory_usage table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS inventory_usage (
                id SERIAL PRIMARY KEY,
                sale_id INTEGER REFERENCES sales(id),
                product_name TEXT NOT NULL,
                quantity NUMERIC(10, 2) NOT NULL,
                unit TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Table created successfully.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

migrate();
