import { pgTable, text, serial, numeric, timestamp, integer, boolean, json, index } from 'drizzle-orm/pg-core';

export const tickets = pgTable('tickets', {
    id: serial('id').primaryKey(),
    ticketRef: text('ticket_ref').notNull(), // The user entered ID like TKT-2025-0015
    provider: text('provider').notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: text('payment_method').notNull(),
    status: text('status').default('No Desglosado'), // 'No Desglosado', 'Desglosado'
    purchaseDate: timestamp('purchase_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at'),
    userId: integer('user_id').references(() => users.id), // Added for user tracking
}, (table) => {
    return {
        purchaseDateIdx: index('tickets_purchase_date_idx').on(table.purchaseDate),
        statusIdx: index('tickets_status_idx').on(table.status),
        ticketRefIdx: index('tickets_ref_idx').on(table.ticketRef),
    };
});

export const ticketItems = pgTable('ticket_items', {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id').references(() => tickets.id).notNull(),
    product: text('product').notNull(),
    quantity: numeric('quantity', { precision: 15, scale: 6 }).notNull(),
    unit: text('unit').notNull(),
    unitPrice: numeric('unit_price', { precision: 15, scale: 6 }).notNull(),
    discount: numeric('discount', { precision: 15, scale: 6 }).default('0'),
    total: numeric('total', { precision: 15, scale: 6 }).notNull(),
    type: text('type').default('Insumo'), // 'Terminado', 'Insumo', 'Operativo'
}, (table) => {
    return {
        ticketIdIdx: index('ticket_items_ticket_id_idx').on(table.ticketId),
        productIdx: index('ticket_items_product_idx').on(table.product),
    };
});

export const fixedExpenses = pgTable('fixed_expenses', {
    id: serial('id').primaryKey(),
    concept: text('concept').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paidTo: text('paid_to').notNull(),
    paymentMethod: text('payment_method').notNull(),
    frequency: text('frequency').notNull(), // 'Mensual', 'Bimestral', 'Anual', etc.
    expenseDate: timestamp('expense_date').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
    userId: integer('user_id').references(() => users.id), // Added for user tracking
}, (table) => {
    return {
        expenseDateIdx: index('expenses_date_idx').on(table.expenseDate),
    };
});

export const recipes = pgTable('recipes', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    category: text('category').notNull(),
    isPublic: boolean('is_public').default(true),
    variations: json('variations'),
    imageUrl: text('image_url'), // Added to prevent data-loss warning during migration
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const recipeIngredients = pgTable('recipe_ingredients', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
    productName: text('product_name').notNull(), // Links to inventory/ticket_items product name
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unit: text('unit').notNull(),
}, (table) => {
    return {
        recipeIdIdx: index('recipe_ingredients_recipe_id_idx').on(table.recipeId),
    };
});

export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone'),
    deliveryTime: text('delivery_time'), // Changed to text to store "14:30" or specific format easily
    deliveryLocation: text('delivery_location'),
    paymentMethod: text('payment_method'), // 'Efectivo', 'Tarjeta', 'Transferencia'
    notes: text('notes'),
    status: text('status').default('Nuevo'), // 'Nuevo', 'En preparación', 'En entrega', 'Completado'
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
}, (table) => {
    return {
        createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
        statusIdx: index('orders_status_idx').on(table.status),
        phoneIdx: index('orders_phone_idx').on(table.customerPhone),
    };
});

export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    productName: text('product_name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    notes: text('notes'),
    options: json('options'),
}, (table) => {
    return {
        orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
    };
});

export const sales = pgTable('sales', {
    id: serial('id').primaryKey(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: text('payment_method').notNull(), // 'Efectivo', 'Tarjeta', 'Transferencia', 'CXC', 'Cortesía'
    customerName: text('customer_name'), // Copied from Order or CXC
    customerPhone: text('customer_phone'), // Copied from Order or CXC
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at'),
    userId: integer('user_id').references(() => users.id), // Added for user tracking
}, (table) => {
    return {
        createdAtIdx: index('sales_created_at_idx').on(table.createdAt),
        paymentMethodIdx: index('sales_payment_method_idx').on(table.paymentMethod),
        customerPhoneIdx: index('sales_customer_phone_idx').on(table.customerPhone),
    };
});

export const saleItems = pgTable('sale_items', {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id').references(() => sales.id).notNull(),
    productName: text('product_name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
}, (table) => {
    return {
        saleIdIdx: index('sale_items_sale_id_idx').on(table.saleId),
        productNameIdx: index('sale_items_product_name_idx').on(table.productName),
    };
});

export const inventoryUsage = pgTable('inventory_usage', {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id').references(() => sales.id), // Nullable now
    orderId: integer('order_id').references(() => orders.id), // New field
    productName: text('product_name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unit: text('unit').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        saleIdIdx: index('inv_usage_sale_id_idx').on(table.saleId),
        orderIdIdx: index('inv_usage_order_id_idx').on(table.orderId),
        productNameIdx: index('inv_usage_product_name_idx').on(table.productName),
    };
});



export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    username: text('username').unique().notNull(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(), // Hashed
    role: text('role').notNull(), // 'Administrador', 'Gerencia', 'Operativo'
    accessPin: text('access_pin'), // 4-char PIN for quick unlock
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const menuItems = pgTable('menu_items', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    recipeId: integer('recipe_id').references(() => recipes.id),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    description: text('description'),
    variations: json('variations'), // JSON structure for Size/Modifiers
    category: text('category').notNull().default('General'),
    icon: text('icon'), // New Icon field
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
}, (table) => {
    return {
        recipeIdIdx: index('menu_items_recipe_id_idx').on(table.recipeId),
    };
});

export const customers = pgTable('customers', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').unique().notNull(), // Unique identifier
    createdAt: timestamp('created_at').defaultNow(),
});

export const cxc = pgTable('cxc', {
    id: serial('id').primaryKey(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone'),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    saleId: integer('sale_id').references(() => sales.id),
    status: text('status').default('Pending'), // 'Pending', 'Paid'
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    paidAt: timestamp('paid_at'),
    userId: integer('user_id').references(() => users.id), // Added for user tracking
}, (table) => {
    return {
        statusIdx: index('cxc_status_idx').on(table.status),
        customerPhoneIdx: index('cxc_customer_phone_idx').on(table.customerPhone),
        saleIdIdx: index('cxc_sale_id_idx').on(table.saleId),
    };
});
