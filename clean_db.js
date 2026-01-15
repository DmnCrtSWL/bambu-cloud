import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function cleanDatabase() {
    console.log('🔥 INICIANDO LIMPIEZA PROFUNDA DE BASE DE DATOS...');
    try {
        // Using TRUNCATE CASCADE to clear everything and reset IDs in one go.
        // This handles FKs automatically and resets sequences.
        // We exclude 'users' as per request to keep login.

        console.log('⚡ Truncating tables (reseting IDs)...');

        // List of tables to wipe
        const tablesToTruncate = [
            'inventory_usage',
            'sale_items',
            'cxc',
            'sales',
            'order_items',
            'orders',
            'ticket_items',
            'tickets',
            'fixed_expenses',
            'customers'
        ];

        for (const table of tablesToTruncate) {
            await db.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`));
            console.log(`✅ Table '${table}' wiped & IDs reset.`);
        }

        console.log('✨ Base de datos TOTALMENTE limpia. (Solo Usuarios conservados)');
    } catch (e) {
        console.error('❌ Error al limpiar:', e);
    }
    process.exit(0);
}

cleanDatabase();
