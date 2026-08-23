# Agente mundo procedural

## Objetivo

Generar Bogotá sin fin de forma estable, legible y eficiente.

## Diseño mínimo

- Chunks cuadrados con semilla derivada de `(chunkX, chunkY)`.
- Patrón de cuadras: calzada gris, doble línea amarilla, andenes claros y edificios de ladrillo.
- Orientación ambiental: una franja/montaña al este; no debe impedir la circulación normal.
- Intersecciones con puntos de semáforo y carriles detectables.
- Props con colisión: postes, muros y mobiliario.

## Rendimiento

Mantener activos solo los chunks alrededor de la cámara; no guardar todos los recorridos. La misma semilla debe regenerar el mismo chunk.

## Entrega

Consultas para carriles, obstáculos e intersecciones que Tráfico y Gameplay puedan ejecutar por frame.
