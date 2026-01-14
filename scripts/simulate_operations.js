
import { db } from '../src/db/index.js';
import { 
    menuItems, recipes, recipeIngredients, 
    tickets, ticketItems 
} from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// --- CONFIGURATION ---
const TARGET_UNITS = 10; // We want enough stock for 10 of each
const PROVIDER = 'City Market Polanco';

// --- SMART CHEF KNOWLEDGE BASE ---
// Returns: { ingredients: [ { name, qty, unit, price } ], prepTime: 'X min' }
function hallucinateRecipe(itemName, category) {
    const name = itemName.toLowerCase();
    const cat = category?.toLowerCase() || '';

    // 1. COFFEE & DRINKS
    if (cat.includes('café') || cat.includes('cafe')) {
        if (name.includes('leche') || name.includes('latte') || name.includes('cappuccino')) {
            return [
                { name: 'Café Grano', qty: '18', unit: 'gr', price: '0.40' }, // ~$400/kg
                { name: 'Leche Entera', qty: '250', unit: 'ml', price: '0.02' } // ~$25/L
            ];
        }
        if (name.includes('espresso')) {
            return [{ name: 'Café Grano', qty: '18', unit: 'gr', price: '0.40' }];
        }
        return [ // Americano / Default
            { name: 'Café Grano', qty: '18', unit: 'gr', price: '0.40' },
            { name: 'Agua Purificada', qty: '300', unit: 'ml', price: '0.005' }
        ];
    }
    
    if (cat.includes('bebida') || cat.includes('smoothie')) {
        if (name.includes('naranja')) return [{ name: 'Naranja', qty: '3', unit: 'pz', price: '5.00' }];
        if (name.includes('verde')) return [
            { name: 'Nopal', qty: '1', unit: 'pz', price: '2.00' },
            { name: 'Piña', qty: '50', unit: 'gr', price: '0.08' },
            { name: 'Jugo Naranja', qty: '200', unit: 'ml', price: '0.03' }
        ];
        return [{ name: 'Refresco Lata', qty: '1', unit: 'pz', price: '15.00' }];
    }

    // 2. BREAKFAST
    if (cat.includes('desayuno') || cat.includes('huevo') || name.includes('omelet')) {
        const base = [{ name: 'Huevo', qty: '2', unit: 'pz', price: '3.50' }, { name: 'Aceite', qty: '10', unit: 'ml', price: '0.04' }];
        if (name.includes('jamon') || name.includes('jamón')) base.push({ name: 'Jamón de Pavo', qty: '50', unit: 'gr', price: '0.15' });
        if (name.includes('mexicana')) {
            base.push({ name: 'Jitomate', qty: '1', unit: 'pz', price: '3.00' });
            base.push({ name: 'Cebolla', qty: '20', unit: 'gr', price: '0.03' });
            base.push({ name: 'Chile Serrano', qty: '1', unit: 'pz', price: '1.00' });
        }
        base.push({ name: 'Frijol Refrito', qty: '100', unit: 'gr', price: '0.05' }); // Side
        return base;
    }

    if (name.includes('chilaquiles')) {
        return [
            { name: 'Totopos', qty: '150', unit: 'gr', price: '0.08' },
            { name: 'Salsa Verde/Roja', qty: '150', unit: 'ml', price: '0.04' },
            { name: 'Crema', qty: '30', unit: 'ml', price: '0.06' },
            { name: 'Queso Cotija', qty: '20', unit: 'gr', price: '0.12' },
            { name: 'Cebolla', qty: '15', unit: 'gr', price: '0.03' },
            { name: 'Pollo Deshebrado', qty: '80', unit: 'gr', price: '0.12' }
        ];
    }
    
    if (name.includes('hot cleaning') || name.includes('hot cakes') || name.includes('pancake')) {
         return [
            { name: 'Harina HotCakes', qty: '150', unit: 'gr', price: '0.03' },
            { name: 'Leche Entera', qty: '100', unit: 'ml', price: '0.02' },
            { name: 'Huevo', qty: '1', unit: 'pz', price: '3.50' },
            { name: 'Mantequilla', qty: '10', unit: 'gr', price: '0.15' },
            { name: 'Miel de Maple', qty: '30', unit: 'ml', price: '0.10' }
         ];
    }

    // 3. LUNCH / MENU DEL DIA
    if (cat.includes('menú del día') || name.includes('paquete')) {
        return [
            { name: 'Sopa del Día', qty: '1', unit: 'br', price: '10.00' }, // Generic batch item
            { name: 'Guisado Pollo/Res', qty: '150', unit: 'gr', price: '0.15' },
            { name: 'Arroz/Guarnición', qty: '100', unit: 'gr', price: '0.04' },
            { name: 'Agua Fresca', qty: '500', unit: 'ml', price: '0.01' },
            { name: 'Tortilla', qty: '3', unit: 'pz', price: '0.50' }
        ];
    }

    // 4. SANDWICHES
    if (cat.includes('sandwich') || cat.includes('panini') || cat.includes('baguette')) {
        return [
            { name: 'Pan Baguette/Ciabatta', qty: '1', unit: 'pz', price: '8.00' },
            { name: 'Mayonesa/Aderezo', qty: '20', unit: 'gr', price: '0.08' },
            { name: 'Queso Manchego', qty: '40', unit: 'gr', price: '0.18' },
            { name: 'Jamón/Pavo', qty: '60', unit: 'gr', price: '0.15' },
            { name: 'Lechuga', qty: '20', unit: 'gr', price: '0.05' },
            { name: 'Jitomate', qty: '30', unit: 'gr', price: '0.03' }
        ];
    }

    // DEFAULT GENERIC
    return [{ name: `Insumo ${itemName}`, qty: '1', unit: 'pz', price: '10.00' }];
}


async function simulate() {
    console.log('🚀 INITIALIZING SMART KITCHEN SIMULATION');
    console.log(`Target: Stock for ${TARGET_UNITS} units of every dish.`);
    console.log(`Shopping at: ${PROVIDER}`);
    
    try {
        // 1. Fetch Menu
        const items = await db.select().from(menuItems);
        console.log(`Found ${items.length} menu items.`);

        const shoppingList = {}; // { "IngredientName": { qty, unit, price } }

        // 2. Plan Recipes & Build Shopping List
        for (const item of items) {
            console.log(`Analyzing: ${item.name} (${item.category})`);
            const ingredients = hallucinateRecipe(item.name, item.category);
            
            // Create Recipe in DB
            const [newRecipe] = await db.insert(recipes).values({
                name: `Receta ${item.name}`,
                category: item.category,
                price: item.price, // Base costing
                isPublic: false
            }).returning();

            // Link Recipe Ingredients
            const recipeIngs = ingredients.map(ing => ({
                recipeId: newRecipe.id,
                productName: ing.name,
                quantity: ing.qty,
                unit: ing.unit
            }));
            await db.insert(recipeIngredients).values(recipeIngs);

            // Link Menu Item to Recipe
            await db.update(menuItems)
                .set({ recipeId: newRecipe.id })
                .where(eq(menuItems.id, item.id));

            // Add to Shopping List (x10)
            ingredients.forEach(ing => {
                const key = ing.name;
                if (!shoppingList[key]) {
                    shoppingList[key] = { 
                        qty: 0, 
                        unit: ing.unit, 
                        price: parseFloat(ing.price) 
                    };
                }
                shoppingList[key].qty += (parseFloat(ing.qty) * TARGET_UNITS);
            });
        }

        // 3. Go Shopping (Create Ticket)
        console.log('🛒 Going shopping...');
        
        let grandTotal = 0;
        const ticketItemsList = [];

        Object.entries(shoppingList).forEach(([name, data]) => {
            const lineTotal = data.qty * data.price;
            grandTotal += lineTotal;
            ticketItemsList.push({
                product: name,
                quantity: data.qty.toFixed(2),
                unit: data.unit,
                unitPrice: data.price.toFixed(2),
                total: lineTotal.toFixed(2),
                type: 'Insumo'
            });
        });

        const today = new Date();
        const [ticket] = await db.insert(tickets).values({
            ticketRef: `CM-${today.getTime().toString().slice(-6)}`, // Random-ish ref
            provider: PROVIDER,
            total: grandTotal.toFixed(2),
            paymentMethod: 'Tarjeta Corporativa',
            purchaseDate: today,
            status: 'Desglosado'
        }).returning();

        // Save Breakdown
        const finalTicketItems = ticketItemsList.map(t => ({
            ...t,
            ticketId: ticket.id
        }));

        await db.insert(ticketItems).values(finalTicketItems);

        console.log(`✅ Shopping Complete! Spent $${grandTotal.toFixed(2)} on ${Object.keys(shoppingList).length} ingredients.`);
        console.log('✅ Recipes generated and linked.');
        console.log('✅ Inventory stocked for 10x units.');
        
        process.exit(0);

    } catch (e) {
        console.error('❌ Simulation Failed:', e);
        process.exit(1);
    }
}

simulate();
