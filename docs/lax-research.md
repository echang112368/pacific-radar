# KLAX research and simulation data

This level models normal LAX west-flow operations for entertainment gameplay.
It is not an operational planning or training tool.

## Airfield

The four runway pairs, dimensions, bearings, threshold coordinates, field
elevation, lighting, and local-control frequencies come from the current FAA
AIP entry and airport diagram:

| Physical runway | Simulation west-flow role | Physical dimensions |
| --- | --- | --- |
| 06L / 24R | 24R arrival | 8,926 × 150 ft |
| 06R / 24L | 24L departure | 10,885 × 150 ft |
| 07L / 25R | 25R departure | 12,923 × 150 ft |
| 07R / 25L | 25L arrival | 11,095 × 200 ft |

The inboard runways nearest the terminal complex are 24L and 25R. The
outboard runways are 24R and 25L. The traffic generator follows the dominant
normal west flow: arrivals use 24R/25L and departures use 24L/25R. LAWA's Q4
2025 runway-utilization report recorded about 91% west-flow operations.

The map projects the FAA threshold coordinates onto a closer 18 NM Esri World
Imagery scope. This keeps all four runways in their real relative positions
while giving the north and south parallel pairs enough visual separation for
gameplay. Aircraft movement, approach gates, and separation calculations use
the airport-specific 18 NM scale. Each physical runway owns both reciprocal
ends, so an aircraft on 24R also occupies 06L, but does not incorrectly block
parallel Runway 24L.

## Traffic mix

The weighted traffic catalog follows LAWA's Q4 2025 aircraft-by-runway report.
The most frequent simulated families are E175, A321neo, 737-800/MAX/900, with
widebody and cargo appearances from the 767, 777-300ER, 787-9, A350-900,
A380-800, and 747-8. The CRJ-700 represents the smaller regional-jet flow.

Types already present before the LAX level were PA28, C172, PC12, C25A,
E145, E175, and B738. LAX adds CRJ7, A21N, B38M, B39M, B739, B763, B77W,
B789, A359, A388, and B748.

## Aircraft performance model

The game uses a representative terminal profile for each type. Real V-speeds
and runway requirements change with weight, configuration, temperature,
pressure altitude, wind, runway condition, obstacles, and operator procedure.
The maneuver minimum is the lowest speed the game accepts through a normal
airborne speed command. Approach and landing logic uses the separate final
speed and is intentionally exempt. These values must not be used for real
flight operations.

| Type | Wake | Rotate kt | Initial climb kt | Maneuver min kt | Final kt | Terminal kt | Cruise kt | Takeoff roll ft | Landing roll ft | Climb fpm |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| PA28 | L | 60 | 79 | 80 | 66 | 115 | 124 | 1,135 | 920 | 667 |
| C172 | L | 55 | 74 | 80 | 65 | 115 | 122 | 960 | 575 | 730 |
| PC12 | M | 82 | 130 | 105 | 85 | 175 | 290 | 1,850 | 1,830 | 1,920 |
| C25A | M | 105 | 160 | 130 | 105 | 210 | 404 | 2,900 | 2,200 | 3,500 |
| E145 | M | 120 | 180 | 150 | 125 | 190 | 447 | 4,200 | 2,500 | 2,500 |
| E175 | M | 125 | 190 | 160 | 130 | 210 | 447 | 4,500 | 2,800 | 2,500 |
| CRJ7 | M | 128 | 190 | 165 | 134 | 205 | 447 | 5,200 | 2,800 | 2,500 |
| B738 | M | 145 | 200 | 170 | 140 | 225 | 453 | 5,200 | 3,000 | 3,000 |
| A21N | M | 150 | 210 | 165 | 136 | 225 | 450 | 6,500 | 3,500 | 2,500 |
| B38M | M | 145 | 205 | 170 | 139 | 230 | 453 | 6,000 | 3,300 | 3,000 |
| B39M | M | 150 | 210 | 175 | 145 | 230 | 453 | 6,600 | 3,600 | 2,800 |
| B739 | M | 148 | 205 | 175 | 143 | 225 | 453 | 6,300 | 3,500 | 2,800 |
| B763 | H | 155 | 210 | 175 | 145 | 235 | 459 | 7,000 | 4,100 | 2,500 |
| B789 | H | 158 | 215 | 175 | 145 | 240 | 488 | 8,500 | 4,500 | 2,500 |
| B77W | H | 165 | 220 | 180 | 150 | 240 | 482 | 9,000 | 5,000 | 2,200 |
| A359 | H | 155 | 215 | 175 | 145 | 240 | 488 | 8,200 | 4,500 | 2,500 |
| A388 | J (Super) | 165 | 215 | 170 | 138 | 235 | 488 | 9,500 | 5,200 | 1,800 |
| B748 | H | 170 | 220 | 180 | 150 | 240 | 493 | 10,000 | 5,200 | 2,000 |

## Primary sources

- [FAA AIP — California aerodromes, KLAX entry](https://www.faa.gov/air_traffic/publications/atpubs/aip_html/part3_ad_2.0_california.html)
- [FAA Order JO 7110.65 — Section 5-7, Speed Adjustment](https://www.faa.gov/air_traffic/publications/atpubs/atc/atc0507.html)
- [FAA airport diagram — KLAX, cycle 2607](https://aeronav.faa.gov/d-tpp/2607/00237AD.PDF)
- [LAWA Q4 2025 noise and runway-utilization report](https://www.lawa.org/sites/lawa/files/2026-03/LAX%204q25_20260319_Quarterly%20Report.pdf)
- [LAWA LAX Surface Movement Guidance and Control System plan](https://www.lawa.org/media/16143)
- [Boeing airplane characteristics planning manuals](https://www.boeing.com/commercial/airports/plan-manuals)
- [Airbus aircraft characteristics planning manuals](https://www.aircraft.airbus.com/en/customer-care/fleet-wide-care/airport-operations-and-aircraft-characteristics/aircraft-characteristics)
