import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
    console.log('👤 Creando usuario Administrador por defecto...');
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await db.insert(users).values({
            name: 'Super Admin',
            username: 'admin',
            email: 'admin@system.com',
            password: hashedPassword,
            role: 'Administrador',
            accessPin: '0000'
        });
        console.log('✅ Usuario creado: admin / 123456');
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
}

createAdmin();
