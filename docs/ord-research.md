# KORD research and simulation data

This level models Chicago O'Hare's dominant west-flow operation for
entertainment gameplay. It is not an operational planning or training tool.

## Airfield

The FAA's August 6, 2026 NASR data supplies the field reference point,
elevation, runway dimensions, magnetic designations, and surveyed threshold
coordinates. All eight physical runways are present:

| Physical runway | Simulation west-flow role | Physical dimensions |
| --- | --- | --- |
| 04L / 22R | Drawn, inactive in west flow | 7,500 × 150 ft |
| 04R / 22L | 22L departure | 8,075 × 150 ft |
| 09C / 27C | 27C arrival | 11,245 × 200 ft |
| 09L / 27R | 27R arrival | 7,500 × 150 ft |
| 09R / 27L | 27L arrival | 11,260 × 150 ft |
| 10C / 28C | 28C arrival | 10,800 × 200 ft |
| 10L / 28R | 28R departure | 13,000 × 150 ft |
| 10R / 28L | Drawn, inactive in west flow | 7,500 × 150 ft |

The Chicago Department of Aviation describes O'Hare's east/west runway system
and the reciprocal logic of east and west flow. Its June 2025 noise-management
report recorded west flow 58% of the time. Runway 28R was the most-used
departure runway at 36%, while 28C was the most-used arrival runway at 21%.
The game therefore cycles arrivals across 27R, 27C, 27L, and 28C and departures
between 28R and 22L. The crosswind runways remain visible at their real
positions instead of being removed from the map.

The runway endpoints are projected from FAA latitude/longitude onto an 18 NM
Esri World Imagery scope centered on the KORD airport reference point. The
runway designations provide magnetic gameplay headings: 040/220, 090/270, and
100/280. Approach fixes displayed inside the scope are also projected from the
current FAA FIX dataset. GCO is the on-airport Chicago DME from the FAA NAV
dataset. Farther SID/STAR names are placed at the edge as gameplay handoff
gates.

## Traffic mix

The June 2025 CDA fleet report provides the weighted catalog. The largest
groups were Boeing 737s (25.3%), E170/E175s (23.2%), CRJ-200/700/900s (18.9%),
and the A319/A320/A321 family (17.9%). Smaller shares included the 787 (2.8%),
777 (2.2%), A220 (1.7%), 747 (1.5%), 757 (1.3%), 767 (0.9%), A330 (0.5%),
717 (0.4%), and A350 (0.4%).

Most of those families already existed for KLAX. KORD adds the CRJ2
(CRJ-200), BCS3 (A220-300), A320, B712 (717-200), B752 (757-200), and A333
(A330-300). Regional jets, 737s, and A320-family aircraft are repeated in the
spawn list so the game resembles O'Hare rather than sampling every model
equally. Widebodies and freighters remain uncommon.

## Added aircraft performance profiles

The simulation uses representative terminal profiles synthesized from
manufacturer airport-planning material and normal terminal operating ranges.
Real V-speeds and runway requirements vary with weight, flap/configuration,
temperature, pressure altitude, wind, runway condition, obstacles, and airline
procedure. These fixed values exist to make game behavior distinct and
consistent; they must not be used for real operations.

The maneuver minimum is the lowest normal airborne speed command the game will
accept. Approach and landing logic separately controls final-approach speed, so
landing procedures are exempt from that command floor.

| Type | Aircraft | Wake | Rotate kt | Initial climb kt | Maneuver min kt | Final kt | Terminal kt | Cruise kt | Takeoff roll ft | Landing roll ft | Climb fpm |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CRJ2 | CRJ-200 | M | 134 | 180 | 150 | 137 | 200 | 424 | 5,800 | 3,000 | 2,500 |
| BCS3 | Airbus A220-300 | M | 135 | 190 | 155 | 130 | 210 | 447 | 6,200 | 3,400 | 2,500 |
| A320 | Airbus A320 | M | 140 | 200 | 160 | 135 | 220 | 450 | 6,200 | 3,300 | 2,500 |
| B712 | Boeing 717-200 | M | 130 | 190 | 155 | 130 | 210 | 440 | 5,100 | 3,000 | 2,800 |
| B752 | Boeing 757-200 | M | 145 | 210 | 170 | 140 | 230 | 461 | 6,500 | 3,800 | 3,000 |
| A333 | Airbus A330-300 | H | 155 | 215 | 175 | 145 | 235 | 470 | 8,500 | 4,700 | 2,200 |

The pre-KORD catalog used by KSMO and KLAX is documented in
[the LAX research note](lax-research.md).

## Primary sources

- [FAA NASR subscription, effective August 6, 2026](https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/2026-08-06/)
- [FAA KORD airport diagram, cycle 2608](https://aeronav.faa.gov/d-tpp/2608/00166AD.PDF)
- [Chicago Department of Aviation — Airport Operations 101](https://www.flychicago.com/community/ORDnoise/AirportOperations/pages/default.aspx)
- [Chicago Department of Aviation — June 2025 O'Hare ANMS report](https://www.flychicago.com/SiteCollectionDocuments/Community/ArchivedPDFs/Noise/OHare/ANMS/MonthlyReports/2025/ORD_ANMS_Report_June_2025.pdf)
- [Chicago Department of Aviation — 2025 airfield activity](https://www.flychicago.com/business/media/news/pages/article.aspx?newsid=1931)
- [Boeing airplane characteristics planning manuals](https://www.boeing.com/commercial/airports/plan-manuals)
- [Airbus aircraft characteristics planning manuals](https://www.aircraft.airbus.com/en/customer-care/fleet-wide-care/airport-operations-and-aircraft-characteristics/aircraft-characteristics)
