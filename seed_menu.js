import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';

const menuData = {
    "BEBIDAS": [
        { name: "Agua Sta María 500 ml", price: "20.00" },
        { name: "Ciel Mineral 355 ml", price: "25.00" },
        { name: "Coca Cola Light 355 ml", price: "25.00" },
        { name: "Coca Cola Mini", price: "15.00" },
        { name: "Coca Cola Regular", price: "25.00" },
        { name: "Coca Cola Zero Mini", price: "15.00" },
        { name: "Fanta Mini", price: "15.00" },
        { name: "Fresca Mini", price: "15.00" },
        { name: "Jumex Durazno Mini", price: "12.00" },
        { name: "Jumex Mango Mini", price: "12.00" },
        { name: "Jumex Manzana Mini", price: "12.00" },
        { name: "Mundet Mini", price: "15.00" }
    ],
    "BARRA DE CAFÉ": [
        { name: "Café Americano", price: "34.00" },
        { name: "Café de Olla", price: "39.00" },
        { name: "Capuccino", price: "49.00" },
        { name: "Latte", price: "49.00" },
        { name: "Moka", price: "49.00" },
        { name: "Frappé (Sabores)", price: "69.00" },
        { name: "Frappé Pan de Muerto", price: "59.00" },
        { name: "Promoción Desayuno", price: "99.00" }
    ],
    "SANDWICHES": [
        { name: "Chapata de Atún", price: "99.00" },
        { name: "Chapata de Pechuga de Pavo", price: "109.00" },
        { name: "Chapata de Pollo", price: "119.00" },
        { name: "Croissant de Jamón y Queso", price: "99.00" },
        { name: "Croissant de Queso y Zarzamora", price: "89.00" },
        { name: "Sandwich de Atún", price: "99.00" },
        { name: "Sandwich de Pechuga de Pavo", price: "89.00" }
    ],
    "DESAYUNOS": [
        { name: "Chilaquiles con Pollo", price: "79.00" },
        { name: "Chilaquiles Sencillos", price: "69.00" },
        { name: "Enchiladas Verdes", price: "79.00" },
        { name: "Fruta con Yogurt", price: "59.00" },
        { name: "Hotcakes (3)", price: "49.00" },
        { name: "Jugo de Naranja", price: "49.00" },
        { name: "Jugo Verde", price: "49.00" },
        { name: "Molletes con Jamón", price: "79.00" },
        { name: "Molletes Sencillos", price: "69.00" }
    ],
    "HUEVOS": [
        { name: "Omelette de Jamón", price: "69.00" },
        { name: "Omelette Vegetariano", price: "69.00" },
        { name: "Omelette de Champiñones", price: "69.00" }
    ]
};

async function seedMenu() {
    console.log('🌱 Seeding Menu Items...');
    
    try {
        const itemsToInsert = [];

        for (const [category, items] of Object.entries(menuData)) {
            for (const item of items) {
                itemsToInsert.push({
                    name: item.name,
                    price: item.price,
                    category: category,
                    isActive: true
                });
            }
        }

        if (itemsToInsert.length > 0) {
            await db.insert(menuItems).values(itemsToInsert);
            console.log(`✅ Successfully inserted ${itemsToInsert.length} menu items.`);
        } else {
            console.log('⚠️ No items to insert.');
        }

    } catch (error) {
        console.error('❌ Error seeding menu:', error);
    } finally {
        process.exit(0);
    }
}

seedMenu();
