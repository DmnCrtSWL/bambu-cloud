import { db } from '../src/db/index.js';
import { tickets, ticketItems } from '../src/db/schema.js';

async function seed() {
    console.log('Seeding mock purchase data for ingredients...');

    try {
        // 1. Create a ticket for Atun and Bread
        const [ticket1] = await db.insert(tickets).values({
            ticketRef: 'SEEDED-001',
            provider: 'Mock Provider',
            total: '1500.00',
            paymentMethod: 'Efectivo',
            status: 'Desglosado'
        }).returning();

        await db.insert(ticketItems).values([
            {
                ticketId: ticket1.id,
                product: 'Atún en lata',
                quantity: '5000', // 5kg or 5000 gr 
                unit: 'Gramos',
                unitPrice: '0.2',
                total: '1000'
            },
            {
                ticketId: ticket1.id,
                product: 'Pan Oroweat',
                quantity: '10',
                unit: 'Paquetes',
                unitPrice: '50',
                total: '500'
            }
        ]);

        // 2. Create another ticket for Vegetables
        const [ticket2] = await db.insert(tickets).values({
            ticketRef: 'SEEDED-002',
            provider: 'Vegetable Palace',
            total: '800.00',
            paymentMethod: 'Transferencia',
            status: 'Desglosado'
        }).returning();

        await db.insert(ticketItems).values([
            {
                ticketId: ticket2.id,
                product: 'Jitomate',
                quantity: '10000', // 10kg or 10000 gr
                unit: 'Gramos',
                unitPrice: '0.05',
                total: '500'
            },
            {
                ticketId: ticket2.id,
                product: 'Cebolla',
                quantity: '5000',
                unit: 'Gramos',
                unitPrice: '0.06',
                total: '300'
            }
        ]);

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seed();
