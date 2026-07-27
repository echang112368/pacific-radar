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
  assert.match(html, /N172SP/);
  assert.match(html, /EXIT MALIBU/);
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
  assert.match(simulator, /next\.track =/);
  assert.match(css, /ksmo-terminal-satellite\.jpg/);
  assert.match(css, /\.history-group polyline/);
  assert.match(css, /\.flight-strip\.departure/);
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
