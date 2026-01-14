<template>
    <div class="legal-page">
        <div class="container">
            <h1>Términos y Condiciones</h1>
            <p><strong>Última actualización: Diciembre 2025</strong></p>

            <section>
                <h2>1. Aceptación de los Términos</h2>
                <p>Al acceder y utilizar nuestro servicio de pedidos en línea, usted acepta estar sujeto a los siguientes términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar nuestros servicios.</p>
            </section>

            <section>
                <h2>2. Pedidos y Pagos</h2>
                <p>Al realizar un pedido a través de nuestra plataforma:</p>
                <ul>
                    <li>Usted garantiza que la información proporcionada (nombre, teléfono, dirección) es exacta y completa.</li>
                    <li>Usted se compromete a pagar el total del pedido mediante el método de pago seleccionado.</li>
                    <li>Nos reservamos el derecho de rechazar cualquier pedido por cualquier motivo, incluyendo falta de disponibilidad de productos.</li>
                </ul>
            </section>

            <section>
                <h2>3. Tiempos de Entrega</h2>
                <p>Los tiempos de entrega mostrados son estimados y dependen de la disponibilidad y carga de trabajo en cocina. Haremos nuestro mejor esfuerzo para cumplir con los horarios programados, pero no garantizamos la entrega a la hora exacta.</p>
            </section>

            <section>
                <h2>4. Cancelaciones y Reembolsos</h2>
                <p>Una vez que el pedido ha comenzado a prepararse (estado "En Preparación"), no se aceptan cancelaciones. Las solicitudes de reembolso por problemas de calidad serán evaluadas caso por caso por la gerencia.</p>
            </section>

            <section>
                <h2>5. Modificaciones</h2>
                <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en este sitio.</p>
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
