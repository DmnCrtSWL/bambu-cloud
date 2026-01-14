import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function checkTime() {
    console.log('--- NODE.JS PROCESS TIME ---');
    console.log('new Date().toString():', new Date().toString());
    console.log('new Date().toISOString():', new Date().toISOString());
    console.log('CDMX Locale:', new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));

    console.log('\n--- DATABASE TIME (Postgres) ---');
    try {
        const result = await db.execute(sql`SELECT NOW() as db_time, current_setting('TIMEZONE') as db_tz`);
        console.log('DB NOW():', result.rows[0].db_time);
        console.log('DB Timezone:', result.rows[0].db_tz);
    } catch (e) {
        console.error('Error fetching DB time:', e);
    }
    process.exit(0);
}

checkTime();
