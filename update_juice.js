import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function fixJuice() {
    console.log('🍊 Ajustando descripción de Jugo de Naranja...');
    try {
        await db.update(menuItems)
            .set({ description: "Una dosis de frescura cítrica intensa para despertar tus sentidos." })
            .where(eq(menuItems.name, "Jugo de Naranja"));
        console.log('✅ Descripción actualizada.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

fixJuice();
