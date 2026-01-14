import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const fixTicketItemsTable = async () => {
    try {
        console.log('Fixing ticket_items table schema...\n');

        // Drop the old table
        await pool.query('DROP TABLE IF EXISTS ticket_items CASCADE;');
        console.log('Dropped old ticket_items table');

        // Create the new table with correct schema
        await pool.query(`
            CREATE TABLE ticket_items (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) NOT NULL,
                product TEXT NOT NULL,
                quantity NUMERIC(10, 2) NOT NULL,
                unit TEXT NOT NULL,
                unit_price NUMERIC(10, 2) NOT NULL,
                discount NUMERIC(10, 2) DEFAULT 0,
                total NUMERIC(10, 2) NOT NULL
            );
        `);
        console.log('Created new ticket_items table with correct schema');

        console.log('\nTable fixed successfully!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
};

fixTicketItemsTable();
