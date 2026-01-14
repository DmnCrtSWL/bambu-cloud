import { db } from './src/db/index.js';
import { sales } from './src/db/schema.js';
import { desc } from 'drizzle-orm';

async function checkData() {
    try {
        const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(10);
        console.log('Total sales retrieved:', allSales.length);
        allSales.forEach(s => {
            console.log(`ID: ${s.id}, Total: ${s.total}, CreatedAt: ${s.createdAt} (${typeof s.createdAt})`);
        });

        // Check if there is ANY data in the last 7 days
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        console.log('Checking for data since:', lastWeek.toISOString());
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkData();
