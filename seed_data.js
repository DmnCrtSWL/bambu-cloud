import { db } from './src/db/index.js';
import { tickets, ticketItems, recipes, recipeIngredients, fixedExpenses, sales, saleItems, orderItems, orders, users } from './src/db/schema.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
    console.log('🌱 Starting database seed...');

    try {
        // 1. Clear Tables
        console.log('🧹 Clearing tables...');
        await db.delete(saleItems);
        await db.delete(sales);
        await db.delete(orderItems);
        await db.delete(orders);
        await db.delete(recipeIngredients);
        await db.delete(recipes);
        await db.delete(ticketItems);
        await db.delete(tickets);
        await db.delete(fixedExpenses);

        // 2. Create Purchase Ticket (Walmart)
        console.log('🛒 Creating Purchase Ticket...');
        const [ticket] = await db.insert(tickets).values({
            ticketRef: 'WAL-2024-001',
            provider: 'Walmart Express',
            total: '2500.00',
            paymentMethod: 'Tarjeta',
            status: 'Desglosado',
            purchaseDate: new Date()
        }).returning();

        // 3. Create Ticket Items (Ingredients & Finished Products)
        console.log('📝 Adding Ticket Items (Ingredients)...');
        const items = [
            // Proteins
            { product: 'Pechuga de Pollo', quantity: 5, unit: 'kg', unitPrice: 120, total: 600, type: 'Insumo' },
            { product: 'Jamon Virginia', quantity: 2, unit: 'kg', unitPrice: 150, total: 300, type: 'Insumo' },
            { product: 'Huevo San Juan', quantity: 60, unit: 'pz', unitPrice: 2.5, total: 150, type: 'Insumo' },
            // Dairy
            { product: 'Queso Manchego', quantity: 2, unit: 'kg', unitPrice: 180, total: 360, type: 'Insumo' },
            { product: 'Leche Santa Clara', quantity: 12, unit: 'L', unitPrice: 24, total: 288, type: 'Insumo' },
            { product: 'Mantequilla Gloria', quantity: 1, unit: 'kg', unitPrice: 180, total: 180, type: 'Insumo' },
            { product: 'Crema Acida', quantity: 2, unit: 'L', unitPrice: 45, total: 90, type: 'Insumo' },
            // Grains/Breads
            { product: 'Pan Chapata', quantity: 20, unit: 'pz', unitPrice: 8, total: 160, type: 'Insumo' },
            { product: 'Bolillo', quantity: 30, unit: 'pz', unitPrice: 2.5, total: 75, type: 'Insumo' },
            { product: 'Harina Hotcakes', quantity: 2, unit: 'kg', unitPrice: 40, total: 80, type: 'Insumo' },
            { product: 'Tortillas', quantity: 5, unit: 'kg', unitPrice: 22, total: 110, type: 'Insumo' },
            // Veggies/Others
            { product: 'Jitomate Saladet', quantity: 3, unit: 'kg', unitPrice: 30, total: 90, type: 'Insumo' },
            { product: 'Lechuga', quantity: 5, unit: 'pz', unitPrice: 15, total: 75, type: 'Insumo' },
            { product: 'Cebolla Blanca', quantity: 2, unit: 'kg', unitPrice: 25, total: 50, type: 'Insumo' },
            { product: 'Frijoles Refritos', quantity: 2, unit: 'kg', unitPrice: 35, total: 70, type: 'Insumo' },
            { product: 'Salsa Verde', quantity: 2, unit: 'L', unitPrice: 40, total: 80, type: 'Insumo' },
            // Finished Products (For Resale)
            { product: 'Coca Cola 355ml', quantity: 24, unit: 'pz', unitPrice: 12, total: 288, type: 'Terminado' },
            { product: 'Galletas Marias', quantity: 10, unit: 'pz', unitPrice: 15, total: 150, type: 'Terminado' },
            { product: 'Chocolate Abuelita', quantity: 5, unit: 'pz', unitPrice: 40, total: 200, type: 'Terminado' }
        ];

        for (const item of items) {
            await db.insert(ticketItems).values({
                ticketId: ticket.id,
                ...item
            });
        }

        // 4. Create Recipes (Menu Items) linked to Ingredients
        console.log('🍳 Creating Recipes (Menu)...');

        const menu = [
            // --- Requested Dishes ---
            {
                name: 'Chapata de Pollo',
                price: 95.00,
                category: 'Sandwiches',
                ingredients: [
                    { productName: 'Pan Chapata', quantity: 1, unit: 'pz' },
                    { productName: 'Pechuga de Pollo', quantity: 0.150, unit: 'kg' }, // 150g
                    { productName: 'Queso Manchego', quantity: 0.050, unit: 'kg' },
                    { productName: 'Jitomate Saladet', quantity: 0.050, unit: 'kg' },
                    { productName: 'Lechuga', quantity: 0.2, unit: 'pz' }, // Hoja
                    { productName: 'Crema Acida', quantity: 0.02, unit: 'L' } // Aderezo
                ]
            },
            {
                name: 'Orden de Hotcakes',
                price: 85.00,
                category: 'Desayunos',
                ingredients: [
                    { productName: 'Harina Hotcakes', quantity: 0.150, unit: 'kg' },
                    { productName: 'Leche Santa Clara', quantity: 0.1, unit: 'L' },
                    { productName: 'Huevo San Juan', quantity: 1, unit: 'pz' },
                    { productName: 'Mantequilla Gloria', quantity: 0.02, unit: 'kg' }
                ]
            },
            {
                name: 'Chilaquiles con Pollo',
                price: 110.00,
                category: 'Desayunos',
                ingredients: [
                    { productName: 'Tortillas', quantity: 0.200, unit: 'kg' }, // Totopos
                    { productName: 'Salsa Verde', quantity: 0.150, unit: 'L' },
                    { productName: 'Pechuga de Pollo', quantity: 0.120, unit: 'kg' },
                    { productName: 'Crema Acida', quantity: 0.03, unit: 'L' },
                    { productName: 'Queso Manchego', quantity: 0.03, unit: 'kg' },
                    { productName: 'Cebolla Blanca', quantity: 0.02, unit: 'kg' }
                ]
            },
            {
                name: 'Molletes con Jamón',
                price: 75.00,
                category: 'Desayunos',
                ingredients: [
                    { productName: 'Bolillo', quantity: 2, unit: 'pz' }, // 2 mitades
                    { productName: 'Frijoles Refritos', quantity: 0.1, unit: 'kg' },
                    { productName: 'Queso Manchego', quantity: 0.1, unit: 'kg' },
                    { productName: 'Jamon Virginia', quantity: 0.06, unit: 'kg' },
                    { productName: 'Jitomate Saladet', quantity: 0.05, unit: 'kg' } // Pico de gallo
                ]
            },
            // --- Finished Products (Sold as is) ---
            {
                name: 'Coca Cola 355ml',
                price: 35.00,
                category: 'Bebidas',
                ingredients: [
                    { productName: 'Coca Cola 355ml', quantity: 1, unit: 'pz' }
                ]
            },
            {
                name: 'Chocolate Caliente',
                price: 45.00,
                category: 'Bebidas',
                ingredients: [
                    { productName: 'Chocolate Abuelita', quantity: 0.2, unit: 'pz' }, // Tableta
                    { productName: 'Leche Santa Clara', quantity: 0.3, unit: 'L' }
                ]
            },
            {
                name: 'Galletas Marias (Orden)',
                price: 25.00,
                category: 'Dulcería',
                ingredients: [
                    { productName: 'Galletas Marias', quantity: 1, unit: 'pz' } // Paquete
                ]
            }
        ];

        for (const dish of menu) {
            const [recipe] = await db.insert(recipes).values({
                name: dish.name,
                price: dish.price.toString(),
                category: dish.category,
                description: 'Delicioso platillo preparado al momento'
            }).returning();

            for (const ing of dish.ingredients) {
                await db.insert(recipeIngredients).values({
                    recipeId: recipe.id,
                    productName: ing.productName,
                    quantity: ing.quantity.toString(),
                    unit: ing.unit
                });
            }
        }

        // 5. Create Fixed Expenses (Various Dates)
        console.log('📅 Adding Fixed Expenses...');
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed

        const fixedExpensesData = [
            {
                concept: 'Renta Local',
                amount: '12000.00',
                paidTo: 'Inmobiliaria Lomas',
                paymentMethod: 'Transferencia',
                frequency: 'Mensual',
                dateDay: 1
            },
            {
                concept: 'Servicio de Luz (CFE)',
                amount: '3500.50',
                paidTo: 'CFE',
                paymentMethod: 'Transferencia',
                frequency: 'Bimestral',
                dateDay: 10
            },
            {
                concept: 'Servicio de Internet',
                amount: '899.00',
                paidTo: 'Telmex',
                paymentMethod: 'Tarjeta',
                frequency: 'Mensual',
                dateDay: 15
            },
            {
                concept: 'Gas Estacionario',
                amount: '2400.00',
                paidTo: 'Gas Express',
                paymentMethod: 'Efectivo',
                frequency: 'Mensual',
                dateDay: 20
            },
            {
                concept: 'Nómina Semanal',
                amount: '8500.00',
                paidTo: 'Personal',
                paymentMethod: 'Transferencia',
                frequency: 'Semanal',
                dateDay: today.getDate() // Today
            }
        ];

        for (const exp of fixedExpensesData) {
            // Handle date creation safely
            const expenseDate = new Date(year, month, exp.dateDay, 12, 0, 0);

            // If the generated date is in the future relative to "today" (and not today itself), 
            // strictly speaking for historical data we might want past dates.
            // But user asked for "different days of the month".
            // Let's assume current month is fine. 
            // If today is 5th, and we put 20th, it's future expense. That's OK.

            await db.insert(fixedExpenses).values({
                concept: exp.concept,
                amount: exp.amount,
                paidTo: exp.paidTo,
                paymentMethod: exp.paymentMethod,
                frequency: exp.frequency,
                expenseDate: expenseDate,
                status: 'Pagado'
            });
        }


        // 6. Create Users
        console.log('👥 Creating Users...');
        await db.delete(users); // Clear existing users

        const hashedPassword = await bcrypt.hash('123456', 10);

        const usersData = [
            { name: 'Administrador', username: 'admin', role: 'Administrador', email: 'admin@lomas.com' },
            { name: 'Gerente General', username: 'gerente', role: 'Gerencia', email: 'gerente@lomas.com' },
            { name: 'Cajero Operativo', username: 'caja', role: 'Operativo', email: 'caja@lomas.com' }
        ];

        for (const u of usersData) {
            await db.insert(users).values({
                name: u.name,
                username: u.username,
                email: u.email,
                password: hashedPassword,
                role: u.role,
                pin: '0000'
            });
        }

        console.log('✅ Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

seed();
