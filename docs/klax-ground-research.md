# KLAX ground-control research and gameplay interpretation

This level is an entertainment simulation, not an operational chart or a
training aid. Surface geometry is calibrated to the airport image, while the
taxi graph is deliberately simplified so instructions remain readable at game
scale.

## Current airport diagram and runway use

The implementation was checked against FAA Airport Diagram 26190, effective
August 6–September 3, 2026. LAX has two close parallel runway complexes:

| Physical runway | West-operations role | Dimensions |
| --- | --- | --- |
| 06L / 24R | North outer arrival | 8,926 × 150 ft |
| 06R / 24L | North inner departure | 10,885 × 150 ft |
| 07L / 25R | South inner departure | 12,923 × 150 ft |
| 07R / 25L | South outer arrival | 11,095 × 200 ft |

The game models common west operations: arrivals land on 24R or 25L and Tower
controls their rollout and crossing of the paired inner runway before handing
them to Ground on Taxiway D or C. The player decides when a departure lines up
and takes off on 24L or 25R. A pending arrival protects only its own close
parallel pair, allowing independent use of the other complex.

FAA diagram frequencies used in the UI are Ground North 121.65 and Ground
South 121.75. Field elevation is 128 ft.

## Taxi routes and intersections

Taxiways E and H are shown between each close parallel runway pair. Taxiway D
is the north side of the central terminal area, while Taxiway C is its south
side. The game also models the published terminal-complex transition pattern:

- North Route: C/Bravo toward N, northbound on N, then D/Charlie.
- South Route: D/Echo toward P, southbound on P, then C/Delta.
- Checkpoints 1 and 2 are labeled where the modeled transitions enter the
  terminal complex.

The path graph preserves the real airport's basic circulation and runway-pair
relationships but does not reproduce every connector, alley restriction,
hotspot, tug road, or aircraft-design-group limitation.

## Terminals and gates

LAX publishes nine passenger terminals in its current passenger-facing map:
Terminals 1–8 plus Terminal B. The new West Gates are part of Terminal B.
Terminal 5 is currently closed for reconstruction and is intentionally not an
assignable destination; the airport anticipates reopening it in 2028.

The game exposes 16 representative gate positions, not the airport's total
gate count:

- Terminal 1: 12, 15
- Terminal 2/3: 24, 34
- Terminal B: 132, 148
- West Gates: 202, 218
- Terminal 4: 42, 46
- Terminal 6: 62, 66
- Terminal 7/8: 72, 76, 82, 86

Regional and narrowbody aircraft use domestic terminal groups. Large
international widebodies use Terminal B or the West Gates; the A380 is limited
to the modeled Terminal B group. These are gameplay compatibility categories,
not airline schedule assignments.

## Timing and aircraft behavior

Main-taxiway targets are 18–21 kt by type and ramp targets are 7–9 kt. Engine
starts run 48–120 seconds, with longer times assigned to larger aircraft.
Landing and takeoff rolls use type-specific representative speeds. Because
operational speeds vary with weight, wind, configuration, and operator
procedure, the values are intended only to produce believable game pacing.

After an arrival reaches its assigned gate, it remains visible for a 45-second
chocks/shutdown interval and then leaves the active map. A new departure can
use that modeled gate afterward.

## Command rules

Commands use `CALLSIGN + COMMAND`:

- `SWA172 START`
- `SWA172 TAXI RWY 24L VIA D`
- `DAL452 TAXI RWY 25R VIA C`
- `SWA172 HOLD`
- `SWA172 CONTINUE`
- `SWA172 LINEUP RWY 24L`
- `SWA172 TAKEOFF RWY 24L`
- `AAL104 TAXI TBIT VIA D`
- `UAL826 TAXI WEST`
- `ASA331 TAXI G72 VIA C`

`T1`, `T3`, `TBIT`, `T4`, `T6`, `T7`, and `WEST` select an open compatible
gate in that group. A modeled gate such as `G72` can be requested explicitly.
The requested aircraft must be on Ground frequency, engine start must finish
before departure taxi, and a departure must be holding short before line-up.

## Primary sources

- [FAA KLAX Airport Diagram 26190](https://aeronav.faa.gov/d-tpp/2608/00237AD.PDF)
- [FAA LAX standard taxi routes](https://www.faa.gov/air_traffic/publications/domesticnotices/dom24032_af.html)
- [FAA LAX runway-status-light notice](https://www.faa.gov/air_traffic/publications/atpubs/ntap_jan_18/SW17000.html)
- [LAX official terminal maps](https://www.flylax.com/lax-terminal-maps)
- [LAX official Terminal B page](https://www.flylax.com/terminals/terminal-b)
