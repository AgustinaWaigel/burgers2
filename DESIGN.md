# Dirección visual: Turno noche / arcade oscuro

Confirmada por el usuario: estética de videojuego arcade oscuro.

- Fondo carbón, superficies oliva oscuro, texto crema y acciones rojo tomate. El ámbar identifica el foco del teclado.
- Press Start 2P para títulos y acciones breves; Geist para ingredientes y formularios; Geist Mono para precios y señales de la máquina.
- Portada con una máquina arcade y un sprite vectorial de hamburguesa construido sobre una cuadrícula de píxeles. Es una ilustración, no una fotografía comercial.
- Catálogo en filas con precio y personalización visibles; categorías seleccionables y estado de producto agotado explícito.
- Carrito, personalizador, checkout y administración comparten superficies, bordes, campos y controles. Diálogos nativos con foco contenido y cierre con Escape.
- En celular, portada y formularios pasan a una columna. Controles de al menos 44 px, títulos ajustados al ancho y precios con cifras tabulares.
- Movimiento limitado a la entrada del sprite y feedback de botones. Se respeta movimiento reducido.
- Nombres, fotografías comerciales, precios, horarios y disponibilidad provienen de los datos existentes. Los estados vacíos explican la ausencia sin revelar detalles de infraestructura.

## Movimiento de la interfaz

- Entrada de portada de 450 ms, con desfases de 50 ms y contenido siempre operable.
- Modales centrados: opacidad y escala desde 0,96; entrada de 250 ms y salida de 160 ms.
- Carrito: desplazamiento lateral con la curva `--ease-drawer`.
- Presión de botones: escala 0,97 durante 120 ms. Los efectos de hover se limitan a punteros precisos.
- Las acciones por teclado son inmediatas. Movimiento reducido conserva fundidos breves sin desplazamiento ni escala.
- Los diálogos mantienen el foco contenido, permiten Escape y devuelven el foco al origen. El cierre se bloquea mientras el formulario guarda.
