<template>
    <div class="legal-page">
        <div class="container">
            <h1>Aviso de Privacidad</h1>
            <p><strong>Última actualización: Diciembre 2025</strong></p>

            <section>
                <h2>1. Responsable de la protección de sus datos personales</h2>
                <p>La Administración de este establecimiento (en adelante "El Responsable"), con domicilio en la ubicación del local comercial, es responsable del tratamiento de sus datos personales.</p>
            </section>

            <section>
                <h2>2. Finalidad del tratamiento de datos</h2>
                <p>Sus datos personales serán utilizados para las siguientes finalidades necesarias para el servicio que solicita:</p>
                <ul>
                    <li>Procesar, completar y administrar sus pedidos de alimentos y bebidas.</li>
                    <li>Contactarlo en caso de incidencias con su pedido o entrega.</li>
                    <li>Emisión de comprobantes de pago y facturación si es requerida.</li>
                    <li>Análisis interno para mejorar nuestros productos y servicios.</li>
                </ul>
            </section>

            <section>
                <h2>3. Datos recabados</h2>
                <p>Para llevar a cabo las finalidades descritas, recabaremos lo siguientes datos personales:</p>
                <ul>
                    <li>Nombre completo.</li>
                    <li>Teléfono de contacto.</li>
                    <li>Dirección de entrega (en caso de servicio a domicilio).</li>
                    <li>Datos de facturación (si aplica).</li>
                </ul>
            </section>

            <section>
                <h2>4. Derechos ARCO</h2>
                <p>Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición).</p>
            </section>

            <div class="back-link">
                <router-link to="/menu">Regresar al Menú</router-link>
            </div>
        </div>
    </div>
</template>

<style scoped>
.legal-page {
    background: #f8fafc;
    min-height: 100vh;
    padding: 2rem 1rem;
    font-family: 'Inter', sans-serif;
    color: #334155;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

h1 {
    font-size: 2rem;
    color: #0f172a;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 1rem;
}

h2 {
    font-size: 1.25rem;
    color: #1e293b;
    margin-top: 2rem;
    margin-bottom: 1rem;
}

p, li {
    line-height: 1.6;
    margin-bottom: 0.75rem;
}

ul {
    padding-left: 1.5rem;
}

.back-link {
    margin-top: 3rem;
    text-align: center;
}

.back-link a {
    color: var(--color-primary, #0f766e);
    font-weight: 600;
    text-decoration: none;
}
.back-link a:hover {
    text-decoration: underline;
}

@media (max-width: 640px) {
    .container {
        padding: 1.5rem;
    }
}
</style>
