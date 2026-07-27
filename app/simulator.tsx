"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type FlightKind = "arrival" | "departure";
type RunwayEnd = "03" | "21";
type FlightStatus =
  | "INBOUND"
  | "APPROACH"
  | "FINAL"
  | "GO_AROUND"
  | "HOLDING"
  | "HOLD_SHORT"
  | "LINE_UP"
  | "TAKEOFF_ROLL"
  | "DEPARTURE"
  | "LANDED"
  | "HANDOFF";

type TrackPoint = {
  x: number;
  y: number;
  tick: number;
  groundSpeed: number;
  groundTrack: number;
};

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
  groundSpeed?: number;
  groundTrack?: number;
  landingCleared?: boolean;
  runway?: RunwayEnd;
  approach?: string;
  exitFix?: string;
  departureAltitudeAssigned?: boolean;
  departureHeading?: number;
  departureTurnDirection?: "L" | "R";
  turnDirection?: "L" | "R";
  expedite?: boolean;
  holdFix?: string;
  track: TrackPoint[];
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

type HighScore = {
  score: number;
  safeOperations: number;
  elapsed: string;
};

const RUNWAY = {
  designation: "03/21",
  elevation: 177,
  ends: {
    "21": {
      heading: 210,
      threshold: { x: 52.2, y: 47.9 },
      rolloutEnd: { x: 49.4, y: 50.7 },
      hold: { x: 52.5, y: 47.7 },
    },
    "03": {
      heading: 30,
      threshold: { x: 49.4, y: 50.7 },
      rolloutEnd: { x: 52.2, y: 47.9 },
      hold: { x: 49.1, y: 50.9 },
    },
  },
};

const SIMULATION_TICKS_PER_SECOND = 4;
const TRACK_SAMPLE_SECONDS = 1;
const TRACK_HISTORY_SECONDS = 15;
const TRACK_SAMPLE_TICKS =
  SIMULATION_TICKS_PER_SECOND * TRACK_SAMPLE_SECONDS;
const TRACK_HISTORY_TICKS =
  SIMULATION_TICKS_PER_SECOND * TRACK_HISTORY_SECONDS;
const SCOPE_NM_PER_WORLD_UNIT = 0.35;
const BACKGROUND_MOVEMENT_SCALE = 1.35;
const TAKEOFF_ROLL_MOVEMENT_SCALE = 3.5;

const INITIAL_WORLD: World = {
  tick: 0,
  score: 1000,
  safeOperations: 0,
  separationLosses: 0,
  runwayIncursions: 0,
  aircraft: [],
  events: [
    {
      tick: 0,
      tone: "system",
      message: "KSMO TOWER · Runway 03/21 available · Wind 240 at 8",
    },
    {
      tick: 0,
      tone: "system",
      message: "Scope clear · Traffic will build gradually as the shift begins.",
    },
  ],
};

const FIXES = [
  { name: "DARTS", x: 73, y: 28, kind: "fix" },
  { name: "MORVE", x: 67, y: 42, kind: "fix" },
  { name: "WAKER", x: 29, y: 38, kind: "fix" },
  { name: "SMO", x: 50, y: 50, kind: "vor" },
  { name: "VNY", x: 44, y: 6, kind: "vor" },
  { name: "LAX", x: 57, y: 68, kind: "vor" },
  { name: "HHR", x: 68, y: 72, kind: "vor" },
  { name: "NATJU", x: 78, y: 61, kind: "fix" },
];

const EXIT_FIXES = [
  { name: "VNY", x: 20, y: 2, edge: "north" },
  { name: "HOLTZ", x: 98, y: 22, edge: "east" },
  { name: "SADDE", x: 98, y: 73, edge: "east" },
  { name: "LAXX", x: 66, y: 98, edge: "south" },
  { name: "MALIBU", x: 2, y: 70, edge: "west" },
] as const;

const SPAWN_SCHEDULE: { tick: number; aircraft: Aircraft }[] = [
  {
    tick: 48,
    aircraft: {
      callsign: "N4382K",
      type: "PA28",
      wake: "L",
      kind: "departure",
      status: "HOLD_SHORT",
      runway: "21",
      x: 52.5,
      y: 47.7,
      heading: 210,
      targetHeading: 210,
      altitude: 177,
      targetAltitude: 177,
      speed: 0,
      targetSpeed: 0,
      exitFix: "MALIBU",
      departureAltitudeAssigned: false,
      track: [],
    },
  },
  {
    tick: 160,
    aircraft: {
      callsign: "N172SP",
      type: "C172",
      wake: "L",
      kind: "arrival",
      status: "INBOUND",
      runway: "21",
      x: 99.2,
      y: 9,
      heading: 246,
      targetHeading: 246,
      altitude: 4600,
      targetAltitude: 4600,
      speed: 115,
      targetSpeed: 115,
      track: [],
    },
  },
  {
    tick: 288,
    aircraft: {
      callsign: "JSX422",
      type: "E145",
      wake: "M",
      kind: "arrival",
      status: "INBOUND",
      runway: "03",
      x: 99.4,
      y: 76,
      heading: 304,
      targetHeading: 304,
      altitude: 6200,
      targetAltitude: 6200,
      speed: 190,
      targetSpeed: 190,
      track: [],
    },
  },
  {
    tick: 416,
    aircraft: {
      callsign: "SURF52",
      type: "PC12",
      wake: "M",
      kind: "departure",
      status: "HOLD_SHORT",
      runway: "03",
      x: 49.1,
      y: 50.9,
      heading: 30,
      targetHeading: 30,
      altitude: 177,
      targetAltitude: 177,
      speed: 0,
      targetSpeed: 0,
      exitFix: "LAXX",
      departureAltitudeAssigned: false,
      track: [],
    },
  },
  {
    tick: 532,
    aircraft: {
      callsign: "N91GX",
      type: "C25A",
      wake: "M",
      kind: "arrival",
      status: "INBOUND",
      runway: "21",
      x: 17,
      y: 0.6,
      heading: 154,
      targetHeading: 154,
      altitude: 7200,
      targetAltitude: 7200,
      speed: 220,
      targetSpeed: 220,
      track: [],
    },
  },
  {
    tick: 640,
    aircraft: {
      callsign: "UAL918",
      type: "B738",
      wake: "M",
      kind: "arrival",
      status: "INBOUND",
      runway: "03",
      x: 0.6,
      y: 34,
      heading: 96,
      targetHeading: 96,
      altitude: 5400,
      targetAltitude: 5400,
      speed: 210,
      targetSpeed: 210,
      track: [],
    },
  },
  {
    tick: 740,
    aircraft: {
      callsign: "N225SM",
      type: "C172",
      wake: "L",
      kind: "departure",
      status: "HOLD_SHORT",
      runway: "21",
      x: 53,
      y: 47.3,
      heading: 210,
      targetHeading: 210,
      altitude: 177,
      targetAltitude: 177,
      speed: 0,
      targetSpeed: 0,
      exitFix: "HOLTZ",
      departureAltitudeAssigned: false,
      track: [],
    },
  },
  {
    tick: 832,
    aircraft: {
      callsign: "SKW603",
      type: "E175",
      wake: "M",
      kind: "arrival",
      status: "INBOUND",
      runway: "03",
      x: 99.4,
      y: 53,
      heading: 276,
      targetHeading: 276,
      altitude: 6800,
      targetAltitude: 6800,
      speed: 220,
      targetSpeed: 220,
      track: [],
    },
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function turnToward(current: number, target: number, amount: number) {
  const delta = ((target - current + 540) % 360) - 180;
  if (Math.abs(delta) <= amount) return (target + 360) % 360;
  return (current + Math.sign(delta) * amount + 360) % 360;
}

function turnTowardDirected(
  current: number,
  target: number,
  amount: number,
  direction?: "L" | "R",
) {
  if (!direction) return turnToward(current, target, amount);
  const remaining =
    direction === "R"
      ? (target - current + 360) % 360
      : (current - target + 360) % 360;
  if (remaining <= amount || remaining > 359.5) return target;
  return (current + (direction === "R" ? amount : -amount) + 360) % 360;
}

function moveToward(current: number, target: number, amount: number) {
  if (Math.abs(target - current) <= amount) return target;
  return current + Math.sign(target - current) * amount;
}

function groundTravelForKnots(speedKnots: number, phaseScale = 1) {
  const nauticalMilesPerTick =
    speedKnots / 3600 / SIMULATION_TICKS_PER_SECOND;
  return (
    (nauticalMilesPerTick / SCOPE_NM_PER_WORLD_UNIT) *
    BACKGROUND_MOVEMENT_SCALE *
    phaseScale
  );
}

function appendEvent(world: World, tone: EventItem["tone"], message: string) {
  return {
    ...world,
    events: [...world.events.slice(-18), { tick: world.tick, tone, message }],
  };
}

function findNavFix(name: string) {
  return (
    FIXES.find((fix) => fix.name === name) ??
    EXIT_FIXES.find((fix) => fix.name === name)
  );
}

function angularDifference(first: number, second: number) {
  return Math.abs(((first - second + 540) % 360) - 180);
}

function distance(a: Aircraft, b: Aircraft) {
  return Math.hypot(a.x - b.x, a.y - b.y) * 0.35;
}

function headingToPoint(
  from: Pick<Aircraft, "x" | "y">,
  to: { x: number; y: number },
) {
  return (
    ((Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI + 360) %
    360
  );
}

function isRunwayEnd(value: string | undefined): value is RunwayEnd {
  return value === "03" || value === "21";
}

function normalizeRunwayEnd(value: string | undefined) {
  const normalized = value?.replace("RWY", "");
  return isRunwayEnd(normalized) ? normalized : null;
}

function runwayEndFor(flight: Aircraft) {
  return RUNWAY.ends[flight.runway ?? "21"];
}

function groundMotionBetween(
  from: Pick<TrackPoint, "x" | "y" | "tick">,
  to: Pick<TrackPoint, "x" | "y" | "tick">,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distanceNm = Math.hypot(dx, dy) * SCOPE_NM_PER_WORLD_UNIT;
  const elapsedSeconds = Math.max(
    (to.tick - from.tick) / SIMULATION_TICKS_PER_SECOND,
    1 / SIMULATION_TICKS_PER_SECOND,
  );
  const groundSpeed =
    (distanceNm * 3600) /
    elapsedSeconds /
    BACKGROUND_MOVEMENT_SCALE;
  const groundTrack =
    distanceNm > 0.0001
      ? ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
      : 0;
  return { groundSpeed, groundTrack };
}

function appendGroundTrackSample(
  flight: Aircraft,
  previousPosition: Pick<TrackPoint, "x" | "y" | "tick">,
  tick: number,
) {
  const retained = flight.track.filter(
    (point) => tick - point.tick <= TRACK_HISTORY_TICKS,
  );
  if (tick % TRACK_SAMPLE_TICKS !== 0) return retained;

  const current = { x: flight.x, y: flight.y, tick };
  const origin = retained.at(-1) ?? previousPosition;
  const motion = groundMotionBetween(origin, current);
  const groundTrack =
    motion.groundSpeed > 0.5
      ? motion.groundTrack
      : retained.at(-1)?.groundTrack ?? 0;

  return [
    ...retained,
    {
      ...current,
      groundSpeed: motion.groundSpeed,
      groundTrack,
    },
  ];
}

function smoothGroundTrack(points: TrackPoint[]) {
  if (points.length < 3) return points;
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point;
    const previous = points[index - 1];
    const following = points[index + 1];
    return {
      ...point,
      x: previous.x * 0.16 + point.x * 0.68 + following.x * 0.16,
      y: previous.y * 0.16 + point.y * 0.68 + following.y * 0.16,
    };
  });
}

function currentGroundMotion(flight: Aircraft) {
  if (flight.status === "TAKEOFF_ROLL") {
    const runway = runwayEndFor(flight);
    return {
      groundSpeed: flight.speed,
      groundTrack: headingToPoint(runway.threshold, runway.rolloutEnd),
    };
  }
  const latest = flight.track.at(-1);
  return {
    groundSpeed: flight.groundSpeed ?? latest?.groundSpeed ?? 0,
    groundTrack: flight.groundTrack ?? latest?.groundTrack ?? 0,
  };
}

function stepWorld(previous: World): World {
  let world: World = { ...previous, tick: previous.tick + 1 };
  const stepped = previous.aircraft.map((flight) => {
    if (flight.completed || flight.status === "HANDOFF") return flight;

    const next = { ...flight };
    const previousPosition = {
      x: flight.x,
      y: flight.y,
      tick: previous.tick,
    };
    const onGround = ["HOLD_SHORT", "LINE_UP", "TAKEOFF_ROLL"].includes(
      next.status,
    );

    if (next.status === "HOLDING" && next.holdFix) {
      const holdFix = findNavFix(next.holdFix);
      if (holdFix) {
        const holdDistance = Math.hypot(next.x - holdFix.x, next.y - holdFix.y);
        if (holdDistance > 2.6) {
          next.targetHeading = Math.round(headingToPoint(next, holdFix));
          next.turnDirection = undefined;
        } else {
          next.targetHeading = (next.heading + 90) % 360;
          next.turnDirection = "R";
        }
      }
    }

    next.heading = turnTowardDirected(
      next.heading,
      next.targetHeading,
      0.8,
      next.turnDirection,
    );
    if (
      next.status !== "HOLDING" &&
      angularDifference(next.heading, next.targetHeading) < 0.2
    ) {
      next.turnDirection = undefined;
    }
    if (!onGround) {
      next.altitude = moveToward(
        next.altitude,
        next.targetAltitude,
        next.expedite ? 32 : 16,
      );
      next.speed = moveToward(next.speed, next.targetSpeed, 1.5);
      if (Math.abs(next.altitude - next.targetAltitude) < 1) {
        next.expedite = false;
      }
    }

    if (
      ["INBOUND", "DEPARTURE", "GO_AROUND", "HOLDING"].includes(next.status) &&
      next.speed > 0
    ) {
      const radians = (next.heading * Math.PI) / 180;
      const travel = groundTravelForKnots(next.speed);
      next.x += Math.sin(radians) * travel;
      next.y -= Math.cos(radians) * travel;
    }

    if (next.status === "APPROACH" || next.status === "FINAL") {
      const runway = runwayEndFor(next);
      const dx = runway.threshold.x - next.x;
      const dy = runway.threshold.y - next.y;
      const dist = Math.hypot(dx, dy);
      const travel = groundTravelForKnots(Math.max(next.speed, 80));
      next.x += (dx / Math.max(dist, 0.01)) * travel;
      next.y += (dy / Math.max(dist, 0.01)) * travel;
      next.targetHeading = runway.heading;
      next.targetAltitude = Math.max(177, Math.min(next.altitude, dist * 115));
      next.targetSpeed = next.wake === "M" ? 125 : 85;

      if (dist < 7) next.status = "FINAL";
      if (dist < 1.2 && !next.landingCleared) {
        next.status = "GO_AROUND";
        next.targetHeading = runway.heading;
        next.targetAltitude = 3000;
        next.targetSpeed = next.wake === "M" ? 170 : 110;
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
        next.speed = 0;
        next.targetSpeed = 0;
        next.completed = true;
        world.safeOperations += 1;
        world.score += 250;
        world = appendEvent(
          world,
          "success",
          `${next.callsign}: Touchdown Runway ${next.runway ?? "21"}. Landing complete.`,
        );
      }
    }

    if (next.status === "TAKEOFF_ROLL") {
      const runway = runwayEndFor(next);
      const dx = runway.rolloutEnd.x - next.x;
      const dy = runway.rolloutEnd.y - next.y;
      const dist = Math.hypot(dx, dy);
      next.speed = moveToward(next.speed, 78, 2.2);
      const travel = groundTravelForKnots(
        Math.max(next.speed, 8),
        TAKEOFF_ROLL_MOVEMENT_SCALE,
      );
      if (dist <= travel) {
        next.x = runway.rolloutEnd.x;
        next.y = runway.rolloutEnd.y;
        next.status = "DEPARTURE";
        next.targetSpeed = 120;
        if (next.departureHeading !== undefined) {
          next.targetHeading = next.departureHeading;
          next.turnDirection = next.departureTurnDirection;
        }
      } else {
        next.x += (dx / Math.max(dist, 0.01)) * travel;
        next.y += (dy / Math.max(dist, 0.01)) * travel;
      }
    }

    if (next.status === "DEPARTURE") {
      const exit = EXIT_FIXES.find((fix) => fix.name === next.exitFix);
      const reachedExit =
        exit && Math.hypot(next.x - exit.x, next.y - exit.y) < 2.86;
      const leftScope =
        next.x < 0.5 || next.x > 99.5 || next.y < 0.5 || next.y > 99.5;

      if (reachedExit && next.altitude >= RUNWAY.elevation + 4000) {
        next.status = "HANDOFF";
        next.completed = true;
        world.safeOperations += 1;
        world.score += 220;
        world = appendEvent(
          world,
          "success",
          `${next.callsign}: ${exit.name} exit reached. Contact SoCal Departure.`,
        );
      } else if (leftScope) {
        next.status = "HANDOFF";
        next.completed = true;
        world.score += 60;
        world = appendEvent(
          world,
          "system",
          `${next.callsign}: Leaving tower scope — handed to nearby airspace.`,
        );
      }
    }

    if (
      next.kind === "arrival" &&
      !next.completed &&
      (next.x < -0.5 || next.x > 100.5 || next.y < -0.5 || next.y > 100.5)
    ) {
      next.completed = true;
      world.score = Math.max(0, world.score - 200);
      world = appendEvent(
        world,
        "warning",
        `${next.callsign}: Arrival left controlled airspace without landing.`,
      );
    }

    const instantaneousMotion = groundMotionBetween(previousPosition, {
      x: next.x,
      y: next.y,
      tick: world.tick,
    });
    next.groundSpeed =
      instantaneousMotion.groundSpeed /
      (flight.status === "TAKEOFF_ROLL"
        ? TAKEOFF_ROLL_MOVEMENT_SCALE
        : 1);
    if (instantaneousMotion.groundSpeed > 0.5) {
      next.groundTrack = instantaneousMotion.groundTrack;
    }

    if (
      !next.completed &&
      !["HOLD_SHORT", "LINE_UP", "LANDED"].includes(next.status)
    ) {
      next.track = appendGroundTrackSample(
        next,
        previousPosition,
        world.tick,
      );
    } else {
      next.track = next.track.filter(
        (point) => world.tick - point.tick <= TRACK_HISTORY_TICKS,
      );
    }

    return next;
  });

  world.aircraft = stepped;

  for (const spawn of SPAWN_SCHEDULE) {
    if (
      spawn.tick === world.tick &&
      !world.aircraft.some(
        (flight) => flight.callsign === spawn.aircraft.callsign,
      )
    ) {
      world.aircraft = [
        ...world.aircraft,
        { ...spawn.aircraft, track: [] },
      ];
      world = appendEvent(
        world,
        "pilot",
        spawn.aircraft.kind === "arrival"
          ? `${spawn.aircraft.callsign}: Entering the terminal area from the scope boundary.`
          : `${spawn.aircraft.callsign}: Holding short Runway ${spawn.aircraft.runway ?? "21"}, ready for departure.`,
      );
    }
  }

  const airborne = world.aircraft.filter(
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
    (flight) => flight.callsign === tokens[0] && !flight.completed,
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
  const reject = (message: string) => appendEvent(previous, "warning", message);
  const rejectHazard = (message: string) =>
    appendEvent(
      {
        ...previous,
        runwayIncursions: previous.runwayIncursions + 1,
        score: Math.max(0, previous.score - 500),
      },
      "warning",
      message,
    );
  const readbacks: string[] = [];
  let cursor = 0;

  const leaveHold = () => {
    if (flight.status !== "HOLDING") return;
    flight.status = flight.kind === "arrival" ? "INBOUND" : "DEPARTURE";
    flight.holdFix = undefined;
  };
  const departureOnGround = () =>
    flight.kind === "departure" &&
    ["HOLD_SHORT", "LINE_UP"].includes(flight.status);

  while (cursor < tokens.length) {
    const action = tokens[cursor];

    if (["C", "CLEAR"].includes(action)) {
      const clearance = tokens[cursor + 1];
      if (!clearance) {
        return reject(`${flight.callsign}: Clearance value missing after C.`);
      }

      if (/^\d{3}$/.test(clearance)) {
        const heading = Number.parseInt(clearance, 10);
        if (heading > 359) {
          return reject(
            `${flight.callsign}: Invalid heading ${clearance}; use 000 through 359.`,
          );
        }
        const direction = tokens[cursor + 2];
        const forcedDirection =
          direction === "L" || direction === "R" ? direction : undefined;
        if (departureOnGround()) {
          flight.departureHeading = heading;
          flight.departureTurnDirection = forcedDirection;
        } else {
          flight.targetHeading = heading;
          flight.turnDirection = forcedDirection;
          leaveHold();
        }
        readbacks.push(
          `${forcedDirection === "L" ? "left turn " : forcedDirection === "R" ? "right turn " : ""}heading ${String(heading).padStart(3, "0")}`,
        );
        cursor += forcedDirection ? 3 : 2;
        continue;
      }

      if (/^\d{1,2}$/.test(clearance)) {
        const altitude = clamp(
          Number.parseInt(clearance, 10) * 1000,
          RUNWAY.elevation,
          20000,
        );
        const expediteToken = tokens[cursor + 2];
        flight.targetAltitude = altitude;
        flight.expedite =
          !["HOLD_SHORT", "LINE_UP"].includes(flight.status) &&
          ["X", "EX"].includes(expediteToken);
        if (flight.kind === "departure") {
          flight.departureAltitudeAssigned = true;
        }
        readbacks.push(
          `${altitude >= flight.altitude ? "climb and maintain" : "descend and maintain"} ${altitude.toLocaleString()}${flight.expedite ? ", expedite" : ""}`,
        );
        cursor += ["X", "EX"].includes(expediteToken) ? 3 : 2;
        continue;
      }

      const fix = findNavFix(clearance);
      if (!fix) {
        return reject(`${flight.callsign}: Unknown fix ${clearance}.`);
      }
      const direction = tokens[cursor + 2];
      const directHeading = Math.round(headingToPoint(flight, fix));
      const forcedDirection =
        direction === "L" || direction === "R" ? direction : undefined;
      if (departureOnGround()) {
        flight.departureHeading = directHeading;
        flight.departureTurnDirection = forcedDirection;
      } else {
        flight.targetHeading = directHeading;
        flight.turnDirection = forcedDirection;
        leaveHold();
      }
      if (flight.kind === "departure" && EXIT_FIXES.some((item) => item.name === fix.name)) {
        flight.exitFix = fix.name;
      }
      readbacks.push(
        `direct ${fix.name}${forcedDirection ? `, turn ${forcedDirection === "L" ? "left" : "right"}` : ""}`,
      );
      cursor += forcedDirection ? 3 : 2;
      continue;
    }

    if (["HDG", "HEADING"].includes(action) && tokens[cursor + 1]) {
      const heading = Number.parseInt(tokens[cursor + 1], 10);
      if (
        !/^\d{1,3}$/.test(tokens[cursor + 1]) ||
        !Number.isFinite(heading) ||
        heading > 359
      ) {
        return reject(
          `${flight.callsign}: Invalid heading; use 000 through 359.`,
        );
      }
      const assignedHeading = heading;
      if (departureOnGround()) {
        flight.departureHeading = assignedHeading;
      } else {
        flight.targetHeading = assignedHeading;
        leaveHold();
      }
      readbacks.push(`heading ${String(assignedHeading).padStart(3, "0")}`);
      cursor += 2;
      continue;
    }

    if (["ALT", "ALTITUDE"].includes(action) && tokens[cursor + 1]) {
      const altitude = Number.parseInt(tokens[cursor + 1], 10);
      if (!Number.isFinite(altitude)) {
        return reject(`${flight.callsign}: Invalid altitude.`);
      }
      flight.targetAltitude = clamp(altitude, RUNWAY.elevation, 20000);
      if (flight.kind === "departure") flight.departureAltitudeAssigned = true;
      readbacks.push(`maintain ${flight.targetAltitude.toLocaleString()}`);
      cursor += 2;
      continue;
    }

    if (["DCT", "DIRECT"].includes(action) && tokens[cursor + 1]) {
      const fix = findNavFix(tokens[cursor + 1]);
      if (!fix) {
        return reject(`${flight.callsign}: Unknown fix ${tokens[cursor + 1]}.`);
      }
      const directHeading = Math.round(headingToPoint(flight, fix));
      if (departureOnGround()) {
        flight.departureHeading = directHeading;
      } else {
        flight.targetHeading = directHeading;
        leaveHold();
      }
      if (flight.kind === "departure" && EXIT_FIXES.some((item) => item.name === fix.name)) {
        flight.exitFix = fix.name;
      }
      readbacks.push(`direct ${fix.name}`);
      cursor += 2;
      continue;
    }

    if (["S", "SPD", "SPEED"].includes(action) && tokens[cursor + 1]) {
      const speed = Number.parseInt(tokens[cursor + 1], 10);
      if (!Number.isFinite(speed)) {
        return reject(`${flight.callsign}: Invalid speed.`);
      }
      flight.targetSpeed = clamp(speed, 60, flight.wake === "M" ? 280 : 160);
      readbacks.push(`speed ${flight.targetSpeed} knots`);
      cursor += 2;
      continue;
    }

    if (["L", "LDG", "LAND"].includes(action)) {
      const runwayToken = tokens[cursor + 1];
      const runwayName =
        normalizeRunwayEnd(runwayToken) ?? flight.runway ?? "21";
      if (runwayToken && !normalizeRunwayEnd(runwayToken)) {
        return reject(
          `${flight.callsign}: Unknown runway ${runwayToken}; use 03 or 21.`,
        );
      }
      const runway = RUNWAY.ends[runwayName];
      if (flight.kind !== "arrival") {
        return reject(`${flight.callsign}: Unable landing clearance.`);
      }
      if (flight.altitude - RUNWAY.elevation > 3000) {
        return reject(
          `${flight.callsign}: Unable landing clearance above 3,000 feet AGL.`,
        );
      }
      if (angularDifference(flight.heading, runway.heading) > 60) {
        return reject(
          `${flight.callsign}: Unable landing clearance — heading must be within 60° of Runway ${runwayName}.`,
        );
      }
      const occupant = previous.aircraft.find(
        (other) =>
          other.callsign !== flight.callsign &&
          !other.completed &&
          ["LINE_UP", "TAKEOFF_ROLL", "LANDED"].includes(other.status),
      );
      if (occupant) {
        return rejectHazard(
          `${flight.callsign}: Unable — Runway ${RUNWAY.designation} occupied by ${occupant.callsign}.`,
        );
      }
      flight.status = "APPROACH";
      flight.runway = runwayName;
      flight.approach = `RNAV ${runwayName}`;
      flight.landingCleared = true;
      flight.holdFix = undefined;
      flight.targetSpeed = flight.wake === "M" ? 140 : 95;
      readbacks.push(`cleared to land Runway ${runwayName}`);
      cursor += runwayToken ? 2 : 1;
      continue;
    }

    if (action === "APP") {
      const runwayToken = tokens[cursor + 1];
      const runwayName =
        normalizeRunwayEnd(runwayToken) ?? flight.runway ?? "21";
      if (runwayToken && !normalizeRunwayEnd(runwayToken)) {
        return reject(
          `${flight.callsign}: Unknown runway ${runwayToken}; use 03 or 21.`,
        );
      }
      if (flight.kind !== "arrival") {
        return reject(`${flight.callsign}: Unable approach clearance.`);
      }
      if (flight.altitude - RUNWAY.elevation > 3000) {
        return reject(`${flight.callsign}: Descend below 3,000 AGL first.`);
      }
      flight.status = "APPROACH";
      flight.runway = runwayName;
      flight.approach = `RNAV ${runwayName}`;
      flight.targetSpeed = flight.wake === "M" ? 140 : 95;
      readbacks.push(`cleared approach Runway ${runwayName}`);
      cursor += runwayToken ? 2 : 1;
      continue;
    }

    if (["W", "LW", "LUAW"].includes(action)) {
      if (flight.kind !== "departure" || flight.status !== "HOLD_SHORT") {
        return reject(`${flight.callsign}: Unable line up from present position.`);
      }
      const occupant = previous.aircraft.find(
        (other) =>
          other.callsign !== flight.callsign &&
          !other.completed &&
          ["LINE_UP", "TAKEOFF_ROLL", "LANDED"].includes(other.status),
      );
      const final = previous.aircraft.find(
        (other) =>
          other.callsign !== flight.callsign &&
          other.kind === "arrival" &&
          other.status === "FINAL" &&
          !other.completed,
      );
      if (occupant || final) {
        return rejectHazard(
          `${flight.callsign}: Unable line up — Runway ${RUNWAY.designation} is not available.`,
        );
      }
      const runway = runwayEndFor(flight);
      flight.status = "LINE_UP";
      flight.x = runway.threshold.x;
      flight.y = runway.threshold.y;
      flight.heading = runway.heading;
      flight.targetHeading = runway.heading;
      flight.speed = 0;
      flight.targetSpeed = 0;
      readbacks.push(`Runway ${flight.runway ?? "21"}, line up and wait`);
      cursor += 1;
      continue;
    }

    if (["T", "TO"].includes(action)) {
      if (
        flight.kind !== "departure" ||
        !["HOLD_SHORT", "LINE_UP"].includes(flight.status)
      ) {
        return reject(`${flight.callsign}: Unable takeoff from present position.`);
      }
      if (!flight.departureAltitudeAssigned) {
        return reject(
          `${flight.callsign}: Assign a departure altitude with C before takeoff.`,
        );
      }
      const occupant = previous.aircraft.find(
        (other) =>
          other.callsign !== flight.callsign &&
          !other.completed &&
          ["LINE_UP", "TAKEOFF_ROLL", "LANDED"].includes(other.status),
      );
      const final = previous.aircraft.find(
        (other) =>
          other.callsign !== flight.callsign &&
          other.kind === "arrival" &&
          other.status === "FINAL" &&
          !other.completed,
      );
      if (occupant || final) {
        return rejectHazard(
          `${flight.callsign}: Unable takeoff — Runway ${RUNWAY.designation} is not available.`,
        );
      }
      const runway = runwayEndFor(flight);
      flight.status = "TAKEOFF_ROLL";
      flight.x = runway.threshold.x;
      flight.y = runway.threshold.y;
      flight.heading = runway.heading;
      flight.targetHeading = runway.heading;
      flight.speed = 0;
      flight.targetSpeed = 78;
      readbacks.push(`Runway ${flight.runway ?? "21"}, cleared for takeoff`);
      cursor += 1;
      continue;
    }

    if (["H", "HOLD"].includes(action)) {
      const fixName = tokens[cursor + 1];
      const fix = findNavFix(fixName);
      if (!fix || ["HOLD_SHORT", "LINE_UP", "TAKEOFF_ROLL"].includes(flight.status)) {
        return reject(`${flight.callsign}: Unable hold at ${fixName ?? "unknown fix"}.`);
      }
      flight.status = "HOLDING";
      flight.holdFix = fix.name;
      flight.targetHeading = Math.round(headingToPoint(flight, fix));
      readbacks.push(`hold at ${fix.name}`);
      cursor += 2;
      continue;
    }

    if (["A", "ABORT", "GA"].includes(action)) {
      if (flight.kind === "arrival" && !flight.completed) {
        if (!["APPROACH", "FINAL"].includes(flight.status)) {
          return reject(`${flight.callsign}: No landing clearance to abort.`);
        }
        flight.status = "GO_AROUND";
        flight.landingCleared = false;
        flight.targetHeading = runwayEndFor(flight).heading;
        flight.targetAltitude = 3000;
        flight.targetSpeed = flight.wake === "M" ? 170 : 110;
        readbacks.push(`go around, runway heading, 3,000`);
        cursor += 1;
        continue;
      }
      if (flight.kind === "departure" && flight.status === "TAKEOFF_ROLL") {
        const runway = runwayEndFor(flight);
        flight.status = "HOLD_SHORT";
        flight.x = runway.hold.x;
        flight.y = runway.hold.y;
        flight.heading = runway.heading;
        flight.targetHeading = runway.heading;
        flight.speed = 0;
        flight.targetSpeed = 0;
        flight.track = [];
        readbacks.push(
          `abort takeoff, hold short Runway ${flight.runway ?? "21"}`,
        );
        cursor += 1;
        continue;
      }
      return reject(`${flight.callsign}: Nothing to abort.`);
    }

    if (["TX", "TAXI"].includes(action)) {
      if (flight.status !== "HOLD_SHORT") {
        return reject(`${flight.callsign}: Unable taxi from present position.`);
      }
      readbacks.push(
        `taxi via Alpha, hold short Runway ${flight.runway ?? "21"}`,
      );
      cursor += 1;
      continue;
    }

    return reject(
      `Command not understood near “${tokens.slice(cursor).join(" ")}”. Try C 035, C 3, C MALIBU, S 100, L 03, L 21, W, T, H SMO, or A.`,
    );
  }

  aircraft[index] = flight;
  return appendEvent(
    { ...previous, aircraft },
    "pilot",
    `${flight.callsign}: ${readbacks.join("; ")}.`,
  );
}

function statusLabel(status: FlightStatus) {
  return status.replaceAll("_", " ");
}

function altitudeLabel(altitude: number) {
  return String(Math.round(altitude / 100)).padStart(3, "0");
}

function clearedHeading(flight: Aircraft) {
  return flight.departureHeading ?? flight.targetHeading;
}

function flightCardRoute(flight: Aircraft) {
  const runway = flight.runway ?? "21";
  if (flight.kind === "departure" && flight.status === "HOLD_SHORT") {
    return `RWY ${runway} · HOLD SHORT · TO ${flight.exitFix ?? "TBD"}`;
  }
  if (flight.kind === "departure" && flight.status === "LINE_UP") {
    return `RWY ${runway} · LINE UP · TO ${flight.exitFix ?? "TBD"}`;
  }
  const route =
    flight.kind === "arrival"
      ? `RWY ${runway}`
      : `EXIT ${flight.exitFix ?? "TBD"}`;
  if (["INBOUND", "DEPARTURE"].includes(flight.status)) return route;
  return `${route} · ${statusLabel(flight.status)}`;
}

export function RadarSimulator() {
  const [world, setWorld] = useState<World>(INITIAL_WORLD);
  const [selected, setSelected] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [paused, setPaused] = useState(false);
  const [queuedCommands, setQueuedCommands] = useState<
    { callsign: string; command: string }[]
  >([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showSatellite, setShowSatellite] = useState(true);
  const [showScale, setShowScale] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [shiftComplete, setShiftComplete] = useState(false);
  const [highScores, setHighScores] = useState<HighScore[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem("pacific-radar-high-scores");
      return saved ? (JSON.parse(saved) as HighScore[]) : [];
    } catch {
      return [];
    }
  });
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
        setShowStats(false);
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
  const radarAircraft = useMemo(
    () =>
      visibleAircraft.filter((flight) => flight.status !== "HOLD_SHORT"),
    [visibleAircraft],
  );

  const selectedFlight =
    visibleAircraft.find((flight) => flight.callsign === selected) ??
    visibleAircraft[0] ??
    null;
  const activeSelection = selectedFlight?.callsign ?? null;

  const alerts = useMemo(() => {
    const result: string[] = [];
    const airborne = radarAircraft.filter(
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
  }, [radarAircraft]);

  const dispatchCommand = (value: string) => {
    const globalCommand = value.trim().toUpperCase();
    if (globalCommand === "HELP") {
      setShowHelp(true);
      setWorld((current) =>
        appendEvent(current, "system", "Command guide displayed."),
      );
      return;
    }
    if (globalCommand === "SCALE") {
      setShowScale((current) => !current);
      setWorld((current) =>
        appendEvent(
          current,
          "system",
          `Mileage scale ${showScale ? "hidden" : "shown"}.`,
        ),
      );
      return;
    }
    if (globalCommand === "STATS") {
      setShowStats(true);
      setWorld((current) =>
        appendEvent(current, "system", "Performance statistics displayed."),
      );
      return;
    }
    if (["QUIT", "EXIT"].includes(globalCommand)) {
      const elapsed = `${String(Math.floor(world.tick / 240)).padStart(2, "0")}:${String(Math.floor((world.tick % 240) / 4)).padStart(2, "0")}`;
      const entry: HighScore = {
        score: world.score,
        safeOperations: world.safeOperations,
        elapsed,
      };
      const nextScores = [...highScores, entry]
        .sort((first, second) => second.score - first.score)
        .slice(0, 5);
      setHighScores(nextScores);
      try {
        window.localStorage.setItem(
          "pacific-radar-high-scores",
          JSON.stringify(nextScores),
        );
      } catch {
        // Local high scores remain available for this session.
      }
      setShiftComplete(true);
      setShowStats(true);
      setPaused(true);
      setWorld((current) =>
        appendEvent(current, "system", "Shift complete · Score recorded locally."),
      );
      return;
    }
    if (!activeSelection) {
      setWorld((current) =>
        appendEvent(
          current,
          "warning",
          "Select an aircraft or begin with a valid callsign.",
        ),
      );
      return;
    }
    if (paused) {
      setQueuedCommands((current) => [
        ...current,
        { callsign: activeSelection, command: value },
      ]);
      setWorld((current) =>
        appendEvent(
          current,
          "system",
          `${activeSelection}: Clearance queued for resume — ${value.trim().toUpperCase()}.`,
        ),
      );
      return;
    }
    setWorld((current) =>
      executeCommand(current, value, activeSelection),
    );
  };

  const transmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!command.trim()) return;
    dispatchCommand(command);
    setCommand("");
    inputRef.current?.focus();
  };

  const pauseSimulation = () => setPaused(true);

  const resumeSimulation = () => {
    if (queuedCommands.length > 0) {
      setWorld((current) =>
        queuedCommands.reduce(
          (nextWorld, queued) =>
            executeCommand(nextWorld, queued.command, queued.callsign),
          current,
        ),
      );
      setQueuedCommands([]);
    }
    setPaused(false);
  };

  const togglePause = () => {
    if (paused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  };

  const reset = () => {
    setWorld(INITIAL_WORLD);
    setSelected(null);
    setCommand("");
    setQueuedCommands([]);
    setShowStats(false);
    setShiftComplete(false);
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
            <span>RUNWAY</span>
            <strong>03 / 21</strong>
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
            onClick={togglePause}
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
              <div className="scope-boundary" />
              <div className="range-ring ring-one" />
              <div className="range-ring ring-two" />
              <div className="range-ring ring-three" />
              <svg
                className="runway-layer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-label={`KSMO Runway ${RUNWAY.designation}`}
              >
                <line
                  className="runway-outline"
                  x1={RUNWAY.ends["03"].threshold.x}
                  y1={RUNWAY.ends["03"].threshold.y}
                  x2={RUNWAY.ends["21"].threshold.x}
                  y2={RUNWAY.ends["21"].threshold.y}
                />
                <line
                  className="runway-surface"
                  x1={RUNWAY.ends["03"].threshold.x}
                  y1={RUNWAY.ends["03"].threshold.y}
                  x2={RUNWAY.ends["21"].threshold.x}
                  y2={RUNWAY.ends["21"].threshold.y}
                />
              </svg>
              <span
                className="runway-end-label runway-end-21"
                style={{
                  left: `${RUNWAY.ends["21"].threshold.x}%`,
                  top: `${RUNWAY.ends["21"].threshold.y}%`,
                }}
              >
                21
              </span>
              <span
                className="runway-end-label runway-end-03"
                style={{
                  left: `${RUNWAY.ends["03"].threshold.x}%`,
                  top: `${RUNWAY.ends["03"].threshold.y}%`,
                }}
              >
                03
              </span>

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

              {EXIT_FIXES.map((fix) => (
                <div
                  className={`exit-marker edge-${fix.edge}`}
                  key={fix.name}
                  style={{ left: `${fix.x}%`, top: `${fix.y}%` }}
                >
                  <span className="exit-arrow" aria-hidden="true" />
                  <span>
                    <strong>{fix.name}</strong>
                    <small>EXIT</small>
                  </span>
                </div>
              ))}

              <svg
                className="track-layer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {radarAircraft.map((flight) => {
                  const groundMotion = currentGroundMotion(flight);
                  const points = smoothGroundTrack([
                    ...flight.track,
                    {
                      x: flight.x,
                      y: flight.y,
                      tick: world.tick,
                      ...groundMotion,
                    },
                  ]);
                  return (
                    <g
                      className={`history-group ${flight.kind} ${activeSelection === flight.callsign ? "selected" : ""}`}
                      key={flight.callsign}
                    >
                      {points.slice(1).map((point, index) => {
                        const previousPoint = points[index];
                        const recency = (index + 1) / Math.max(points.length - 1, 1);
                        return (
                          <polyline
                            className="history-segment"
                            key={`${flight.callsign}-segment-${point.tick}-${index}`}
                            opacity={0.12 + recency * 0.72}
                            points={`${previousPoint.x},${previousPoint.y} ${point.x},${point.y}`}
                          />
                        );
                      })}
                      {flight.track.map((point, index) => (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          key={`${flight.callsign}-history-${point.tick}`}
                          r={activeSelection === flight.callsign ? 0.16 : 0.12}
                          opacity={0.12 + ((index + 1) / Math.max(flight.track.length, 1)) * 0.68}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>

              {radarAircraft.map((flight) => {
                const groundMotion = currentGroundMotion(flight);
                return (
                  <button
                    className={`aircraft-target ${activeSelection === flight.callsign ? "selected" : ""} ${flight.kind}`}
                    key={flight.callsign}
                    style={{
                      left: `${clamp(flight.x, 1, 98)}%`,
                      top: `${clamp(flight.y, 1, 97)}%`,
                    }}
                    onClick={() => {
                      setSelected(flight.callsign);
                      setCommand(`${flight.callsign} `);
                      inputRef.current?.focus();
                    }}
                    aria-label={`Select ${flight.callsign}, altitude ${Math.round(flight.altitude)} feet, ground track ${Math.round(groundMotion.groundTrack)}`}
                  >
                    <span
                      className="target-chevron"
                      style={{
                        transform: `rotate(${groundMotion.groundTrack}deg)`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="data-tag">
                      <strong>{flight.callsign}</strong>
                      <span>
                        {altitudeLabel(flight.altitude)} ·{" "}
                        {Math.round(groundMotion.groundSpeed)}KT
                      </span>
                    </span>
                  </button>
                );
              })}

              <div className="map-title">
                <span>SMO TOWER · 35 NM TERMINAL SCOPE</span>
                <strong>RWY 03/21 · 3,500 × 150 FT · 5 NM RINGS</strong>
              </div>

              <div className="map-controls">
                <button
                  className={showSatellite ? "active" : ""}
                  onClick={() => setShowSatellite((value) => !value)}
                >
                  SAT
                </button>
                <button onClick={togglePause}>
                  {paused ? "▶" : "Ⅱ"}
                </button>
              </div>

              <div className="map-attribution">
                Imagery © Esri, Maxar, Earthstar Geographics
              </div>

              {showScale && (
                <div className="scope-scale" aria-label="Radar mileage scale">
                  <span>0</span>
                  <span>5 NM</span>
                  <span>10 NM</span>
                  <span>15 NM</span>
                </div>
              )}

              {alerts.length > 0 && (
                <div className="conflict-banner">
                  <span className="pulse-dot" />
                  CONFLICT PREDICTION · {alerts[0]}
                </div>
              )}

              {paused && (
                <div
                  className="pause-overlay"
                  role="status"
                  aria-label="Simulation paused. Aircraft movement and simulation clock are frozen."
                >
                  <div className="pause-card">
                    <span>Simulation paused</span>
                    <small>
                      Traffic and clock frozen ·{" "}
                      {queuedCommands.length === 0
                        ? "commands remain available"
                        : `${queuedCommands.length} clearance${queuedCommands.length === 1 ? "" : "s"} queued`}
                    </small>
                    <button onClick={resumeSimulation}>Resume shift</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <aside className="side-panel">
          <section className="panel-section radio-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">120.100</p>
                <h2>Radio log</h2>
              </div>
              <span className="live-indicator">LIVE</span>
            </div>
            <div className="event-log" aria-live="polite">
              {world.events.slice(-2).reverse().map((item, index) => (
                <div className={`event-row ${item.tone}`} key={`${item.tick}-${index}`}>
                  <span>
                    {String(Math.floor(item.tick / 240)).padStart(2, "0")}:
                    {String(Math.floor((item.tick % 240) / 4)).padStart(2, "0")}
                  </span>
                  <p title={item.message}>{item.message}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="command-deck" aria-label="Clearance console">
            <form className="command-form" onSubmit={transmit}>
              <div className="command-input-wrap">
                <span className="prompt-symbol">›</span>
                <input
                  ref={inputRef}
                  id="command"
                  aria-label="ATC command"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit">Send</button>
              </div>
            </form>
          </section>

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
                <p className="eyebrow">YOUR AIRSPACE</p>
                <h2>Active control</h2>
              </div>
              <span>{visibleAircraft.length} active</span>
            </div>
            <div className="strip-stack">
              {visibleAircraft.map((flight) => (
                <button
                  className={`flight-strip ${flight.kind} ${activeSelection === flight.callsign ? "selected" : ""}`}
                  key={flight.callsign}
                  onClick={() => {
                    setSelected(flight.callsign);
                    setCommand(`${flight.callsign} `);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="strip-main">
                    <strong>{flight.callsign}</strong>
                    <small>
                      {flight.type} · WTC {flight.wake} · HDG{" "}
                      {String(Math.round(clearedHeading(flight))).padStart(3, "0")}
                      ° ·{" "}
                      {Math.round(flight.speed)}KT
                    </small>
                  </span>
                  <span className="strip-data">
                    <strong>
                      {altitudeLabel(flight.targetAltitude)}
                      {flight.targetAltitude > flight.altitude + 30
                        ? "↑"
                        : flight.targetAltitude < flight.altitude - 30
                          ? "↓"
                          : ""}
                    </strong>
                    <small>ALT</small>
                  </span>
                  <span className="strip-status">{flightCardRoute(flight)}</span>
                </button>
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
              Commands use Flight ID + command + value. Selecting a target or
              strip inserts its Flight ID. Commands may be chained.
            </p>
            <div className="command-grid">
              <div>
                <code>N172SP C 035</code>
                <span>Turn to heading 035; three digits mean heading</span>
              </div>
              <div>
                <code>N172SP C 3 EX</code>
                <span>Climb or descend to 3,000, expedited</span>
              </div>
              <div>
                <code>N172SP C SMO L</code>
                <span>Direct SMO with a forced left turn</span>
              </div>
              <div>
                <code>N172SP S 100</code>
                <span>Adjust speed to 100 knots</span>
              </div>
              <div>
                <code>N172SP L 03 · L 21</code>
                <span>Intercept and land from either runway end</span>
              </div>
              <div>
                <code>N4382K C 5</code>
                <span>Assign 5,000 before departure</span>
              </div>
              <div>
                <code>N4382K W</code>
                <span>Line up and wait; LW is identical</span>
              </div>
              <div>
                <code>N4382K T</code>
                <span>Clear for takeoff; W is optional</span>
              </div>
              <div>
                <code>N172SP H SMO</code>
                <span>Hold at SMO</span>
              </div>
              <div>
                <code>N172SP A</code>
                <span>Abort landing or takeoff</span>
              </div>
              <div>
                <code>N4382K C 5 C MALIBU T</code>
                <span>Combined altitude, route, and takeoff clearance</span>
              </div>
              <div>
                <code>HELP · SCALE · STATS · EXIT</code>
                <span>Guide, scale, performance, and local high scores</span>
              </div>
            </div>
            <div className="safety-note">
              <strong>Safety and runway rules</strong>
              <p>
                Maintain 3 NM or 1,000 ft. Departures require an assigned
                altitude. Landing requires 3,000 ft AGL or lower and a heading
                within 60° of the cleared runway heading.
              </p>
              <p>
                KSMO has one runway designated 03/21. Runway 21 and Runway 03
                are opposite ends of that runway. Arrivals may be cleared to
                either end, and departures use the runway shown on their strip.
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

      {showStats && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="command-modal stats-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {shiftComplete ? "SHIFT COMPLETE" : "LIVE PERFORMANCE"}
                </p>
                <h2 id="stats-title">Controller statistics</h2>
              </div>
              {!shiftComplete && (
                <button onClick={() => setShowStats(false)} aria-label="Close statistics">
                  ×
                </button>
              )}
            </div>
            <div className="stats-grid">
              <div>
                <span>Score</span>
                <strong>{world.score.toLocaleString()}</strong>
              </div>
              <div>
                <span>Safe operations</span>
                <strong>{world.safeOperations}</strong>
              </div>
              <div>
                <span>Separation losses</span>
                <strong>{world.separationLosses}</strong>
              </div>
              <div>
                <span>Blocked hazards</span>
                <strong>{world.runwayIncursions}</strong>
              </div>
            </div>
            <div className="high-score-board">
              <p className="eyebrow">LOCAL HIGH SCORES</p>
              {highScores.length === 0 ? (
                <p>No completed shifts yet. Type EXIT to record this shift.</p>
              ) : (
                <ol>
                  {highScores.map((entry, index) => (
                    <li key={`${entry.score}-${entry.elapsed}-${index}`}>
                      <span>#{index + 1}</span>
                      <strong>{entry.score.toLocaleString()}</strong>
                      <small>
                        {entry.safeOperations} safe · {entry.elapsed}
                      </small>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <button
              className="primary-button wide-button"
              onClick={shiftComplete ? reset : () => setShowStats(false)}
            >
              {shiftComplete ? "Start new shift" : "Return to scope"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
