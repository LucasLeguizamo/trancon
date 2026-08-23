# Runbook de QA — prueba jugable de Trancón

El agente de QA es independiente de los agentes de implementación. Su función no
es revisar intenciones ni leer solo el código: debe jugar y registrar evidencia.

## Preparación

1. Ejecutar `npm install` y `npm run dev`.
2. Abrir el enlace local en una ventana limpia.
3. Verificar que la pantalla inicial explica los controles y que el botón inicia
   la partida sin pasos adicionales.

## Recorrido de verificación

| Prueba | Acción | Resultado que debe observarse |
| --- | --- | --- |
| Arranque | Pulsar “Arrancar el motor” | HUD activo, auto centrado y mundo visible. |
| Selección de vehículo | Elegir cada skin antes de arrancar | Taxista, Uber, Tombo, SITP y Presidencial cambian aspecto; Presidencial muestra dos escoltas. |
| Conducción | Mantener acelerar, girar, soltar y frenar | Inercia perceptible, giro según velocidad; acepta WASD y flechas. |
| Cámara/mundo | Conducir dos cuadras en cada dirección | La cámara sigue y aparecen nuevas cuadras sin borde vacío. |
| Choques | Golpear un vehículo y un borde/poste | Retroceso, partículas, reducción de integridad; no muerte instantánea al iniciar. |
| Vida/muerte | Repetir choques fuertes | La barra llega a cero, se pausa la partida y aparece score final/reinicio. |
| Vidas | Vaciar la barra sin reiniciar | Se resta un corazón, reaparece con integridad completa y solo termina tras perder las tres vidas. |
| TransMilenio | Esperar o recorrer Avenida Caracas | Articulado rojo móvil, más grande y con mayor daño. |
| Semáforos | Esperar un cambio de fase en cruce | Indicador cambia; IA se detiene ante rojo y continúa en verde. |
| Mundo vivo | Recorrer una pantalla | Autos autónomos más peatones y motos visibles. |
| Micromovilidad | Recorrer dos intersecciones | Se distinguen ciclas azules y motos amarillas, más pequeñas que los carros. |
| Perros | Recorrer los andenes | Perros marrones deambulan; impactarlos genera aviso y daño moderado. |
| Ladrones | Acercarse a una persona encapuchada con bolsa roja | Puede robar score y huye; al alcanzarlo despacio se recupera el botín. Presidencial lo bloquea con escoltas. |
| Fotomultas | Cruzar una cámara a más de 58 km/h | Aparece alerta, aumenta el contador monetario y baja el score. |
| Minimapa | Mantener la partida activa | Panel inferior derecho muestra calles cercanas, jugador verde y tráfico por tipo. |

## Criterios de bloqueo

- Un control no responde o no hay indicaciones para aprenderlo.
- Aparece muerte sin haber tenido oportunidad razonable de conducir.
- El mapa termina, entidades atraviesan edificios de forma recurrente o la IA no
  reacciona al semáforo.
- Error de consola o caída visible durante cinco minutos de partida.

## Registro final

Marcar cada fila como `PASA`, `FALLA` o `RIESGO`, describiendo el navegador,
pasos, resultado y captura cuando falle. Solo un informe con todos los puntos en
`PASA` habilita el cierre del hito base.
