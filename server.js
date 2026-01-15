
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { db } from './src/db/index.js';
import { tickets, ticketItems, fixedExpenses, recipes, recipeIngredients, orders, orderItems, sales, saleItems, users, menuItems, customers, cxc, inventoryUsage } from './src/db/schema.js';
import { eq, and, or, like, gte, lte, asc, desc, isNull, sql, between } from 'drizzle-orm';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/ping', (req, res) => res.send('pong'));

// --- DEBUG ENDPOINT (Forced Top Priority) ---
app.get('/api/orders/latest/id', async (req, res) => {
    try {
        const result = await db.select({ id: orders.id }).from(orders).orderBy(desc(orders.id)).limit(1);
        const latestId = result.length > 0 ? result[0].id : 0;
        res.json({ id: latestId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch latest order ID' });
    }
});

app.get('/api/health-db', async (req, res) => {
    try {
        const result = await db.execute(sql`SELECT NOW()`);
        res.json({ 
            status: 'ok', 
            serverTime: new Date().toISOString(), 
            dbTime: result.rows[0],
            connectionStringStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 10) : 'MISSING' 
        });
    } catch (error) {
        console.error('DB Health Check Failed:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message,
            stack: error.stack,
            connectionStringStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 10) : 'MISSING'
        });
    }
});

// --- MIDDLEWARE: VERIFY TOKEN ---
const verifyToken = async (req, res, next) => {
    // Skip for public routes (explicitly handled here or just apply middleware selectively)
    // We will apply middleware selectively.
    
    const bearerHeader = req.headers['authorization'];
    
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        
        try {
            const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
            
            // Critical: Check if user actually exists in DB
            const userExists = await db.select().from(users).where(and(eq(users.id, decoded.id), isNull(users.deletedAt)));
            
            if (!userExists || userExists.length === 0) {
                return res.status(401).json({ error: 'Usuario ya no existe. Acceso denegado.' });
            }
            
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }
    } else {
        // If no token provided
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
};


// DEBUG LOGGER



// Export app for Serverless
export default app;

// Only listen if run directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT} (v2 - Fixed Notifs)`);
        console.log(`[INFO] Server starting with T12:00:00 fix safe-guard.`);
    });
}
// GET /api/sales - History View (PROTECTED)
app.get('/api/sales', verifyToken, async (req, res) => {
    try {
        const { today, from, to } = req.query;
        console.log('[GET /api/sales] Query:', req.query);
        let conditions = [isNull(sales.deletedAt)];

        if (today === 'true') {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            // Create range for "Today" using local bounds converted to Date objects (which driver handles)
            const start = new Date(todayStr + 'T00:00:00');
            const end = new Date(todayStr + 'T23:59:59');

            conditions.push(between(sales.createdAt, start, end));
        } else if (from && to) {
            // "from" and "to" are expected as YYYY-MM-DD
            const start = new Date(from + 'T00:00:00');
            const end = new Date(to + 'T23:59:59');
            conditions.push(between(sales.createdAt, start, end));
        } else if (from) {
             const start = new Date(from + 'T00:00:00');
             const end = new Date(from + 'T23:59:59');
             conditions.push(between(sales.createdAt, start, end));
        }

        const salesResult = await db.select().from(sales)
            .where(and(...conditions))
            .orderBy(desc(sales.createdAt));

        const salesWithItems = await Promise.all(salesResult.map(async (sale) => {
            const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
            return {
                ...sale,
                items
            };
        }));

        res.json(salesWithItems);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

// GET /api/tickets - List all tickets with optional date filtering (PROTECTED)
app.get('/api/tickets', verifyToken, async (req, res) => {
    try {
        console.log('[GET /api/tickets] Incoming Query:', req.query);
        const { today, from, to, undissected } = req.query;
        let conditions = [isNull(tickets.deletedAt)];

        if (today === 'true') {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const start = new Date(todayStr + 'T00:00:00');
            const end = new Date(todayStr + 'T23:59:59');

            console.log(`[GET /api/tickets] Filter TODAY:`, {
                todayStr,
                start: start.toISOString(),
                end: end.toISOString()
            });

            conditions.push(between(tickets.purchaseDate, start, end));
        } else if (undissected === 'true') {
            // Show all tickets that are NOT 'Desglosado' (so 'No Desglosado', or anything else)
            // Using 'ne' (not equal) or explicit check.
            const { ne } = await import('drizzle-orm'); // Dynamic import if needed, or just use sql/ne from top
            // actually 'ne' is not imported at top. Let's check imports.
            // imports: eq, and, like, gte, lte, asc, desc, isNull, sql, between
            // I'll add 'ne' to imports in a separate call or use sql.
            // simpler: utilize sql for "status != 'Desglosado'" to be safe and avoid import mess mid-file
            conditions.push(sql`${tickets.status} != 'Desglosado'`);
        } else if (from && to) {
            // Apply range filtering for both ranges and specific days
            // The client now sends explicit YYYY-MM-DD "from" and "to" for Today/Specific Day,
            // so we can rely on standard start/end of day construction.
            const fromDate = new Date(from + 'T00:00:00');
            const toDate = new Date(to + 'T23:59:59');

            console.log(`[GET /api/tickets] Filter RANGE:`, { from, to, fromDate: fromDate.toISOString(), toDate: toDate.toISOString() });

            conditions.push(between(tickets.purchaseDate, fromDate, toDate));
        }

        const result = await db.select()
            .from(tickets)
            .where(and(...conditions))
            .orderBy(desc(tickets.purchaseDate));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// POST /api/tickets - Create a new ticket (PROTECTED)
app.post('/api/tickets', verifyToken, async (req, res) => {
    try {
        console.log('[POST /api/tickets] Incoming Body:', req.body);
        const { ticketRef, provider, total, paymentMethod, purchaseDate } = req.body;

        // Check if purchaseDate already has time component (T...)
        // If frontend sends "2026-01-12T12:00:00.000Z", we use it as is.
        // If it sends "2026-01-12", we append T12:00:00.
        const finalPurchaseDate = purchaseDate 
            ? (purchaseDate.includes('T') ? new Date(purchaseDate) : new Date(purchaseDate + 'T12:00:00'))
            : new Date();
        console.log('[POST /api/tickets] Final Date to save:', finalPurchaseDate);

        const [newTicket] = await db.insert(tickets).values({
            ticketRef,
            provider,
            total,
            paymentMethod,
            paymentMethod,
            purchaseDate: finalPurchaseDate,
            userId: req.user.id // Track User
        }).returning();

        console.log('[POST /api/tickets] Saved Ticket:', {
            id: newTicket.id,
            ticketRef: newTicket.ticketRef,
            purchaseDate: newTicket.purchaseDate,
            createdAt: newTicket.createdAt
        });
        res.json(newTicket);
    } catch (error) {
        console.error('[POST /api/tickets] Error:', error);
        
        // Quick debug logging to file
        // const fs = await import('fs');
        // fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] POST /api/tickets ERROR: ${error.message}\n${error.stack}\n\n`);

        res.status(500).json({ error: `Failed to create ticket: ${error.message}` });
    }
});

// GET /api/tickets/:id - Get ticket details with items (PROTECTED)
app.get('/api/tickets/:id', verifyToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);

        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticketResult = await db.select().from(tickets).where(eq(tickets.id, ticketId));

        if (!ticketResult || ticketResult.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const itemsResult = await db.select().from(ticketItems).where(eq(ticketItems.ticketId, ticketId));

        res.json({
            ...ticketResult[0],
            items: itemsResult || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch ticket details' });
    }
});

// PUT /api/tickets/:id - Update ticket (PROTECTED)
app.put('/api/tickets/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { ticketRef, provider, total, paymentMethod, purchaseDate } = req.body;

        await db.update(tickets)
            .set({
                ticketRef,
                provider,
                total,
                paymentMethod,
                purchaseDate: purchaseDate 
                    ? (purchaseDate.includes('T') ? new Date(purchaseDate) : new Date(purchaseDate + 'T12:00:00'))
                    : undefined
            })
            .where(eq(tickets.id, id));

        res.json({ success: true });
    } catch (error) {
        console.error('[PUT /api/tickets/:id] Error:', error);

        // Quick debug logging to file
        // const fs = await import('fs');
        // fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] PUT /api/tickets/${req.params.id} ERROR: ${error.message}\n${error.stack}\n\n`);

        res.status(500).json({ error: `Failed to update ticket: ${error.message}` });
    }
});

// DELETE /api/tickets/:id - Soft delete ticket (PROTECTED)
app.delete('/api/tickets/:id', verifyToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        await db.update(tickets)
            .set({ deletedAt: new Date() })
            .where(eq(tickets.id, ticketId));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

// POST /api/tickets/:id/breakdown - Atomic replace of breakdown items (PROTECTED)
app.post('/api/tickets/:id/breakdown', verifyToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { items } = req.body;

        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        await db.transaction(async (tx) => {
            await tx.delete(ticketItems).where(eq(ticketItems.ticketId, ticketId));
            if (items && items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    ticketId,
                    product: item.product,
                    quantity: item.quantity.toString(),
                    unit: item.unit,
                    unitPrice: item.unitPrice.toString(),
                    discount: (item.discount || 0).toString(),
                    total: item.total.toString(),
                    type: item.type || 'Insumo'
                }));
                await tx.insert(ticketItems).values(itemsToInsert);
            }
            // Update ticket status to Desglosado
            await tx.update(tickets).set({ status: 'Desglosado' }).where(eq(tickets.id, ticketId));
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[POST /api/tickets/:id/breakdown] Error:', error);

        // Quick debug logging to file
        // const fs = await import('fs');
        // fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] POST /api/tickets/${req.params.id}/breakdown ERROR: ${error.message}\n${error.stack}\n\n`);

        res.status(500).json({ error: `Failed to save breakdown: ${error.message}` });
    }
});

// --- FIXED EXPENSES ENDPOINTS ---

app.get('/api/fixed-expenses', verifyToken, async (req, res) => {
    try {
        console.log('[GET /api/fixed-expenses] Query:', req.query);
        const { today, from, to } = req.query;
        let conditions = [isNull(fixedExpenses.deletedAt)];

        if (today === 'true') {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            // Use substring on text representation to absolutely ignore timezone and just match stored YYYY-MM-DD
            conditions.push(sql`substring(${fixedExpenses.expenseDate}::text, 1, 10) = ${todayStr}`);
        } else if (from && to) {
            conditions.push(sql`substring(${fixedExpenses.expenseDate}::text, 1, 10) >= ${from}`);
            conditions.push(sql`substring(${fixedExpenses.expenseDate}::text, 1, 10) <= ${to}`);
        }

        const result = await db.select()
            .from(fixedExpenses)
            .where(and(...conditions))
            .orderBy(desc(fixedExpenses.expenseDate));
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch fixed expenses' });
    }
});

app.post('/api/fixed-expenses', verifyToken, async (req, res) => {
    try {
        const { concept, amount, paidTo, paymentMethod, frequency, expenseDate } = req.body;
        const [newExpense] = await db.insert(fixedExpenses).values({
            concept, amount, paidTo, paymentMethod, frequency, expenseDate: new Date(expenseDate),
            userId: req.user.id // Track User
        }).returning();
        res.json(newExpense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create fixed expense' });
    }
});

app.get('/api/fixed-expenses/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.select().from(fixedExpenses).where(eq(fixedExpenses.id, id));
        if (result.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

app.put('/api/fixed-expenses/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { concept, amount, paidTo, paymentMethod, frequency, expenseDate } = req.body;
        await db.update(fixedExpenses).set({
            concept, amount, paidTo, paymentMethod, frequency, expenseDate: new Date(expenseDate)
        }).where(eq(fixedExpenses.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update fixed expense' });
    }
});

app.delete('/api/fixed-expenses/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.update(fixedExpenses).set({ deletedAt: new Date() }).where(eq(fixedExpenses.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete fixed expense' });
    }
});

// --- RECIPES ENDPOINTS ---

app.get('/api/recipes', verifyToken, async (req, res) => {
    try {
        const result = await db.select().from(recipes).where(isNull(recipes.deletedAt)).orderBy(desc(recipes.createdAt));
        const recipesWithIngredients = await Promise.all(result.map(async (recipe) => {
            const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
            return { ...recipe, ingredients };
        }));
        res.json(recipesWithIngredients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
});

app.post('/api/recipes', verifyToken, async (req, res) => {
    try {
        const { name, isPublic, variations, ingredients } = req.body;
        // Default price to '0' and category to 'General' if not provided
        const price = req.body.price || '0';
        const category = req.body.category || 'General';
        console.log('[POST /api/recipes] Body:', JSON.stringify(req.body, null, 2));
        const result = await db.transaction(async (tx) => {
            const [newRecipe] = await tx.insert(recipes).values({ name, price, category, isPublic, variations }).returning();
            if (ingredients && ingredients.length > 0) {
                const ingredientsToInsert = ingredients.map(ing => ({
                    recipeId: newRecipe.id,
                    productName: ing.productName,
                    quantity: ing.quantity.toString(),
                    unit: ing.unit
                }));
                await tx.insert(recipeIngredients).values(ingredientsToInsert);
            }
            return newRecipe;
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to create recipe' });
    }
});

app.get('/api/recipes/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
        if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
        const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
        res.json({ ...recipe, ingredients });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch recipe' });
    }
});

app.put('/api/recipes/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, isPublic, variations, ingredients } = req.body;
        const price = req.body.price || '0';
        const category = req.body.category || 'General';

        await db.transaction(async (tx) => {
            await tx.update(recipes).set({ name, price, category, isPublic, variations }).where(eq(recipes.id, id));
            await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
            if (ingredients && ingredients.length > 0) {
                const ingredientsToInsert = ingredients.map(ing => ({
                    recipeId: id,
                    productName: ing.productName,
                    quantity: ing.quantity.toString(),
                    unit: ing.unit
                }));
                await tx.insert(recipeIngredients).values(ingredientsToInsert);
            }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

app.delete('/api/recipes/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.update(recipes).set({ deletedAt: new Date() }).where(eq(recipes.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// --- INVENTORY ENDPOINTS ---

// --- INVENTORY ENDPOINTS ---

app.get('/api/inventory', verifyToken, async (req, res) => {
    try {
        // 1. Total Inputs (Purchases)
        const inputs = await db.select({
            product: ticketItems.product,
            unit: ticketItems.unit,
            // Include 'type' in selection
            type: ticketItems.type,
            totalQuantity: sql`sum(${ticketItems.quantity})`,
            avgUnitPrice: sql`avg(${ticketItems.unitPrice})`,
            lastPurchaseDate: sql`max(${tickets.purchaseDate})`
        })
            .from(ticketItems)
            .innerJoin(tickets, eq(ticketItems.ticketId, tickets.id))
            .where(isNull(tickets.deletedAt))
            // Must group by type as well to avoid mixing types for same product name if that happens
            .groupBy(ticketItems.product, ticketItems.unit, ticketItems.type);

        // 2. Total Outputs (Usage)
        const outputs = await db.select({
            product: inventoryUsage.productName,
            totalUsed: sql`sum(${inventoryUsage.quantity})`
        })
            .from(inventoryUsage)
            .groupBy(inventoryUsage.productName);

        // Create Map for fast lookup
        const usageMap = {};
        outputs.forEach(o => {
            usageMap[o.product] = parseFloat(o.totalUsed) || 0;
        });

        // 3. Merge & Calculate
        const finalInventory = inputs.map(item => {
            const used = usageMap[item.product] || 0;
            const totalInput = parseFloat(item.totalQuantity) || 0;
            const currentStock = totalInput - used;

            return {
                product: item.product,
                unit: item.unit,
                type: item.type, // Pass the type
                // Frontend expects 'totalQuantity' (legacy name) for stock display
                totalQuantity: currentStock,
                totalInput: totalInput,
                totalUsed: used,
                currentStock: currentStock,
                avgUnitPrice: parseFloat(item.avgUnitPrice) || 0,
                lastPurchaseDate: item.lastPurchaseDate, // Pass the date
                status: currentStock <= 5 ? 'Bajo' : 'Ok'
            };
        });

        res.json(finalInventory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// --- DASHBOARD ENDPOINTS --- (PROTECTED)
// --- DASHBOARD ENDPOINTS --- (PROTECTED)
// Helper to get CDMX Date Range from YYYY-MM-DD
const getCDMXRange = (from, to) => {
    if (!from || !to) { // Default to Today
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        return {
            start: new Date(todayStr + 'T00:00:00'),
            end: new Date(todayStr + 'T23:59:59')
        };
    }
    return {
        start: new Date(from + 'T00:00:00'),
        end: new Date(to + 'T23:59:59') 
    };
};

app.get('/api/dashboard/summary', verifyToken, async (req, res) => {
    try {
        const { from, to } = req.query;
        const { start, end } = getCDMXRange(from, to);
        console.log(`[GET /api/dashboard/summary] Query Params: from=${from}, to=${to}`);
        console.log(`[GET /api/dashboard/summary] Range (Local Objects): ${start.toString()} - ${end.toString()}`);
        console.log(`[GET /api/dashboard/summary] Range (ISO): ${start.toISOString()} - ${end.toISOString()}`);

        const currentSales = await db.select().from(sales)
            .where(and(
                isNull(sales.deletedAt),
                between(sales.createdAt, start, end)
            ));
        
        console.log(`[GET /api/dashboard/summary] Found ${currentSales.length} sales in range.`);
        if (currentSales.length > 0) {
            console.log(`[GET /api/dashboard/summary] First sale date: ${currentSales[0].createdAt}`);
        }

        const totalSales = currentSales.reduce((acc, s) => {
            const method = s.paymentMethod ? s.paymentMethod.toLowerCase().trim() : '';
            if (['efectivo', 'tarjeta', 'transferencia', 'uber eats'].includes(method)) {
                return acc + parseFloat(s.total);
            }
            return acc;
        }, 0);
        const totalOrders = currentSales.length;

        // Calculate CXC (Pending Debt) - This is usually total outstanding, not just relative to date range?
        // Let's assume CXC card shows ALL pending debt regardless of date, or just new debt in range?
        // Usually CXC in dashboard implies "Current Owed Money".
        // Use all sales with paymentMethod = 'cxc' and NO corresponding 'cxc_payment' (this logic is complex, 
        // simplified version: sum total of CXC type sales in range? 
        // The CXCView logic uses cxc table. Let's start with simple sum of 'cxc' sales in range for consistency,
        // OR better: All outstanding debt from 'cxc' table.
        // DashboardView shows "Cuentas por Cobrar" -> "Pendiente de pago". Makes sense to be ALL time debt.
        
        const allPendingCXC = await db.select().from(cxc);
        // Calculate total debt for each customer (sum of sales - sum of payments)
        // Or simpler: cxc table doesn't hold balance. We need to query sales.
        // Actually, let's replicate logic from CXCView roughly or simpler:
        // Use a simple sum of ALL sales with method 'CXC' minus valid payments? 
        // For now, let's stick to the requested "Sales" and "Orders" correctness.
        // Leaving CXC as "Sales defined as CXC in range" or "Total Debt"?
        // Let's stick to: Sum of cxc table entries (customers) isn't total money.
        // Re-using logic from "cxc" endpoint logic would be best but standardizing on Sales and Orders first.
        
        // Correct approach for CXC Card: Show TOTAL PENDING DEBT (All time)
        // We will calc this by iterating all cxc customers and summing their balances? 
        // For speed, let's just use the current range 'cxc' sales for now unless requested otherwise.
        // User asked for "Card 1 (Sales) and Card 2 (Orders)".
        
        const totalCXC_InRange = currentSales
            .filter(s => s.paymentMethod === 'CXC' || s.paymentMethod === 'cxc')
            .reduce((acc, s) => acc + parseFloat(s.total), 0);

        res.json({
            totalSales,
            totalOrders,
            goal: 5500, // Hardcoded for now
            totalCXC: totalCXC_InRange // Showing CXC generated in this period
        });

    } catch(e) {
        console.error(e);
        res.status(500).json({error: 'Summary error'});
    }
});

app.get('/api/dashboard/comparison', verifyToken, async (req, res) => {
     res.json({ current: 0, previous: 0, diff: 0 }); // Placeholder
});

app.get('/api/dashboard/top-products', verifyToken, async (req, res) => {
    try {
        const { from, to } = req.query;
        const { start, end } = getCDMXRange(from, to);

        // Join saleItems with sales to filter by date
        const result = await db.select({
            name: saleItems.productName,
            count: sql`sum(${saleItems.quantity})` // or count
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(and(
            isNull(sales.deletedAt),
            between(sales.createdAt, start, end)
        ))
        .groupBy(saleItems.productName)
        .orderBy(desc(sql`sum(${saleItems.quantity})`))
        .limit(5);

        res.json(result);
    } catch(e) {
        console.error(e);
        res.status(500).json([]);
    }
});

app.get('/api/dashboard/top-customers', verifyToken, async (req, res) => {
    try {
         const { from, to } = req.query;
        const { start, end } = getCDMXRange(from, to);

        const result = await db.select({
            name: sales.customerName,
            count: sql`count(*)`,
            totalSpent: sql`sum(${sales.total})`
        })
        .from(sales)
        .where(and(
            isNull(sales.deletedAt),
            between(sales.createdAt, start, end),
            sql`${sales.customerName} IS NOT NULL`,
            sql`${sales.customerName} != 'Venta en Barra'` // Exclude generic
        ))
        .groupBy(sales.customerName)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

        // Calculate percentages
        const totalVisits = result.reduce((acc, r) => acc + Number(r.count), 0);
        const withPct = result.map(r => ({
            ...r,
            percentage: totalVisits > 0 ? Math.round((Number(r.count) / totalVisits) * 100) : 0
        }));

        res.json(withPct);
    } catch(e) {
         console.error(e);
        res.status(500).json([]);
    }
});

app.get('/api/dashboard/weekly-stats', verifyToken, async (req, res) => {
    try {
        // Calculate "This Week" vs "Last Week" independent of query params usually
        // But let's anchor "This Week" to the "Data To" date if provided, or Now.
        const anchor = req.query.to ? new Date(req.query.to) : new Date();
        
        // Logic for weekly stats... placeholder for now as focus is Card 1 & 2
        res.json({ thisWeek: 0, lastWeek: 0, diff: 0 });
    } catch(e) {
         console.error(e);
        res.status(500).json({error: 'Weekly stats error'});
    }
});


// --- ORDERS ENDPOINTS ---

app.get('/api/orders', async (req, res) => {
    try {
        const result = await db.select().from(orders).where(isNull(orders.deletedAt)).orderBy(asc(orders.deliveryTime));
        const ordersWithItems = await Promise.all(result.map(async (order) => {
            const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
            return { ...order, items };
        }));
        res.json(ordersWithItems);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/api/orders/latest/id', async (req, res) => {
    try {
        const result = await db.select({ id: orders.id }).from(orders).orderBy(desc(orders.id)).limit(1);
        const latestId = result.length > 0 ? result[0].id : 0;
        res.json({ id: latestId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch latest order ID' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, customerPhone, deliveryTime, deliveryLocation, paymentMethod, notes, total, items } = req.body;
        const result = await db.transaction(async (tx) => {
            const [newOrder] = await tx.insert(orders).values({
                customerName,
                customerPhone,
                deliveryTime, // Storing as text now
                deliveryLocation,
                paymentMethod,
                notes,
                total: total.toString(),
                status: 'Nuevo'
            }).returning();

            if (items && items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    orderId: newOrder.id,
                    productName: item.productName,
                    quantity: item.quantity.toString(),
                    unitPrice: item.unitPrice.toString(),
                    total: item.total.toString(),
                    notes: item.notes || null,
                    options: item.options || null
                }));
                await tx.insert(orderItems).values(itemsToInsert);

                // --- INVENTORY DEDUCTION LOGIC ---
                // For each item in the order, find its recipe and deduct ingredients
                for (const item of items) {
                    // Find menu item to get recipeId
                    // We assume 'item.originalId' might be passed from frontend, OR we search by name.
                    // Frontend 'MenuView.vue' sends 'productName' (= item.name) and we can try to find it.
                    // Ideally frontend sends menuId, but let's look up by name/id if possible.
                    // Checking MenuView.vue -> it sends 'productName'. 
                    // Let's try to find the menu item by name to get the recipe.
                    
                    const menuItem = await tx.select().from(menuItems).where(eq(menuItems.name, item.productName));
                    
                    if (menuItem && menuItem.length > 0 && menuItem[0].recipeId) {
                        const recipeId = menuItem[0].recipeId;
                        const ingredients = await tx.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
                        
                        if (ingredients.length > 0) {
                            const usageInserts = ingredients.map(ing => ({
                                orderId: newOrder.id,
                                saleId: null, // Distinct from Sale
                                productName: ing.productName, // The ingredient name (e.g. "Huevo")
                                quantity: (parseFloat(ing.quantity) * parseFloat(item.quantity)).toString(),
                                unit: ing.unit
                            }));
                            await tx.insert(inventoryUsage).values(usageInserts);
                        }
                    }
                }
            }

            // Upsert Customer Logic
            if (customerPhone && customerPhone.trim() !== '') {
                await tx.insert(customers)
                    .values({
                        name: customerName,
                        phone: customerPhone
                    })
                    .onConflictDoUpdate({
                        target: customers.phone,
                        set: { name: customerName } // Keep name updated
                    });
            }

            return newOrder;
        });
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.patch('/api/orders/:id/status', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        await db.update(orders).set({ status }).where(eq(orders.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// --- CUSTOMERS ENDPOINTS ---
app.get('/api/customers', verifyToken, async (req, res) => {
    try {
        const allCustomers = await db.select().from(customers);
        const allOrders = await db.select().from(orders);
        const allCXC = await db.select().from(cxc);

        // Fetch Items from Orders (Online/App)
        const orderItemsData = await db.select({
            phone: orders.customerPhone,
            product: orderItems.productName
        })
            .from(orderItems)
            .innerJoin(orders, eq(orders.id, orderItems.orderId));

        // Fetch Items from CXC (Credit Sales)
        const cxcItemsData = await db.select({
            phone: cxc.customerPhone,
            product: saleItems.productName
        })
            .from(saleItems)
            .innerJoin(cxc, eq(cxc.saleId, saleItems.saleId));

        logToFile(`[GET /api/customers] CXC Items Found: ${cxcItemsData.length}`);
        if (cxcItemsData.length > 0) {
            logToFile(`[GET /api/customers] Sample CXC Item: ${JSON.stringify(cxcItemsData[0])}`);
        }

        // Combine all items
        const allItems = [...orderItemsData, ...cxcItemsData];

        // Aggregate Data
        const stats = {};

        // Helper to normalize phone for matching (remove spaces, dashes)
        const normalizePhone = (p) => p ? p.replace(/\D/g, '') : '';

        // 1. Process Orders (Online/App)
        for (const order of allOrders) {
            if (!order.customerPhone) continue;
            const p = normalizePhone(order.customerPhone);
            if (!p) continue;

            if (!stats[p]) stats[p] = { orders: 0, lastOrder: null, items: {} };

            stats[p].orders += 1;
            const d = new Date(order.createdAt);
            if (!stats[p].lastOrder || d > stats[p].lastOrder) stats[p].lastOrder = d;
        }

        // 2. Process CXC (Credits - these are also "Orders")
        for (const cxcRecord of allCXC) {
            if (!cxcRecord.customerPhone) continue;
            const p = normalizePhone(cxcRecord.customerPhone);
            if (!p) continue;

            if (!stats[p]) stats[p] = { orders: 0, lastOrder: null, items: {} };

            stats[p].orders += 1;
            const d = new Date(cxcRecord.createdAt);
            if (!stats[p].lastOrder || d > stats[p].lastOrder) stats[p].lastOrder = d;
        }

        // Process Items (for favorites - Orders + CXC)
        for (const item of allItems) {
            if (!item.phone) continue;
            const p = normalizePhone(item.phone);
            if (!stats[p]) continue;

            if (!stats[p].items[item.product]) stats[p].items[item.product] = 0;
            stats[p].items[item.product] += 1;
        }

        // Merge
        const enriched = allCustomers.map(c => {
            const cleanPhone = normalizePhone(c.phone);
            const s = stats[cleanPhone] || { orders: 0, lastOrder: null, items: {} };

            // Calc Favorite
            let fav = 'N/A';
            let max = 0;
            for (const [name, qty] of Object.entries(s.items)) {
                if (qty > max) {
                    max = qty;
                    fav = name;
                }
            }

            // Check for pending debts (using normalized phone match)
            const customerDebts = allCXC.filter(d => normalizePhone(d.customerPhone) === cleanPhone && d.status === 'Pending');
            const hasPendingDebt = customerDebts.length > 0;
            const accountStatus = hasPendingDebt ? 'Abierta' : 'Cerrada';

            // Calculate total pending debt
            const totalDebt = customerDebts.reduce((sum, d) => sum + parseFloat(d.amount), 0);

            return {
                ...c,
                totalOrders: s.orders,
                lastOrderDate: s.lastOrder || c.createdAt,
                favoriteItem: fav,
                accountStatus,
                totalDebt // Return the debt amount
            };
        });

        res.json(enriched);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// --- CXC ENDPOINTS (Cuentas por Cobrar) ---
app.post('/api/cxc', verifyToken, async (req, res) => {
    try {
        const { customerName, customerPhone, items, total } = req.body;
        console.log('[POST /api/cxc] Received:', { customerName, customerPhone, total });
        logToFile(`[POST /api/cxc] Received: Name=${customerName}, Phone=${customerPhone}, Total=${total}`);

        const result = await db.transaction(async (tx) => {
            // 1. Create Sale Record
            const [newSale] = await tx.insert(sales).values({
                total: total.toString(),
                paymentMethod: 'CXC',
                userId: req.user.id // Track User
            }).returning();

            // 2. Insert Items
            if (items && items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    saleId: newSale.id,
                    productName: item.productName,
                    quantity: item.quantity.toString(),
                    unitPrice: item.unitPrice.toString(),
                    total: item.total.toString()
                }));
                await tx.insert(saleItems).values(itemsToInsert);

                // Inventory Deduction for CXC
                for (const item of items) {
                    await deductInventory(tx, item, newSale.id);
                }
            }

            // 3. Create CXC Record
            const [newCXC] = await tx.insert(cxc).values({
                saleId: newSale.id,
                customerName,
                customerPhone,
                amount: total.toString(),
                status: 'Pending',
                userId: req.user.id // Track User
            }).returning();

            // 4. Upsert Customer (Explicit Logic)
            if (customerPhone) {
                console.log('[POST /api/cxc] Handling customer:', { name: customerName, phone: customerPhone });

                // Check if exists
                const existingCustomer = await tx.select().from(customers).where(eq(customers.phone, customerPhone)).limit(1);

                if (existingCustomer.length > 0) {
                    console.log('[POST /api/cxc] Customer exists, updating name...');
                    await tx.update(customers)
                        .set({ name: customerName, updatedAt: new Date() })
                        .where(eq(customers.phone, customerPhone));
                } else {
                    console.log('[POST /api/cxc] Creating new customer...');
                    await tx.insert(customers).values({
                        name: customerName,
                        phone: customerPhone
                    });
                }
            } else {
                console.log('[POST /api/cxc] No phone provided, skipping customer handling');
            }

            return { sale: newSale, cxc: newCXC };
        });

        console.log('[POST /api/cxc] Transaction completed messages');
        logToFile('[POST /api/cxc] Transaction completed successfully');
        res.json(result);
    } catch (error) {
        console.error('[POST /api/cxc] Error:', error);
        res.status(500).json({ error: 'Failed to create CXC record', details: error.message });
    }
});

app.get('/api/cxc', verifyToken, async (req, res) => {
    try {
        // Fetch pending CXC
        const pending = await db.select().from(cxc)
            .where(eq(cxc.status, 'Pending'))
            .orderBy(desc(cxc.createdAt));
        res.json(pending);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch CXC' });
    }
});

app.put('/api/cxc/:id/pay', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.update(cxc)
            .set({
                status: 'Paid',
                paidAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(cxc.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark as paid' });
    }
});

// --- SALES ENDPOINTS ---

// --- HELPER FUNCTIONS ---
const deductInventory = async (tx, item, saleId = null) => {
     // A. Inventory Deduction Logic
    if (item.type !== 'cxc_payment') {
        let recipeIdToUse = null;

        // Normalize lookup name
        const lookupName = (item.baseName || item.productName || '').trim();
        console.log(`[Inventory] Processing Deduction for "${lookupName}" (Original: "${item.productName}")`);
        
        // 1. Try to find via Menu Item (Preferred match)
        const menuItemsFound = await tx.select().from(menuItems).where(eq(menuItems.name, lookupName)).limit(1);

        if (menuItemsFound.length > 0 && menuItemsFound[0].recipeId) {
            recipeIdToUse = menuItemsFound[0].recipeId;
            console.log(`[Inventory] Found Recipe ID ${recipeIdToUse} via Menu Item "${lookupName}"`);
        } else {
            console.log(`[Inventory] No Menu Item link found for "${lookupName}".`);
        }

        // 2. Fallback: Try to find recipe by name directly (Legacy/Direct match)
        if (!recipeIdToUse) {
            // Try explicit product name match against Recipe Table
            const recipeResults = await tx.select().from(recipes).where(eq(recipes.name, lookupName)).limit(1);
            if (recipeResults.length > 0) {
                recipeIdToUse = recipeResults[0].id;
                console.log(`[Inventory] Found Recipe ID ${recipeIdToUse} via Direct Recipe Name match "${lookupName}"`);
            } else {
                 console.log(`[Inventory] No Direct Recipe Name match for "${lookupName}".`);
            }
        }

        if (recipeIdToUse) {
            // Get ingredients
            let ingredients = await tx.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeIdToUse));
            console.log(`[Inventory] Base Ingredients count: ${ingredients.length}`);

            // --- VARIATION LOGIC START ---
            const extraIngredients = [];
            const replacements = new Set();
            const itemOptions = item.options; // Array of strings e.g. ["Grande", "Leche Almendra"]

            // Function to find option config in menu item variations
            if (menuItemsFound.length > 0 && itemOptions && Array.isArray(itemOptions) && itemOptions.length > 0) {
                const menuItem = menuItemsFound[0];
                if (menuItem.variations && Array.isArray(menuItem.variations)) {
                    menuItem.variations.forEach(group => {
                        if (group.options) {
                            group.options.forEach(opt => {
                                // If this option was selected (Flexible match: Trimmed + Case Insensitive)
                                const normalizedOptName = opt.name.trim().toLowerCase();
                                const isSelected = itemOptions.some(selected => selected.trim().toLowerCase() === normalizedOptName);
                                
                                if (isSelected) {
                                    console.log(`[Inventory] Variation Match: "${opt.name}"`);
                                    // Check mapping
                                    if (opt.ingredientMapping && opt.ingredientMapping.inventoryItem) {
                                        const mapping = opt.ingredientMapping;
                                        console.log(`[Inventory] Mapping found: ${JSON.stringify(mapping)}`);
                                        
                                        // Add to extras list (to be added)
                                        extraIngredients.push({
                                            productName: mapping.inventoryItem,
                                            quantity: mapping.quantity || 1,
                                            unit: mapping.unit || 'pza'
                                        });

                                        // Check if it replaces something
                                        if (mapping.isReplacement && mapping.replaceTarget) {
                                            replacements.add(mapping.replaceTarget);
                                            console.log(`[Inventory] Replaces target: "${mapping.replaceTarget}"`);
                                        }
                                    } else {
                                        console.log(`[Inventory] Variation "${opt.name}" has NO ingredientMapping.`);
                                    }
                                }
                            });
                        }
                    });
                }
            } else {
                if (itemOptions && itemOptions.length > 0) {
                     console.log(`[Inventory] Item has options but no linked Menu Item found to resolve them.`);
                }
            }

            // Filter base ingredients if replacements exist
            if (replacements.size > 0) {
                console.log(`[Inventory] Removing replaced ingredients:`, [...replacements]);
                ingredients = ingredients.filter(ing => !replacements.has(ing.productName));
            }

            // Combine with extras
            const finalIngredients = [...ingredients, ...extraIngredients];
            // --- VARIATION LOGIC END ---

            if (finalIngredients.length > 0) {
                const usageToInsert = finalIngredients.map(ing => ({
                    saleId: saleId, 
                    productName: ing.productName,
                    quantity: (Number(ing.quantity) * Number(item.quantity)).toString(),
                    unit: ing.unit
                }));

                await tx.insert(inventoryUsage).values(usageToInsert);
                console.log(`[Inventory] SUCCESSFULLY DEDUCTED for ${item.productName}:`, usageToInsert);
            } else {
                console.log(`[Inventory] Zero ingredients to deduct for ${item.productName}.`);
            }
        } else {
            console.log(`[Inventory] ABORT: No recipe found for "${lookupName}", skipping deduction.`);
        }
    }
};

app.post('/api/sales', verifyToken, async (req, res) => {
    try {
        console.log('[POST /api/sales] Incoming body:', JSON.stringify(req.body, null, 2));
        const { total, paymentMethod, items, customerName, customerPhone } = req.body;

        if (total === undefined || total === null || !paymentMethod) {
            console.error('[POST /api/sales] Missing required fields');
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const result = await db.transaction(async (tx) => {
            console.log('[POST /api/sales] Starting transaction...');
            const [newSale] = await tx.insert(sales).values({
                total: total.toString(),
                paymentMethod,
                customerName,
                customerPhone,
                userId: req.user.id // Track User
            }).returning();

            console.log('[POST /api/sales] Sale created:', newSale.id);

            if (items && items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    saleId: newSale.id,
                    productName: item.productName,
                    quantity: item.quantity.toString(),
                    unitPrice: item.unitPrice.toString(),
                    total: item.total.toString()
                }));
                await tx.insert(saleItems).values(itemsToInsert);
                console.log(`[POST /api/sales] ${items.length} items inserted`);

                for (const item of items) {
                    logToFile(`[POST /api/sales] Item: ${JSON.stringify(item)}`);
                    
                    // Use Helper
                    await deductInventory(tx, item, newSale.id);

                    // B. CXC Payment Logic
                    if (item.type === 'cxc_payment' && item.metadata && item.metadata.cxcId) {
                        const cxcId = parseInt(item.metadata.cxcId);
                        logToFile(`[POST /api/sales] FOUND CXC Payment for ID: ${cxcId}`);
                        await tx.update(cxc)
                            .set({
                                status: 'Paid',
                                paidAt: new Date(),
                                updatedAt: new Date()
                            })
                            .where(eq(cxc.id, cxcId));
                    }
                }
            }
            return newSale;
        });

        console.log('[POST /api/sales] Transaction committed successfully');
        res.json(result);
    } catch (error) {
        console.error('[POST /api/sales] Error:', error);
        res.status(500).json({ error: 'Error al registrar la venta: ' + error.message });
    }
});







// --- INVENTORY ALERTS ---
app.get('/api/inventory/alerts', verifyToken, async (req, res) => {
    try {
        // 1. Get Active Menu Items with Recipes
        const menu = await db.select().from(menuItems).where(eq(menuItems.isActive, true));
        const itemsWithRecipe = menu.filter(i => i.recipeId);
        
        if (itemsWithRecipe.length === 0) return res.json([]);

        // 2. Get All Recipe Ingredients
        const allIngredients = await db.select().from(recipeIngredients);

        // 3. Calculate Current Stock for ALL ingredients known
        //    Stock = Sum(Ticket Items) - Sum(Inventory Usage)
        
        // Fetch sums using raw SQL for efficiency
        const inputsRes = await db.execute(sql`
            SELECT product as name, SUM(quantity) as total 
            FROM ticket_items 
            GROUP BY product
        `);
        const outputsRes = await db.execute(sql`
            SELECT product_name as name, SUM(quantity) as total 
            FROM inventory_usage 
            GROUP BY product_name
        `);

        // Map: IngredientName -> currentStock
        const stockMap = {};
        
        inputsRes.rows.forEach(row => {
            stockMap[row.name] = parseFloat(row.total);
        });

        outputsRes.rows.forEach(row => {
            if (!stockMap[row.name]) stockMap[row.name] = 0;
            stockMap[row.name] -= parseFloat(row.total);
        });

        // 4. Determine Portions Remaining for each Menu Item
        const alerts = [];

        for (const item of itemsWithRecipe) {
            const recipeIngs = allIngredients.filter(ri => ri.recipeId === item.recipeId);
            
            if (recipeIngs.length === 0) continue; // No ingredients defined, skip

            let maxPortions = Infinity;

            for (const ing of recipeIngs) {
                const available = stockMap[ing.productName] || 0;
                const required = parseFloat(ing.quantity);
                
                if (required <= 0) continue; 

                const portions = Math.floor(available / required);
                if (portions < maxPortions) {
                    maxPortions = portions;
                }
            }

            if (maxPortions <= 2) {
                alerts.push({
                    id: item.id,
                    name: item.name,
                    portionsRemaining: maxPortions < 0 ? 0 : maxPortions,
                    status: maxPortions <= 0 ? 'Agotado' : 'Bajo Stock'
                });
            }
        }

        res.json(alerts);

    } catch (error) {
        console.error('Error calculating inventory alerts:', error);
        res.status(500).json({ error: 'Failed to calculate alerts' });
    }
});

// --- USERS & AUTH ENDPOINTS ---

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if username matches EITHER username OR email
        const [user] = await db.select().from(users).where(
            and(
                or(eq(users.username, username), eq(users.email, username)),
                isNull(users.deletedAt)
            )
        );

        if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                accessPin: user.accessPin
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const result = await db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            email: users.email,
            role: users.role,
            accessPin: users.accessPin,
            createdAt: users.createdAt
        }).from(users).where(isNull(users.deletedAt)).orderBy(desc(users.createdAt));
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

app.get('/api/users/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [user] = await db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            email: users.email,
            role: users.role,
            accessPin: users.accessPin
        }).from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

app.post('/api/users', verifyToken, async (req, res) => {
    try {
        const { name, username, email, password, role, accessPin } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [newUser] = await db.insert(users).values({
            name,
            username,
            email,
            password: hashedPassword,
            role,
            accessPin: accessPin || null
        }).returning();

        res.json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

app.put('/api/users/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, username, email, password, role, accessPin } = req.body;

        const updateData = {
            name,
            username,
            email,
            role,
            accessPin: accessPin || null,
            updatedAt: new Date()
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await db.update(users).set(updateData).where(eq(users.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

app.delete('/api/users/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// --- REPORTS ENDPOINTS ---

app.get('/api/reports/daily', verifyToken, async (req, res) => {
    try {
        const { date, userId } = req.query; // Expecting YYYY-MM-DD
        const targetDate = date ? new Date(date + 'T00:00:00') : new Date();

        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        // Filter by user if provided
        const userFilter = userId && userId !== 'all' ? eq(sales.userId, parseInt(userId)) : undefined;

        const result = await db.select({
            paymentMethod: sales.paymentMethod,
            total: sql`sum(${sales.total})::numeric`
        })
            .from(sales)
            .where(
                and(
                    isNull(sales.deletedAt),
                    between(sales.createdAt, start, end),
                    userFilter
                )
            )
            .groupBy(sales.paymentMethod);

        // Transform to a more usable object for the frontend
        const summary = {
            date: start.toISOString().split('T')[0],
            efectivo: 0,
            tarjeta: 0,
            transferencia: 0,
            uber: 0, // Uber Eats
            cortesia: 0,
            cxc: 0,
            total: 0
        };

        result.forEach(row => {
            const amount = parseFloat(row.total);
            const method = row.paymentMethod.toLowerCase();
            
            // Only add to Total if it's REAL income (Cash, Card, Transfer, Uber)
            // STRICT WHITELIST APPROACH
            const validIncomeMethods = ['efectivo', 'tarjeta', 'transferencia', 'uber eats'];
            if (validIncomeMethods.includes(method.trim())) {
                summary.total += amount;
            }

            if (method === 'efectivo') summary.efectivo = amount;
            else if (method === 'tarjeta') summary.tarjeta = amount;
            else if (method === 'transferencia') summary.transferencia = amount;
            else if (method === 'uber eats') summary.uber = amount;
            else if (method === 'cortesía' || method === 'cortesia') summary.cortesia = amount;
            else if (method === 'cxc') summary.cxc = amount;
        });

        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch daily report' });
    }
});

// --- MENU ITEMS ENDPOINTS ---

app.get('/api/menu-items', async (req, res) => {
    try {
        // Fetch menu items and join with recipes to get default costs
        // Drizzle join:
        const result = await db.select({
            id: menuItems.id,
            name: menuItems.name,
            price: menuItems.price,
            description: menuItems.description,
            isActive: menuItems.isActive,
            variations: menuItems.variations,
            isActive: menuItems.isActive,
            variations: menuItems.variations,
            category: menuItems.category,
            icon: menuItems.icon,
            recipeId: menuItems.recipeId,
            recipeId: menuItems.recipeId,
            recipeName: recipes.name,
            updatedAt: menuItems.updatedAt
        })
            .from(menuItems)
            .leftJoin(recipes, eq(menuItems.recipeId, recipes.id))
            .where(isNull(menuItems.deletedAt))
            .orderBy(desc(menuItems.updatedAt));

        // Note: To get "Costo Real", we need ingredients.
        // Option A: Fetch all ingredients for each recipe.
        // Option B: Just return recipeId and let frontend fetch recipe details or common store.
        // Let's do Option A for completeness / robustness for the list view 'Real Cost' column.

        const detailedResult = await Promise.all(result.map(async (item) => {
            let realCost = 0;
            if (item.recipeId) {
                const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, item.recipeId));
                // We need unit prices from inventory (ticketItems AVG)
                // This logic is duplicated from RecipeForm. ideally should be a helper.
                // For now, let's keep it simple: Frontend calculates cost? 
                // Creating a helper function inside server for cost calc is better but out of scope for quick refactor.
                // Let's fetch ingredients and let frontend calculate or do a quick calc here if possible.
                // Optimization: Fetch inventory once.

                // Let's just return the ingredients and their quantities. frontend has the inventory prices context usually.
                // Actually, backend calculation is safer.
                // Let's defer cost calculation to a specialized endpoint or just return recipeId and handle logic on front for now to match current architecture.
                // "MenuListView" previously calculated it from ingredients.
                return { ...item, ingredients };
            }
            return { ...item, ingredients: [] };
        }));

        res.json(detailedResult);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

app.post('/api/menu-items', verifyToken, async (req, res) => {
    try {
        const { name, recipeId, price, description, isActive, variations, category, icon } = req.body;
        const [newItem] = await db.insert(menuItems).values({
            name,
            recipeId: recipeId || null,
            price: price || '0',
            description,
            variations: variations || [],
            category: category || 'General',
            icon: icon || null,
            isActive: isActive !== undefined ? isActive : true
        }).returning();
        res.json(newItem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

app.put('/api/menu-items/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, recipeId, price, description, isActive, variations, category, icon } = req.body;
        await db.update(menuItems).set({
            name,
            recipeId: recipeId || null,
            price: price || '0',
            description,
            variations: variations || [],
            category: category || 'General',
            icon: icon || null,
            isActive,
            updatedAt: new Date()
        }).where(eq(menuItems.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

app.delete('/api/menu-items/:id', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.update(menuItems).set({ deletedAt: new Date() }).where(eq(menuItems.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

// --- ADVANCED REPORTING ENDPOINTS ---

app.get('/api/reports/detailed', verifyToken, async (req, res) => {
    try {
        const { date, userId } = req.query;
        if (!date) return res.status(400).json({ error: 'Date required' });

        const start = new Date(date + 'T00:00:00');
        const end = new Date(date + 'T23:59:59');

        // userFilter logic
        const userFilter = userId && userId !== 'all' ? eq(sales.userId, parseInt(userId)) : undefined;
        // Expenses/Tickets might filter by userId too if column exists and userId is provided
        const expenseUserFilter = userId && userId !== 'all' ? eq(fixedExpenses.userId, parseInt(userId)) : undefined;
        const ticketUserFilter = userId && userId !== 'all' ? eq(tickets.userId, parseInt(userId)) : undefined;
        const cxcUserFilter = userId && userId !== 'all' ? eq(cxc.userId, parseInt(userId)) : undefined;


        // 1. Sales Breakdown (including Payment Methods & Courtesies)
        const salesData = await db.select().from(sales)
            .where(and(
                isNull(sales.deletedAt),
                between(sales.createdAt, start, end),
                userFilter
            ));

        const salesSummary = {
            total: 0,
            methods: {},
            courtesies: []
        };

        const validMethods = ['efectivo', 'tarjeta', 'transferencia', 'uber eats'];

        salesData.forEach(sale => {
            const method = sale.paymentMethod.toLowerCase().trim();
            const total = parseFloat(sale.total);

            // Courtesies
            if (method === 'cortesía' || method === 'cortesia') {
                salesSummary.courtesies.push({
                    id: sale.id,
                    total: total,
                    customer: sale.customerName || 'N/A',
                    time: new Date(sale.createdAt).toLocaleTimeString()
                });
            } 
            // Real Sales
            else if (validMethods.includes(method)) {
                salesSummary.total += total;
                if (!salesSummary.methods[method]) salesSummary.methods[method] = 0;
                salesSummary.methods[method] += total;
            }
        });

        // 2. Expenses (Gastos)
        const expenseData = await db.select().from(fixedExpenses)
            .where(and(
                isNull(fixedExpenses.deletedAt),
                between(fixedExpenses.expenseDate, start, end),
                expenseUserFilter
            ));
        
        const expenses = expenseData.map(e => ({
            id: e.id,
            concept: e.concept,
            amount: parseFloat(e.amount),
            time: new Date(e.expenseDate).toLocaleTimeString() // Approx if only date stored
        }));
        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

        // 3. Purchases (Compras)
        const purchaseData = await db.select().from(tickets)
            .where(and(
                isNull(tickets.deletedAt),
                between(tickets.purchaseDate, start, end),
                ticketUserFilter
            ));

        const purchases = purchaseData.map(t => ({
            id: t.id,
            ref: t.ticketRef,
            provider: t.provider,
            total: parseFloat(t.total)
        }));
        const totalPurchases = purchases.reduce((acc, t) => acc + t.total, 0);

        // 4. CXC Day (Debts generated today)
        // We use the `cxc` table creation date
        const cxcDayData = await db.select().from(cxc)
            .where(and(
                between(cxc.createdAt, start, end),
                cxcUserFilter
            ));
        
        const cxcDay = cxcDayData.map(c => ({
            id: c.id,
            customer: c.customerName,
            amount: parseFloat(c.amount),
            status: c.status
        }));
        const totalCXCDay = cxcDay.reduce((acc, c) => acc + c.amount, 0);

        // 5. CXC Accumulated (Total Pending Debts)
        const cxcPendingData = await db.select().from(cxc)
            .where(and(
                eq(cxc.status, 'Pending'),
                cxcUserFilter
            ));
        const totalCXCPending = cxcPendingData.reduce((acc, c) => acc + parseFloat(c.amount), 0);

        res.json({
            sales: salesSummary,
            expenses: { total: totalExpenses, list: expenses },
            purchases: { total: totalPurchases, list: purchases },
            cxcDay: { total: totalCXCDay, list: cxcDay },
            cxcTotalPending: totalCXCPending
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch detailed report' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
