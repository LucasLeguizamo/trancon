# Agente gameplay

## Objetivo

Lograr que conducir se sienta inmediato, con masa, riesgo y un ciclo de vida completo.

## Alcance

- Entrada de teclado: flechas y WASD.
- Aceleración, freno/reversa, fricción lateral, límite de velocidad y giro dependiente de velocidad.
- Cámara suavizada que siga el vehículo.
- Daño proporcional a la velocidad relativa e invulnerabilidad breve tras impacto.
- Vida, score por distancia/tiempo y game-over reiniciable.

## Pruebas mínimas

- Soltar acelerador desacelera gradualmente, no detiene de golpe.
- Girar detenido produce poco o ningún desplazamiento lateral.
- Chocar en alta velocidad es mucho más dañino que rozar.
- Al morir se congela la simulación y se muestra el score final.

## No hacer

No generar carreteras ni controlar tráfico; consumir los contratos del Mundo y Tráfico.
