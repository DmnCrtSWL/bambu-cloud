import { db } from './src/db/index.js';
import { cxc } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function checkCXC() {
    try {
        console.log('Checking CXC table...');
        const allCXC = await db.select().from(cxc);
        console.log('Total CXC records:', allCXC.length);
        allCXC.forEach(r => {
            console.log(`ID: ${r.id}, Customer: ${r.customerName}, Amount: ${r.amount}, Status: '${r.status}'`);
        });

        const pending = await db.select().from(cxc).where(eq(cxc.status, 'Pending'));
        console.log('Pending records found via query:', pending.length);

        const total = pending.reduce((acc, c) => acc + Number(c.amount), 0);
        console.log('Calculated Total:', total);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkCXC();
