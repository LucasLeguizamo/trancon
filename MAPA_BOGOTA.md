# Mapa de Bogotá — especificación para Trancón

## Objetivo

Construir un distrito jugable, reconocible y coherente de Bogotá, no una réplica
completa de la ciudad. El recorte operativo vive en `docs/agents/MAPA_PLAN.md`:
tajadas desde **InnovaLab (Carrera 15 #93A-10)**, con calzada, TransMilenio y
ciclorrutas en el mismo bbox.

Este archivo guarda sabor, paleta y landmarks. La geometría se hornea por
tajada; no sustituye al plan vivo.

## Área, orientación y escala

- **Convención:** norte = arriba; oriente = derecha. Los cerros siempre ocupan el
  borde derecho y no son transitables.
- **Área finita principal:** 6 400 x 4 800 unidades de mundo, con origen `(0, 0)`
  al noroccidente y `(6400, 4800)` al suroriente.
- **Escala de juego:** 1 unidad = 0,5 m aproximadamente. Una cuadra local mide
  160–220 unidades (80–110 m). Es una abstracción visual, no cartografía métrica.
- **Límites:** edificios/andenes bloquean norte, sur y occidente; el borde oriental
  termina en ladera, bosque y muro de contención. Los bordes pueden encadenar a
  sectores procedurales con el mismo estilo, pero la ruta de misión permanece en
  este distrito diseñado.
- **Cuadrícula base:** vías este-oeste cada 520–640 unidades y vías norte-sur cada
  520–720 unidades. Romper la cuadrícula en el lado oriental: Séptima se curva y
  los cerros invaden algunas manzanas.

## Red vial y geometría

La red usa carriles con centrolineas, no un mapa de tiles. Cada calle define ancho,
sentido, carriles, velocidad, conectividad y controles de semáforo. Todas las
intersecciones se resuelven como nodos y todos los bordes de carril como segmentos
dirigidos; eso permite tanto IA como ruteo A*.

| Eje | Posición aproximada | Forma y uso |
| --- | --- | --- |
| Avenida Caracas | x=1 500 | Corredor norte-sur de 4 carriles generales, dos por sentido, y franja central exclusiva de TransMilenio. Es el eje de mayor tráfico. |
| Carrera 13 | x=2 350 | Norte-sur, 2 carriles por sentido, comercio, paraderos y taxis. Conecta con Caracas mediante calles transversales. |
| Carrera Séptima | x=4 950→5 400 | Norte-sur sinuosa al pie de los cerros; 1–2 carriles por sentido, más angosta, con ciclovía y alto flujo peatonal. |
| Avenida Circunvalar | x=5 900 | Vía panorámica discontinua junto a la ladera; un sentido por tramo, curvas pronunciadas y accesos limitados. |
| Calle 26 | y=1 800 | Arteria oeste-este de 3 carriles por sentido. Conecta Caracas, Centro Internacional y acceso al centro. |
| Calle 45 | y=2 750 | Arteria este-oeste de 2 carriles por sentido, con cruces de Séptima/Caracas y mucha actividad universitaria. |
| Calle 63 | y=3 750 | Eje este-oeste de 2 carriles por sentido; sirve como límite norte del circuito principal. |
| Avenida Jiménez | y=800 | Corredor curvo de menor escala que lleva hacia el centro histórico; preferencia peatonal y tráfico lento. |

### Jerarquía de vías

- Arterias: 64–80 unidades de calzada, separador de 12–24 y velocidad IA de
  45–60 km/h.
- Colectoras: 44–56 unidades, dos carriles totales o cuatro estrechos, 30–40 km/h.
- Locales: 28–36 unidades, dos sentidos estrechos, 20–30 km/h.
- Andenes: 18–32 unidades, con bolardos, árboles, vendedores, postes y paraderos.
- Cada cruce arterial tiene paso peatonal marcado, semáforo y caja de intersección
  que los vehículos no deben bloquear.

### Rutas jugables prediseñadas

1. **Ruta principal:** Portal ficticio de la Calle 63 `(1500, 3820)` → Plaza de
   Bolívar `(3150, 620)`. Sigue el corredor Caracas y luego Avenida Jiménez.
   Distancia por red: 5,4–6,2 km abstractos; objetivo de 2–4 minutos.
2. **Ruta panorámica:** Parque Nacional `(4740, 2350)` → Movistar Arena
   `(700, 2100)`, vía Séptima, Calle 45 y Calle 26. Muestra cerros, ciclovía y
   congestión transversal.
3. **Atajo de riesgo:** Circunvalar → Calle 26. Menos intersecciones, curvas
   cerradas, derrumbes/obras y menor visibilidad.

El minimapa debe dibujar estas arterias, los nombres de destino y el destino activo;
no requiere GIS en tiempo real.

## TransMilenio y transporte público

- La troncal principal está en el separador de Avenida Caracas: dos carriles
  exclusivos, uno por sentido, cada uno de 18 unidades. Deben ser físicamente
  inaccesibles para el carro del jugador mediante bordillos/barreras, salvo cruces
  explícitos.
- Estaciones: `Calle 63`, `Calle 45`, `Calle 26`, `Las Nieves` y `Museo del Oro`.
  Cada estación es una cápsula roja de 160–220 unidades, con puertas, plataforma y
  señalización. Los articulados se detienen 2–4 segundos.
- Articulado: largo 130–150, ancho 26–30; gira con radio amplio y tiene daño alto
  al impacto. Frecuencia inicial: uno por dirección cada 18–30 s, con desfase.
- Alimentadores/SITP: buses verdes o azules circulan en colectoras y se detienen en
  paraderos. Taxis amarillos aparecen con mayor probabilidad en Carrera 13, Calle
  26 y Séptima.
- Semáforos coordinados: ciclo de 36–50 s. El carril TM recibe fase propia o fase
  concurrente protegida. Vehículos IA frenan antes de la línea de pare; jugadores
  que cruzan en rojo reciben un incremento breve de peligro (más tráfico entrando)
  en vez de una penalización invisible.

## Landmarks y lectura espacial

Los landmarks deben ser siluetas grandes visibles desde una o dos cuadras; no hace
falta modelado detallado. Su collider debe coincidir con el volumen visual.

| Hito | Ubicación | Tratamiento jugable/visual |
| --- | --- | --- |
| Cerros Orientales y Monserrate | borde derecho; pico en `(6100, 900)` | Fondo en capas con vegetación oscura, niebla y teleférico/santuario estilizado. Bloquea y orienta. |
| Torre Colpatria | `(3250, 1520)` | Torre blanca vertical con luces de color nocturnas; visible sobre edificios bajos. |
| Parque Nacional | `(4760, 2350)` | Masa verde atravesada por senderos; reduce la cuadrícula y crea acceso a Séptima. |
| Movistar Arena / El Campín | `(700, 2100)` | Óvalo blanco y violeta, vallas y embotellamiento de evento en ciertas partidas. |
| Plaza de Bolívar / Catedral | `(3150, 620)` | Plaza peatonal amplia, fachada neoclásica y palomas; destino de misión. |
| Museo del Oro | `(2550, 900)` | Volumen bajo dorado/ocre junto a estación; referencia para girar al centro. |
| Torres del Centro Internacional | Calle 26 / Carrera 7 | Skyline de vidrio gris, hoteles y oficinas. |

## Estética y señalética

- Paleta: asfalto gris frío, andenes gris claro, ladrillo cocido `#9D4C35`, TM rojo
  `#D9251B`, taxis amarillo `#F9C51B`, buses SITP azul/verde apagado y vegetación
  verde húmeda. Evitar una Bogotá excesivamente limpia o tropical.
- Fachadas: predominio de ladrillo, rejas, locales angostos, edificios de 4–12
  pisos; torres de vidrio solo alrededor de Calle 26/Centro Internacional.
- Atmósfera: cielo nublado azul-gris, luz difusa y neblina contra los cerros.
  Variantes opcionales: lluvia con reflejos, charcos y baja adherencia leve.
- Señales: nomenclatura `Calle NN`, `Carrera NN`, letreros de estación y placas de
  pare. Usar señalética inspirada en Bogotá sin copiar marcas o mapas protegidos.
- Vida urbana: vendedores bajo sombrilla, peatones con chaqueta, ciclistas y
  domiciliarios/motos. Mantenerlos fuera de la calzada salvo pasos peatonales para
  evitar colisiones injustas.

## Implementación de datos

### Formato mínimo

Guardar un `mapConfig` local (JSON/TS) con capas independientes:

```ts
type Road = {
  id: string; name: string; class: 'arterial' | 'collector' | 'local' | 'tm';
  points: Array<{ x: number; y: number }>; lanesForward: number; lanesBack: number;
  width: number; speedLimit: number; transitOnly?: boolean;
};
type Intersection = { id: string; x: number; y: number; roads: string[]; signal?: string };
type Landmark = { id: string; type: string; x: number; y: number; w: number; h: number };
```

Derivar los carriles y el grafo de navegación al cargar. Edificios, árboles y
props se generan por semilla únicamente dentro de polígonos de manzana, nunca sobre
el pavimento, las estaciones ni los pasos peatonales.

### Fuente de realidad y fallback

1. **Opción preferida:** dibujar manualmente los seis ejes anteriores a partir de
   OpenStreetMap como referencia visual, simplificándolos al presupuesto de juego.
   Guardar solo geometría propia/derivada; no hacer solicitudes de red durante la
   partida.
2. **Fallback seguro:** usar la tabla de coordenadas y las relaciones viales de
   este documento. La fidelidad se sostiene por la orientación, nombres, jerarquía,
   cerros, troncal y landmarks, no por reproducir cada calle.
3. **Extensión procedural:** al salir del rectángulo, crear bloques con la misma
   semilla por sector. Mantener continuidad de arterias, aumentar densidad lejos de
   cerros y reservar el lado oriental para parques/ladera. No generar una nueva
   troncal TM fuera de una conexión definida.

## Presupuesto de rendimiento

- Mostrar/actualizar únicamente entidades dentro de 1,5 pantallas de la cámara.
- Máximo inicial: 35 autos, 6 articulados, 10 buses locales, 40 peatones y 80 props
  interactivos en la zona activa. Los elementos de fondo se agrupan en sprites por
  bloque.
- Reutilizar vehículos y peatones mediante pool; recalcular rutas solo al cambiar
  de nodo o al quedar bloqueado.
- Los edificios son colliders rectangulares o polígonos simples. Los cerros usan
  una máscara estática, no colisiones de malla.

## Criterios de aceptación

- [ ] Al iniciar, la cámara permite distinguir que el oriente está a la derecha por
  los cerros; no puede conducir hacia ellos.
- [ ] Caracas, Séptima, Calle 26 y al menos dos calles adicionales son nombrables,
  transitables y conectadas por un grafo de carriles.
- [ ] Cinco estaciones y articulados rojos aparecen en la troncal de Caracas,
  paran, obedecen semáforos y producen colisiones de gran impacto.
- [ ] La ruta Calle 63 → Plaza de Bolívar puede calcularse y completarse sin salir
  del mapa ni atravesar edificios.
- [ ] Se ven al menos cuatro landmarks de la tabla durante esa ruta o en el
  minimapa, incluyendo cerros y un hito del centro.
- [ ] El distrito transmite Bogotá mediante ladrillo, clima nublado, taxis amarillos,
  señalética y transporte público; no depende solamente de texto explicativo.
- [ ] Con el máximo de entidades definido, la simulación mantiene una tasa de
  cuadros jugable en el navegador objetivo.
