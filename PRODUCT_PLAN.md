# ATC Game — Product and Technical Plan

## 1. Product direction

Build a browser-based air traffic control game with two complementary modes:

1. **Career Airport** — begin with a small, fictional, single-runway airport and grow it over time. The player unlocks taxiways, stands, navigation aids, terminal capacity, better radar, staffing, and eventually additional runways.
2. **Real Airport Scenarios** — self-contained sessions based on selected real airports, procedures, runway layouts, and traffic patterns. This is the realism-oriented sandbox and challenge mode.

The game should preserve what works in ATC-SIM: no installation, immediate play, fast keyboard commands, an uncluttered radar picture, and increasing workload. Its distinguishing idea is that ATC decisions alter an airport that the player owns and develops.

This is an entertainment simulation, not an approved ATC training tool. Realistic mode should follow published terminology and procedures where practical, but the UI must clearly state that it is not for operational training.

## 2. Findings from ATC-SIM

### Existing loop

- Choose an airport and options.
- Handle arriving and departing aircraft on a radar map.
- Select a flight strip or target and type abbreviated commands.
- Maintain 3 NM lateral or 1,000 ft vertical separation.
- Vector arrivals to an enlarged runway representation.
- Clear departures, hand them off automatically, and pursue a high score.

### Existing command model

- `CALLSIGN C 035`: fly heading 035.
- `CALLSIGN C 3`: climb or descend to 3,000 ft.
- `CALLSIGN C FIX`: proceed to a fix.
- `CALLSIGN S 200`: set speed to 200 kt.
- `CALLSIGN L 27R`: land runway 27R.
- `CALLSIGN W`: line up and wait.
- `CALLSIGN T`: take off.
- `CALLSIGN H FIX`: hold at a fix.
- `CALLSIGN A`: abort takeoff or go around.
- Commands can be chained.

### What players value

- Free and instantly available in a browser.
- A simple, understandable “keep them separated” loop.
- Addictive time pressure and replayability.
- Typed commands feel more deliberate and authentic than drawing paths.
- Real airport maps and recognizable airline traffic provide aviation flavor.

### Recurring criticisms and gaps

- It is closer to a separation puzzle than a procedural ATC simulation.
- No pilot readbacks or hearback/error-correction loop.
- No named instrument approach clearances or meaningful missed approaches.
- Emergencies, diversions, and dynamic weather are absent.
- Surface and ground control are very limited.
- Traffic becomes repetitive rather than scenario-driven.
- Simplified landing capture hides energy management and approach geometry.
- Conflict detection has reported edge cases, including aircraft in holds.
- The old desktop layout, tiny text, limited onboarding, and command memorization create unnecessary friction.
- High-score-only motivation does not create long-term ownership or progression.

## 3. Design pillars

### Clear under pressure

The player should be able to understand aircraft state, conflicts, runway state, and required actions in a glance. Visual density may increase, but ambiguity should not.

### Learn by doing

Introduce one operational concept at a time. Early shifts use assisted commands and forgiving traffic. Later shifts add readback errors, wake categories, instrument procedures, surface conflicts, weather, and emergencies.

### Consequences create stories

Aircraft delays, runway closures, weather cells, low fuel, medical emergencies, bird activity, equipment failures, and staffing constraints should interact. A session should produce memorable situations rather than merely spawn faster targets.

### Realism in layers

Use three profiles:

- **Arcade** — forgiving separation buffers, command suggestions, automatic readbacks and handoffs.
- **Standard** — realistic concepts with compressed timing and simplified phraseology.
- **Procedural** — stricter phraseology, readback validation, wake and runway separation, approach clearances, missed approaches, surface routing, coordination, and limited assistance.

### Airport growth changes the puzzle

Upgrades must create tradeoffs, not just higher numbers. A rapid-exit taxiway improves runway occupancy but can create a crossing hotspot. A longer runway attracts heavier aircraft but adds wake separation and apron pressure. A second terminal improves demand but increases taxi complexity.

## 4. Small-airport MVP

### Airport

A fictional regional field, initially named **Pine Ridge Municipal (KPRM)**:

- One runway, 09/27, approximately 6,000 ft.
- One parallel taxiway with two runway access points.
- Four parking stands.
- One non-towered-style visual reporting point and one RNAV approach per runway end.
- Light piston, turboprop, regional jet, medevac, and occasional business jet traffic.
- Day/VMC first; wind determines runway in use.

### Player role

Combine clearance, ground, tower, and approach responsibilities into one position for the first airport. As the airport grows, the player can unlock AI-assisted positions or explicitly split responsibilities in advanced and multiplayer modes.

### Session loop

1. Review a short shift briefing: runway, wind, visibility, NOTAM-like constraints, expected demand, and one optional objective.
2. Accept departures, issue taxi and hold-short instructions, and sequence runway use.
3. Sequence arrivals into the pattern or RNAV approach.
4. Manage runway occupancy and wake spacing.
5. Respond to one or more dynamic events.
6. End the shift and receive a debrief.
7. Spend earned airport funds and reputation on an upgrade or reserve funds.

Target shift length: 12–20 minutes. Include pause and time compression when the traffic state safely permits it.

### MVP aircraft states

`PARKED → READY → TAXI_OUT → HOLD_SHORT → LINE_UP → TAKEOFF_ROLL → DEPARTURE → HANDOFF`

`INBOUND → SEQUENCED → APPROACH_CLEARED → FINAL → LANDED → RUNWAY_EXIT → TAXI_IN → PARKED`

Exceptional states include `GO_AROUND`, `HOLDING`, `EMERGENCY`, `STOPPED`, and `DIVERTING`.

### MVP commands

Support both concise keyboard commands and full phrase-like commands. Both compile into the same structured clearance objects.

| Intent | Fast command | Phrase-style example |
|---|---|---|
| Heading | `N123AB C 270` | `N123AB HEADING 270` |
| Forced turn | `N123AB C 270 L` | `N123AB TURN LEFT HEADING 270` |
| Altitude | `N123AB C 3` | `N123AB ALTITUDE 3000` |
| Expedite altitude | `N123AB C 3 EX` | `N123AB DESCEND 3000 EXPEDITE` |
| Speed | `N123AB S 170` | `N123AB REDUCE SPEED 170` |
| Direct fix | `N123AB C PRM` | `N123AB PROCEED DIRECT PRM` |
| Taxi | `N123AB TX A H09` | `N123AB TAXI VIA ALPHA HOLD SHORT RUNWAY 09` |
| Cross runway | `N123AB X 09` | `N123AB CROSS RUNWAY 09` |
| Line up | `N123AB W` or `LW` | `N123AB LINE UP AND WAIT` |
| Takeoff | `N123AB T` | `N123AB CLEARED FOR TAKEOFF` |
| Land | `N123AB L 21` | `N123AB CLEARED TO LAND RUNWAY 21` |
| Abort / go around | `N123AB A` | `N123AB ABORT` |
| Hold | `N123AB H PRM` | `N123AB HOLD AT PRM` |

The command model intentionally preserves ATC-SIM shorthand. `C` is
disambiguated by its argument: exactly three digits means heading, one or two
digits means thousands of feet, and a named token means a fix. Multiple
clearances may be chained in one transmission. Departures require an altitude
assignment before `T`; `W` is optional and models runway entry without takeoff
authorization.
- Preserve a command history and allow correction before transmission.
- Provide contextual autocomplete without automatically selecting unsafe commands.

### Pilot/readback model

Every transmitted clearance creates a readback:

- Correct readback and compliance.
- Clarification request when syntax or intent is ambiguous.
- “Unable” due to aircraft performance, weather, runway length, fuel, or traffic.
- Configurable readback error rate in advanced modes.
- Safety-critical readbacks require player verification: runway assignment, hold short, takeoff/landing clearance, heading, altitude, and approach.

Voice can follow text. The first release should make the text/readback state machine deterministic and fully testable before adding speech recognition or generated voices.

### Separation and safety model

The simulator should distinguish:

- Radar separation in controlled airspace.
- Wake turbulence categories and time/distance spacing.
- Runway occupancy and same-runway arrival/departure rules.
- Hold-short and runway-crossing authorization.
- Terrain/minimum vectoring altitude protection.
- Predicted loss of separation, current loss, runway incursion, and collision.

Alerts should explain the hazard and time to predicted conflict. Do not award points merely for clearing an alert; reward prevention and efficient recovery.

### Scoring

Use a transparent debrief rather than one opaque total:

- Safety: separation, runway incursions, unstable approaches.
- Orderliness: sensible sequences, unnecessary go-arounds, excessive holding.
- Efficiency: delay, fuel burn, runway occupancy, throughput.
- Communication: correct phraseology, resolved readback errors, frequency congestion.
- Passenger/airline impact: cancellations, diversions, priority handling.

Safety violations should dominate the score. Efficiency must never reward unsafe compression.

## 5. Career progression

### Currencies

- **Airport funds** buy physical infrastructure.
- **Reputation** unlocks traffic types, grants, airlines, and higher-complexity contracts.
- Avoid premium currencies and real-money acceleration.

### Upgrade tree

#### Airfield

- Runway lighting and approach lights.
- Precision approach or improved RNAV capability.
- Runway extension and pavement strengthening.
- Rapid-exit taxiway.
- Full parallel taxiway.
- Additional runway only in a much later airport tier.

#### Terminal and ramp

- More stands.
- Passenger terminal expansion.
- Cargo apron.
- Deicing pad.
- Rescue and firefighting capability.

#### ATC and weather

- Better surface surveillance.
- Improved radar coverage and conflict prediction.
- AWOS/ATIS improvements.
- Backup power and equipment reliability.
- Additional staffed controller position or AI assistant.

### Tradeoffs

- Larger aircraft pay more but require longer runway occupancy and wake spacing.
- More stands increase revenue but can gridlock taxi routes.
- Precision approaches reduce weather diversions but increase traffic demand.
- Closely spaced departure banks boost throughput but create frequency congestion.
- Deferred maintenance saves cash today but increases closure risk.

### Campaign structure

- Each “day” contains two or three selectable shifts.
- Forecasts reveal likely traffic and weather, but not every event.
- Contracts create goals such as handling a commuter bank, keeping average delay below a threshold, or supporting wildfire/medevac operations.
- Upgrades take in-game construction time and can temporarily close taxiways or reduce capacity.
- Failure should cause delay, repair cost, or reputation loss—not erase the airport.

## 6. Events and engaging situations

### Early game

- Student pilot makes a long landing.
- Aircraft requests the opposite runway due to wind/performance.
- Vehicle requests runway inspection.
- VIP/business jet asks for priority but has no operational priority.
- Short weather deterioration.

### Mid game

- Medical emergency or minimum-fuel aircraft.
- Bird activity and runway inspection.
- Disabled aircraft closes a taxiway.
- Missed approach due to unstable final.
- Readback error during a busy sequence.
- Pop-up IFR clearance and departure-release window.

### Late game

- Thunderstorm cells force reroutes and runway changes.
- Deicing queues and braking-action degradation.
- Equipment outage changes separation requirements.
- Diversion wave from a nearby airport.
- Emergency landing followed by runway closure.
- Construction phase changes taxi routes for several shifts.

Events should be generated from explicit rules and seeded randomness. The same seed must replay identically for debugging, testing, daily challenges, and competitive scoring.

## 7. Interface

### Primary layout

- Center: scalable radar/airfield canvas.
- Right: flight strips grouped by arrivals, departures, surface, and attention needed.
- Bottom: command composer, suggestions, transmission history, and readback log.
- Top: wind, altimeter, visibility, runway status, clock, and traffic-rate controls.
- Optional left overlay: objectives, alerts, and airport construction.

### Interaction

- Click a target or strip to select the callsign.
- Type commands without leaving the radar.
- Tab-complete only currently valid fixes, procedures, runways, and taxi routes.
- Spacebar push-to-talk behavior can be added for voice mode.
- Visual command builder is available for accessibility and onboarding, but keyboard remains fastest.
- Pause opens a tactical planning overlay, not the construction screen during an active safety event.

### Visual language

- Use a modern STARS-inspired display without claiming exact equipment fidelity.
- Never encode critical state by color alone.
- Keep aircraft labels stable and provide leader-line decluttering.
- Show predicted paths only on selection or conflict to avoid visual noise.
- Include scalable text, high-contrast palettes, reduced motion, and complete keyboard navigation.

## 8. Python-centered architecture

A browser game still requires browser-side rendering. “In Python” should mean that the authoritative simulation, rules, persistence, and API are Python; the radar client should remain a thin TypeScript application for responsive canvas rendering.

### Recommended stack

- **Backend:** Python 3.13, FastAPI, Pydantic, SQLAlchemy.
- **Simulation:** pure Python package with a fixed-step deterministic clock.
- **Realtime transport:** WebSocket messages; REST for profiles, airports, upgrades, and replays.
- **Database:** SQLite during local development, PostgreSQL in production.
- **Jobs:** begin in-process; add Redis/RQ only when needed.
- **Frontend:** TypeScript, React, PixiJS or Canvas 2D, Vite.
- **Testing:** pytest, Hypothesis for geometry/rules, Playwright for browser flows.
- **Packaging:** Docker Compose for local/prod parity.

### Repository structure

```text
atc_game/
  apps/
    api/                 # FastAPI entry point and WebSocket gateway
    web/                 # TypeScript radar client
  packages/
    simulation/          # deterministic world update
    atc_rules/           # separation, runway, wake, phraseology
    commands/            # parser -> validated intent objects
    scenarios/           # seeded generators and objectives
    airports/            # fictional and real-airport data schema
    economy/             # progression, upgrades, construction
    replay/              # event log and deterministic playback
  tests/
    unit/
    property/
    scenarios/
    browser/
```

### Simulation boundary

The server owns:

- Aircraft truth state and performance.
- Weather and runway state.
- Clearance acceptance and pilot response.
- Conflict prediction and violations.
- Scenario generation and scoring.
- Economy and save data.

The client owns:

- Rendering and label placement.
- Local command editing and autocomplete.
- Audio playback.
- UI preferences.

Never let the client decide whether separation, a clearance, a landing, or a score is valid.

### Deterministic event model

Persist player actions and world events rather than frame-by-frame positions:

```text
session_started(seed, airport_version, rules_version)
clearance_transmitted(callsign, parsed_clearance, tick)
pilot_readback(callsign, readback, correctness, tick)
weather_changed(...)
runway_state_changed(...)
conflict_predicted(...)
violation_recorded(...)
session_ended(score_breakdown, tick)
```

Reconstruct aircraft positions by replaying the same fixed-step simulation. Version airport data, rules, and aircraft performance so old replays remain valid.

### Core data objects

- `Airport`, `Runway`, `TaxiwaySegment`, `Stand`, `NavFix`, `Procedure`.
- `AircraftType`, `Aircraft`, `FlightPlan`, `PerformanceEnvelope`.
- `Clearance`, `Readback`, `PilotIntent`, `ControllerAction`.
- `Weather`, `RunwayCondition`, `OperationalEvent`.
- `Conflict`, `SeparationStandard`, `RunwayOccupancy`.
- `CareerAirport`, `Upgrade`, `ConstructionProject`, `Contract`.

## 9. Implementation phases

### Phase 0 — rules and prototypes (1–2 weeks)

- Write the single-runway operational rules as executable acceptance tests.
- Prototype aircraft kinematics, runway occupancy, command parsing, and deterministic replay.
- Create a low-fidelity radar mockup.
- Validate the fun of sequencing 6–10 aircraft before building progression.

Exit criterion: a headless simulation can replay the same command log to the same final state and score.

### Phase 1 — playable vertical slice (4–6 weeks)

- KPRM map, one runway, one taxiway, four stands.
- Arrivals, departures, taxi, takeoff, approach, landing, go-around, and handoff.
- Keyboard command system and text readbacks.
- Basic wind, runway selection, alerts, scoring, and debrief.
- Tutorial of five short lessons.
- Local save and replay export.

Exit criterion: a new player can complete a 15-minute shift without external instructions.

### Phase 2 — progression alpha (4–6 weeks)

- Career persistence, funds, reputation, contracts, construction time.
- First 10–12 upgrades.
- Event director and seeded daily scenario.
- Traffic demand responds to airport capacity.
- Accessibility and UI scaling pass.

Exit criterion: at least three hours of progression with meaningful build choices.

### Phase 3 — procedural depth (6–10 weeks)

- Named approaches, missed-approach instructions, wake separation.
- Readback errors, “unable,” frequency occupancy, and pilot response delays.
- Richer weather, runway changes, emergencies, and diversions.
- Surface conflict detection and taxi route reservations.
- Advanced debrief with replay timeline.

### Phase 4 — real-airport mode

- Versioned airport data importer and manual validation tools.
- Curated first real airport with official/public data and hand-tuned traffic.
- Scenario editor.
- Licensing and attribution review for map, procedure, and airline assets.

### Phase 5 — optional multiplayer/voice

- Split tower/ground/approach roles.
- Observer and instructor mode.
- Push-to-talk voice recognition with confirmation UI.
- Voice remains optional; keyboard commands retain full functionality.

## 10. Test strategy

Safety logic requires more than example tests.

- Unit tests for every command form and aircraft state transition.
- Property tests for geometry, predicted closest approach, altitude crossing, holds, and runway occupancy.
- Scenario tests for arrival/departure sequencing and go-arounds.
- Regression replay for every reported conflict bug.
- Fuzz malformed, partial, ambiguous, and chained commands.
- Assert that identical seed + rules version + command log produces identical events and score.
- Browser tests for selection, autocomplete, transmission, readback acknowledgement, pause, save, and debrief.
- Performance target: 60 FPS client rendering with 100 targets; simulation tick comfortably faster than real time in headless tests.

## 11. First development backlog

1. Define the simulation coordinate system, fixed tick, and units.
2. Model runway and taxiway occupancy as reserved resources.
3. Implement basic aircraft ground and airborne state machines.
4. Implement heading, altitude, speed, taxi, LUAW, takeoff, approach, landing, and go-around clearances.
5. Create the dual syntax parser and ambiguity errors.
6. Build deterministic event logging and replay.
7. Add conflict prediction and violation classification.
8. Create the KPRM airport file and initial traffic generator.
9. Build radar canvas, strips, command composer, and readback log.
10. Add shift briefing, debrief, and transparent scoring.
11. Add five tutorial lessons.
12. Playtest the core loop before implementing the economy.

## 12. Product decisions to make after the vertical slice

- Whether aircraft movement should be visually continuous or slightly quantized like a radar sweep.
- Whether the default syntax should prefer FAA-style terms, an international neutral set, or selectable regional phraseology.
- How strict readback acknowledgement should be in Standard mode.
- Whether career construction is selected between shifts only or can create multi-shift operational constraints.
- Whether real-airport data is curated manually or imported from a licensed provider.
- Whether “controller staffing” is an upgrade, a difficulty reducer, or both.

The first prototype should not include a second runway, multiplayer, speech recognition, a global airport database, or complex airline economics. Those features would hide whether the single-runway sequencing, runway occupancy, and command/readback loop are enjoyable.
