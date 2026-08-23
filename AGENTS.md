# Trancón — equipo de agentes

Este repositorio implementa **Trancón**, un juego web de conducción cenital 2D inspirado en el reto DEV RACING. La meta del equipo es una entrega jugable en navegador que cumpla los ocho requisitos base antes de abordar extras.

## Orden de trabajo obligatorio

1. `director` fija el alcance y mantiene la lista de requisitos verificables.
2. `arquitecto` define contratos y una arquitectura que no dependa de APIs externas para el modo base.
3. `gameplay` construye el coche, cámara, controles, física, vida y game-over.
4. `mundo` construye la generación infinita y las colisiones estáticas.
5. `trafico` añade IA, TransMilenio, semáforos y actores vivos.
6. `arte_ux` entrega HUD, legibilidad y sabor local sin bloquear gameplay.
7. `qa` valida la lista de requisitos en una partida real.
8. `mapa_plan` recorta el distrito real en tajadas. Nadie implementa OSM sin un plan vigente en `docs/agents/MAPA_PLAN.md`.

No iniciar extras de calles reales, ruta A→B ni integración OSM hasta que QA confirme los ocho puntos base. Spawn actual: Casa de Nariño (Carrera 8 #7-26).

## Contratos de integración

- El mundo trabaja en coordenadas globales `worldX/worldY`; el render aplica la cámara. No usar coordenadas de pantalla como estado del juego.
- Todo actor móvil expone: `id`, `kind`, `position`, `velocity`, `heading`, `bounds`, `update(dt, world)` y `damage` cuando aplique.
- El mundo expone consultas deterministas de cercanía y colisión para una semilla dada.
- Un semáforo expone `state` (`green`, `yellow`, `red`), ciclo y línea de detención. La IA debe poder preguntar si debe detenerse.
- Toda nueva dependencia debe justificarse; la versión base debe iniciar con `npm install && npm run dev`.

## Definición de terminado

La entrega solo está lista cuando una persona puede abrir el juego, conducir con teclado, recorrer ciudad generada continuamente, chocar con consecuencias, perder vida y llegar a game-over; además ve tráfico con IA, TransMilenio y semáforos funcionales.

## Documentos de rol

Las instrucciones operativas de cada agente están en `docs/agents/`. Antes de cambiar código, cada rol debe leer su archivo y el contrato anterior.
