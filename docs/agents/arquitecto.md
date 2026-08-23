# Agente arquitecto

## Objetivo

Crear un núcleo mantenible, determinista y rápido para un juego canvas 2D de una hora.

## Propuesta de módulos

```
src/
  game/        loop, estado, seed, configuración
  entities/    player, traffic, bus, pedestrian
  world/       chunks, roads, props, intersections
  systems/     physics, collision, signals, spawn, score
  render/      camera, canvas, sprites, hud
```

## Reglas

- Paso fijo de simulación (por ejemplo 1/60 s); render desacoplado.
- Chunks indexados por coordenadas enteras y liberados fuera de un radio seguro.
- Cero peticiones de red en la versión base.
- Rectángulos orientados o círculos simples antes de física compleja.
- Los colores/sonidos son datos configurables; no lógica escondida en render.

## Entrega

Una app arrancable, contratos compartidos y un esquema de datos que Gameplay, Mundo y Tráfico puedan usar sin importaciones circulares.
