import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const checkTables = async () => {
    try {
        console.log('Checking database tables...\n');

        // Check if tickets table exists
        const ticketsCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tickets'
            );
        `);
        console.log('Tickets table exists:', ticketsCheck.rows[0].exists);

        // Check if ticket_items table exists
        const itemsCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ticket_items'
            );
        `);
        console.log('Ticket_items table exists:', itemsCheck.rows[0].exists);

        // List all columns in ticket_items
        if (itemsCheck.rows[0].exists) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'ticket_items'
                ORDER BY ordinal_position;
            `);
            console.log('\nTicket_items columns:');
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        }

        // List all columns in tickets
        if (ticketsCheck.rows[0].exists) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'tickets'
                ORDER BY ordinal_position;
            `);
            console.log('\nTickets columns:');
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
};

checkTables();
