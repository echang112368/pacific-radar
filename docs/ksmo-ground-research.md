# KSMO Ground Control Research

Research checked 2026-08-05. Game geometry is for simulation only and must not
be used for navigation.

## Current field facts

- FAA Airport Diagram 26134 (effective 2026-08-06 through 2026-09-03): one
  Runway 03/21, 3,500 by 150 feet; parallel Taxiways A and B; labeled surface
  positions A1-A5 and B1-B5; published run-up areas at A2, A5, B2, and B5;
  transient parking near B5; northeast hangars/parking; FBO and south hangars.
  Source: https://aeronav.faa.gov/d-tpp/2608/05023AD.PDF
- FAA KSMO safety briefing: the field is one large paved surface, movement and
  non-movement areas are separated by markings, there are four approach holding
  positions on Taxiways A/B, the pavement beyond the relocated thresholds is
  blast-pad pavement unavailable for landing/takeoff/taxi, and Ground is 121.9.
  Source: https://www.faa.gov/flight_deck/smo
- City fixed-wing pilot guide: field elevation 170 feet; Runway 03 threshold
  elevation 126 feet; Runway 21 threshold elevation 170 feet; runway slope 1.2%
  down southwest; maximum dual-wheel certified landing weight 60,000 pounds;
  intersection departures are prohibited. Atlantic Aviation is the FBO.
  Source: https://www.santamonica.gov/media/Public%20Works/Airport/SMO_FixedWing_%202023.pdf
- City turbine guide: turbine aircraft cannot park in the transient area near
  Airport Administration; IFR/turbine crews contact Ground one minute before
  actual engine start. Source:
  https://www.santamonica.gov/media/Public%20Works/Airport/SMO_Jet%28Turbine%29_%202023.pdf
- Current JSX authorization: the city authorized two ATR 42-600 aircraft for
  JSX public-charter operations at 3100 Donald Douglas Loop North. The simulator
  therefore models two JSX apron positions, not two jet-bridge gates. Source:
  https://www.santamonica.gov/media/Document%20Library/Environmental%20Documentation/250930%20NOE_CEQA%20Findings%20for%20JSX%20Final.pdf

## Parking interpretation

SMO is a general-aviation field and does not publish a conventional airline
terminal/gate count. The FAA diagram publishes parking *areas*, not numbered
stands. The game therefore states the real gate count as zero and models 15
playable general-aviation positions within the published FBO, transient,
northeast, and hangar areas. These position numbers are gameplay identifiers,
not claimed real-world gate numbers. Two additional JSX apron positions mirror
the two-aircraft operation authorized by the city.

## Aircraft and timing model

- Aircraft mix: Cessna 172, Piper PA-28, Diamond DA42, Pilatus PC-12, Cessna
  Citation CJ2, and JSX ATR 42-600.
- Normal taxi speeds are type-limited to 12-15 knots; ramp speeds are 5-6 knots.
- Type-specific engine-start timers run from 22 seconds for light pistons to the
  published 60-second turbine advisory interval.
- Landing and takeoff ground motion uses the current 3,500-foot runway scale and
  type-specific threshold speeds. The game is operationally plausible, not a
  certified performance calculator.
