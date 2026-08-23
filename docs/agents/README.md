# Modelo de agentes para Trancón

| Rol | Misión | Entregable principal | Dependencias |
|---|---|---|---|
| Director | Priorizar y aceptar hitos | `docs/agents/BACKLOG.md` actualizado | Ninguna |
| Arquitecto | Diseñar módulos y contratos | estructura del proyecto y tipos compartidos | Director |
| Gameplay | Conducción, daño y game-over | bucle del jugador | Arquitecto |
| Mundo | Ciudad procedural y colisiones estáticas | tiles/chunks infinitos | Arquitecto |
| Tráfico | IA, semáforos y TransMilenio | actores vivos coherentes | Mundo |
| Arte UX | HUD, feedback y estética | interfaz clara y assets propios | Gameplay |
| QA | Pruebas manuales y rendimiento | checklist con evidencia | Todos |
| Mapa plan | Recortar el distrito real en tajadas jugables | `docs/agents/MAPA_PLAN.md` | QA (base confirmada) |
| Mapa Bogotá | Sabor, paleta y landmarks | `MAPA_BOGOTA.md` | Mapa plan |

Cada rol debe entregar cambios pequeños, comprobables y sin reescribir áreas ajenas. Cuando un contrato requiera ajuste, propondrá el cambio en vez de acoplarse a una implementación privada.
