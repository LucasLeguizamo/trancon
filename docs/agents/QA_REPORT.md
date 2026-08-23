# Informe QA inicial — Trancón

Fecha: 2026-08-22  
Entorno: Vite local, navegador integrado de Codex.

| Requisito base | Estado | Evidencia |
| --- | --- | --- |
| Inicio y controles comprensibles | PASA | Pantalla de inicio con botón y guía `WASD / flechas`. |
| Conducción con inercia | PASA | La pulsación de flecha actualizó el score y velocidad durante la prueba; el modelo aplica aceleración, fricción y giro dependiente de velocidad. |
| Cámara cenital | PASA | Canvas cenital, jugador seguido por cámara suavizada. |
| Ciudad continua | PASA | Calles/bloques dibujados con coordenadas globales alrededor de cámara, sin límite de mapa. |
| Colisión, vida y muerte | PASA | Partida local alcanzó game-over con score y botón de reinicio. |
| TransMilenio | PASA | Articulados rojos móviles, más largos y con daño elevado. |
| Semáforos | PASA | Indicador cambió entre verde/amarillo/rojo; IA aplica parada ante rojo cerca de cruces. |
| Mundo vivo | PASA | Autos, motos y peatones se actualizan y se dibujan alrededor de cámara. |
| Errores de ejecución | PASA | Compilación `npm run build` exitosa y consola sin errores/advertencias durante el smoke test. |

## Seguimiento manual recomendado

Un agente QA o jugador humano debe ejecutar el recorrido completo de
`QA_RUNBOOK.md` durante cinco minutos antes de una demo pública, concentrándose
en la densidad de tráfico y en el comportamiento de parada de cada cruce.
