# Plan vivo del mapa — Trancón

Spawn actual: **Casa de Nariño**, Carrera 8 #7-26  
Cruce OSM: `4.59543, -74.07752` (predio presidencial)  
Escala: **6 unidades de mundo = 1 m**.  
Horneado: JSON local. El juego no llama a Overpass.

## Estado

| Campo | Valor |
|---|---|
| Mundo actual | Red OSM horneada en `src/world/data/bogota.json` |
| Distrito horneado | Centro / Casa de Nariño (calzada 1316, TM 177, ciclovía 52) |
| Tajada activa | **T-Centro** — spawn en Casa de Nariño |
| Estaciones TM | Bicentenario, Tercer Milenio, San Victorino, Av. Jiménez, Museo del Oro, Las Aguas, Universidades, Calle 19, Calle 22 |
| QA base | Confirmada en `docs/agents/QA_REPORT.md` → extra OSM permitido |

## Cola

1. **T-Centro Casa de Nariño** (ahora) — bbox `4.5865, -74.0895, 4.6145, -74.0610`.
2. T-Norte — Calle 26 / Centro Internacional.
3. Fuera del bbox: seguir con chunks procedurales.

---

## T-Centro — Casa de Nariño

**Bbox** (S, W, N, E): `4.5865, -74.0895, 4.6145, -74.0610`  
Cubre: Carrera 7–10, Calles 1–26, Plaza de Bolívar, troncal Caracas, Eje Ambiental, Parque Tercer Milenio.

### En alcance

- Calzada OSM (trunk → living_street).
- Troncal TransMilenio (`name=TransMilenio`) y **9 estaciones** visibles.
- Ciclorrutas `highway=cycleway`.
- Landmark: Casa de Nariño. Plaza de Bolívar al norte.

### Horneado

- Extracto: `tools/osm/centro.json`
- Script: `tools/build-bogota-map.py` → `src/world/data/bogota.json`

### Aceptación jugable

1. Al arrancar, el carro está junto a Casa de Nariño, Carrera 8.
2. Se ven estaciones TM con rótulo `TM · nombre`.
3. Cada 10 s un helicóptero cruza la pantalla con «FIRMES PARA LA PATRIA».
