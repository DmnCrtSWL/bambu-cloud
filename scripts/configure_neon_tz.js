import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function configureTimezone() {
    console.log('--- Configuring Neon DB Timezone ---');
    try {
        // 1. Get current context
        const context = await db.execute(sql`SELECT current_database(), current_user`);
        const dbName = context.rows[0].current_database;
        const dbUser = context.rows[0].current_user;

        console.log(`Target Database: ${dbName}`);
        console.log(`Target User: ${dbUser}`);

        // 2. Set Timezone for the DATABASE (Persistent for all users connecting to this DB)
        // We use string concatenation for identifiers since they cannot be parameterized in DDL
        console.log(`Executing: ALTER DATABASE "${dbName}" SET timezone TO 'America/Mexico_City'...`);
        await db.execute(sql.raw(`ALTER DATABASE "${dbName}" SET timezone TO 'America/Mexico_City'`));

        // 3. Set Timezone for the USER (Double safety)
        console.log(`Executing: ALTER ROLE "${dbUser}" SET timezone TO 'America/Mexico_City'...`);
        await db.execute(sql.raw(`ALTER ROLE "${dbUser}" SET timezone TO 'America/Mexico_City'`));

        console.log('✅ Configuration applied successfully.');

        // 4. Verify immediate effect (might require reconnection in real app, but let's check session)
        // Note: New settings usually take effect on NEW connections.
        console.log('NOTE: Changes typically apply to NEW connections.');

    } catch (e) {
        console.error('❌ Error configuring timezone:', e);
        if (e.message.includes('permission denied')) {
            console.error('Hint: You might need to be a superuser or the DB owner.');
        }
    }
    process.exit(0);
}

configureTimezone();
