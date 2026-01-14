
import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq, like, or } from 'drizzle-orm';

async function splitItems() {
    console.log('Splitting Breakfast Items...');

    // 1. Handle Chilaquiles
    const chilaquiles = await db.select().from(menuItems).where(like(menuItems.name, 'Chilaquiles%'));
    if (chilaquiles.length > 0) {
        const base = chilaquiles[0];
        console.log('Found Chilaquiles:', base.name);

        // Update base to Sencillos
        await db.update(menuItems).set({
            name: 'Chilaquiles Sencillos',
            price: '69.00',
            variations: null // Remove variations
        }).where(eq(menuItems.id, base.id));
        console.log('Updated Chilaquiles Sencillos');

        // Create Con Pollo (Assuming Pollo for Chilaquiles per user hint)
        // Base 69 + 15 (Var price) = 84
        await db.insert(menuItems).values({
            name: 'Chilaquiles con Pollo',
            description: base.description,
            price: '84.00',
            category: 'Desayunos',
            icon: 'Utensils',
            isActive: true
        });
        console.log('Created Chilaquiles con Pollo');
    }

    // 2. Handle Molletes
    const molletes = await db.select().from(menuItems).where(like(menuItems.name, 'Molletes%'));
    if (molletes.length > 0) {
        const base = molletes[0];
        console.log('Found Molletes:', base.name);

        // Update base to Sencillos
        await db.update(menuItems).set({
            name: 'Molletes Sencillos',
            price: '69.00',
            variations: null // Remove variations
        }).where(eq(menuItems.id, base.id));
        console.log('Updated Molletes Sencillos');

        // Create Con Jamón
        // Base 69 + 15 = 84
        await db.insert(menuItems).values({
            name: 'Molletes con Jamón',
            description: base.description,
            price: '84.00',
            category: 'Desayunos',
            icon: 'Utensils',
            isActive: true
        });
        console.log('Created Molletes con Jamón');
    }

    console.log('Done.');
    process.exit(0);
}

splitItems().catch(e => {
    console.error(e);
    process.exit(1);
});
