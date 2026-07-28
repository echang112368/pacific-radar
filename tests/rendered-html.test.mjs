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
  assert.match(simulator, /Touchdown Runway \$\{next\.runway \?\? "21"\}/);
  assert.match(simulator, /handed to nearby airspace\./);
  assert.match(simulator, /\["DCT", "DIRECT"\]/);
  assert.match(simulator, /appendGroundTrackSample/);
  assert.match(css, /ksmo-terminal-satellite\.jpg/);
  assert.match(css, /\.history-group \.history-segment/);
  assert.match(css, /\.flight-strip\.departure/);
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
  assert.match(simulator, /AIRBORNE_SPEED_CHANGE_PER_TICK = 0\.5/);
  assert.match(simulator, /function groundTravelForKnots/);
  assert.match(simulator, /groundTravelForKnots\(next\.speed\)/);
  assert.match(simulator, /groundSpeed = \(distanceNm \* 3600\) \/ elapsedSeconds/);
  assert.match(
    simulator,
    /Math\.round\(currentGroundMotion\(flight\)\.groundSpeed\)\}KT/,
  );
  assert.match(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE/);
  assert.doesNotMatch(simulator, /BACKGROUND_MOVEMENT_SCALE/);
  assert.doesNotMatch(
    simulator,
    /groundTravelForKnots\(Math\.max\(next\.speed/,
  );
  assert.doesNotMatch(simulator, /next\.speed \/ 5000/);
  assert.doesNotMatch(simulator, /Math\.max\(next\.speed, 8\) \/ 4800/);
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
    /1000 \/ SIMULATION_TICKS_PER_SECOND \/ simulationSpeed/,
  );
  assert.match(simulator, /\[paused, simulationSpeed\]/);
  assert.match(simulator, /aria-label="Simulation speed"/);
  assert.match(simulator, /Real life speed/);
  assert.doesNotMatch(simulator, /Reset seed 0321/);
  assert.doesNotMatch(simulator, /Deterministic replay · build 0\.1/);
  assert.match(css, /\.simulation-speed-slider/);
  assert.match(css, /\.speed-scale/);
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

test("aligns departures to KSMO Runway 03/21 and uses the full takeoff roll", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /type RunwayEnd = "03" \| "21"/);
  assert.match(simulator, /designation:\s*"03\/21"/);
  assert.match(simulator, /"21":\s*\{[^}]*heading:\s*210/s);
  assert.match(simulator, /"03":\s*\{[^}]*heading:\s*30/s);
  assert.match(simulator, /runway:\s*"03"/);
  assert.match(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE = 3\.5/);
  assert.match(simulator, /if \(dist <= travel\)/);
  assert.match(simulator, /next\.x = runway\.rolloutEnd\.x/);
  assert.match(simulator, /next\.status = "DEPARTURE"/);
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
    /LINE_UP_TICKS = SIMULATION_TICKS_PER_SECOND \* 3/,
  );
  assert.match(
    simulator,
    /TAKEOFF_POWER_TICKS = SIMULATION_TICKS_PER_SECOND/,
  );
  assert.match(simulator, /TAKEOFF_ACCELERATION_PER_TICK = 1\.8/);
  assert.match(simulator, /flight\.status = "LINING_UP"/);
  assert.match(simulator, /next\.status = "TAKEOFF_READY"/);
  assert.match(simulator, /next\.status = "TAKEOFF_ROLL"/);
  assert.match(
    simulator,
    /next\.speed = moveToward\(\s*next\.speed,\s*78,\s*TAKEOFF_ACCELERATION_PER_TICK/s,
  );
  assert.doesNotMatch(simulator, /flight\.status = "TAKEOFF_ROLL"/);
  assert.match(simulator, /LINE UP & WAIT/);
  assert.match(simulator, /TAKEOFF POWER SET/);
});

test("pause is a planning state with compact, boxless traffic displays", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /if \(paused\) return;/);
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
  assert.match(simulator, /tick:\s*48/);
  assert.match(simulator, /tick:\s*160/);
  assert.match(simulator, /tick:\s*832/);
  assert.match(simulator, /x:\s*0\.6/);
  assert.match(simulator, /status:\s*"HOLD_SHORT"/);
  assert.match(simulator, /flight\.status !== "HOLD_SHORT"/);
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
