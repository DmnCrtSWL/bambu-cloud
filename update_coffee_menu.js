

import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq, like } from 'drizzle-orm';

async function updateMenu() {
    console.log('Starting menu updates...');

    // 1. Update Capuccino (ID 15) & Moka (ID 17)
    // Variations: Tamaño Regular ($49 base), Grande ($59 -> +10)
    // Note: Schema does NOT have isVariable, existence of variations JSON implies it.
    const coffeeVariations = [
        {
            name: "Tamaño",
            options: [
                { name: "Regular", price: 0 },
                { name: "Grande", price: 10 }
            ]
        }
    ];

    await db.update(menuItems)
        .set({ 
            price: '49.00',
            variations: coffeeVariations 
        })
        .where(eq(menuItems.name, 'Capuccino'));
    console.log('Updated Capuccino');

    await db.update(menuItems)
        .set({ 
            price: '49.00', 
            variations: coffeeVariations 
        })
        .where(eq(menuItems.name, 'Moka'));
    console.log('Updated Moka');

    // 2. Update 'Promoción Desayuno' -> 'Promo Café + Croissant'
    // Move to 'Desayunos' (String category)
    // Price 99
    // Variations: Croissant type
    const breakfastVariations = [
        {
            name: "Tipo de Croissant",
            options: [
                { name: "Jamón y Queso", price: 0 },
                { name: "Queso con Zarzamora", price: 0 }
            ]
        }
    ];

    // Find the item first
    const promo = await db.select().from(menuItems).where(like(menuItems.name, '%Promoción Desayuno%'));
    if (promo.length > 0) {
        await db.update(menuItems)
            .set({
                name: 'Promo Café + Croissant',
                category: 'Desayunos', // String
                price: '99.00',
                variations: breakfastVariations
            })
            .where(eq(menuItems.id, promo[0].id));
        console.log('Updated Promo Café + Croissant');
    } else {
        console.log('Promoción Desayuno not found, creating new...');
        // Create it if not found just in case
        await db.insert(menuItems).values({
            name: 'Promo Café + Croissant',
            description: 'Café Americano + Croissant a elección.',
            price: '99.00',
            category: 'Desayunos',
            variations: breakfastVariations,
            isActive: true
        });
        console.log('Created Promo Café + Croissant');
    }

    // 3. Delete 'Café de Olla'
    await db.delete(menuItems).where(eq(menuItems.name, 'Café de Olla'));
    console.log('Deleted Café de Olla');

    console.log('Done!');
    process.exit(0);
}

updateMenu().catch(e => {
    console.error(e);
    process.exit(1);
});

