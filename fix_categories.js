import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const corrections = {
    "BEBIDAS": "Bebidas",
    "BARRA DE CAFÉ": "Barra de Café",
    "SANDWICHES": "Sandwiches",
    "DESAYUNOS": "Desayunos",
    "HUEVOS": "Huevos Al Gusto"
};

async function fixCategories() {
    console.log('🔧 Corrigiendo categorías...');
    
    try {
        for (const [wrong, correct] of Object.entries(corrections)) {
            const result = await db.update(menuItems)
                .set({ category: correct })
                .where(eq(menuItems.category, wrong))
                .returning({ id: menuItems.id });
                
            if (result.length > 0) {
                console.log(`✅ ${wrong} -> ${correct} (${result.length} items actualizados)`);
            }
        }
    } catch (error) {
        console.error('❌ Error corrigiendo categorías:', error);
    } finally {
        process.exit(0);
    }
}

fixCategories();
