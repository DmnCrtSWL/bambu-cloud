
import { db } from '../src/db/index.js';
import { 
    tickets, ticketItems, fixedExpenses, recipes, recipeIngredients, 
    orders, orderItems, sales, saleItems, users, menuItems, 
    customers, cxc, inventoryUsage 
} from '../src/db/schema.js';
import { eq, ne, sql } from 'drizzle-orm';

async function resetDatabase() {
    console.log('⚠️  STARTING PARTIAL DATABASE RESET (KEEP MENU + ADMIN) ⚠️');
    console.log('---------------------------------------------------------');

    try {
        // 1. Unlink Menu from Recipes (Prevent FK errors when deleting recipes)
        console.log('1. Unlinking Recipes from Menu Items...');
        await db.update(menuItems).set({ recipeId: null });
        console.log('   -> Done.');

        // 2. Delete Operational Data (Order matters for FK)
        console.log('2. Deleting Sales, Orders, Inventory, etc...');
        
        // Deleting Children first
        await db.delete(saleItems);
        await db.delete(orderItems);
        await db.delete(ticketItems);
        await db.delete(inventoryUsage);
        await db.delete(cxc); // CXC usually links to sales or customers
        
        // Deleting Parents
        await db.delete(sales);
        await db.delete(orders);
        await db.delete(tickets);
        await db.delete(fixedExpenses);
        await db.delete(customers);
        
        console.log('   -> Done.');

        // 3. Delete Recipes
        console.log('3. Deleting Recipes...');
        await db.delete(recipeIngredients);
        await db.delete(recipes);
        console.log('   -> Done.');

        // 4. Cleanup Users (Keep only demiancrate@gmail.com)
        console.log('4. Cleaning up Users (keeping demiancrate@gmail.com)...');
        await db.delete(users).where(ne(users.email, 'demiancrate@gmail.com'));
        console.log('   -> Done.');

        console.log('---------------------------------------------------------');
        console.log('✅  DATABASE RESET COMPLETED SUCCESSFULLY');
        process.exit(0);

    } catch (error) {
        console.error('❌  ERROR DURING RESET:', error);
        process.exit(1);
    }
}

resetDatabase();
