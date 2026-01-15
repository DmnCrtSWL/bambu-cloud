import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("CRITICAL: DATABASE_URL is missing in environment variables.");
} else {
    console.log("DB Connection String found (starts with):", connectionString.substring(0, 15) + "...");
}

const pool = new Pool({
    connectionString,
    max: 1, // Important for serverless
    ssl: true // Force SSL for Neon/Vercel
});

export const db = drizzle(pool, { schema });
