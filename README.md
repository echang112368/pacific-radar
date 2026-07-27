# Pacific Radar

Phase 0 of a browser-based air traffic control game, initially modeled around
Santa Monica Municipal Airport (KSMO) and its single 3,500-foot Runway 03/21.

The current prototype includes:

- A real, attributed 35 NM satellite scope covering the Los Angeles terminal
  area around KSMO.
- A deterministic moving radar picture with multiple arrivals and departures.
- Selectable active-control flight cards with callsign, type, altitude,
  heading, speed, status, and assigned departure exit.
- Radar history trails and five named edge fixes for outbound handoffs.
- Successful arrival removal at touchdown, successful departure removal at the
  assigned exit, and fallback handoff when a departure leaves the scope.
- Typed heading, altitude, speed, approach, landing, line-up, takeoff, and
  go-around clearances, plus direct-to-exit routing.
- Pilot readbacks, runway occupancy checks, unsafe-clearance blocking, and
  basic 3 NM / 1,000 ft separation monitoring.
- Flight strips, a radio log, a shift score, and seeded reset behavior.
- A pure Python deterministic simulation core with tests for runway occupancy,
  clearance prerequisites, and replay consistency.

## Python simulation

The headless rules engine lives in `simulation/`. Run its tests with:

```bash
python -m unittest discover -s tests_py
```

The browser client is currently a Phase 0 visualization and interaction
prototype. The Python engine is the intended authoritative simulation boundary
as the project advances.

## Data and imagery

Airport facts are based on current FAA material for KSMO. Satellite imagery is
from Esri World Imagery and is attributed in the radar display. The prototype is
for entertainment and software development, not operational ATC training.
