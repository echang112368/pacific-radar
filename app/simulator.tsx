"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type FlightKind = "arrival" | "departure";
type FlightStatus =
  | "INBOUND"
  | "APPROACH"
  | "FINAL"
  | "GO_AROUND"
  | "HOLD_SHORT"
  | "LINE_UP"
  | "TAKEOFF_ROLL"
  | "DEPARTURE"
  | "LANDED"
  | "HANDOFF";

type Aircraft = {
  callsign: string;
  type: string;
  wake: "L" | "M";
  kind: FlightKind;
  status: FlightStatus;
  x: number;
  y: number;
  heading: number;
  targetHeading: number;
  altitude: number;
  targetAltitude: number;
  speed: number;
  targetSpeed: number;
  landingCleared?: boolean;
  approach?: string;
  completed?: boolean;
};

type EventItem = {
  tick: number;
  tone: "system" | "pilot" | "warning" | "success";
  message: string;
};

type World = {
  tick: number;
  score: number;
  safeOperations: number;
  separationLosses: number;
  runwayIncursions: number;
  aircraft: Aircraft[];
  events: EventItem[];
};

const RUNWAY = {
  active: "21",
  heading: 210,
  threshold: { x: 56, y: 23 },
  rollout: { x: 39, y: 47 },
};

const INITIAL_WORLD: World = {
  tick: 0,
  score: 1000,
  safeOperations: 0,
  separationLosses: 0,
  runwayIncursions: 0,
  aircraft: [
    {
      callsign: "N172SP",
      type: "C172",
      wake: "L",
      kind: "arrival",
      status: "INBOUND",
      x: 84,
      y: 8,
      heading: 235,
      targetHeading: 235,
      altitude: 2600,
      targetAltitude: 2600,
      speed: 115,
      targetSpeed: 115,
    },
    {
      callsign: "JSX422",
      type: "E145",
      wake: "M",
      kind: "arrival",
      status: "INBOUND",
      x: 93,
      y: 66,
      heading: 305,
      targetHeading: 305,
      altitude: 4200,
      targetAltitude: 4200,
      speed: 190,
      targetSpeed: 190,
    },
    {
      callsign: "N4382K",
      type: "PA28",
      wake: "L",
      kind: "departure",
      status: "HOLD_SHORT",
      x: 57.5,
      y: 25,
      heading: 210,
      targetHeading: 210,
      altitude: 177,
      targetAltitude: 2500,
      speed: 0,
      targetSpeed: 0,
    },
  ],
  events: [
    {
      tick: 0,
      tone: "system",
      message: "KSMO TOWER · Runway 21 active · Wind 240 at 8",
    },
    {
      tick: 0,
      tone: "pilot",
      message: "N172SP: Eight miles northeast, 2,600, inbound full stop.",
    },
    {
      tick: 0,
      tone: "pilot",
      message: "N4382K: Holding short Runway 21, ready for departure.",
    },
  ],
};

const FIXES = [
  { name: "DARTS", x: 75, y: 17, kind: "fix" },
  { name: "MORVE", x: 69, y: 34, kind: "fix" },
  { name: "WAKER", x: 24, y: 26, kind: "fix" },
  { name: "SMO", x: 48, y: 36, kind: "vor" },
  { name: "SESPE", x: 18, y: 13, kind: "vor" },
  { name: "NATJU", x: 82, y: 56, kind: "fix" },
];

const QUICK_COMMANDS = [
  { label: "Heading 210", command: "H 210" },
  { label: "Descend 1,400", command: "A 1400" },
  { label: "Speed 100", command: "S 100" },
  { label: "RNAV 21", command: "APP RNAV21" },
  { label: "Clear to land", command: "LDG 21" },
  { label: "Line up & wait", command: "LUAW 21" },
  { label: "Clear takeoff", command: "TO 21" },
  { label: "Go around", command: "GA" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function turnToward(current: number, target: number, amount: number) {
  const delta = ((target - current + 540) % 360) - 180;
  if (Math.abs(delta) <= amount) return (target + 360) % 360;
  return (current + Math.sign(delta) * amount + 360) % 360;
}

function moveToward(current: number, target: number, amount: number) {
  if (Math.abs(target - current) <= amount) return target;
  return current + Math.sign(target - current) * amount;
}

function appendEvent(world: World, tone: EventItem["tone"], message: string) {
  return {
    ...world,
    events: [...world.events.slice(-18), { tick: world.tick, tone, message }],
  };
}

function runwayOccupied(aircraft: Aircraft[]) {
  return aircraft.some((flight) =>
    ["LINE_UP", "TAKEOFF_ROLL", "LANDED"].includes(flight.status),
  );
}

function distance(a: Aircraft, b: Aircraft) {
  return Math.hypot(a.x - b.x, a.y - b.y) * 0.16;
}

function stepWorld(previous: World): World {
  let world: World = { ...previous, tick: previous.tick + 1 };
  const stepped = previous.aircraft.map((flight) => {
    if (flight.completed || flight.status === "HANDOFF") return flight;

    const next = { ...flight };
    next.heading = turnToward(next.heading, next.targetHeading, 0.8);
    next.altitude = moveToward(next.altitude, next.targetAltitude, 16);
    next.speed = moveToward(next.speed, next.targetSpeed, 1.5);

    if (
      ["INBOUND", "DEPARTURE", "GO_AROUND"].includes(next.status) &&
      next.speed > 0
    ) {
      const radians = (next.heading * Math.PI) / 180;
      const travel = next.speed / 15000;
      next.x += Math.sin(radians) * travel;
      next.y -= Math.cos(radians) * travel;
    }

    if (next.status === "APPROACH" || next.status === "FINAL") {
      const dx = RUNWAY.threshold.x - next.x;
      const dy = RUNWAY.threshold.y - next.y;
      const dist = Math.hypot(dx, dy);
      const travel = Math.max(next.speed, 80) / 12000;
      next.x += (dx / Math.max(dist, 0.01)) * travel;
      next.y += (dy / Math.max(dist, 0.01)) * travel;
      next.targetHeading = RUNWAY.heading;
      next.targetAltitude = Math.max(177, Math.min(next.altitude, dist * 115));
      next.targetSpeed = next.type === "E145" ? 125 : 85;

      if (dist < 7) next.status = "FINAL";
      if (dist < 1.2 && !next.landingCleared) {
        next.status = "GO_AROUND";
        next.targetHeading = 210;
        next.targetAltitude = 3000;
        next.targetSpeed = next.type === "E145" ? 170 : 110;
        next.landingCleared = false;
        world = appendEvent(
          world,
          "warning",
          `${next.callsign}: Going around — no landing clearance received.`,
        );
      } else if (dist < 0.75 && next.landingCleared) {
        next.status = "LANDED";
        next.altitude = 177;
        next.targetAltitude = 177;
        next.speed = next.type === "E145" ? 95 : 65;
        next.targetSpeed = 20;
      }
    }

    if (next.status === "LANDED") {
      const dx = RUNWAY.rollout.x - next.x;
      const dy = RUNWAY.rollout.y - next.y;
      const dist = Math.hypot(dx, dy);
      const travel = Math.max(next.speed, 12) / 15000;
      next.x += (dx / Math.max(dist, 0.01)) * travel;
      next.y += (dy / Math.max(dist, 0.01)) * travel;
      if (dist < 1.2) {
        next.completed = true;
        world.safeOperations += 1;
        world.score += 250;
        world = appendEvent(
          world,
          "success",
          `${next.callsign}: Runway 21 vacated. Landing complete.`,
        );
      }
    }

    if (next.status === "TAKEOFF_ROLL") {
      const dx = RUNWAY.rollout.x - next.x;
      const dy = RUNWAY.rollout.y - next.y;
      const dist = Math.hypot(dx, dy);
      next.speed = moveToward(next.speed, 78, 2.2);
      const travel = Math.max(next.speed, 8) / 11500;
      next.x += (dx / Math.max(dist, 0.01)) * travel;
      next.y += (dy / Math.max(dist, 0.01)) * travel;
      if (next.speed >= 72 || dist < 2) {
        next.status = "DEPARTURE";
        next.targetSpeed = 120;
        next.targetAltitude = Math.max(next.targetAltitude, 2500);
      }
    }

    if (
      next.status === "DEPARTURE" &&
      next.altitude > 2200 &&
      (next.x < 3 || next.x > 97 || next.y < 3 || next.y > 97)
    ) {
      next.status = "HANDOFF";
      next.completed = true;
      world.safeOperations += 1;
      world.score += 220;
      world = appendEvent(
        world,
        "success",
        `${next.callsign}: Contact SoCal Departure. Good day.`,
      );
    }

    return next;
  });

  world.aircraft = stepped;

  const airborne = stepped.filter(
    (flight) =>
      !flight.completed &&
      !["HOLD_SHORT", "LINE_UP", "TAKEOFF_ROLL", "LANDED"].includes(
        flight.status,
      ),
  );

  for (let i = 0; i < airborne.length; i += 1) {
    for (let j = i + 1; j < airborne.length; j += 1) {
      const lateral = distance(airborne[i], airborne[j]);
      const vertical = Math.abs(
        airborne[i].altitude - airborne[j].altitude,
      );
      if (
        lateral < 3 &&
        vertical < 1000 &&
        previous.tick % 24 === 0
      ) {
        world.separationLosses += 1;
        world.score = Math.max(0, world.score - 350);
        world = appendEvent(
          world,
          "warning",
          `LOSS OF SEPARATION · ${airborne[i].callsign} / ${airborne[j].callsign} · ${lateral.toFixed(1)} NM`,
        );
      }
    }
  }

  return world;
}

function parseNumber(token: string | undefined) {
  const value = Number.parseInt(token ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

function executeCommand(
  previous: World,
  rawCommand: string,
  selectedCallsign: string | null,
) {
  const normalized = rawCommand
    .trim()
    .toUpperCase()
    .replaceAll(",", "")
    .replace(/\s+/g, " ");

  if (!normalized) return previous;

  let tokens = normalized.split(" ");
  let callsign = selectedCallsign;
  const explicit = previous.aircraft.find(
    (flight) => flight.callsign === tokens[0],
  );
  if (explicit) {
    callsign = explicit.callsign;
    tokens = tokens.slice(1);
  }

  const index = previous.aircraft.findIndex(
    (flight) => flight.callsign === callsign,
  );
  if (index < 0) {
    return appendEvent(
      previous,
      "warning",
      "Select an aircraft or begin with a valid callsign.",
    );
  }

  const aircraft = [...previous.aircraft];
  const flight = { ...aircraft[index] };
  const phrase = tokens.join(" ");
  const command = tokens[0];
  const value = parseNumber(tokens[1]);

  const acknowledge = (message: string) => {
    aircraft[index] = flight;
    return appendEvent({ ...previous, aircraft }, "pilot", message);
  };
  const reject = (message: string) => appendEvent(previous, "warning", message);

  if (["H", "HDG", "HEADING"].includes(command) && value !== null) {
    flight.targetHeading = ((value % 360) + 360) % 360;
    return acknowledge(
      `${flight.callsign}: ${value < flight.heading ? "Left" : "Right"} heading ${String(flight.targetHeading).padStart(3, "0")}.`,
    );
  }

  if (
    ["A", "ALT", "ALTITUDE"].includes(command) &&
    value !== null
  ) {
    flight.targetAltitude = clamp(value, 177, 8000);
    return acknowledge(
      `${flight.callsign}: ${flight.targetAltitude >= flight.altitude ? "Climb and maintain" : "Descend and maintain"} ${flight.targetAltitude.toLocaleString()}.`,
    );
  }

  if (["S", "SPD", "SPEED"].includes(command) && value !== null) {
    flight.targetSpeed = clamp(value, 70, flight.type === "E145" ? 250 : 140);
    return acknowledge(
      `${flight.callsign}: Speed ${flight.targetSpeed} knots.`,
    );
  }

  if (
    command === "APP" ||
    phrase.includes("CLEARED RNAV") ||
    phrase.includes("RNAV21")
  ) {
    if (flight.kind !== "arrival") {
      return reject(`${flight.callsign}: Unable approach clearance.`);
    }
    if (flight.altitude > 3500) {
      return reject(
        `${flight.callsign}: Unable — descend below 3,500 before approach clearance.`,
      );
    }
    flight.status = "APPROACH";
    flight.approach = "RNAV 21";
    flight.targetHeading = 210;
    flight.targetSpeed = flight.type === "E145" ? 140 : 95;
    return acknowledge(
      `${flight.callsign}: Cleared RNAV Runway 21 approach.`,
    );
  }

  if (
    ["LDG", "LAND"].includes(command) ||
    phrase.includes("CLEARED TO LAND")
  ) {
    if (!["APPROACH", "FINAL"].includes(flight.status)) {
      return reject(
        `${flight.callsign}: Unable landing clearance — approach not established.`,
      );
    }
    if (runwayOccupied(previous.aircraft)) {
      return reject(
        `${flight.callsign}: Unable — Runway 21 is occupied.`,
      );
    }
    flight.landingCleared = true;
    return acknowledge(`${flight.callsign}: Runway 21, cleared to land.`);
  }

  if (command === "GA" || phrase.includes("GO AROUND")) {
    if (flight.kind !== "arrival") {
      return reject(`${flight.callsign}: Unable go-around.`);
    }
    flight.status = "GO_AROUND";
    flight.landingCleared = false;
    flight.targetHeading = 210;
    flight.targetAltitude = 3000;
    flight.targetSpeed = flight.type === "E145" ? 170 : 110;
    return acknowledge(
      `${flight.callsign}: Going around, runway heading, 3,000.`,
    );
  }

  if (command === "LUAW" || phrase.includes("LINE UP")) {
    if (flight.status !== "HOLD_SHORT") {
      return reject(`${flight.callsign}: Unable line up from present position.`);
    }
    const threat = previous.aircraft.find(
      (other) =>
        other.kind === "arrival" &&
        other.status === "FINAL" &&
        !other.completed,
    );
    if (runwayOccupied(previous.aircraft) || threat) {
      return appendEvent(
        {
          ...previous,
          runwayIncursions: previous.runwayIncursions + 1,
          score: Math.max(0, previous.score - 500),
        },
        "warning",
        `UNSAFE CLEARANCE BLOCKED · Runway 21 ${threat ? `arrival ${threat.callsign} on final` : "occupied"}.`,
      );
    }
    flight.status = "LINE_UP";
    flight.x = RUNWAY.threshold.x;
    flight.y = RUNWAY.threshold.y;
    return acknowledge(
      `${flight.callsign}: Runway 21, line up and wait.`,
    );
  }

  if (
    command === "TO" ||
    command === "T" ||
    phrase.includes("CLEARED FOR TAKEOFF")
  ) {
    if (flight.status !== "LINE_UP") {
      return reject(
        `${flight.callsign}: Unable takeoff — not lined up on Runway 21.`,
      );
    }
    const final = previous.aircraft.find(
      (other) => other.kind === "arrival" && other.status === "FINAL",
    );
    if (final) {
      return appendEvent(
        {
          ...previous,
          runwayIncursions: previous.runwayIncursions + 1,
          score: Math.max(0, previous.score - 500),
        },
        "warning",
        `UNSAFE TAKEOFF BLOCKED · ${final.callsign} is on final Runway 21.`,
      );
    }
    flight.status = "TAKEOFF_ROLL";
    flight.targetSpeed = 78;
    return acknowledge(
      `${flight.callsign}: Runway 21, cleared for takeoff.`,
    );
  }

  if (command === "TX" || command === "TAXI") {
    if (flight.status !== "HOLD_SHORT") {
      return reject(`${flight.callsign}: Unable taxi from present position.`);
    }
    return acknowledge(
      `${flight.callsign}: Taxi via Alpha, hold short Runway 21.`,
    );
  }

  return reject(
    `Command not understood: “${normalized}”. Try H 210, A 1400, APP RNAV21, LDG 21, LUAW 21, TO 21, or GA.`,
  );
}

function statusLabel(status: FlightStatus) {
  return status.replaceAll("_", " ");
}

function altitudeLabel(altitude: number) {
  return String(Math.round(altitude / 100)).padStart(3, "0");
}

export function RadarSimulator() {
  const [world, setWorld] = useState<World>(INITIAL_WORLD);
  const [selected, setSelected] = useState<string | null>("N172SP");
  const [command, setCommand] = useState("");
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSatellite, setShowSatellite] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setWorld((current) => stepWorld(current));
    }, 250);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const focusCommand = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        document.activeElement?.tagName.toLowerCase() !== "input"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setShowHelp(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", focusCommand);
    return () => window.removeEventListener("keydown", focusCommand);
  }, []);

  const visibleAircraft = useMemo(
    () => world.aircraft.filter((flight) => !flight.completed),
    [world.aircraft],
  );

  const selectedFlight =
    world.aircraft.find((flight) => flight.callsign === selected) ?? null;

  const alerts = useMemo(() => {
    const result: string[] = [];
    const airborne = visibleAircraft.filter(
      (flight) =>
        !["HOLD_SHORT", "LINE_UP", "TAKEOFF_ROLL", "LANDED"].includes(
          flight.status,
        ),
    );
    for (let i = 0; i < airborne.length; i += 1) {
      for (let j = i + 1; j < airborne.length; j += 1) {
        const lateral = distance(airborne[i], airborne[j]);
        const vertical = Math.abs(
          airborne[i].altitude - airborne[j].altitude,
        );
        if (lateral < 4.5 && vertical < 1000) {
          result.push(
            `${airborne[i].callsign} / ${airborne[j].callsign} ${lateral.toFixed(1)} NM`,
          );
        }
      }
    }
    return result;
  }, [visibleAircraft]);

  const transmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!command.trim()) return;
    setWorld((current) => executeCommand(current, command, selected));
    setCommand("");
    inputRef.current?.focus();
  };

  const runQuickCommand = (value: string) => {
    if (!selected) return;
    setWorld((current) => executeCommand(current, value, selected));
    inputRef.current?.focus();
  };

  const reset = () => {
    setWorld(INITIAL_WORLD);
    setSelected("N172SP");
    setCommand("");
    setPaused(false);
  };

  const clockMinutes = Math.floor(world.tick / 240);
  const clockSeconds = Math.floor((world.tick % 240) / 4);

  return (
    <main className="sim-shell">
      <header className="top-bar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            PR
          </div>
          <div>
            <p className="eyebrow">PACIFIC RADAR · PHASE 0</p>
            <h1>Santa Monica Tower</h1>
          </div>
        </div>
        <div className="status-ribbon" aria-label="Airport conditions">
          <div>
            <span>FIELD</span>
            <strong>KSMO · 177&apos;</strong>
          </div>
          <div>
            <span>ACTIVE</span>
            <strong>RWY 21</strong>
          </div>
          <div>
            <span>WIND</span>
            <strong>240° / 08 KT</strong>
          </div>
          <div>
            <span>VIS</span>
            <strong>10+ SM</strong>
          </div>
          <div>
            <span>SIM</span>
            <strong>
              {String(clockMinutes).padStart(2, "0")}:
              {String(clockSeconds).padStart(2, "0")}
            </strong>
          </div>
        </div>
        <div className="header-actions">
          <button className="ghost-button" onClick={() => setShowHelp(true)}>
            Command guide
          </button>
          <button
            className={paused ? "primary-button" : "ghost-button"}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      <section className="workspace">
        <div className="radar-column">
          <div className="radar-frame">
            <div
              className={`radar-map ${showSatellite ? "satellite-on" : "satellite-off"}`}
              aria-label="Interactive radar map centered on Santa Monica Municipal Airport"
            >
              <div className="satellite-layer" />
              <div className="radar-tint" />
              <div className="range-ring ring-one" />
              <div className="range-ring ring-two" />
              <div className="range-ring ring-three" />
              <div className="runway-overlay" aria-label="Runway 03/21">
                <span className="runway-number runway-21">21</span>
                <span className="runway-number runway-03">03</span>
              </div>

              {FIXES.map((fix) => (
                <div
                  className={`fix-marker ${fix.kind}`}
                  key={fix.name}
                  style={{ left: `${fix.x}%`, top: `${fix.y}%` }}
                >
                  <span className="fix-symbol" aria-hidden="true" />
                  <span>{fix.name}</span>
                </div>
              ))}

              {visibleAircraft.map((flight) => (
                <button
                  className={`aircraft-target ${selected === flight.callsign ? "selected" : ""} ${flight.kind}`}
                  key={flight.callsign}
                  style={{
                    left: `${clamp(flight.x, 1, 98)}%`,
                    top: `${clamp(flight.y, 1, 97)}%`,
                  }}
                  onClick={() => {
                    setSelected(flight.callsign);
                    inputRef.current?.focus();
                  }}
                  aria-label={`Select ${flight.callsign}`}
                >
                  <span
                    className="target-chevron"
                    style={{ transform: `rotate(${flight.heading}deg)` }}
                    aria-hidden="true"
                  />
                  <span className="data-tag">
                    <strong>{flight.callsign}</strong>
                    <span>
                      {altitudeLabel(flight.altitude)}
                      {flight.targetAltitude > flight.altitude + 30
                        ? "↑"
                        : flight.targetAltitude < flight.altitude - 30
                          ? "↓"
                          : "·"}{" "}
                      {Math.round(flight.speed)}
                    </span>
                    <span>{statusLabel(flight.status)}</span>
                  </span>
                </button>
              ))}

              <div className="map-title">
                <span>SMO TOWER · 12 NM</span>
                <strong>RWY 03/21 · 3,500 × 150 FT</strong>
              </div>

              <div className="map-controls">
                <button
                  className={showSatellite ? "active" : ""}
                  onClick={() => setShowSatellite((value) => !value)}
                >
                  SAT
                </button>
                <button onClick={() => setPaused((value) => !value)}>
                  {paused ? "▶" : "Ⅱ"}
                </button>
              </div>

              <div className="map-attribution">
                Imagery © Esri, Maxar, Earthstar Geographics
              </div>

              {alerts.length > 0 && (
                <div className="conflict-banner">
                  <span className="pulse-dot" />
                  CONFLICT PREDICTION · {alerts[0]}
                </div>
              )}

              {paused && (
                <div className="pause-overlay">
                  <span>Simulation paused</span>
                  <button onClick={() => setPaused(false)}>Resume shift</button>
                </div>
              )}
            </div>

            <div className="command-deck">
              <div className="selection-summary">
                <span>SELECTED</span>
                <strong>{selectedFlight?.callsign ?? "NONE"}</strong>
                {selectedFlight && (
                  <small>
                    {selectedFlight.type} · {statusLabel(selectedFlight.status)}
                  </small>
                )}
              </div>
              <form className="command-form" onSubmit={transmit}>
                <label htmlFor="command">Clearance</label>
                <div className="command-input-wrap">
                  <span className="prompt-symbol">›</span>
                  <input
                    ref={inputRef}
                    id="command"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder={
                      selected
                        ? `${selected} H 210 · press Enter`
                        : "Select an aircraft"
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button type="submit">Transmit</button>
                </div>
              </form>
              <div className="quick-commands" aria-label="Quick commands">
                {QUICK_COMMANDS.map((item) => (
                  <button
                    key={item.command}
                    onClick={() => runQuickCommand(item.command)}
                    disabled={!selected}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="side-panel">
          <section className="score-card">
            <div>
              <span>SHIFT SCORE</span>
              <strong>{world.score.toLocaleString()}</strong>
            </div>
            <div className="score-metrics">
              <span>
                <strong>{world.safeOperations}</strong> safe ops
              </span>
              <span>
                <strong>{world.separationLosses}</strong> sep losses
              </span>
              <span>
                <strong>{world.runwayIncursions}</strong> blocked hazards
              </span>
            </div>
          </section>

          <section className="panel-section strips-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">TRAFFIC BOARD</p>
                <h2>Flight strips</h2>
              </div>
              <span>{visibleAircraft.length} active</span>
            </div>
            <div className="strip-stack">
              {visibleAircraft.map((flight) => (
                <button
                  className={`flight-strip ${flight.kind} ${selected === flight.callsign ? "selected" : ""}`}
                  key={flight.callsign}
                  onClick={() => {
                    setSelected(flight.callsign);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="strip-sequence">
                    {flight.kind === "arrival" ? "ARR" : "DEP"}
                  </span>
                  <span className="strip-main">
                    <strong>{flight.callsign}</strong>
                    <small>
                      {flight.type} · WTC {flight.wake}
                    </small>
                  </span>
                  <span className="strip-data">
                    <strong>{Math.round(flight.altitude)}&apos;</strong>
                    <small>{Math.round(flight.speed)} KT</small>
                  </span>
                  <span className="strip-status">
                    {statusLabel(flight.status)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section radio-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">120.100</p>
                <h2>Radio log</h2>
              </div>
              <span className="live-indicator">LIVE</span>
            </div>
            <div className="event-log" aria-live="polite">
              {[...world.events].reverse().map((item, index) => (
                <div className={`event-row ${item.tone}`} key={`${item.tick}-${index}`}>
                  <span>
                    {String(Math.floor(item.tick / 240)).padStart(2, "0")}:
                    {String(Math.floor((item.tick % 240) / 4)).padStart(2, "0")}
                  </span>
                  <p>{item.message}</p>
                </div>
              ))}
            </div>
          </section>

          <footer className="side-footer">
            <button className="ghost-button" onClick={reset}>
              Reset seed 0321
            </button>
            <span>Deterministic replay · build 0.1</span>
          </footer>
        </aside>
      </section>

      {showHelp && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="command-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-guide-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">CLEARANCE REFERENCE</p>
                <h2 id="command-guide-title">Command guide</h2>
              </div>
              <button onClick={() => setShowHelp(false)} aria-label="Close guide">
                ×
              </button>
            </div>
            <p className="modal-intro">
              Select a target or strip, then type the short form. Full callsigns
              are optional when a flight is selected.
            </p>
            <div className="command-grid">
              <div>
                <code>H 210</code>
                <span>Turn heading 210</span>
              </div>
              <div>
                <code>A 1400</code>
                <span>Climb or descend to 1,400</span>
              </div>
              <div>
                <code>S 100</code>
                <span>Adjust speed to 100 knots</span>
              </div>
              <div>
                <code>APP RNAV21</code>
                <span>Clear RNAV Runway 21 approach</span>
              </div>
              <div>
                <code>LDG 21</code>
                <span>Clear to land Runway 21</span>
              </div>
              <div>
                <code>LUAW 21</code>
                <span>Line up and wait Runway 21</span>
              </div>
              <div>
                <code>TO 21</code>
                <span>Clear for takeoff Runway 21</span>
              </div>
              <div>
                <code>GA</code>
                <span>Issue go-around</span>
              </div>
            </div>
            <div className="safety-note">
              <strong>Phase 0 safety logic</strong>
              <p>
                The simulator blocks unsafe runway clearances, monitors 3 NM /
                1,000 ft airborne separation, and requires an approach clearance
                before a landing clearance.
              </p>
            </div>
            <button
              className="primary-button wide-button"
              onClick={() => setShowHelp(false)}
            >
              Return to scope
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
