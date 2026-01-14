
import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function deleteItem() {
    console.log('Deleting Promo Café + Croissant...');
    await db.delete(menuItems).where(eq(menuItems.name, 'Promo Café + Croissant'));
    console.log('Deleted successfully.');
    process.exit(0);
}

deleteItem().catch(e => {
    console.error(e);
    process.exit(1);
});
