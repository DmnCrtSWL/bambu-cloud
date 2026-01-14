import { db } from './src/db/index.js';
import { menuItems } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const updates = [
    // BEBIDAS (Amable/Friendly)
    { name: "Agua Sta María 500 ml", description: "Refrescante pureza para acompañar tu momento con suavidad." },
    { name: "Ciel Mineral 355 ml", description: "Burbujas gentiles que avivan tu energía suavemente." },
    { name: "Coca Cola Light 355 ml", description: "El sabor que te gusta, ligero y amable contigo." },
    { name: "Coca Cola Mini", description: "Un pequeño gusto para alegrar tu día." },
    { name: "Coca Cola Regular", description: "La compañía perfecta para compartir sonrisas." },
    { name: "Coca Cola Zero Mini", description: "Todo el sabor, sin azúcar, en una dosis de felicidad." },
    { name: "Fanta Mini", description: "Divertido toque de naranja para refrescarte amablemente." },
    { name: "Fresca Mini", description: "Cítricos suaves que revitalizan tu paladar." },
    { name: "Jumex Durazno Mini", description: "La suavidad del durazno en un sorbo cariñoso." },
    { name: "Jumex Mango Mini", description: "Dulzura tropical que abraza tu gusto." },
    { name: "Jumex Manzana Mini", description: "El confort de la manzana en su versión más tierna." },
    { name: "Mundet Mini", description: "Sabor a tradición que refresca con gentileza." },

    // BARRA DE CAFÉ (Confortable/Cozy)
    { name: "Café Americano", description: "La esencia del grano, cálida y reconfortante." },
    { name: "Café de Olla", description: "Especias y piloncillo que saben a hogar." },
    { name: "Capuccino", description: "Espuma de leche como una nube suave sobre espresso intenso." },
    { name: "Latte", description: "Cremosa armonía láctea que invita a relajarse." },
    { name: "Moka", description: "El dulce encuentro entre el chocolate y el café para apapacharte." },
    { name: "Frappé (Sabores)", description: "Una pausa fría y dulce para consentirte profundamente." },
    { name: "Frappé Pan de Muerto", description: "El sabor de la temporada hecho caricia helada." },
    { name: "Promoción Desayuno", description: "La combinación perfecta para iniciar tu día con calidez y energía." },

    // SANDWICHES (Deliciosa y Fresca/Delicious & Fresh)
    { name: "Chapata de Atún", description: "Pan artesanal crujiente y atún fresco, una mezcla deliciosa y ligera." },
    { name: "Chapata de Pechuga de Pavo", description: "Sabores frescos y equilibrados en cada mordida deliciosa." },
    { name: "Chapata de Pollo", description: "Jugoso pollo y vegetales frescos abrazados por pan crujiente." },
    { name: "Croissant de Jamón y Queso", description: "Masa hojaldrada y dorada con un relleno clásico irresistiblemente sabroso." },
    { name: "Croissant de Queso y Zarzamora", description: "El balance exquisito y fresco entre lo dulce y lo cremoso." },
    { name: "Sandwich de Atún", description: "La opción fresca y nutritiva que siempre se antoja." },
    { name: "Sandwich de Pechuga de Pavo", description: "Sencillo, fresco y lleno de sabor natural en cada capa." },

    // DESAYUNOS (Deliciosa y Fresca)
    { name: "Chilaquiles con Pollo", description: "Salsa casera vibrante sobre totopos y pollo tierno recién hecho." },
    { name: "Chilaquiles Sencillos", description: "El crujir delicioso de la tradición servido con frescura." },
    { name: "Enchiladas Verdes", description: "Tortillas suaves bañadas en frescura verde, queso y crema de primera." },
    { name: "Fruta con Yogurt", description: "Selección de frutas de temporada llenas de frescura, color y vida." },
    { name: "Hotcakes (3)", description: "Esponjosos y dorados, listos para un desayuno dulce y delicioso." },
    { name: "Jugo de Naranja", description: "Exprimido al momento, pura energía cítrica y frescura vital." },
    { name: "Jugo Verde", description: "Una explosión de vitalidad y frescura natural en tu vaso." },
    { name: "Molletes con Jamón", description: "Pan tostado con frijoles y queso gratinado al momento, irresistiblemente sabroso." },
    { name: "Molletes Sencillos", description: "El sabor auténtico de lo simple, preparado con ingredientes frescos." },

    // HUEVOS (Deliciosa y Fresca)
    { name: "Omelette de Jamón", description: "Huevos batidos y cocinados a la perfección con jamón de calidad." },
    { name: "Omelette Vegetariano", description: "Vegetales frescos del día abrazados por huevo esponjoso y delicioso." },
    { name: "Omelette de Champiñones", description: "El sabor de la tierra en un platillo fresco, nutritivo y lleno de sabor." }
];

async function updateDescriptions() {
    console.log('📝 Actualizando descripciones del menú...');
    
    try {
        let count = 0;
        for (const item of updates) {
            const result = await db.update(menuItems)
                .set({ description: item.description })
                .where(eq(menuItems.name, item.name))
                .returning({ updatedId: menuItems.id });
                
            if (result.length > 0) count++;
        }

        console.log(`✅ Se actualizaron las descripciones de ${count} productos.`);

    } catch (error) {
        console.error('❌ Error updating descriptions:', error);
    } finally {
        process.exit(0);
    }
}

updateDescriptions();
