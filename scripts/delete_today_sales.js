import { db } from '../src/db/index.js';
import { sales } from '../src/db/schema.js';
import { and, between, isNull } from 'drizzle-orm';

const deleteTodaySales = async () => {
    // CDMX Range logic
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const start = new Date(todayStr + 'T00:00:00');
    const end = new Date(todayStr + 'T23:59:59');

    console.log(`Soft deleting sales between ${start.toISOString()} and ${end.toISOString()} (CDMX)`);

    try {
        const result = await db.update(sales)
            .set({ deletedAt: new Date() })
            .where(and(
                isNull(sales.deletedAt),
                between(sales.createdAt, start, end)
            ))
            .returning({ id: sales.id });

        console.log(`Successfully deleted ${result.length} sales.`);
        process.exit(0);
    } catch (error) {
        console.error('Error deleting sales:', error);
        process.exit(1);
    }
};

deleteTodaySales();
