
import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq, like, and, isNull } from 'drizzle-orm';

async function checkAndRefactor() {
    console.log('🔍 Checking DB State...');

    try {
        // Check Molletes Sencillos
        const molletesSencillos = await db.select().from(menuItems).where(eq(menuItems.name, 'Molletes Sencillos'));
        console.log('Molletes Sencillos:', molletesSencillos);

        // Check Molletes (New Name)
        const molletes = await db.select().from(menuItems).where(eq(menuItems.name, 'Molletes'));
        console.log('Molletes (Refactored):', molletes);

        // Check Frappe Pan de Muerto
        const frappe = await db.select().from(menuItems).where(eq(menuItems.name, 'Frappé Pan de Muerto'));
        console.log('Frappe Pan de Muerto:', frappe);
        
        // If Refactor didn't happen, try again?
        if (molletesSencillos.length > 0 && !molletesSencillos[0].deletedAt) {
             console.log('⚠️ Refactor apparently failed earlier. Trying again with explicit logging.');
             
             // Try Update again
             const res = await db.update(menuItems)
                .set({
                    name: 'Molletes',
                    variations: [{
                        name: 'Estilo',
                        options: [
                            { name: 'Sencillos', price: 0 },
                            { name: 'Con Jamón', price: 14 }
                        ]
                    }],
                    updatedAt: new Date()
                })
                .where(eq(menuItems.name, 'Molletes Sencillos'))
                .returning();
             console.log('Update Result:', res);
        }
        
         if (frappe.length > 0 && !frappe[0].deletedAt) {
             console.log('Trying to delete Frappe Pan de Muerto again...');
             await db.update(menuItems).set({ deletedAt: new Date() }).where(eq(menuItems.id, frappe[0].id));
         }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

checkAndRefactor();
