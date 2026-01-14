import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
import { users } from './src/db/schema.js';
import bcrypt from 'bcryptjs';

async function wipeDatabaseFull() {
    console.log('☢️  INICIANDO BORRADO TOTAL DEL SISTEMA (Full Wipe) ☢️');
    try {
        console.log('⚡ Truncando TODAS las tablas...');

        // List of tables to wipe - Order doesn't strictly matter with CASCADE, but good to be thorough
        const tablesToTruncate = [
            'inventory_usage',
            'sale_items',
            'cxc',
            'sales',
            'order_items',
            'orders',
            'recipe_ingredients',
            'menu_items',
            'recipes',
            'ticket_items',
            'tickets',
            'fixed_expenses',
            'customers',
            'users' // <--- Explicitly included
        ];

        for (const table of tablesToTruncate) {
            await db.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`));
            console.log(`✅ Tabla '${table}' eliminada.`);
        }

        console.log('✨ SISTEMA EN CERO. No existen usuarios.');

    } catch (e) {
        console.error('❌ Error al limpiar:', e);
        process.exit(1);
    }
    process.exit(0);
}

// Optional: Function to create a default admin if we ever need it nicely integrated
async function createRescueAdmin() {
     const hashedPassword = await bcrypt.hash('123456', 10);
     await db.insert(users).values({
        name: 'Super Admin',
        username: 'admin',
        email: 'admin@system.com',
        password: hashedPassword,
        role: 'Administrador',
        accessPin: '0000'
     });
     console.log("🚑 Rescue Admin created (admin / 123456)");
}

// Check for flag --with-admin to optionally create an admin
const args = process.argv.slice(2);
if (args.includes('--with-admin')) {
    wipeDatabaseFull().then(() => createRescueAdmin().then(() => process.exit(0)));
} else {
    wipeDatabaseFull();
}
