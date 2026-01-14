
import { db } from './src/db/index.js';
import { tickets } from './src/db/schema.js';
import { desc } from 'drizzle-orm';

async function verify() {
    const dbRes = await db.select().from(tickets).orderBy(desc(tickets.id)).limit(5);
    if (dbRes.length > 0) {
        dbRes.forEach(t => {
             console.log(`ID: ${t.id} | Date: ${new Date(t.purchaseDate).toISOString()} | DeletedAt: ${t.deletedAt}`);
        });
    }
    process.exit(0);
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
