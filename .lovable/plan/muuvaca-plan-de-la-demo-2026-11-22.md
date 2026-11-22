# Muuvaca — Plan de la demo

Web app instalable donde productores publican y alquilan maquinaria, herramientas y ganado, con acta fotográfica, depósito de garantía y pago por QR sobre la red Stellar (testnet para la demo).

## Pantallas
1. **Inicio** (`/`): propuesta de valor, cómo funciona (publicar, reservar, entregar, devolver, calificar), categorías y llamado a la acción.
2. **Explorar** (`/explorar`): listado de publicaciones reales de la base de datos, filtros por categoría, precio y cercanía (ubicación del navegador). Estado vacío honesto si aún no hay publicaciones.
3. **Detalle** (`/publicacion/$id`): fotos, precio por día, depósito, disponibilidad en calendario, perfil y reputación del dueño, botón Reservar.
4. **Ingresar / Registro** (`/auth`): correo y contraseña.
5. **Publicar** (`/publicar`): formulario con fotos, categoría, precio, depósito, ubicación y fechas disponibles.
6. **Mis reservas** (`/reservas`): como arrendatario y como dueño, con estados: solicitada, aceptada, pagada, entregada, devuelta, cerrada.
7. **Reserva** (`/reservas/$id`): flujo paso a paso:
   - Pago: QR Stellar (alquiler + depósito) y verificación de la transacción en la red.
   - Acta de entrega con fotos y notas, firmada por ambas partes.
   - Acta de devolución con fotos; al confirmar, se registra liberación del depósito y comisión de Muuvaca.
   - Calificación mutua y reseña.
8. **Perfil** (`/perfil/$id`): historial verificable: alquileres completados, calificación media, reseñas y enlaces a las transacciones en Stellar.
9. **Mi cuenta** (`/cuenta`): datos, dirección Stellar pública, mis publicaciones.

## Funcionalidad clave
- Reservas por rango de fechas sin solapamientos.
- Cálculo: días x precio + depósito; comisión configurable (porcentaje).
- Cada pago y cada acta guardan su hash; las actas se anclan en Stellar mediante un memo con el hash, consultable en el explorador público.
- Estados de carga, errores y confirmaciones en todos los formularios.
- Sin datos inventados: todo lo que se muestra lo crean los usuarios.
- Instalable en el celular (ícono en pantalla de inicio).

## Diseño
Estilo rural moderno: tonos tierra, verde pasto y crema, tipografía con carácter, tarjetas con fotos grandes, pensado primero para celular.

## Etapas
1. Diseño base, inicio, navegación, metadatos.
2. Lovable Cloud: usuarios, perfiles, publicaciones, fotos, reservas, actas, reseñas.
3. Publicar, explorar, detalle, reservar.
4. Pago QR Stellar testnet y verificación; anclaje de actas.
5. Actas con fotos, devolución, liberación de depósito, calificaciones, perfil con historial.
6. Instalable, pruebas de reglas (precios, fechas, comisión), verificación en navegador y publicación con enlace público.

## Detalles técnicos
- TanStack Start + React + TypeScript + Tailwind v4; Lovable Cloud (base de datos, autenticación, almacenamiento de fotos) con RLS.
- Stellar: `@stellar/stellar-sdk`, URI SEP-7 en QR, verificación en Horizon testnet desde función de servidor. El depósito queda en una cuenta de custodia de Muuvaca (testnet); su devolución en la demo se registra en el sistema (liberación automática en cadena requiere clave de custodia como secreto, opcional).
- GitHub: se conecta desde Lovable (Conectores > GitHub), sincroniza el código.
- Despliegue: el enlace público se obtiene publicando en Lovable. Vercel: el proyecto está orientado a servidores tipo edge; incluiré instrucciones en README, pero el enlace recomendado es el de Lovable.
