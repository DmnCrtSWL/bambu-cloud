import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
    console.log('👤 Creando usuario Super Admin solicitado...');
    try {
        const hashedPassword = await bcrypt.hash('PamMartin1!', 10);
        await db.insert(users).values({
            name: 'Super Admin',
            username: 'superadmin',
            email: 'demiancrate@gmail.com',
            password: hashedPassword,
            role: 'Administrador',
            accessPin: '0000' // Keeping default PIN just in case
        });
        console.log('✅ Usuario creado exitosamente: demiancrate@gmail.com');
    } catch (e) {
        console.error('❌ Error al crear usuario:', e.message);
    }
    process.exit(0);
}

createSuperAdmin();
