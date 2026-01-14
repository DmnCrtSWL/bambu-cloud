
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const createTables = async () => {
    try {
        console.log('Creating tables...');

        // Tickets Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_ref TEXT NOT NULL,
                provider TEXT NOT NULL,
                total NUMERIC(10, 2) NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'No Desglosado',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Ticket Items Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_items (
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

        console.log('Tables created successfully.');

        // Seed if empty
        const res = await pool.query('SELECT COUNT(*) FROM tickets');
        if (parseInt(res.rows[0].count) === 0) {
            console.log('Seeding initial ticket...');
            await pool.query(`
                INSERT INTO tickets (ticket_ref, provider, total, payment_method, status)
                VALUES ($1, $2, $3, $4, $5)
            `, ['TKT-2025-0015', 'Walmart Supercenter', 4567.80, 'Tarjeta', 'No Desglosado']);
            console.log('Seed ticket created.');
        } else {
            console.log('Tickets table already has data, skipping seed.');
        }

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await pool.end();
    }
};

createTables();
