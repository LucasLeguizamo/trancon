---
name: trancon-mapa-plan
description: Planea el mapa real de Trancón por tajadas. Spawn actual: Casa de Nariño (Carrera 8 #7-26). Usar cuando el usuario hable de mapa, Bogotá, OSM, vías, TransMilenio, ciclovía, centro, Casa de Nariño o spawn.
---

# Mapa por tajadas

Antes de implementar vías reales, invoca el subagente `mapa-plan` o sigue `docs/agents/mapa_plan.md`.

## Reglas

1. Una tajada por iteración. Radio ≤ 800 m o un corredor ≤ 1.2 km.
2. Spawn actual: Casa de Nariño, Carrera 8 #7-26 (`4.59543, -74.07752`).
3. Si el bbox incluye Caracas, Séptima o Jiménez, la tajada trae **calzada + TM + ciclorruta** juntos.
4. OSM se hornea a JSON. Cero red en `npm run dev`.
5. Fuera del bbox horneado, la ciudad procedural sigue viva.

No intentes calcar Bogotá completa. Actualiza `docs/agents/mapa_plan.md` y entrega el contrato de consultas a `mundo`.
