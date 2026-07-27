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
  assert.match(simulator, /Touchdown Runway 21\. Landing complete\./);
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

test("calibrates knot speed to faster movement across the satellite background", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /BACKGROUND_MOVEMENT_SCALE = 1\.35/);
  assert.match(simulator, /function groundTravelForKnots/);
  assert.match(simulator, /groundTravelForKnots\(next\.speed\)/);
  assert.match(
    simulator,
    /groundTravelForKnots\(Math\.max\(next\.speed, 80\)\)/,
  );
  assert.match(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE/);
  assert.doesNotMatch(simulator, /next\.speed \/ 5000/);
  assert.doesNotMatch(simulator, /Math\.max\(next\.speed, 8\) \/ 4800/);
});

test("aligns departures to KSMO Runway 03/21 and uses the full takeoff roll", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /reciprocal:\s*"03"/);
  assert.match(simulator, /designation:\s*"03\/21"/);
  assert.match(simulator, /departureEnd:\s*\{/);
  assert.match(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE = 3\.5/);
  assert.match(simulator, /if \(dist <= travel\)/);
  assert.match(simulator, /next\.x = RUNWAY\.departureEnd\.x/);
  assert.match(simulator, /next\.status = "DEPARTURE"/);
  assert.doesNotMatch(simulator, /next\.speed >= 72 \|\| dist < 2/);
  assert.match(simulator, /className="runway-layer"/);
  assert.match(simulator, /ACTIVE END/);
  assert.match(simulator, /RECIPROCAL/);
  assert.match(css, /\.runway-layer/);
  assert.match(css, /\.runway-end-label/);
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
  assert.match(css, /\.pause-overlay\s*\{[^}]*inset:\s*0/s);
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
  assert.match(css, /\.side-panel\s*\{[^}]*grid-template-rows:\s*auto auto/s);
  assert.doesNotMatch(css, /height:\s*calc\(100%\s*-\s*174px\)/);
});
