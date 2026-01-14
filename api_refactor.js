
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
// Native fetch is available in Node 18+

async function run() {
    console.log('🚀 Starting API Refactor...');

    try {
        // 1. Create Temp Admin
        const password = await bcrypt.hash('temp123', 10);
        const username = 'tempadmin_' + Date.now();
        
        console.log(`Creating user ${username} in DB...`);
        const [user] = await db.insert(users).values({
            name: 'Temp Admin',
            username: username,
            email: `${username}@test.com`,
            password: password,
            role: 'Administrador'
        }).returning();

        console.log('User created. ID:', user.id);

        // 2. Login via API
        const loginUrl = 'http://localhost:3000/api/auth/login';
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: 'temp123' })
        });

        if (!loginRes.ok) {
            console.error('❌ Login failed!', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login successful! Token obtained.');

        // 3. Perform Updates via API
        const headers = { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        };

        // Molletes (ID 36 - Sencillos)
        console.log('Updating Molletes (ID 36)...');
        const updateMolletes = await fetch('http://localhost:3000/api/menu-items/36', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                name: 'Molletes',
                price: '69.00',
                variations: [{
                    name: 'Ingrediente Extra',
                    options: [
                        { name: 'Sencillos', price: 0 },
                        { name: 'Con Jamón', price: 14 }
                    ]
                }],
                isActive: true,
                category: 'Desayunos',
                icon: 'Utensils'
            })
        });
        console.log('Molletes Update:', updateMolletes.status);

        // Delete Molletes con Jamon (ID 35)
        console.log('Deleting Molletes con Jamón (ID 35)...');
        await fetch('http://localhost:3000/api/menu-items/35', { method: 'DELETE', headers });

        // Chilaquiles (ID 29 - Sencillos)
        console.log('Updating Chilaquiles (ID 29)...');
        const updateChilaquiles = await fetch('http://localhost:3000/api/menu-items/29', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                name: 'Chilaquiles',
                price: '69.00',
                variations: [{
                    name: 'Ingrediente Extra',
                    options: [
                        { name: 'Sencillos', price: 0 },
                        { name: 'Con Pollo', price: 14 }
                    ]
                }],
                isActive: true,
                category: 'Desayunos',
                icon: 'Utensils'
            })
        });
        console.log('Chilaquiles Update:', updateChilaquiles.status);

        // Delete Chilaquiles con Pollo (ID 28)
        console.log('Deleting Chilaquiles con Pollo (ID 28)...');
        await fetch('http://localhost:3000/api/menu-items/28', { method: 'DELETE', headers });

        // Delete Frappe Pan de Muerto (ID 19)
        console.log('Deleting Frappe Pan de Muerto (ID 19)...');
        await fetch('http://localhost:3000/api/menu-items/19', { method: 'DELETE', headers });

        console.log('✨ All API operations completed.');

        // Cleanup User
        await db.delete(users).where(eq(users.id, user.id));

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        process.exit(0);
    }
}

run();
