import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function assignIcons() {
    console.log('🎨 Asignando iconos automáticos...');
    
    try {
        // Bebidas -> GlassWater
        await db.update(menuItems).set({ icon: 'GlassWater' }).where(eq(menuItems.category, 'Bebidas'));
        
        // Barra de Café -> Coffee
        await db.update(menuItems).set({ icon: 'Coffee' }).where(eq(menuItems.category, 'Barra de Café'));
        
        // Sandwiches -> Sandwich (if exists, else Croissant works) - Let's use Croissant for now based on available imports or Pizza/Utensils. 
        // Available in MenuForm: Utensils, Coffee, Pizza, Cake, Croissant, Egg, Fish, Salad, Soup, IceCream, Cookie, Carrot, Apple, Banana, Cherry, Milk, Popcorn, Citrus, GlassWater
        await db.update(menuItems).set({ icon: 'Croissant' }).where(eq(menuItems.category, 'Sandwiches'));
        
        // Desayunos -> Utensils
        await db.update(menuItems).set({ icon: 'Utensils' }).where(eq(menuItems.category, 'Desayunos'));
        
        // Huevos -> Egg
        await db.update(menuItems).set({ icon: 'Egg' }).where(eq(menuItems.category, 'Huevos Al Gusto'));

        console.log('✅ Iconos asignados correctamente.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

assignIcons();
