import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Pacific Radar simulator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Pacific Radar — Santa Monica Tower<\/title>/i);
  assert.match(html, /SMO TOWER · 35 NM TERMINAL SCOPE/);
  assert.match(html, /Active control/);
  assert.match(html, /0(?:<!-- -->)? active/);
  assert.match(html, /Scope clear · Traffic will build gradually/);
  assert.doesNotMatch(html, /RWY 21 · HOLD SHORT · TO MALIBU/);
  assert.match(html, /track-layer/);
  assert.doesNotMatch(html, /codex-preview|starter loading skeleton/i);
});

test("includes terminal-scope completion and handoff behavior", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(
      new URL(
        "../public/ksmo-terminal-satellite.jpg",
        import.meta.url,
      ),
    ),
  ]);

  assert.match(simulator, /const EXIT_FIXES/);
  assert.match(simulator, /Touchdown Runway \$\{next\.runway \?\? "21"\}, rolling out/);
  assert.match(
    simulator,
    /Incorrect handoff — left controlled airspace without reaching/,
  );
  assert.match(simulator, /\["DCT", "DIRECT"\]/);
  assert.match(simulator, /appendGroundTrackSample/);
  assert.match(css, /ksmo-terminal-satellite\.jpg/);
  assert.match(css, /\.history-group \.history-segment/);
  assert.match(css, /\.flight-strip\.departure/);
});

test("uses stabilized final speeds and a visible braking rollout", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /\| "LANDING_ROLL"/);
  assert.match(simulator, /finalApproachSpeed:\s*65/);
  assert.match(simulator, /landingRollFeet:\s*575/);
  assert.match(simulator, /function landingDecelerationKnotsPerSecond/);
  assert.match(simulator, /kinematicDecelerationKnotsPerSecond/);
  assert.match(simulator, /brakingResponse/);
  assert.match(simulator, /next\.targetSpeed = performanceFor\(next\)\.finalApproachSpeed/);
  assert.match(simulator, /const approachTravel = Math\.min\(dist, travel\)/);
  assert.match(simulator, /next\.status = "LANDING_ROLL"/);
  assert.match(simulator, /next\.landingDistanceFeet = 0/);
  assert.match(simulator, /next\.landingDistanceFeet \/ RUNWAY\.lengthFeet/);
  assert.match(simulator, /next\.speed <= 0\.5/);
  assert.match(simulator, /Clear of Runway \$\{next\.runway \?\? "21"\}/);
  assert.doesNotMatch(
    simulator,
    /next\.status = "LANDED";\s*next\.altitude = 177;\s*next\.targetAltitude = 177;\s*next\.speed = 0/s,
  );
});

test("uses timestamped ground-track history with a fading fixed-time trail", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /TRACK_SAMPLE_SECONDS = 1/);
  assert.match(simulator, /TRACK_HISTORY_SECONDS = 15/);
  assert.match(simulator, /groundSpeed:\s*number/);
  assert.match(simulator, /groundTrack:\s*number/);
  assert.match(simulator, /function groundMotionBetween/);
  assert.match(simulator, /next\.groundSpeed =\s*instantaneousMotion\.groundSpeed/s);
  assert.match(simulator, /function smoothGroundTrack/);
  assert.match(simulator, /tick - point\.tick <= TRACK_HISTORY_TICKS/);
  assert.match(simulator, /className="history-segment"/);
  assert.match(simulator, /opacity=\{0\.12 \+ recency \* 0\.72\}/);
  assert.doesNotMatch(simulator, /track\.slice\(-13\)/);
  assert.match(css, /stroke-linecap:\s*round/);
  assert.match(css, /vector-effect:\s*non-scaling-stroke/);
});

test("maps displayed ground speed linearly to real-time screen movement", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /SCOPE_NM_PER_WORLD_UNIT = 0\.35/);
  assert.match(
    simulator,
    /elapsedHoursPerTick = 1 \/ SIMULATION_TICKS_PER_SECOND \/ 3600/,
  );
  assert.match(
    simulator,
    /nauticalMilesPerTick = speedKnots \* elapsedHoursPerTick/,
  );
  assert.match(simulator, /airborneAccelerationKnotsPerSecond/);
  assert.match(simulator, /function groundTravelForKnots/);
  assert.match(simulator, /groundTravelForKnots\(next\.speed\)/);
  assert.match(simulator, /groundSpeed = \(distanceNm \* 3600\) \/ elapsedSeconds/);
  assert.match(
    simulator,
    /Math\.round\(currentGroundMotion\(flight\)\.groundSpeed\)\}KT/,
  );
  assert.match(
    simulator,
    /function groundTravelForKnots\(speedKnots: number\)/,
  );
  assert.match(
    simulator,
    /return nauticalMilesPerTick \/ SCOPE_NM_PER_WORLD_UNIT/,
  );
  assert.match(simulator, /next\.groundSpeed = instantaneousMotion\.groundSpeed/);
  assert.doesNotMatch(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE/);
  assert.doesNotMatch(simulator, /BACKGROUND_MOVEMENT_SCALE/);
  assert.doesNotMatch(
    simulator,
    /groundTravelForKnots\(Math\.max\(next\.speed/,
  );
  assert.doesNotMatch(simulator, /next\.speed \/ 5000/);
  assert.doesNotMatch(simulator, /Math\.max\(next\.speed, 8\) \/ 4800/);
});

test("uses speed- and aircraft-dependent coordinated turn dynamics", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /STANDARD_RATE_TURN_DEGREES_PER_SECOND = 3/);
  assert.match(simulator, /COORDINATED_TURN_RATE_FACTOR = 1091/);
  assert.match(simulator, /PA28:\s*30/);
  assert.match(simulator, /C172:\s*30/);
  assert.match(simulator, /B738:\s*25/);
  assert.match(simulator, /function turnDegreesPerTick\(flight: Aircraft\)/);
  assert.match(simulator, /Math\.tan\(\(bankLimit \* Math\.PI\) \/ 180\)/);
  assert.match(
    simulator,
    /Math\.min\(STANDARD_RATE_TURN_DEGREES_PER_SECOND, coordinatedRate\)/,
  );
  assert.match(
    simulator,
    /turnTowardDirected\(\s*next\.heading,\s*next\.targetHeading,\s*turnDegreesPerTick\(next\)/s,
  );
  assert.doesNotMatch(
    simulator,
    /turnTowardDirected\(\s*next\.heading,\s*next\.targetHeading,\s*0\.8/s,
  );
});

test("offers fixed whole-simulation speed controls in the sidebar footer", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /SIMULATION_SPEEDS = \[1, 1\.5, 2, 3, 4\] as const/);
  assert.match(simulator, /const \[speedIndex, setSpeedIndex\] = useState\(0\)/);
  assert.match(
    simulator,
    /SIMULATION_TICKS_PER_SECOND \*\s*simulationSpeed/s,
  );
  assert.match(
    simulator,
    /\[paused, simulationSpeed, simulationFailed\]/,
  );
  assert.match(simulator, /aria-label="Simulation speed"/);
  assert.match(simulator, /Real life speed/);
  assert.doesNotMatch(simulator, /Reset seed 0321/);
  assert.doesNotMatch(simulator, /Deterministic replay · build 0\.1/);
  assert.match(css, /\.simulation-speed-slider/);
  assert.match(css, /\.speed-scale/);
});

test("reconciles elapsed wall time after browser background throttling", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /MAX_CATCH_UP_TICKS_PER_PASS/);
  assert.match(simulator, /lastSimulationUpdateRef/);
  assert.match(simulator, /pendingSimulationTicksRef/);
  assert.match(simulator, /function advanceWorldByTicks/);
  assert.match(simulator, /const elapsedSeconds = Math\.max\(0, \(now - previousUpdate\) \/ 1000\)/);
  assert.match(
    simulator,
    /elapsedSeconds \*\s*SIMULATION_TICKS_PER_SECOND \*\s*simulationSpeed/s,
  );
  assert.match(
    simulator,
    /advanceWorldByTicks\(current, ticksToAdvance\)/,
  );
  assert.match(
    simulator,
    /document\.addEventListener\("visibilitychange", advanceToWallClock\)/,
  );
  assert.match(
    simulator,
    /window\.addEventListener\("focus", advanceToWallClock\)/,
  );
  assert.match(simulator, /window\.setInterval\(advanceToWallClock, 250\)/);
  assert.doesNotMatch(
    simulator,
    /setInterval\(\(\) => \{\s*setWorld\(\(current\) => stepWorld\(current\)\)/s,
  );
});

test("stops the shift and explains the final score after a collision", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /type SimulationFailure/);
  assert.match(simulator, /COLLISION_DISTANCE_FEET = 500/);
  assert.match(
    simulator,
    /COLLISION_DISTANCE_FEET \/ FEET_PER_NAUTICAL_MILE/,
  );
  assert.match(simulator, /COLLISION_VERTICAL_FEET = 500/);
  assert.match(simulator, /if \(previous\.failure\) return previous/);
  assert.match(
    simulator,
    /lateral <= COLLISION_LATERAL_NM &&\s*vertical <= COLLISION_VERTICAL_FEET/s,
  );
  assert.match(simulator, /kind: "collision"/);
  assert.match(simulator, /finalScore/);
  assert.match(simulator, /COLLISION · \$\{airborne\[i\]\.callsign\}/);
  assert.match(simulator, /const simulationFailed = Boolean\(world\.failure\)/);
  assert.match(simulator, /if \(paused \|\| simulationFailed\)/);
  assert.match(simulator, /role="alertdialog"/);
  assert.match(simulator, /Aircraft collision/);
  assert.match(simulator, /lateralSeparationFeet/);
  assert.match(simulator, /The simulation has been stopped/);
  assert.match(simulator, /Final score/);
  assert.match(simulator, /Start new shift/);
  assert.match(css, /\.failure-modal/);
  assert.match(css, /\.failure-summary/);
  assert.match(css, /\.failure-restart/);
});

test("highlights aircraft only inside the close-proximity warning radius", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /const conflictedCallsigns = useMemo/);
  assert.match(simulator, /LOSS_OF_SEPARATION_LATERAL_NM = 2/);
  assert.match(simulator, /LOSS_OF_SEPARATION_VERTICAL_FEET = 1000/);
  assert.match(
    simulator,
    /lateral < LOSS_OF_SEPARATION_LATERAL_NM &&\s*vertical < LOSS_OF_SEPARATION_VERTICAL_FEET/s,
  );
  assert.match(simulator, /result\.add\(airborne\[i\]\.callsign\)/);
  assert.match(simulator, /result\.add\(airborne\[j\]\.callsign\)/);
  assert.match(
    simulator,
    /conflictedCallsigns\.has\(flight\.callsign\) \? "conflict" : ""/,
  );
  assert.doesNotMatch(simulator, /CONFLICT PREDICTION/);
  assert.doesNotMatch(simulator, /lateral < 4\.5/);
  assert.doesNotMatch(simulator, /className="conflict-banner"/);
  assert.match(css, /\.aircraft-target\.conflict \.data-tag/);
  assert.match(css, /\.aircraft-target\.conflict \.target-chevron/);
  assert.doesNotMatch(css, /\.conflict-banner/);
  assert.match(
    simulator,
    /A loss of separation is recorded when aircraft are both less\s*than 2 NM apart laterally and less than 1,000 ft apart\s*vertically/s,
  );
  assert.match(
    simulator,
    /A collision immediately ends the game when aircraft are both\s*within 500 ft laterally and within 500 ft vertically/s,
  );
  assert.match(simulator, /The third\s*incorrect handoff also ends the game/s);
  assert.doesNotMatch(simulator, /Maintain 3 NM or 1,000 ft/);
});

test("uses hollow aircraft targets without a forward heading line", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.target-chevron\s*\{[^}]*background:\s*transparent/s,
  );
  assert.match(css, /\.target-chevron\s*\{[^}]*border:\s*1px solid #fff/s);
  assert.match(css, /\.target-chevron\s*\{[^}]*box-shadow:\s*none/s);
  assert.match(
    css,
    /\.aircraft-target\.selected \.target-chevron\s*\{[^}]*border-color:\s*#fff/s,
  );
  assert.match(
    css,
    /\.target-chevron::after,\s*\.target-chevron::before\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    css,
    /\.aircraft-target\.conflict \.target-chevron\s*\{[^}]*background:\s*transparent/s,
  );
  assert.match(
    css,
    /\.aircraft-target\.conflict \.target-chevron\s*\{[^}]*border-color:\s*#ff7469/s,
  );
  assert.match(
    css,
    /\.aircraft-target\.conflict \.target-chevron\s*\{[^}]*box-shadow:\s*none/s,
  );
  assert.doesNotMatch(css, /\.target-chevron::after\s*\{\s*content:/s);
});

test("fails on the third incorrect departure handoff", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /incorrectHandoffs:\s*number/);
  assert.match(simulator, /incorrectHandoffs:\s*0/);
  assert.match(simulator, /INCORRECT_HANDOFF_LIMIT = 3/);
  assert.match(
    simulator,
    /const incorrectHandoffs = world\.incorrectHandoffs \+ 1/,
  );
  assert.match(
    simulator,
    /incorrectHandoffs >= INCORRECT_HANDOFF_LIMIT/,
  );
  assert.match(simulator, /kind: "handoff_limit"/);
  assert.match(simulator, /Incorrect handoff — left controlled airspace/);
  assert.match(simulator, /HANDOFF FAILURE/);
  assert.match(simulator, /Handoff limit exceeded/);
  assert.match(
    simulator,
    /Three departures left controlled airspace/,
  );
  assert.match(simulator, /world\.incorrectHandoffs\}\/3<\/strong> handoff errors/);
});

test("earns the overall score only from safe landings and handoffs", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /score:\s*0/);
  assert.match(simulator, /safeLandings:\s*0/);
  assert.match(simulator, /safeHandoffs:\s*0/);
  assert.match(simulator, /SAFE_LANDING_POINTS = 100/);
  assert.match(simulator, /SAFE_HANDOFF_POINTS = 100/);
  assert.match(simulator, /world\.safeLandings \+= 1/);
  assert.match(simulator, /world\.score \+= SAFE_LANDING_POINTS/);
  assert.match(simulator, /world\.safeHandoffs \+= 1/);
  assert.match(simulator, /world\.score \+= SAFE_HANDOFF_POINTS/);
  assert.match(simulator, />OVERALL SCORE</);
  assert.match(simulator, /safe landings/);
  assert.match(simulator, /safe handoffs/);
  assert.doesNotMatch(simulator, />SHIFT SCORE</);
  assert.doesNotMatch(simulator, /COLLISION_SCORE_PENALTY/);
  assert.doesNotMatch(simulator, /INCORRECT_HANDOFF_PENALTY/);
});

test("warns before a refresh would discard shift progress", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /const warnAboutLostProgress = \(event: BeforeUnloadEvent\)/);
  assert.match(simulator, /event\.preventDefault\(\)/);
  assert.match(simulator, /event\.returnValue = ""/);
  assert.match(
    simulator,
    /window\.addEventListener\("beforeunload", warnAboutLostProgress\)/,
  );
  assert.match(
    simulator,
    /window\.removeEventListener\("beforeunload", warnAboutLostProgress\)/,
  );
});

test("aligns departures to KSMO Runway 03/21 and uses the full runway before vectoring", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /type RunwayEnd = "03" \| "21"/);
  assert.match(simulator, /designation:\s*"03\/21"/);
  assert.match(simulator, /"21":\s*\{[^}]*heading:\s*210/s);
  assert.match(simulator, /"03":\s*\{[^}]*heading:\s*30/s);
  assert.match(simulator, /runway:\s*"03"/);
  assert.match(simulator, /const travel = groundTravelForKnots\(next\.speed\)/);
  assert.doesNotMatch(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE/);
  assert.match(simulator, /function hasPassedRunwayDepartureEnd/);
  assert.match(simulator, /return runwayProgress >= 1/);
  assert.match(simulator, /const clearOfRunway = hasPassedRunwayDepartureEnd\(next\)/);
  assert.match(
    simulator,
    /next\.altitude >=\s*RUNWAY\.elevation \+ INITIAL_TURN_MINIMUM_AGL_FEET/s,
  );
  assert.match(simulator, /next\.speed >= minimumTurnSpeed/);
  assert.match(
    simulator,
    /next\.departureClimbTicks >= INITIAL_TURN_MINIMUM_CLIMB_TICKS/,
  );
  assert.match(
    simulator,
    /next\.departureHeading !== undefined &&\s*clearOfRunway &&\s*stableInitialClimb/s,
  );
  assert.match(simulator, /next\.targetHeading = runwayEndFor\(next\)\.heading/);
  assert.doesNotMatch(simulator, /next\.speed >= 72 \|\| dist < 2/);
  assert.match(simulator, /className="runway-layer"/);
  assert.match(simulator, /normalizeRunwayEnd/);
  assert.match(simulator, /Unknown runway \$\{runwayToken\}; use 03 or 21/);
  assert.doesNotMatch(simulator, /ACTIVE END/);
  assert.doesNotMatch(simulator, /RECIPROCAL/);
  assert.match(css, /\.runway-layer/);
  assert.match(css, /\.runway-end-label/);
  const runwayLabel =
    css.match(/\.runway-end-label\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(runwayLabel, /\bborder\s*:|\bbackground\s*:/);
});

test("stages lineup, takeoff power, and progressive runway acceleration", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /\| "LINING_UP"/);
  assert.match(simulator, /\| "TAKEOFF_READY"/);
  assert.match(
    simulator,
    /LINE_UP_DELAY_SECONDS = 1\.5/,
  );
  assert.match(
    simulator,
    /LINE_UP_TICKS = Math\.round\(\s*SIMULATION_TICKS_PER_SECOND \* LINE_UP_DELAY_SECONDS/s,
  );
  assert.match(
    simulator,
    /TAKEOFF_POWER_TICKS = SIMULATION_TICKS_PER_SECOND/,
  );
  assert.match(simulator, /takeoffGroundRollFeet:\s*960/);
  assert.match(simulator, /rotationSpeed:\s*55/);
  assert.match(simulator, /rotationSpeed:\s*82/);
  assert.match(simulator, /climbRateFeetPerMinute:\s*1920/);
  assert.match(simulator, /function takeoffAccelerationKnotsPerSecond/);
  assert.match(simulator, /kinematicAccelerationKnotsPerSecond/);
  assert.match(simulator, /aerodynamicTaper/);
  assert.match(simulator, /flight\.status = "LINING_UP"/);
  assert.match(simulator, /next\.status = "TAKEOFF_READY"/);
  assert.match(simulator, /next\.status = "TAKEOFF_ROLL"/);
  assert.match(simulator, /INITIAL_TURN_MINIMUM_AGL_FEET = 500/);
  assert.match(simulator, /INITIAL_TURN_MINIMUM_CLIMB_SECONDS = 8/);
  assert.match(simulator, /INITIAL_TURN_MINIMUM_SPEED_FACTOR = 1\.15/);
  assert.match(simulator, /next\.departureClimbTicks = 0/);
  assert.match(
    simulator,
    /!\["HOLD_SHORT", "LINING_UP"\]\.includes\(flight\.status\)/,
  );
  assert.match(
    simulator,
    /next\.speed = moveToward\(\s*next\.speed,\s*performance\.rotationSpeed,\s*takeoffAccelerationKnotsPerSecond\(next\)/s,
  );
  assert.match(simulator, /next\.targetSpeed = performance\.initialClimbSpeed/);
  assert.match(simulator, /next\.targetAltitude = Math\.max\(next\.targetAltitude, 2500\)/);
  assert.doesNotMatch(simulator, /TAKEOFF_ACCELERATION_PER_TICK|targetSpeed = 78/);
  assert.doesNotMatch(simulator, /flight\.status = "TAKEOFF_ROLL"/);
  assert.match(simulator, /LINE UP & WAIT/);
  assert.match(simulator, /TAKEOFF POWER SET/);
});

test("pause is a planning state with compact, boxless traffic displays", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /if \(paused\) \{/);
  assert.match(simulator, /Clearance queued for resume/);
  assert.match(simulator, /queuedCommands\.reduce/);
  assert.match(simulator, /Traffic and clock frozen/);
  assert.match(simulator, /flightCardRoute/);
  assert.doesNotMatch(simulator, /<b>\{flight\.kind/);

  const dataTag = css.match(/\.data-tag\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(dataTag, /\bbackground\s*:|\bborder(?:-\w+)?\s*:|\boutline\s*:/);
  assert.match(simulator, /className="pause-indicator"/);
  assert.doesNotMatch(simulator, /className="pause-overlay"/);
  assert.doesNotMatch(simulator, /Resume shift/);
  assert.match(css, /\.pause-indicator\s*\{[^}]*top:\s*12px/s);
  assert.match(css, /\.pause-indicator\s*\{[^}]*pointer-events:\s*none/s);
  assert.doesNotMatch(css, /\.pause-overlay|\.pause-card/);
  assert.match(css, /\.flight-strip\s*\{[^}]*min-height:\s*49px/s);
});

test("uses ATC-SIM shorthand and boundary-based traffic lifecycle rules", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /const SPAWN_SCHEDULE/);
  assert.match(simulator, /aircraft:\s*\[\]/);
  assert.match(simulator, /tick:\s*80/);
  assert.match(simulator, /tick:\s*320/);
  assert.match(simulator, /tick:\s*1280/);
  assert.match(simulator, /x:\s*0\.6/);
  assert.match(simulator, /status:\s*"HOLD_SHORT"/);
  assert.match(
    simulator,
    /!\["HOLD_SHORT", "LINING_UP"\]\.includes\(flight\.status\)/,
  );
  assert.match(simulator, /departureAltitudeAssigned/);
  assert.match(simulator, /Assign a departure altitude with C before takeoff/);
  assert.match(simulator, /while \(cursor < tokens\.length\)/);
  assert.match(simulator, /\^\\d\{3\}\$/);
  assert.match(simulator, /\["W", "LW", "LUAW"\]/);
  assert.match(simulator, /above 3,000 feet AGL/);
  assert.match(simulator, /heading must be within 60°/);
  assert.match(simulator, /Invalid heading \$\{clearance\}; use 000 through 359/);
  assert.match(simulator, /!other\.completed/);
  assert.match(simulator, /globalCommand === "HELP"/);
  assert.match(simulator, /globalCommand === "SCALE"/);
  assert.match(simulator, /globalCommand === "STATS"/);
  assert.match(simulator, /pacific-radar-high-scores/);
  assert.match(simulator, /altitudeLabel\(flight\.targetAltitude\)/);
  assert.match(simulator, /clearedHeading\(flight\)/);
  assert.match(simulator, /setCommand\(`\$\{flight\.callsign\} `\)/);
});

test("scales balanced traffic to KSMO's single-runway capacity", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /type AirportTrafficProfile/);
  assert.match(simulator, /function trafficSpacingForRunways/);
  assert.match(simulator, /airport:\s*"KSMO"/);
  assert.match(simulator, /runwayCount:\s*1/);
  assert.match(simulator, /initialSpacingSeconds:\s*Math\.round\(60 \/ capacityScale\)/);
  assert.match(simulator, /minimumSpacingSeconds:\s*Math\.round\(36 \/ capacityScale\)/);
  assert.match(
    simulator,
    /CONTINUOUS_TRAFFIC_START_TICK =\s*380 \* SIMULATION_TICKS_PER_SECOND/,
  );
  assert.match(
    simulator,
    /INITIAL_TRAFFIC_INTERVAL_TICKS =\s*SMO_TRAFFIC_PROFILE\.initialSpacingSeconds \*\s*SIMULATION_TICKS_PER_SECOND/,
  );
  assert.match(
    simulator,
    /MINIMUM_TRAFFIC_INTERVAL_TICKS =\s*SMO_TRAFFIC_PROFILE\.minimumSpacingSeconds \*\s*SIMULATION_TICKS_PER_SECOND/,
  );
  assert.match(simulator, /function continuousTrafficIntervalTicks/);
  assert.match(
    simulator,
    /sequence \/ SMO_TRAFFIC_PROFILE\.rampEveryMovements/,
  );
  assert.match(
    simulator,
    /SMO_TRAFFIC_PROFILE\.spacingReductionSeconds/,
  );
  assert.match(simulator, /function createContinuousTraffic/);
  assert.match(
    simulator,
    /sequence % 2 === 0 \? "departure" : "arrival"/,
  );
  assert.match(simulator, /if \(world\.tick >= world\.nextTrafficTick\)/);
  assert.match(simulator, /trafficSequence: world\.trafficSequence \+ 1/);
  assert.match(simulator, /continuousTrafficIntervalTicks\(world\.trafficSequence \+ 1\)/);
  assert.match(simulator, /stepped\.filter\(\(flight\) => !flight\.completed\)/);
  assert.doesNotMatch(
    simulator,
    /world\.aircraft\.length\s*[<>=]+\s*\d+[^}]*createContinuousTraffic/s,
  );
});

test("keeps the clearance console in the sidebar and gives the radar full height", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const sidebarIndex = simulator.indexOf('<aside className="side-panel">');
  const commandIndex = simulator.indexOf('className="command-deck"');
  assert.ok(sidebarIndex >= 0);
  assert.ok(commandIndex > sidebarIndex);
  assert.match(simulator, /aria-label="Clearance console"/);
  assert.match(css, /\.top-bar\s*\{[^}]*min-height:\s*54px/s);
  assert.match(css, /\.radar-map\s*\{[^}]*height:\s*100%/s);
  assert.match(
    css,
    /\.side-panel\s*\{[^}]*grid-template-rows:\s*92px auto auto minmax\(0, 1fr\) auto/s,
  );
  assert.doesNotMatch(css, /height:\s*calc\(100%\s*-\s*174px\)/);
});

test("keeps radio messages at the top and scrolls only the active strip stack", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const sidebarIndex = simulator.indexOf('<aside className="side-panel">');
  const radioIndex = simulator.indexOf('className="panel-section radio-section"');
  const commandIndex = simulator.indexOf('className="command-deck"');
  const stripsIndex = simulator.indexOf(
    'className="panel-section strips-section"',
  );

  assert.ok(sidebarIndex >= 0);
  assert.ok(radioIndex > sidebarIndex);
  assert.ok(commandIndex > radioIndex);
  assert.ok(stripsIndex > commandIndex);
  assert.match(simulator, /world\.events\.slice\(-2\)\.reverse\(\)/);
  assert.match(css, /body\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(
    css,
    /\.side-panel\s*\{[^}]*height:\s*calc\(100vh - 70px\)[^}]*overflow:\s*hidden/s,
  );
  assert.match(css, /\.strips-section\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.strip-stack\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.event-log\s*\{[^}]*overflow:\s*hidden/s);
});

test("uses a bare command input without selection or suggested clearances", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /aria-label="ATC command"/);
  assert.match(simulator, /<button type="submit">Send<\/button>/);
  assert.doesNotMatch(simulator, /className="selection-summary"/);
  assert.doesNotMatch(simulator, /className="quick-commands"/);
  assert.doesNotMatch(simulator, /const QUICK_COMMANDS/);
  assert.doesNotMatch(simulator, /press Enter/);
  assert.doesNotMatch(css, /\.selection-summary/);
  assert.doesNotMatch(css, /\.quick-commands/);
});
