
import { db } from '../src/db/index.js';
import { orders } from '../src/db/schema.js';
import { desc } from 'drizzle-orm';

async function run() {
    console.log('--- Testing Order ID Increment ---');

    // 1. Get current Max ID
    const initialResult = await db.select({ id: orders.id }).from(orders).orderBy(desc(orders.id)).limit(1);
    const initialId = initialResult.length > 0 ? initialResult[0].id : 0;
    console.log(`Initial Max ID: ${initialId}`);

    // 2. Create Dummy Order
    console.log('Creating dummy order...');
    const [newOrder] = await db.insert(orders).values({
        customerName: 'Test Bot',
        customerPhone: '9999999999',
        total: '1.00',
        status: 'Nuevo',
        deliveryTime: '12:00', // Mock time
        deliveryLocation: 'Test Lab',
        paymentMethod: 'Efectivo',
        notes: 'Test notification trigger'
    }).returning();
    
    console.log(`Created Order ID: ${newOrder.id}`);

    // 3. Verify Max ID again
    const finalResult = await db.select({ id: orders.id }).from(orders).orderBy(desc(orders.id)).limit(1);
    const finalId = finalResult.length > 0 ? finalResult[0].id : 0;
    console.log(`Final Max ID: ${finalId}`);

    if (finalId > initialId && finalId === newOrder.id) {
        console.log('✅ PASS: Order ID incremented correctly.');
    } else {
        console.error('❌ FAIL: Order ID did not update as expected.');
    }

    process.exit(0);
}

run();
