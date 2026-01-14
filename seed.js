import { db } from './src/db/index.js';
import { tickets, ticketItems, recipes, recipeIngredients, menuItems } from './src/db/schema.js';

async function seedData() {
    console.log('🌱 Seeding Database with Demo Data...');

    try {
        // 1. Create Purchase Ticket (Walmart)
        console.log('🛒 Creating Ticket...');
        const [ticket] = await db.insert(tickets).values({
            ticketRef: 'TKT-DEMO-001',
            provider: 'Walmart Supercenter',
            total: '1500.00', // Estimate
            paymentMethod: 'Tarjeta',
            status: 'Desglosado', // We are inserting items directly
            purchaseDate: new Date()
        }).returning();

        // 2. Breakdown Items (Stocking Inventory)
        // We ensure names mimic what a user would type, e.g., "Huevo Rojo" or just "Huevo"
        console.log('📦 Stocking Inventory...');
        const items = [
            { product: 'Pan Chapata', quantity: '20', unit: 'Pzas', unitPrice: '8.50', total: '170.00' },
            { product: 'Atún en Agua', quantity: '5', unit: 'Kg', unitPrice: '120.00', total: '600.00' }, // Bulk tuna
            { product: 'Huevo Blanco', quantity: '60', unit: 'Pzas', unitPrice: '3.50', total: '210.00' },
            { product: 'Queso Manchego', quantity: '2', unit: 'Kg', unitPrice: '180.00', total: '360.00' },
            { product: 'Champiñones', quantity: '2', unit: 'Kg', unitPrice: '80.00', total: '160.00' },
            { product: 'Naranja', quantity: '10', unit: 'Kg', unitPrice: '15.00', total: '150.00' },
            { product: 'Coca Cola 355ml', quantity: '24', unit: 'Pzas', unitPrice: '12.00', total: '288.00', type: 'Terminado' }
        ];

        // Insert ticket items
        await db.insert(ticketItems).values(items.map(i => ({
            ticketId: ticket.id,
            product: i.product,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            total: i.total,
            type: i.type || 'Insumo'
        })));


        // 3. Create Recipes (Defining Portions)
        console.log('👨‍🍳 Creating Recipes...');

        // A. Chapata de Atún
        const [rChapata] = await db.insert(recipes).values({
            name: 'Chapata de Atún',
            price: '45.00', // Cost estimation (not sale price)
            category: 'Sandwiches',
            isPublic: true
        }).returning();

        await db.insert(recipeIngredients).values([
            { recipeId: rChapata.id, productName: 'Pan Chapata', quantity: '1', unit: 'Pzas' },
            { recipeId: rChapata.id, productName: 'Atún en Agua', quantity: '0.150', unit: 'Kg' }, // 150g
        ]);

        // B. Omelette de Queso con Champiñones
        const [rOmelette] = await db.insert(recipes).values({
            name: 'Omelette Especial',
            price: '35.00',
            category: 'Desayunos',
            isPublic: true
        }).returning();

        await db.insert(recipeIngredients).values([
            { recipeId: rOmelette.id, productName: 'Huevo Blanco', quantity: '3', unit: 'Pzas' },
            { recipeId: rOmelette.id, productName: 'Queso Manchego', quantity: '0.080', unit: 'Kg' }, // 80g
            { recipeId: rOmelette.id, productName: 'Champiñones', quantity: '0.050', unit: 'Kg' }, // 50g
        ]);

        // C. Jugo de Naranja
        const [rJugo] = await db.insert(recipes).values({
            name: 'Jugo de Naranja 500ml',
            price: '12.00',
            category: 'Bebidas',
            isPublic: true
        }).returning();

        await db.insert(recipeIngredients).values([
            { recipeId: rJugo.id, productName: 'Naranja', quantity: '0.600', unit: 'Kg' } // ~3-4 oranges
        ]);

        // D. Coca Cola (Linked directly to product)
        const [rCoca] = await db.insert(recipes).values({
            name: 'Coca Cola',
            price: '12.00',
            category: 'Bebidas',
            isPublic: true
        }).returning();

        await db.insert(recipeIngredients).values([
            { recipeId: rCoca.id, productName: 'Coca Cola 355ml', quantity: '1', unit: 'Pzas' }
        ]);


        // 4. Create Menu Items (Public Listing & Pricing)
        console.log('📜 Creating Menu...');

        await db.insert(menuItems).values([
            {
                name: 'Chapata de Atún',
                recipeId: rChapata.id,
                price: '95.00',
                description: 'Deliciosa chapata con atún fresco, vegetales y aderezo de la casa.',
                category: 'Sandwiches',
                icon: 'Fish'
            },
            {
                name: 'Omelette de Queso y Champiñones',
                recipeId: rOmelette.id,
                price: '105.00',
                description: '3 huevos, relleno de queso manchego derretido y champiñones salteados.',
                category: 'Desayunos',
                icon: 'Egg'
            },
            {
                name: 'Jugo de Naranja',
                recipeId: rJugo.id,
                price: '45.00',
                description: 'Recién exprimido, 100% natural.',
                category: 'Bebidas',
                icon: 'Citrus' // Maps to something or default
            },
            {
                name: 'Coca Cola',
                recipeId: rCoca.id,
                price: '35.00',
                description: 'Lata 355ml bien fría.',
                category: 'Bebidas',
                icon: 'Beer' // Closest can shape maybe? or just default
            }
        ]);

        console.log('✅ Base de datos sembrada con éxito!');

    } catch (e) {
        console.error('❌ Error seeding data:', e);
    }
    process.exit(0);
}

seedData();
