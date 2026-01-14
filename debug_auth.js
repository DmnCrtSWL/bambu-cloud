
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function debugAuth() {
    console.log('🔍 Checking Users...');
    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
        console.log('❌ No users found in database!');
    } else {
        console.table(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role, passwordHash: u.password.substring(0, 10) + '...' })));
    }

    // Force reset all passwords to '123456' just to be 100% sure
    console.log('🔄 Resetting all passwords to "123456"...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    for (const u of allUsers) {
        await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, u.id));
    }
    console.log('✅ Passwords reset.');
    process.exit(0);
}

debugAuth().catch(console.error);
